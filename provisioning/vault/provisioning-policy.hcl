# Vault policy for the EDC Provisioning Service
#
# Grants access ONLY to the runtime_edc sub-path within k8s-stack.
# This token is used exclusively by the provisioning service to write
# per-tenant secrets (dbpass, vault-token) during EDC onboarding.
#
# It has NO access to other k8s-stack secrets (e.g. jap-eu-hack app secrets).
#
# Apply:
#   vault policy write edc-provisioning provisioning/vault/provisioning-policy.hcl
#
# Create token:
#   vault token create \
#     -policy=edc-provisioning \
#     -display-name=edc-provisioning-service \
#     -ttl=0 \
#     -no-default-policy

# Write and read per-tenant EDC secrets
path "k8s-stack/data/runtime_edc/*" {
  capabilities = ["create", "update", "read"]
}

# List and inspect secret metadata (needed for idempotent KV v2 writes)
path "k8s-stack/metadata/runtime_edc/*" {
  capabilities = ["list", "read"]
}
