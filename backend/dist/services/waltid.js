"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueCredentialOID4VCI = issueCredentialOID4VCI;
exports.issueCredentialDirect = issueCredentialDirect;
exports.issueCredentialSimple = issueCredentialSimple;
exports.ensureWalletAccount = ensureWalletAccount;
exports.getWallets = getWallets;
exports.storeCredentialInWallet = storeCredentialInWallet;
exports.listWalletCredentials = listWalletCredentials;
exports.verifyPresentationOID4VP = verifyPresentationOID4VP;
const axios_1 = __importDefault(require("axios"));
const WALTID_ISSUER_URL = process.env.WALTID_ISSUER_URL || 'http://localhost:7002';
const WALTID_WALLET_URL = process.env.WALTID_WALLET_URL || 'http://localhost:7001';
const WALTID_VERIFIER_URL = process.env.WALTID_VERIFIER_URL || 'http://localhost:7003';
const issuerApi = axios_1.default.create({ baseURL: WALTID_ISSUER_URL, timeout: 10000 });
const walletApi = axios_1.default.create({ baseURL: WALTID_WALLET_URL, timeout: 10000 });
/**
 * Issue a Verifiable Credential via walt.id issuer-api OID4VCI flow.
 * Returns a credential offer URI that can be claimed by a wallet.
 */
async function issueCredentialOID4VCI(params) {
    try {
        const response = await issuerApi.post('/openid4vc/jwt/issue', {
            issuerKey: { type: 'jwk', jwk: params.issuerKey },
            issuerDid: params.issuerDid,
            credentialConfigurationId: params.credentialConfigurationId,
            credentialData: params.credentialData,
        });
        return response.data; // credential offer URI
    }
    catch (error) {
        console.warn('[walt.id] OID4VCI issuance failed:', error.message);
        return null;
    }
}
/**
 * Issue a VC directly via the walt.id sdjwt/sign endpoint.
 * This is simpler than the full OID4VCI flow — returns the signed JWT directly.
 */
async function issueCredentialDirect(params) {
    try {
        const response = await issuerApi.post('/openid4vc/jwt/issue', {
            issuerKey: { type: 'jwk', jwk: params.issuerKey },
            issuerDid: params.issuerDid,
            credentialConfigurationId: `${params.type[params.type.length - 1]}_jwt_vc_json`,
            credentialData: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: params.type,
                issuer: { id: params.issuerDid },
                credentialSubject: {
                    id: params.subjectDid,
                    ...params.credentialSubject,
                },
            },
        });
        return response.data; // credential offer URI
    }
    catch (error) {
        console.warn('[walt.id] Direct issuance failed:', error.message);
        return null;
    }
}
// walt.id built-in credential config IDs — custom IDs are not supported
const WALTID_CONFIG_ID = 'UniversityDegree_jwt_vc_json';
/**
 * Simple wrapper for legacy callers that don't have an issuerKey.
 * Uses a built-in walt.id credential config ID with custom credential data.
 */
async function issueCredentialSimple(params) {
    try {
        const response = await issuerApi.post('/openid4vc/jwt/issue', {
            issuerDid: params.issuerDid,
            credentialConfigurationId: WALTID_CONFIG_ID,
            credentialData: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', params.type],
                issuer: { id: params.issuerDid },
                credentialSubject: {
                    id: params.subjectDid,
                    ...params.credentialSubject,
                },
            },
        });
        return response.data;
    }
    catch (error) {
        console.warn('[walt.id] Simple issuance failed:', error.message);
        return null;
    }
}
// ─── Wallet API ───────────────────────────────────────────────
let _walletToken = null;
let _walletAccountId = null;
/**
 * Ensure a wallet account exists for the demo. Creates one if needed.
 */
async function ensureWalletAccount() {
    if (_walletToken && _walletAccountId) {
        return { token: _walletToken, accountId: _walletAccountId };
    }
    const email = 'demo@smartsense-loire.io';
    const password = 'demo-wallet-pass-2026';
    try {
        // Try to login first
        const loginResp = await walletApi.post('/wallet-api/auth/login', {
            email, password, type: 'email',
        });
        _walletToken = loginResp.data.token || loginResp.data;
        _walletAccountId = loginResp.data.id || 'default';
        return { token: _walletToken, accountId: _walletAccountId };
    }
    catch {
        // Register if login fails
        try {
            await walletApi.post('/wallet-api/auth/register', {
                name: 'SmartSense Loire Demo',
                email, password, type: 'email',
            });
            const loginResp = await walletApi.post('/wallet-api/auth/login', {
                email, password, type: 'email',
            });
            _walletToken = loginResp.data.token || loginResp.data;
            _walletAccountId = loginResp.data.id || 'default';
            return { token: _walletToken, accountId: _walletAccountId };
        }
        catch (error) {
            console.warn('[walt.id] Wallet account creation failed:', error.message);
            return null;
        }
    }
}
/**
 * Get available wallets for the demo account.
 */
async function getWallets() {
    const account = await ensureWalletAccount();
    if (!account)
        return null;
    try {
        const response = await walletApi.get('/wallet-api/wallet/accounts/wallets', {
            headers: { Authorization: `Bearer ${account.token}` },
        });
        return response.data.wallets || response.data;
    }
    catch (error) {
        console.warn('[walt.id] Failed to get wallets:', error.message);
        return null;
    }
}
/**
 * Store a credential (offer URI or raw data) in the walt.id wallet.
 */
async function storeCredentialInWallet(credentialOfferUri) {
    const account = await ensureWalletAccount();
    if (!account)
        return false;
    try {
        const wallets = await getWallets();
        const walletId = wallets?.[0]?.id || 'default';
        await walletApi.post(`/wallet-api/wallet/${walletId}/exchange/useOfferRequest`, null, {
            params: { offerUrl: credentialOfferUri },
            headers: { Authorization: `Bearer ${account.token}` },
        });
        return true;
    }
    catch (error) {
        console.warn('[walt.id] Failed to store credential in wallet:', error.message);
        return false;
    }
}
/**
 * List credentials in the walt.id wallet.
 */
async function listWalletCredentials() {
    const account = await ensureWalletAccount();
    if (!account)
        return null;
    try {
        const wallets = await getWallets();
        const walletId = wallets?.[0]?.id || 'default';
        const response = await walletApi.get(`/wallet-api/wallet/${walletId}/credentials`, {
            headers: { Authorization: `Bearer ${account.token}` },
        });
        return response.data;
    }
    catch (error) {
        console.warn('[walt.id] Failed to list wallet credentials:', error.message);
        return null;
    }
}
// ─── Verification (OID4VP) ────────────────────────────────────
async function verifyPresentationOID4VP(request) {
    try {
        const response = await axios_1.default.post(`${WALTID_VERIFIER_URL}/openid4vc/verify`, {
            request_credentials: [request.presentationDefinition],
        }, { timeout: 10000 });
        return response.data;
    }
    catch (error) {
        console.warn('[walt.id] OID4VP verification failed:', error.message);
        return null;
    }
}
