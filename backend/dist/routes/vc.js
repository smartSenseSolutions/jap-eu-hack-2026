"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const waltid_1 = require("../services/waltid");
const router = (0, express_1.Router)();
router.post('/issue', auth_1.authenticate, async (req, res) => {
    const { type, issuerDid, subjectDid, credentialSubject } = req.body;
    if (!type || !issuerDid || !subjectDid || !credentialSubject) {
        return res.status(400).json({ error: 'Missing required fields: type, issuerDid, subjectDid, credentialSubject' });
    }
    const result = await (0, waltid_1.issueCredentialSimple)({ type, issuerDid, subjectDid, credentialSubject });
    if (!result) {
        return res.status(503).json({ error: 'walt.id issuer service unavailable' });
    }
    res.json(result);
});
router.post('/verify', auth_1.authenticate, async (req, res) => {
    const { presentationDefinition } = req.body;
    if (!presentationDefinition) {
        return res.status(400).json({ error: 'Missing presentationDefinition' });
    }
    const result = await (0, waltid_1.verifyPresentationOID4VP)({ presentationDefinition });
    if (!result) {
        return res.status(503).json({ error: 'walt.id verifier service unavailable' });
    }
    res.json(result);
});
exports.default = router;
