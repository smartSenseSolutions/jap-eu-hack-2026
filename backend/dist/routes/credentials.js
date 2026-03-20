"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const vc_builder_1 = require("../services/gaiax/vc-builder");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const credentials = await db_1.default.credential.findMany();
    res.json(credentials);
});
router.get('/company/:companyId', async (req, res) => {
    const credentials = await db_1.default.credential.findMany({
        where: { issuerId: req.params.companyId },
    });
    res.json(credentials);
});
// Public credential resolution endpoint — makes credential URIs resolvable
router.get('/:id', async (req, res) => {
    const credential = await db_1.default.credential.findUnique({ where: { id: req.params.id } });
    if (!credential)
        return res.status(404).json({ error: 'Credential not found' });
    const baseUrl = (0, vc_builder_1.getVCBaseUrl)();
    // For OrgVC, resolve issuer to the Legal Participant VC URL
    let issuer = credential.issuerId;
    if (credential.type === 'OrgVC' && credential.subjectId) {
        const orgCred = await db_1.default.orgCredential.findFirst({ where: { companyId: credential.subjectId } });
        if (orgCred) {
            issuer = `${baseUrl}/vc/${orgCred.id}`;
        }
    }
    res.json({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', credential.type],
        id: `${baseUrl}/api/credentials/${credential.id}`,
        issuer,
        issuerName: credential.issuerName,
        validFrom: credential.issuedAt,
        ...(credential.expiresAt ? { validUntil: credential.expiresAt } : {}),
        status: credential.status,
        credentialSubject: credential.credentialSubject,
    });
});
router.post('/', auth_1.authenticate, async (req, res) => {
    const credential = await db_1.default.credential.create({
        data: {
            id: (0, uuid_1.v4)(),
            type: req.body.type,
            issuerId: req.body.issuerId,
            issuerName: req.body.issuerName,
            subjectId: req.body.subjectId,
            status: req.body.status || 'active',
            credentialSubject: req.body.credentialSubject || {},
        },
    });
    res.status(201).json(credential);
});
exports.default = router;
