"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const waltid_1 = require("../services/waltid");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const companies = await db_1.default.company.findMany();
    res.json(companies);
});
router.get('/:id', async (req, res) => {
    const company = await db_1.default.company.findUnique({ where: { id: req.params.id } });
    if (!company)
        return res.status(404).json({ error: 'Company not found' });
    res.json(company);
});
router.post('/', (0, auth_1.requireRole)('company_admin'), async (req, res) => {
    const { name, vatId, eoriNumber, cin, gstNumber, country, city, address, adminName, adminEmail } = req.body;
    if (!name)
        return res.status(400).json({ error: 'Company name is required' });
    if (!vatId && !eoriNumber && !cin && !gstNumber) {
        return res.status(400).json({ error: 'At least one of VAT ID, EORI, CIN, GST is required' });
    }
    const companyId = (0, uuid_1.v4)();
    const credentialId = (0, uuid_1.v4)();
    const credentialSubject = {
        companyName: name,
        companyDid: `did:eu-dataspace:${companyId}`,
        registrationNumber: vatId || eoriNumber || cin || gstNumber,
        vatId,
        eoriNumber,
        cin,
        gstNumber,
        country,
        city,
        address,
        adminName,
        adminEmail,
        incorporationDate: new Date().toISOString(),
    };
    const credential = await db_1.default.credential.create({
        data: {
            id: credentialId,
            type: 'OrgVC',
            issuerId: 'eu-dataspace',
            issuerName: 'EU APAC Dataspace',
            subjectId: companyId,
            status: 'active',
            credentialSubject,
        },
    });
    // Also issue via walt.id OID4VCI (non-blocking)
    (0, waltid_1.issueCredentialSimple)({
        type: 'OrgVC',
        issuerDid: 'did:web:eu-dataspace',
        subjectDid: `did:eu-dataspace:${companyId}`,
        credentialSubject,
    }).catch(() => { });
    const company = await db_1.default.company.create({
        data: {
            id: companyId,
            name,
            vatId,
            eoriNumber,
            cin,
            gstNumber,
            country,
            city,
            address,
            adminName,
            adminEmail,
            did: `did:eu-dataspace:${companyId}`,
            credentialId,
        },
    });
    res.status(201).json({ company, credential });
});
exports.default = router;
