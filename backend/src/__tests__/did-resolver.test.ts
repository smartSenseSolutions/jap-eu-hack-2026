/**
 * Tests for DID Resolution & Service Endpoint Discovery
 */

import {
  resolveDid,
  selectEndpoint,
  resolveEndpointUrl,
  getServiceEndpoints,
  SERVICE_TYPES,
} from '../services/did-resolver';

describe('resolveDid', () => {
  it('should resolve TATA Motors DID', () => {
    const result = resolveDid('did:eu-dataspace:company-tata-001');
    expect(result.didDocument).not.toBeNull();
    expect(result.didDocument!.id).toBe('did:eu-dataspace:company-tata-001');
    expect(result.didResolutionMetadata.error).toBeUndefined();
  });

  it('should resolve Digit Insurance DID', () => {
    const result = resolveDid('did:eu-dataspace:company-digit-001');
    expect(result.didDocument).not.toBeNull();
    expect(result.didDocument!.id).toBe('did:eu-dataspace:company-digit-001');
  });

  it('should resolve user DIDs', () => {
    const result = resolveDid('did:smartsense:mario-sanchez');
    expect(result.didDocument).not.toBeNull();
    expect(result.didDocument!.id).toBe('did:smartsense:mario-sanchez');
  });

  it('should return notFound for unknown DIDs', () => {
    const result = resolveDid('did:unknown:xyz');
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('notFound');
  });

  it('should include verification methods', () => {
    const result = resolveDid('did:eu-dataspace:company-tata-001');
    expect(result.didDocument!.verificationMethod).toBeDefined();
    expect(result.didDocument!.verificationMethod!.length).toBeGreaterThan(0);
  });

  it('should include service endpoints for TATA Motors', () => {
    const result = resolveDid('did:eu-dataspace:company-tata-001');
    const services = result.didDocument!.service || [];
    expect(services.length).toBeGreaterThanOrEqual(4);

    const serviceTypes = services.map(s => s.type);
    expect(serviceTypes).toContain(SERVICE_TYPES.VEHICLE_REGISTRY);
    expect(serviceTypes).toContain(SERVICE_TYPES.VEHICLE_DPP);
    expect(serviceTypes).toContain(SERVICE_TYPES.VEHICLE_INSURANCE_DATA);
    expect(serviceTypes).toContain(SERVICE_TYPES.VP_VERIFICATION);
  });
});

describe('selectEndpoint', () => {
  it('should find VehicleInsuranceDataService endpoint', () => {
    const { didDocument } = resolveDid('did:eu-dataspace:company-tata-001');
    const endpoint = selectEndpoint(didDocument!, SERVICE_TYPES.VEHICLE_INSURANCE_DATA);
    expect(endpoint).not.toBeNull();
    expect(endpoint!.type).toBe(SERVICE_TYPES.VEHICLE_INSURANCE_DATA);
    expect(endpoint!.serviceEndpoint).toContain('/insurance-data-vp');
  });

  it('should find VehicleRegistryService endpoint', () => {
    const { didDocument } = resolveDid('did:eu-dataspace:company-tata-001');
    const endpoint = selectEndpoint(didDocument!, SERVICE_TYPES.VEHICLE_REGISTRY);
    expect(endpoint).not.toBeNull();
    expect(endpoint!.serviceEndpoint).toContain('/vehicle-registry');
  });

  it('should return null for unknown service type', () => {
    const { didDocument } = resolveDid('did:eu-dataspace:company-tata-001');
    const endpoint = selectEndpoint(didDocument!, 'UnknownServiceType');
    expect(endpoint).toBeNull();
  });
});

describe('resolveEndpointUrl', () => {
  it('should substitute VIN in endpoint URL', () => {
    const { didDocument } = resolveDid('did:eu-dataspace:company-tata-001');
    const endpoint = selectEndpoint(didDocument!, SERVICE_TYPES.VEHICLE_INSURANCE_DATA);
    const url = resolveEndpointUrl(endpoint!, { vin: 'TATA2024NEXONEV001' });
    expect(url).toContain('TATA2024NEXONEV001');
    expect(url).not.toContain('{vin}');
  });
});

describe('getServiceEndpoints', () => {
  it('should return all service endpoints', () => {
    const { didDocument } = resolveDid('did:eu-dataspace:company-tata-001');
    const endpoints = getServiceEndpoints(didDocument!);
    expect(endpoints.length).toBeGreaterThanOrEqual(4);
    endpoints.forEach(ep => {
      expect(ep.id).toBeTruthy();
      expect(ep.type).toBeTruthy();
      expect(ep.serviceEndpoint).toBeTruthy();
    });
  });

  it('should return empty array for user DIDs', () => {
    const { didDocument } = resolveDid('did:smartsense:mario-sanchez');
    const endpoints = getServiceEndpoints(didDocument!);
    expect(endpoints).toHaveLength(0);
  });
});
