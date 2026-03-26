import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { writeTenantSecrets, deleteTenantSecrets } from '../services/vault';
import { createTenantDatabase, deleteTenantDatabase } from '../services/postgres';
import { generateValuesFile } from '../services/helm';
import { commitArgoApp, deleteArgoApp } from '../services/argo';
import { notifyBackend } from '../services/callback';
import { withRetry } from '../utils/retry';

export const provisionRouter = Router();

// In-memory lock to prevent concurrent provisioning of the same tenant
const inProgress = new Set<string>();

/**
 * POST /provision
 * Triggers full EDC provisioning for a company.
 * Body: { companyId: string, tenantCode: string, bpn: string }
 *
 * This endpoint is INTERNAL ONLY — not exposed via public ingress.
 * Only the backend service should call this endpoint.
 *
 * Steps (all idempotent):
 *   1. Vault secret write (dbpass + vault-token)
 *   2. PostgreSQL — create tenant database + user on shared server
 *   3. Helm values file generation
 *   4. Argo CD Application manifest commit + push
 *      └─ Argo CD deploys EDC pointed at the shared PostgreSQL server
 *   5. Backend callback with final status
 */
provisionRouter.post('/provision', async (req: Request, res: Response) => {
  const { companyId, tenantCode, bpn } = req.body;

  if (!companyId || !tenantCode || !bpn) {
    return res.status(400).json({ error: 'companyId, tenantCode, and bpn are required' });
  }

  if (inProgress.has(companyId)) {
    console.log(`[provision] Already in progress for company ${companyId} — ignoring duplicate`);
    return res.status(202).json({ status: 'already_in_progress' });
  }

  // Respond immediately; provisioning runs asynchronously
  res.status(202).json({ status: 'accepted', companyId, tenantCode });

  inProgress.add(companyId);
  runProvisioning(companyId, tenantCode, bpn).finally(() => inProgress.delete(companyId));
});

/**
 * GET /status/:companyId
 * Returns the current provisioning status by calling the backend.
 * Convenience endpoint for debugging; UI should call the backend directly.
 */
provisionRouter.get('/status/:companyId', async (req: Request, res: Response) => {
  res.json({
    inProgress: inProgress.has(req.params.companyId),
    note: 'For full status, call GET /companies/:id/edc-status on the backend',
  });
});

/**
 * DELETE /deprovision
 * Tears down all resources for an EDC tenant.
 * Body: { companyId: string, tenantCode: string }
 *
 * Steps (in order):
 *   1. Vault  — permanently delete all secret versions
 *   2. PostgreSQL — drop tenant database + user
 *   3. Git    — remove values file + Argo CD Application manifest and push
 *      └─ Argo CD cascade-deletes K8s resources + namespace via finalizer
 *   4. Backend callback with status "deprovisioned"
 */
