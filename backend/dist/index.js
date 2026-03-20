"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cars_1 = __importDefault(require("./routes/cars"));
const credentials_1 = __importDefault(require("./routes/credentials"));
const consent_1 = __importDefault(require("./routes/consent"));
const insurance_1 = __importDefault(require("./routes/insurance"));
const companies_1 = __importDefault(require("./routes/companies"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const purchases_1 = __importDefault(require("./routes/purchases"));
const vc_1 = __importDefault(require("./routes/vc"));
const org_credentials_1 = __importDefault(require("./routes/org-credentials"));
const edc_1 = __importDefault(require("./routes/edc"));
const vehicle_registry_1 = __importDefault(require("./routes/vehicle-registry"));
const verifier_1 = __importDefault(require("./routes/verifier"));
const wallet_vp_1 = __importDefault(require("./routes/wallet-vp"));
const gaiax_1 = require("./services/gaiax");
const db_1 = __importDefault(require("./db"));
const vc_builder_1 = require("./services/gaiax/vc-builder");
const app = (0, express_1.default)();
const PORT = 8000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), authEnabled: AUTH_ENABLED });
});
app.use('/api/cars', cars_1.default);
app.use('/api/credentials', credentials_1.default);
app.use('/api/consent', consent_1.default);
app.use('/api/insurance', insurance_1.default);
app.use('/api/companies', companies_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/purchases', purchases_1.default);
app.use('/api/vc', vc_1.default);
app.use('/api/org-credentials', org_credentials_1.default);
app.use('/api/edc', edc_1.default);
app.use('/api/vehicle-registry', vehicle_registry_1.default);
app.use('/api/verifier', verifier_1.default);
app.use('/api/wallet-vp', wallet_vp_1.default);
// Well-known endpoint for vehicle registry discovery
app.get('/.well-known/vehicle-registry', (_req, res) => {
    res.redirect('/api/vehicle-registry/well-known');
});
// DID document for did:web resolution (needed by GXDCH compliance)
const didJsonHandler = (_req, res) => {
    const signer = (0, gaiax_1.getVPSigner)();
    res.json({
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
        id: signer.getDid(),
        verificationMethod: [{
                id: signer.getKid(),
                type: 'JsonWebKey2020',
                controller: signer.getDid(),
                publicKeyJwk: signer.getPublicKeyJwk(),
            }],
        authentication: [signer.getKid()],
        assertionMethod: [signer.getKid()],
    });
};
app.get('/.well-known/did.json', didJsonHandler);
app.get('/:path/did.json', didJsonHandler);
// VC resolution endpoints — makes VC URIs publicly resolvable
app.get('/vc/:id', async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Credential not found' });
    const record = row;
    const signer = (0, gaiax_1.getVPSigner)();
    const vc = (0, vc_builder_1.buildLegalParticipantVC)(record, signer.getDid());
    const response = {
        ...vc,
        verificationStatus: row.verificationStatus,
    };
    if (row.complianceResult) {
        response.complianceResult = row.complianceResult;
    }
    const issuedVCs = row.issuedVCs || [];
    if (issuedVCs.length > 0) {
        response.issuedVCs = issuedVCs;
    }
    res.json(response);
});
app.get('/vc/:id/tandc', async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Credential not found' });
    const signer = (0, gaiax_1.getVPSigner)();
    const tandc = (0, vc_builder_1.buildTermsAndConditionsVC)(signer.getDid(), row.id);
    res.json(tandc);
});
app.get('/vc/:id/lrn', async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Credential not found' });
    const record = row;
    const signer = (0, gaiax_1.getVPSigner)();
    const lrn = (0, vc_builder_1.buildRegistrationNumberVC)(signer.getDid(), row.id, record.legalRegistrationNumber, record.legalAddress.countryCode);
    res.json(lrn);
});
// Gaia-X health endpoint
app.get('/api/gaiax/health', async (_req, res) => {
    const client = new gaiax_1.GaiaXClient();
    try {
        const healthResults = await client.checkAllHealth();
        const selected = await client.selectHealthyEndpointSet();
        res.json({
            endpointSets: healthResults,
            selectedEndpointSet: selected ? selected.endpointSet.name : null,
            mockMode: client.isMockMode,
            timestamp: new Date().toISOString(),
        });
    }
    catch (e) {
        const err = e;
        res.status(500).json({ error: 'Health check failed', message: err.message });
    }
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await db_1.default.$disconnect();
    process.exit(0);
});
app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT} (auth: ${AUTH_ENABLED ? 'ON' : 'OFF'})`);
});
