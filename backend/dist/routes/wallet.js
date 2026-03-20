"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/:userId', auth_1.authenticate, async (req, res) => {
    const wallet = await db_1.default.wallet.findUnique({
        where: { userId: req.params.userId },
        include: { credentials: { include: { credential: true } } },
    });
    if (!wallet) {
        return res.json({ userId: req.params.userId, credentialIds: [], credentials: [] });
    }
    const credentialIds = wallet.credentials.map((wc) => wc.credentialId);
    const credentials = wallet.credentials.map((wc) => wc.credential);
    res.json({ userId: req.params.userId, credentialIds, credentials });
});
router.post('/:userId/credentials', auth_1.authenticate, async (req, res) => {
    const { credentialId } = req.body;
    let wallet = await db_1.default.wallet.findUnique({ where: { userId: req.params.userId } });
    if (!wallet) {
        wallet = await db_1.default.wallet.create({ data: { userId: req.params.userId } });
    }
    await db_1.default.walletCredential.upsert({
        where: { walletId_credentialId: { walletId: wallet.id, credentialId } },
        update: {},
        create: { walletId: wallet.id, credentialId },
    });
    const updatedWallet = await db_1.default.wallet.findUnique({
        where: { userId: req.params.userId },
        include: { credentials: { include: { credential: true } } },
    });
    const credentialIds = updatedWallet.credentials.map((wc) => wc.credentialId);
    const credentials = updatedWallet.credentials.map((wc) => wc.credential);
    res.json({ userId: req.params.userId, credentialIds, credentials });
});
exports.default = router;
