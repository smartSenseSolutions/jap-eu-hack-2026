"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const edcConsumerService_1 = require("../services/edcConsumerService");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// Full EDC negotiation with SSE streaming of step progress
router.post('/negotiate', auth_1.authenticate, async (req, res) => {
    const { vin, consentId, stream, dspUrl, bpnl } = req.body;
    if (!vin) {
        return res.status(400).json({ error: 'VIN is required' });
    }
    if (!dspUrl || !bpnl) {
        return res.status(400).json({ error: 'dspUrl and bpnl are required' });
    }
    const provider = { dspUrl, bpnl };
    const requestedBy = req.user?.preferred_username || req.user?.sub || 'unknown';
    // If client requests streaming, use SSE
    if (stream) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });
        const sendEvent = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };
        try {
            const data = await (0, edcConsumerService_1.negotiateAndFetchData)(vin, provider, (update) => sendEvent('step', update), { consentId, requestedBy });
            sendEvent('complete', data);
            res.end();
        }
        catch (err) {
            sendEvent('error', { error: err.message });
            res.end();
        }
        return;
    }
    // Non-streaming: original behavior
    try {
        const startTime = Date.now();
        const data = await (0, edcConsumerService_1.negotiateAndFetchData)(vin, provider, undefined, { consentId, requestedBy });
        const duration = Date.now() - startTime;
        console.log(`[EDC Route] Negotiation complete for VIN: ${vin} (took ${duration}ms)`);
        res.json(data);
    }
    catch (err) {
        console.error(`[EDC Route] Negotiation failed for VIN ${vin}:`, err.message);
        res.status(502).json({
            error: 'EDC data negotiation failed',
            details: err.message,
        });
    }
});
// Get all EDC transactions (for dashboard)
router.get('/transactions', async (_req, res) => {
    const transactions = await db_1.default.edcTransaction.findMany({ orderBy: { startedAt: 'desc' } });
    res.json(transactions);
});
// Get a single transaction by ID
router.get('/transactions/:id', async (req, res) => {
    const tx = await db_1.default.edcTransaction.findUnique({ where: { id: req.params.id } });
    if (!tx)
        return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
});
exports.default = router;
