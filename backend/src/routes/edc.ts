import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { negotiateAndFetchData, EdcStepUpdate } from '../services/edcConsumerService';
import db from '../db';

const router = Router();

// Full EDC negotiation with SSE streaming of step progress
router.post('/negotiate', authenticate, async (req, res) => {
  const { vin, consentId, stream } = req.body;

  if (!vin) {
    return res.status(400).json({ error: 'VIN is required' });
  }

  const requestedBy = (req as any).user?.preferred_username || (req as any).user?.sub || 'unknown';

  // If client requests streaming, use SSE
  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const data = await negotiateAndFetchData(
        vin,
        (update: EdcStepUpdate) => sendEvent('step', update),
        { consentId, requestedBy },
      );
      sendEvent('complete', data);
      res.end();
    } catch (err: any) {
      sendEvent('error', { error: err.message });
      res.end();
    }
    return;
  }

  // Non-streaming: original behavior
  try {
    const startTime = Date.now();
    const data = await negotiateAndFetchData(vin, undefined, { consentId, requestedBy });
    const duration = Date.now() - startTime;
    console.log(`[EDC Route] Negotiation complete for VIN: ${vin} (took ${duration}ms)`);
    res.json(data);
  } catch (err: any) {
    console.error(`[EDC Route] Negotiation failed for VIN ${vin}:`, err.message);
    res.status(502).json({
      error: 'EDC data negotiation failed',
      details: err.message,
    });
  }
});

// Get all EDC transactions (for dashboard)
router.get('/transactions', async (_req, res) => {
  const transactions = db.get('edc_transactions').sortBy('startedAt').reverse().value();
  res.json(transactions);
});

// Get a single transaction by ID
router.get('/transactions/:id', async (req, res) => {
  const tx = db.get('edc_transactions').find({ id: req.params.id }).value();
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

export default router;
