import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const MAX_RETRIES = 12;       // ~10 minutes total with exponential backoff
const BASE_DELAY_MS = 5000;   // 5s, 10s, 20s, 40s … capped at 60s

export interface ProvisioningStatusPayload {
  status: 'provisioning' | 'ready' | 'failed';
  attempts?: number;
  lastError?: string;
  vaultPath?: string;
  provisionedAt?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calls the backend PATCH /companies/:companyId/edc-provisioning to update status.
 *
 * - Intermediate statuses (provisioning): fire-and-forget — backend being down is fine.
 * - Terminal statuses (ready / failed): retries with exponential backoff until the
 *   backend acknowledges. This ensures the final state is never silently lost even if
 *   the backend is temporarily down during provisioning.
 *
 * The backend derives all EDC config (URLs, keys, namespaces) from tenantCode itself —
 * the payload only carries status, vaultPath, and provisionedAt.
 */
export async function notifyBackend(
  companyId: string,
  payload: ProvisioningStatusPayload,
): Promise<void> {
  const url = `${BACKEND_URL}/companies/${companyId}/edc-provisioning`;
  const isTerminal = payload.status === 'ready' || payload.status === 'failed';

  if (!isTerminal) {
    // Fire-and-forget for intermediate status updates
    axios
      .patch(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 })
      .then(() => console.log(`[callback] Backend notified (${payload.status}) for ${companyId}`))
      .catch(err => console.warn(`[callback] Could not notify backend (${payload.status}) for ${companyId}: ${err.message}`));
    return;
  }

  // Terminal status — retry with exponential backoff until backend confirms
  console.log(`[callback] Persisting terminal status "${payload.status}" for company ${companyId}`);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await axios.patch(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      console.log(`[callback] Backend confirmed "${payload.status}" for ${companyId} (attempt ${attempt})`);
      return;
    } catch (err: any) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `[callback] Failed to persist "${payload.status}" for ${companyId} after ${MAX_RETRIES} attempts. ` +
          `Status is safe in Vault — backend can re-derive config from tenantCode.`,
        );
        return;
      }
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 60_000);
      console.warn(`[callback] Attempt ${attempt}/${MAX_RETRIES} failed (${err.message}). Retrying in ${delay / 1000}s…`);
      await sleep(delay);
    }
  }
}
