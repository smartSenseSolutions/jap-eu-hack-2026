import nodeVault from 'node-vault';

export interface TenantSecrets {
  dbpass: string;
  'vault-token': string;
}

/**
 * Idempotently writes tenant EDC secrets to HashiCorp Vault (KV v2).
 * Path: k8s-stack/data/runtime_edc/tx_edc_connector_{tenantCode}
 *
 * Secrets written:
 *   - dbpass      — PostgreSQL password used by the in-cluster Bitnami subchart and EDC
 *   - vault-token — Vault token for the EDC connector's own Vault access
 *
 * DB host, name, and user are deterministic from tenantCode and managed by Helm;
 * they do not need to be stored in Vault.
 *
 * The Vault token used must have the following policy:
 *   path "k8s-stack/data/tx_edc_connector_*" { capabilities = ["create", "update", "read"] }
 */
/**
 * Permanently deletes all versions and metadata of the tenant's Vault secret (KV v2).
 * Path: k8s-stack/metadata/runtime_edc/tx_edc_connector_{tenantCode}
 */
export async function deleteTenantSecrets(tenantCode: string): Promise<void> {
  const vaultAddr = process.env.VAULT_ADDR;
  const vaultToken = process.env.VAULT_TOKEN;
  if (!vaultAddr) throw new Error('VAULT_ADDR is not set');
  if (!vaultToken) throw new Error('VAULT_TOKEN is not set');

  // KV v2 metadata delete removes all versions permanently
  const metadataPath = `k8s-stack/metadata/runtime_edc/tx_edc_connector_${tenantCode.replace(/-/g, '_')}`;
  console.log(`[vault] Deleting secret metadata at path: ${metadataPath}`);

  const vault = nodeVault({ endpoint: vaultAddr, token: vaultToken });
  await vault.delete(metadataPath);

  console.log(`[vault] Secrets permanently deleted for tenant "${tenantCode}"`);
}

export async function writeTenantSecrets(
  tenantCode: string,
  secrets: TenantSecrets,
): Promise<string> {
  const vaultAddr = process.env.VAULT_ADDR;
  const vaultToken = process.env.VAULT_TOKEN;
  if (!vaultAddr) throw new Error('VAULT_ADDR is not set');
  if (!vaultToken) throw new Error('VAULT_TOKEN is not set');

  const vaultPath = `k8s-stack/data/runtime_edc/tx_edc_connector_${tenantCode.replace(/-/g, '_')}`;
  console.log(`[vault] Writing secrets to path: ${vaultPath}`);

  const vault = nodeVault({ endpoint: vaultAddr, token: vaultToken });

  // KV v2 write — idempotent, creates new version if already exists
  await vault.write(vaultPath, { data: secrets });

  console.log(`[vault] Secrets successfully written for tenant "${tenantCode}"`);
  return vaultPath;
}
