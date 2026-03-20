"use strict";
/**
 * DID Resolution & Service Endpoint Discovery
 * Resolves did:eu-dataspace and did:smartsense DIDs to DID documents.
 * Discovers service endpoints by type for vehicle data APIs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_TYPES = void 0;
exports.resolveDid = resolveDid;
exports.getServiceEndpoints = getServiceEndpoints;
exports.selectEndpoint = selectEndpoint;
exports.resolveEndpointUrl = resolveEndpointUrl;
const REGISTRY_BASE = process.env.APP_BASE_URL || 'http://localhost:8000';
// --------------- Service Type Constants ---------------
exports.SERVICE_TYPES = {
    VEHICLE_REGISTRY: 'VehicleRegistryService',
    VEHICLE_DPP: 'VehicleDPPService',
    VEHICLE_INSURANCE_DATA: 'VehicleInsuranceDataService',
    VEHICLE_CREDENTIALS: 'VehicleCredentialService',
    VP_VERIFICATION: 'VPVerificationService',
    DATA_SERVICE: 'DataService',
};
// --------------- DID Document Builders ---------------
function buildTataMotorsDidDocument() {
    return {
        '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
        ],
        id: 'did:eu-dataspace:company-tata-001',
        verificationMethod: [
            {
                id: 'did:eu-dataspace:company-tata-001#key-1',
                type: 'Ed25519VerificationKey2020',
                controller: 'did:eu-dataspace:company-tata-001',
                publicKeyMultibase: 'z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
            },
        ],
        authentication: ['did:eu-dataspace:company-tata-001#key-1'],
        assertionMethod: ['did:eu-dataspace:company-tata-001#key-1'],
        service: [
            {
                id: 'did:eu-dataspace:company-tata-001#vehicle-registry',
                type: exports.SERVICE_TYPES.VEHICLE_REGISTRY,
                serviceEndpoint: `${REGISTRY_BASE}/api/vehicle-registry`,
                description: 'TATA Motors Vehicle Asset Registry — resolve Car IDs and public vehicle data',
            },
            {
                id: 'did:eu-dataspace:company-tata-001#vp-verification',
                type: exports.SERVICE_TYPES.VP_VERIFICATION,
                serviceEndpoint: `${REGISTRY_BASE}/api/vehicle-registry/verify-vp`,
                description: 'VP verification endpoint — validate holder presentations',
            },
            {
                id: 'did:eu-dataspace:company-tata-001#data-service',
                type: exports.SERVICE_TYPES.DATA_SERVICE,
                serviceEndpoint: 'https://tata-motors-protocol.tx.the-sense.io/api/v1/dsp#BPNL00000000024R',
                description: 'IDSA Dataspace Protocol endpoint for sovereign data exchange — DSP URL with provider BPNL',
            },
        ],
    };
}
function buildDigitInsuranceDidDocument() {
    return {
        '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
        ],
        id: 'did:eu-dataspace:company-digit-001',
        verificationMethod: [
            {
                id: 'did:eu-dataspace:company-digit-001#key-1',
                type: 'Ed25519VerificationKey2020',
                controller: 'did:eu-dataspace:company-digit-001',
                publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
            },
        ],
        authentication: ['did:eu-dataspace:company-digit-001#key-1'],
        assertionMethod: ['did:eu-dataspace:company-digit-001#key-1'],
        service: [
            {
                id: 'did:eu-dataspace:company-digit-001#verifier',
                type: 'OpenID4VPVerifier',
                serviceEndpoint: `${REGISTRY_BASE}/api/verifier`,
                description: 'Digit Insurance OpenID4VP verifier endpoint',
            },
        ],
    };
}
function buildUserDidDocument(userId) {
    return {
        '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
        ],
        id: `did:smartsense:${userId}`,
        verificationMethod: [
            {
                id: `did:smartsense:${userId}#key-1`,
                type: 'Ed25519VerificationKey2020',
                controller: `did:smartsense:${userId}`,
                publicKeyMultibase: 'z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
            },
        ],
        authentication: [`did:smartsense:${userId}#key-1`],
        assertionMethod: [`did:smartsense:${userId}#key-1`],
        service: [],
    };
}
// --------------- DID Resolution ---------------
const DID_DOCUMENTS = {
    'did:eu-dataspace:company-tata-001': buildTataMotorsDidDocument,
    'did:eu-dataspace:company-digit-001': buildDigitInsuranceDidDocument,
};
function resolveDid(did) {
    // Handle known organization DIDs
    const builder = DID_DOCUMENTS[did];
    if (builder) {
        return {
            didDocument: builder(),
            didResolutionMetadata: { contentType: 'application/did+ld+json' },
            didDocumentMetadata: { created: '2024-01-01T00:00:00Z', updated: new Date().toISOString() },
        };
    }
    // Handle user DIDs (did:smartsense:*)
    if (did.startsWith('did:smartsense:')) {
        const userId = did.replace('did:smartsense:', '');
        return {
            didDocument: buildUserDidDocument(userId),
            didResolutionMetadata: { contentType: 'application/did+ld+json' },
            didDocumentMetadata: { created: '2024-01-01T00:00:00Z', updated: new Date().toISOString() },
        };
    }
    return {
        didDocument: null,
        didResolutionMetadata: { error: 'notFound' },
        didDocumentMetadata: {},
    };
}
// --------------- Service Endpoint Discovery ---------------
function getServiceEndpoints(didDocument) {
    return didDocument.service || [];
}
function selectEndpoint(didDocument, serviceType) {
    const services = didDocument.service || [];
    return services.find(s => s.type === serviceType) || null;
}
function resolveEndpointUrl(endpoint, params) {
    let url = endpoint.serviceEndpoint;
    for (const [key, value] of Object.entries(params)) {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
    }
    return url;
}
