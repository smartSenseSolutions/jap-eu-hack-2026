"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const client_1 = require("../services/gaiax/client");
const live_client_1 = require("../services/gaiax/live-client");
const orchestrator_1 = require("../services/gaiax/orchestrator");
const vp_signer_1 = require("../services/gaiax/vp-signer");
const vc_builder_1 = require("../services/gaiax/vc-builder");
const waltid_1 = require("../services/waltid");
const router = (0, express_1.Router)();
const gaiaxClient = new client_1.GaiaXClient();
const gaiaxLiveClient = new live_client_1.GaiaXLiveClient();
const orchestrator = new orchestrator_1.GaiaXOrchestrator(gaiaxClient);
// Helper to convert Prisma OrgCredential row to the OrgCredentialRecord shape used by services
function toRecord(row) {
    return {
        ...row,
        legalRegistrationNumber: row.legalRegistrationNumber,
        legalAddress: row.legalAddress,
        headquartersAddress: row.headquartersAddress,
        verificationAttempts: row.verificationAttempts || [],
        issuedVCs: row.issuedVCs || [],
        vcPayload: row.vcPayload,
        complianceResult: row.complianceResult,
        notaryResult: row.notaryResult,
        validFrom: row.validFrom.toISOString(),
        validUntil: row.validUntil.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
// POST /api/org-credentials - Create org credential
router.post('/', (0, auth_1.requireRole)('company_admin'), async (req, res) => {
    const data = req.body;
    const errors = (0, vc_builder_1.validateOrgCredentialFields)(data);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const id = (0, uuid_1.v4)();
    const now = new Date();
    const signer = (0, vp_signer_1.getVPSigner)();
    const record = {
        id,
        companyId: data.companyId || id,
        legalName: data.legalName,
        legalRegistrationNumber: {
            vatId: data.legalRegistrationNumber?.vatId,
            eoriNumber: data.legalRegistrationNumber?.eoriNumber,
            euid: data.legalRegistrationNumber?.euid,
            leiCode: data.legalRegistrationNumber?.leiCode,
            taxId: data.legalRegistrationNumber?.taxId,
            localId: data.legalRegistrationNumber?.localId,
        },
        legalAddress: {
            streetAddress: data.legalAddress?.streetAddress || '',
            locality: data.legalAddress?.locality || '',
            postalCode: data.legalAddress?.postalCode || '',
            countryCode: data.legalAddress?.countryCode || '',
            countrySubdivisionCode: data.legalAddress?.countrySubdivisionCode || '',
        },
        headquartersAddress: {
            streetAddress: data.headquartersAddress?.streetAddress || data.legalAddress?.streetAddress || '',
            locality: data.headquartersAddress?.locality || data.legalAddress?.locality || '',
            postalCode: data.headquartersAddress?.postalCode || data.legalAddress?.postalCode || '',
            countryCode: data.headquartersAddress?.countryCode || data.legalAddress?.countryCode || '',
            countrySubdivisionCode: data.headquartersAddress?.countrySubdivisionCode || data.legalAddress?.countrySubdivisionCode || '',
        },
        website: data.website,
        contactEmail: data.contactEmail,
        did: data.did || signer.getDid(),
        validFrom: (data.validFrom || now.toISOString()),
        validUntil: (data.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()),
        verificationStatus: 'draft',
        verificationAttempts: [],
        issuedVCs: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
    record.vcPayload = (0, vc_builder_1.buildLegalParticipantVC)(record);
    record.vcJwt = signer.signVC(record.vcPayload);
    await db_1.default.orgCredential.create({
        data: {
            id: record.id,
            companyId: record.companyId,
            legalName: record.legalName,
            legalRegistrationNumber: record.legalRegistrationNumber,
            legalAddress: record.legalAddress,
            headquartersAddress: record.headquartersAddress,
            website: record.website,
            contactEmail: record.contactEmail,
            did: record.did,
            validFrom: new Date(record.validFrom),
            validUntil: new Date(record.validUntil),
            verificationStatus: record.verificationStatus,
            verificationAttempts: record.verificationAttempts,
            vcPayload: record.vcPayload,
            vcJwt: record.vcJwt,
            issuedVCs: record.issuedVCs,
        },
    });
    res.status(201).json(record);
});
// GET /api/org-credentials - List all
router.get('/', async (_req, res) => {
    const rows = await db_1.default.orgCredential.findMany();
    res.json(rows.map(toRecord));
});
// GET /api/org-credentials/:id - Get by ID
router.get('/:id', async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Organization credential not found' });
    res.json(toRecord(row));
});
// POST /api/org-credentials/:id/verify - Trigger GXDCH verification (real or mock)
router.post('/:id/verify', (0, auth_1.requireRole)('company_admin'), async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Organization credential not found' });
    const record = toRecord(row);
    await db_1.default.orgCredential.update({
        where: { id: req.params.id },
        data: { verificationStatus: 'verifying' },
    });
    try {
        const result = await orchestrator.verify(record);
        const notaryOk = result.notaryResult.status === 'success';
        const complianceOk = result.complianceResult.status === 'compliant';
        const isVerified = complianceOk || (notaryOk && !gaiaxClient.isMockMode);
        const updated = await db_1.default.orgCredential.update({
            where: { id: req.params.id },
            data: {
                verificationStatus: isVerified ? 'verified' : 'failed',
                vcPayload: result.vc,
                vcJwt: (0, vp_signer_1.getVPSigner)().signVC(result.vc),
                complianceResult: result.complianceResult,
                notaryResult: result.notaryResult,
                issuedVCs: [...(record.issuedVCs || []), ...result.issuedVCs],
                verificationAttempts: [...record.verificationAttempts, ...result.attempts],
            },
        });
        res.json(toRecord(updated));
    }
    catch (e) {
        const err = e;
        await db_1.default.orgCredential.update({
            where: { id: req.params.id },
            data: {
                verificationStatus: 'failed',
                verificationAttempts: [
                    ...record.verificationAttempts,
                    { id: (0, uuid_1.v4)(), timestamp: new Date().toISOString(), endpointSetUsed: 'none', step: 'failed', status: 'error', durationMs: 0, error: err.message },
                ],
            },
        });
        res.status(500).json({ error: 'Verification failed', message: err.message });
    }
});
// POST /api/org-credentials/:id/notary-check - Check registration number via real GXDCH notary
router.post('/:id/notary-check', (0, auth_1.requireRole)('company_admin'), async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    const record = toRecord(row);
    const signer = (0, vp_signer_1.getVPSigner)();
    const regEntry = gaiaxLiveClient.getNotaryType(record.legalRegistrationNumber);
    if (!regEntry) {
        return res.status(400).json({ error: 'No supported registration number type (need VAT, EORI, LEI, or Tax ID)' });
    }
    const notaryUrl = 'https://registrationnumber.notary.lab.gaia-x.eu/v2';
    const result = await gaiaxLiveClient.verifyRegistrationNumber(notaryUrl, regEntry.type, regEntry.value, `${(0, vc_builder_1.getVCBaseUrl)()}/vc/${record.id}`, record.did || signer.getDid());
    res.json({
        registrationNumberType: regEntry.type,
        registrationNumberValue: regEntry.value,
        notaryUrl,
        ...result,
    });
});
// GET /api/org-credentials/:id/status
router.get('/:id/status', async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    const record = toRecord(row);
    res.json({
        id: record.id,
        legalName: record.legalName,
        verificationStatus: record.verificationStatus,
        did: record.did,
        hasVcJwt: !!record.vcJwt,
        issuedVCCount: record.issuedVCs?.length || 0,
        complianceResult: record.complianceResult ? {
            status: record.complianceResult.status,
            complianceLevel: record.complianceResult.complianceLevel,
            endpointSetUsed: record.complianceResult.endpointSetUsed,
            timestamp: record.complianceResult.timestamp,
        } : null,
        notaryResult: record.notaryResult ? {
            status: record.notaryResult.status,
            registrationId: record.notaryResult.registrationId,
            hasRegistrationNumberVC: !!record.notaryResult.registrationNumberVC,
            endpointSetUsed: record.notaryResult.endpointSetUsed,
        } : null,
        attemptCount: record.verificationAttempts.length,
        lastAttempt: record.verificationAttempts.length > 0
            ? record.verificationAttempts[record.verificationAttempts.length - 1]
            : null,
    });
});
// GET /api/org-credentials/:id/proof
router.get('/:id/proof', async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    const record = toRecord(row);
    res.json({
        vcPayload: record.vcPayload,
        vcJwt: record.vcJwt,
        complianceResult: record.complianceResult,
        notaryResult: record.notaryResult,
        issuedVCs: record.issuedVCs,
        verificationAttempts: record.verificationAttempts,
    });
});
// GET /api/org-credentials/:id/issued-vcs - List issued VCs for this credential
router.get('/:id/issued-vcs', async (req, res) => {
    const row = await db_1.default.orgCredential.findUnique({ where: { id: req.params.id } });
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    const record = toRecord(row);
    res.json(record.issuedVCs || []);
});
// GET /api/org-credentials/wallet/credentials - List all VCs in the walt.id wallet
router.get('/wallet/credentials', async (_req, res) => {
    const credentials = await (0, waltid_1.listWalletCredentials)();
    res.json(credentials || []);
});
// POST /api/org-credentials/test-verification
router.post('/test-verification', (0, auth_1.requireRole)('company_admin'), async (_req, res) => {
    const sampleOrg = {
        id: `test-${(0, uuid_1.v4)().slice(0, 8)}`,
        companyId: 'test-company',
        legalName: 'TATA Motors Limited',
        legalRegistrationNumber: { vatId: 'DE129274202' },
        legalAddress: { streetAddress: 'Bombay House, 24 Homi Mody Street', locality: 'Mumbai', postalCode: '400001', countryCode: 'IN', countrySubdivisionCode: 'IN-MH' },
        headquartersAddress: { streetAddress: 'Bombay House, 24 Homi Mody Street', locality: 'Mumbai', postalCode: '400001', countryCode: 'IN', countrySubdivisionCode: 'IN-MH' },
        website: 'https://www.tatamotors.com',
        contactEmail: 'admin@tatamotors.com',
        did: (0, vp_signer_1.getVPSigner)().getDid(),
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        verificationStatus: 'draft',
        verificationAttempts: [],
        issuedVCs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    try {
        const result = await orchestrator.verify(sampleOrg);
        res.json({
            success: true,
            mockMode: gaiaxClient.isMockMode,
            did: sampleOrg.did,
            notaryStatus: result.notaryResult.status,
            notaryRegistrationNumberVC: !!result.notaryResult.registrationNumberVC,
            complianceStatus: result.complianceResult.status,
            complianceErrors: result.complianceResult.errors,
            endpointSetUsed: result.complianceResult.endpointSetUsed,
            issuedVCCount: result.issuedVCs.length,
            attempts: result.attempts,
        });
    }
    catch (e) {
        const err = e;
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
