declare global {
  interface Window {
    __CONFIG__?: {
      KEYCLOAK_URL?: string;
      KEYCLOAK_REALM?: string;
      API_BASE_URL?: string;
    };
  }
}

export function getKeycloakUrl(): string {
  return window.__CONFIG__?.KEYCLOAK_URL || 'http://localhost:8080';
}

export function getKeycloakRealm(): string {
  return window.__CONFIG__?.KEYCLOAK_REALM || 'eu-jap-hack';
}

export function getKeycloakAuthority(): string {
  return `${getKeycloakUrl()}/realms/${getKeycloakRealm()}`;
}

export function getApiBase(): string {
  return window.__CONFIG__?.API_BASE_URL || 'http://localhost:8000/api';
}
