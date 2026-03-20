"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const REGISTRY_BASE = process.env.APP_BASE_URL || 'http://localhost:8000';
const router = (0, express_1.Router)();
// Check if consent already exists (idempotency)
router.get('/check', async (req, res) => {
    const { userId, vin, requesterId } = req.query;
    const existing = await db_1.default.consent.findFirst({
        where: { userId, vin, requesterId, status: 'approved' },
    });
    if (existing) {
        return res.json({ exists: true, consent: existing });
    }
    return res.json({ exists: false });
});
// Get pending consents for a user
router.get('/pending/:userId', async (req, res) => {
    const pending = await db_1.default.consent.findMany({
        where: { userId: req.params.userId, status: 'pending' },
    });
    res.json(pending);
});
// Get consent history for a user
router.get('/history/:userId', async (req, res) => {
    const history = await db_1.default.consent.findMany({
        where: { userId: req.params.userId },
    });
    res.json(history);
});
// Get specific consent by ID
router.get('/:id', async (req, res) => {
    const consent = await db_1.default.consent.findUnique({ where: { id: req.params.id } });
    if (!consent)
        return res.status(404).json({ error: 'Consent not found' });
    res.json(consent);
});
// Create consent request
router.post('/request', auth_1.authenticate, async (req, res) => {
    const { requesterId, requesterName, userId, vin, purpose, dataRequested, dataExcluded } = req.body;
    // Check if pending already exists
    const existingPending = await db_1.default.consent.findFirst({
        where: { userId, vin, requesterId, status: 'pending' },
    });
    if (existingPending) {
        return res.json(existingPending);
    }
    const consent = await db_1.default.consent.create({
        data: {
            id: (0, uuid_1.v4)(),
            requesterId,
            requesterName,
            userId,
            vin,
            purpose,
            dataRequested: dataRequested || [],
            dataExcluded: dataExcluded || [],
            status: 'pending',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });
    res.status(201).json(consent);
});
// Approve consent — also creates an access session for the requester
router.put('/:id/approve', auth_1.authenticate, async (req, res) => {
    const consent = await db_1.default.consent.findUnique({ where: { id: req.params.id } });
    if (!consent)
        return res.status(404).json({ error: 'Consent not found' });
    const updated = await db_1.default.consent.update({
        where: { id: req.params.id },
        data: { status: 'approved', resolvedAt: new Date() },
    });
    // Auto-create an access session so requester can call protected registry endpoints
    const session = await db_1.default.accessSession.create({
        data: {
            id: (0, uuid_1.v4)(),
            vin: updated.vin,
            requesterId: updated.requesterId,
            requesterName: updated.requesterName,
            consentId: updated.id,
            status: 'active',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
    });
    // Audit log
    await db_1.default.vehicleAuditLog.create({
        data: {
            id: (0, uuid_1.v4)(),
            vin: updated.vin,
            action: 'consent_approved_session_created',
            actor: updated.userId,
            details: { consentId: updated.id, sessionId: session.id, requesterId: updated.requesterId },
        },
    });
    res.json({ ...updated, accessSession: session });
});
// Deny consent
router.put('/:id/deny', auth_1.authenticate, async (req, res) => {
    const consent = await db_1.default.consent.findUnique({ where: { id: req.params.id } });
    if (!consent)
        return res.status(404).json({ error: 'Consent not found' });
    const updated = await db_1.default.consent.update({
        where: { id: req.params.id },
        data: { status: 'denied', resolvedAt: new Date() },
    });
    res.json(updated);
});
exports.default = router;
