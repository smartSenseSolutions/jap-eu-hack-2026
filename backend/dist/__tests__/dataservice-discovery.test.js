"use strict";
/**
 * Tests for DataService Discovery
 * Validates parsing of DSP URL and BPNL from DID document DataService entries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const dataservice_discovery_1 = require("../services/dataservice-discovery");
const did_resolver_1 = require("../services/did-resolver");
describe('discoverDataService', () => {
    it('should discover DataService from TATA Motors DID', () => {
        const { didDocument } = (0, did_resolver_1.resolveDid)('did:eu-dataspace:company-tata-001');
        const result = (0, dataservice_discovery_1.discoverDataService)(didDocument);
        expect(result.dspUrl).toBe('https://tata-motors-protocol.tx.the-sense.io/api/v1/dsp');
        expect(result.issuerBpnl).toBe('BPNL00000000024R');
        expect(result.serviceId).toBe('did:eu-dataspace:company-tata-001#data-service');
        expect(result.serviceEndpoint).toBe('https://tata-motors-protocol.tx.the-sense.io/api/v1/dsp#BPNL00000000024R');
    });
    it('should throw NO_DATASERVICE for DID without DataService', () => {
        const { didDocument } = (0, did_resolver_1.resolveDid)('did:eu-dataspace:company-digit-001');
        expect(() => (0, dataservice_discovery_1.discoverDataService)(didDocument)).toThrow(dataservice_discovery_1.DataServiceDiscoveryError);
        try {
            (0, dataservice_discovery_1.discoverDataService)(didDocument);
        }
        catch (err) {
            expect(err).toBeInstanceOf(dataservice_discovery_1.DataServiceDiscoveryError);
            expect(err.code).toBe('NO_DATASERVICE');
        }
    });
    it('should throw NO_DATASERVICE for user DIDs', () => {
        const { didDocument } = (0, did_resolver_1.resolveDid)('did:smartsense:mario-sanchez');
        expect(() => (0, dataservice_discovery_1.discoverDataService)(didDocument)).toThrow(dataservice_discovery_1.DataServiceDiscoveryError);
    });
    it('should handle DID document with no services at all', () => {
        const doc = {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: 'did:test:no-services',
        };
        expect(() => (0, dataservice_discovery_1.discoverDataService)(doc)).toThrow(dataservice_discovery_1.DataServiceDiscoveryError);
    });
    it('should use first DataService when multiple exist', () => {
        const doc = {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: 'did:test:multi',
            service: [
                {
                    id: 'did:test:multi#ds1',
                    type: 'DataService',
                    serviceEndpoint: 'https://first.example.com/dsp#BPNL000000000001',
                },
                {
                    id: 'did:test:multi#ds2',
                    type: 'DataService',
                    serviceEndpoint: 'https://second.example.com/dsp#BPNL000000000002',
                },
            ],
        };
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = (0, dataservice_discovery_1.discoverDataService)(doc);
        expect(result.dspUrl).toBe('https://first.example.com/dsp');
        expect(result.issuerBpnl).toBe('BPNL000000000001');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple DataService entries'));
        consoleSpy.mockRestore();
    });
});
describe('parseDataServiceEndpoint', () => {
    it('should parse valid endpoint with DSP URL and BPNL', () => {
        const service = {
            id: 'did:test:123#data-service',
            type: 'DataService',
            serviceEndpoint: 'https://provider.example.com/api/v1/dsp#BPNL00000000024R',
        };
        const result = (0, dataservice_discovery_1.parseDataServiceEndpoint)(service, 'did:test:123');
        expect(result.dspUrl).toBe('https://provider.example.com/api/v1/dsp');
        expect(result.issuerBpnl).toBe('BPNL00000000024R');
        expect(result.serviceId).toBe('did:test:123#data-service');
    });
    it('should throw MISSING_FRAGMENT when no # in endpoint', () => {
        const service = {
            id: 'did:test:123#ds',
            type: 'DataService',
            serviceEndpoint: 'https://provider.example.com/api/v1/dsp',
        };
        try {
            (0, dataservice_discovery_1.parseDataServiceEndpoint)(service, 'did:test:123');
            fail('Should have thrown');
        }
        catch (err) {
            expect(err).toBeInstanceOf(dataservice_discovery_1.DataServiceDiscoveryError);
            expect(err.code).toBe('MISSING_FRAGMENT');
        }
    });
    it('should throw INVALID_BPNL for malformed BPNL', () => {
        const service = {
            id: 'did:test:123#ds',
            type: 'DataService',
            serviceEndpoint: 'https://provider.example.com/dsp#INVALID_BPN',
        };
        try {
            (0, dataservice_discovery_1.parseDataServiceEndpoint)(service, 'did:test:123');
            fail('Should have thrown');
        }
        catch (err) {
            expect(err).toBeInstanceOf(dataservice_discovery_1.DataServiceDiscoveryError);
            expect(err.code).toBe('INVALID_BPNL');
        }
    });
    it('should throw INVALID_BPNL for short BPNL', () => {
        const service = {
            id: 'did:test:123#ds',
            type: 'DataService',
            serviceEndpoint: 'https://provider.example.com/dsp#BPNL123',
        };
        try {
            (0, dataservice_discovery_1.parseDataServiceEndpoint)(service, 'did:test:123');
            fail('Should have thrown');
        }
        catch (err) {
            expect(err.code).toBe('INVALID_BPNL');
        }
    });
    it('should throw INVALID_DSP_URL for non-URL DSP', () => {
        const service = {
            id: 'did:test:123#ds',
            type: 'DataService',
            serviceEndpoint: 'not-a-url#BPNL00000000024R',
        };
        try {
            (0, dataservice_discovery_1.parseDataServiceEndpoint)(service, 'did:test:123');
            fail('Should have thrown');
        }
        catch (err) {
            expect(err.code).toBe('INVALID_DSP_URL');
        }
    });
    it('should throw MALFORMED_ENDPOINT for empty endpoint', () => {
        const service = {
            id: 'did:test:123#ds',
            type: 'DataService',
            serviceEndpoint: '',
        };
        try {
            (0, dataservice_discovery_1.parseDataServiceEndpoint)(service, 'did:test:123');
            fail('Should have thrown');
        }
        catch (err) {
            expect(err.code).toBe('MALFORMED_ENDPOINT');
        }
    });
    it('should throw INVALID_BPNL for empty BPNL after fragment', () => {
        const service = {
            id: 'did:test:123#ds',
            type: 'DataService',
            serviceEndpoint: 'https://provider.example.com/dsp#',
        };
        try {
            (0, dataservice_discovery_1.parseDataServiceEndpoint)(service, 'did:test:123');
            fail('Should have thrown');
        }
        catch (err) {
            expect(err.code).toBe('INVALID_BPNL');
        }
    });
    it('should accept valid BPNL formats', () => {
        const validBpnls = ['BPNL00000000024R', 'BPNLABCDEF123456', 'BPNL000000000001'];
        for (const bpnl of validBpnls) {
            const service = {
                id: 'did:test:123#ds',
                type: 'DataService',
                serviceEndpoint: `https://provider.example.com/dsp#${bpnl}`,
            };
            const result = (0, dataservice_discovery_1.parseDataServiceEndpoint)(service);
            expect(result.issuerBpnl).toBe(bpnl);
        }
    });
});
describe('end-to-end: DID resolution → DataService discovery', () => {
    it('should extract DSP URL and BPNL from TATA Motors DID in one flow', () => {
        // This mirrors the actual verifier flow
        const issuerDid = 'did:eu-dataspace:company-tata-001';
        const { didDocument } = (0, did_resolver_1.resolveDid)(issuerDid);
        expect(didDocument).not.toBeNull();
        const result = (0, dataservice_discovery_1.discoverDataService)(didDocument);
        expect(result.dspUrl).toMatch(/^https:\/\/.+\/dsp$/);
        expect(result.issuerBpnl).toMatch(/^BPNL[A-Z0-9]{12}$/);
    });
    it('should fail gracefully for issuers without DataService', () => {
        const digitDid = 'did:eu-dataspace:company-digit-001';
        const { didDocument } = (0, did_resolver_1.resolveDid)(digitDid);
        expect(didDocument).not.toBeNull();
        expect(() => (0, dataservice_discovery_1.discoverDataService)(didDocument)).toThrow(dataservice_discovery_1.DataServiceDiscoveryError);
        try {
            (0, dataservice_discovery_1.discoverDataService)(didDocument);
        }
        catch (err) {
            expect(err.code).toBe('NO_DATASERVICE');
            expect(err.did).toBe(digitDid);
        }
    });
    it('old env vars EDC_PARTNER_BPN and EDC_PARTNER_DSP_URL should not be required', () => {
        // These env vars were removed - verify they don't exist in process.env
        // (or if they do, they shouldn't affect the new discovery flow)
        const { didDocument } = (0, did_resolver_1.resolveDid)('did:eu-dataspace:company-tata-001');
        const result = (0, dataservice_discovery_1.discoverDataService)(didDocument);
        // The DSP URL and BPNL come from the DID document, not from env vars
        expect(result.dspUrl).not.toBe(process.env.EDC_PARTNER_DSP_URL || '');
        expect(result.issuerBpnl).not.toBe('');
    });
});
