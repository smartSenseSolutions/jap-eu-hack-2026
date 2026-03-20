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
    const purchases = await db_1.default.purchase.findMany();
    res.json(purchases);
});
router.post('/', (0, auth_1.requireRole)('customer'), async (req, res) => {
    const userId = req.user?.preferred_username || req.body.userId;
    const { vin, userInfo } = req.body;
    const car = await db_1.default.car.findUnique({ where: { vin } });
    if (!car)
        return res.status(404).json({ error: 'Car not found' });
    if (car.status === 'sold')
        return res.status(400).json({ error: 'Car already sold' });
    const credentialId = (0, uuid_1.v4)();
    const purchaseId = (0, uuid_1.v4)();
    const purchaseDate = new Date();
    const ownerName = userInfo?.name || [req.user?.given_name, req.user?.family_name].filter(Boolean).join(' ') || 'Mario Sanchez';
    // Create Ownership VC — issuer links to the seller's resolvable Legal Participant VC
    const baseUrl = (0, vc_builder_1.getVCBaseUrl)();
    const issuerCredentialUrl = `${baseUrl}/vc/org-cred-tata-001`;
    const credentialSubject = {
        ownerName,
        ownerDid: `did:smartsense:${userId}`,
        vin,
        make: car.make,
        model: car.model,
        year: car.year,
        purchaseDate: purchaseDate.toISOString(),
        purchasePrice: car.price,
        dealerName: 'TATA Motors Official',
    };
    const credential = await db_1.default.credential.create({
        data: {
            id: credentialId,
            type: 'OwnershipVC',
            issuerId: issuerCredentialUrl,
            issuerName: 'TATA Motors',
            subjectId: userId,
            status: 'active',
            credentialSubject,
        },
    });
    // Also issue via walt.id OID4VCI (non-blocking)
    (0, waltid_1.issueCredentialSimple)({
        type: 'OwnershipVC',
        issuerDid: 'did:web:tata-motors',
        subjectDid: `did:smartsense:${userId}`,
        credentialSubject,
    }).catch(() => { });
    // Update car status and owner
    const dpp = car.dpp || {};
    dpp.ownershipChain = dpp.ownershipChain || {};
    dpp.ownershipChain.currentOwner = {
        ownerName,
        ownerId: userId,
        purchaseDate: purchaseDate.toISOString(),
        purchasePrice: car.price,
        country: userInfo?.country || 'IT',
    };
    await db_1.default.car.update({
        where: { vin },
        data: {
            status: 'sold',
            ownerId: userId,
            dpp,
        },
    });
    // Add to wallet
    let wallet = await db_1.default.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        wallet = await db_1.default.wallet.create({ data: { userId } });
    }
    await db_1.default.walletCredential.upsert({
        where: { walletId_credentialId: { walletId: wallet.id, credentialId } },
        update: {},
        create: { walletId: wallet.id, credentialId },
    });
    const purchase = await db_1.default.purchase.create({
        data: {
            id: purchaseId,
            userId,
            vin,
            make: car.make,
            model: car.model,
            year: car.year,
            price: car.price,
            purchaseDate,
            dealerName: 'TATA Motors Official',
            credentialId,
        },
    });
    res.status(201).json({ purchase, credential });
});
exports.default = router;