provisionRouter.delete('/deprovision', async (req: Request, res: Response) => {
  const { companyId, tenantCode } = req.body;

  if (!companyId || !tenantCode) {
    return res.status(400).json({ error: 'companyId and tenantCode are required' });
  }

  if (inProgress.has(companyId)) {
    console.log(`[deprovision] Already in progress for company ${companyId} — ignoring duplicate`);
    return res.status(409).json({ error: 'Deprovisioning already in progress for this company' });
  }

  inProgress.add(companyId);
  try {
    await runDeprovisioning(companyId, tenantCode);
    res.status(200).json({ status: 'deprovisioned', companyId, tenantCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    inProgress.delete(companyId);
  }
});

async function runProvisioning(
  companyId: string,
  tenantCode: string,
  bpn: string,
): Promise<void> {
  console.log(`[provision] ===== Starting provisioning for tenant "${tenantCode}" (${bpn}) =====`);

  // Step 0: mark provisioning started
  await notifyBackend(companyId, { status: 'provisioning', attempts: 1 });

  let vaultPath: string;
  let dbPass: string;

  // Step 1: Vault — write dbpass + vault-token
  // dbpass is used by the shared PostgreSQL server (created in Step 2)
  // and by the EDC control/data plane to connect to it (via Vault AVP injection).
  // DB host, name, and user are deterministic from tenantCode; no need to store in Vault.
  try {
    console.log(`[provision] Step 1/4 — Vault`);
    dbPass = randomBytes(24).toString('base64url');
    const edcVaultToken = process.env.VAULT_TOKEN || '';
    vaultPath = await withRetry(
      () =>
        writeTenantSecrets(tenantCode, {
          dbpass: dbPass,
          'vault-token': edcVaultToken,
        }),
      3, 3000, `vault:${tenantCode}`,
    );
  } catch (err: any) {
    console.error(`[provision] Step 1 FAILED for "${tenantCode}": ${err.message}`);
    await safeFail(companyId, `Vault secret write failed: ${err.message}`);
    return;
  }

  // Step 2: PostgreSQL — create tenant database + user on shared server
  try {
    console.log(`[provision] Step 2/4 — PostgreSQL database`);
    await withRetry(
      () => createTenantDatabase(tenantCode, dbPass),
      3, 3000, `postgres:${tenantCode}`,
    );
  } catch (err: any) {
    console.error(`[provision] Step 2 FAILED for "${tenantCode}": ${err.message}`);
    await safeFail(companyId, `PostgreSQL database creation failed: ${err.message}`);
    return;
  }

  // Step 3: Helm values file
  try {
    console.log(`[provision] Step 3/4 — Helm values file`);
    await withRetry(
      () => generateValuesFile(tenantCode, bpn),
      3, 2000, `helm:${tenantCode}`,
    );
  } catch (err: any) {
    console.error(`[provision] Step 3 FAILED for "${tenantCode}": ${err.message}`);
    await safeFail(companyId, `Helm values generation failed: ${err.message}`);
    return;
  }

  // Step 4: Argo CD Application commit + push
  try {
    console.log(`[provision] Step 4/4 — Argo CD git commit`);
    await withRetry(
      () => commitArgoApp(tenantCode, bpn),
      3, 5000, `argo:${tenantCode}`,
    );
  } catch (err: any) {
    console.error(`[provision] Step 4 FAILED for "${tenantCode}": ${err.message}`);
    await safeFail(companyId, `Argo CD Application commit failed: ${err.message}`);
    return;
  }

  // Step 4: Notify backend — only status, vaultPath, and provisionedAt.
  // All EDC config (URLs, keys, namespaces) is derived by the backend from tenantCode,
  // so the callback payload is minimal and the config is never at risk of being lost.
  await notifyBackend(companyId, {
    status: 'ready',
    vaultPath,
    provisionedAt: new Date().toISOString(),
  });
  console.log(`[provision] ===== Provisioning COMPLETE for tenant "${tenantCode}" =====`);
}

async function runDeprovisioning(companyId: string, tenantCode: string): Promise<void> {
  console.log(`[deprovision] ===== Starting deprovisioning for tenant "${tenantCode}" =====`);

  // Step 1: Vault — delete secrets
  try {
    console.log(`[deprovision] Step 1/3 — Vault`);
    await withRetry(() => deleteTenantSecrets(tenantCode), 3, 3000, `vault:${tenantCode}`);
  } catch (err: any) {
    console.error(`[deprovision] Step 1 FAILED for "${tenantCode}": ${err.message}`);
    await safeFail(companyId, `Vault secret deletion failed: ${err.message}`);
    return;
  }

  // Step 2: PostgreSQL — drop database + user
  try {
    console.log(`[deprovision] Step 2/3 — PostgreSQL`);
    await withRetry(() => deleteTenantDatabase(tenantCode), 3, 3000, `postgres:${tenantCode}`);
  } catch (err: any) {
    console.error(`[deprovision] Step 2 FAILED for "${tenantCode}": ${err.message}`);
    await safeFail(companyId, `PostgreSQL deletion failed: ${err.message}`);
    return;
  }

  // Step 3: Git — remove Argo Application + values file and push
  try {
    console.log(`[deprovision] Step 3/3 — Argo CD git delete`);
    await withRetry(() => deleteArgoApp(tenantCode), 3, 5000, `argo:${tenantCode}`);
  } catch (err: any) {
    console.error(`[deprovision] Step 3 FAILED for "${tenantCode}": ${err.message}`);
    await safeFail(companyId, `Argo CD Application deletion failed: ${err.message}`);
    return;
  }

  console.log(`[deprovision] ===== Deprovisioning COMPLETE for tenant "${tenantCode}" =====`);
}

async function safeFail(companyId: string, message: string): Promise<void> {
  await notifyBackend(companyId, { status: 'failed', lastError: message });
}
