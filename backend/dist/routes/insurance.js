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
const vc_builder_1 = require("../services/gaiax/vc-builder");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const policies = await db_1.default.insurancePolicy.findMany();
    res.json(policies);
});
router.get('/:vin', async (req, res) => {
    const policy = await db_1.default.insurancePolicy.findFirst({ where: { vin: req.params.vin } });
    if (!policy)
        return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
});
router.post('/', (0, auth_1.requireRole)('insurance_agent'), async (req, res) => {
    const { userId, vin, coverageType, premiumBreakdown } = req.body;
    const car = await db_1.default.car.findUnique({ where: { vin } });
    if (!car)
        return res.status(404).json({ error: 'Car not found' });
    const targetUserId = userId || car.ownerId;
    const dpp = car.dpp;
    // Create insurance VC
    const credentialId = (0, uuid_1.v4)();
    const policyNumber = `DIG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const startDate = new Date();
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    // issuer links to the insurance company's resolvable Legal Participant VC
    const baseUrl = (0, vc_builder_1.getVCBaseUrl)();
    const insurerCredentialUrl = `${baseUrl}/vc/org-cred-digit-001`;
    const credentialSubject = {
        policyNumber,
        insuredName: dpp?.ownershipChain?.currentOwner?.ownerName || 'Mario Sanchez',
        insuredDid: `did:smartsense:${targetUserId}`,
        vin,
        make: car.make,
        model: car.model,
        year: car.year,
        policyType: coverageType || 'Comprehensive',
        coverageAmount: 50000,
        annualPremium: premiumBreakdown?.total || 1200,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        insurer: 'Digit Insurance',
    };
    const credential = await db_1.default.credential.create({
        data: {
            id: credentialId,
            type: 'InsuranceVC',
            issuerId: insurerCredentialUrl,
            issuerName: 'Digit Insurance',
            subjectId: targetUserId,
            expiresAt: endDate,
            status: 'active',
            credentialSubject,
        },
    });
    // Also issue via walt.id OID4VCI (non-blocking)
    (0, waltid_1.issueCredentialSimple)({
        type: 'InsuranceVC',
        issuerDid: 'did:web:digit-insurance',
        subjectDid: `did:smartsense:${targetUserId}`,
        credentialSubject,
    }).catch(() => { });
    // Add to wallet
    let wallet = await db_1.default.wallet.findUnique({ where: { userId: targetUserId } });
    if (!wallet) {
        wallet = await db_1.default.wallet.create({ data: { userId: targetUserId } });
    }
    await db_1.default.walletCredential.upsert({
        where: { walletId_credentialId: { walletId: wallet.id, credentialId } },
        update: {},
        create: { walletId: wallet.id, credentialId },
    });
    const policy = await db_1.default.insurancePolicy.create({
        data: {
            id: (0, uuid_1.v4)(),
            policyNumber,
            userId: targetUserId,
            vin,
            make: car.make,
            model: car.model,
            year: car.year,
            startDate,
            endDate,
            coverageType: coverageType || 'Comprehensive',
            coverageAmount: 50000,
            annualPremium: premiumBreakdown?.total || 1200,
            premiumBreakdown: premiumBreakdown || undefined,
            status: 'active',
            credentialId,
        },
    });
    res.status(201).json({ policy, credential });
});
exports.default = router;
