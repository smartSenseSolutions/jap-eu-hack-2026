/**
 * OpenID4VP-style Verifier Routes
 * Handles presentation requests from Digit Insurance,
 * receives VPs from the wallet, processes them through the full
 * DID resolution + manufacturer validation pipeline.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import db from '../db';
import { authenticate } from '../middleware/auth';
import {
  parseVP,
  extractCredentials,
  validateVP,
  PresentationRequest,
  PresentationSession,
  SessionStep,
} from '../services/vp-processor';
import {
  resolveDid,
  selectEndpoint,
  resolveEndpointUrl,
  SERVICE_TYPES,
} from '../services/did-resolver';

const REGISTRY_BASE = process.env.APP_BASE_URL || 'http://localhost:8000';
const router = Router();

// --------------- Step Names ---------------

const VP_FLOW_STEPS = [
  'VP Received & Parsed',
  'Credentials Extracted from VP',
  'VP Signature & Structure Validated',
  'Issuer DID Resolved',
  'Service Endpoints Discovered',
  'Vehicle Data Requested via VP',
  'Manufacturer Validated VP & Returned Data',
];

// --------------- Helper ---------------

function updateSession(sessionId: string, updates: Partial<PresentationSession>) {
  const session = db.get('presentation_sessions').find({ id: sessionId });
  if (session.value()) {
    session.assign(updates).write();
  }
}

function updateSessionStep(sessionId: string, stepNum: number, status: SessionStep['status'], details?: Record<string, unknown>, durationMs?: number) {
  const session = db.get('presentation_sessions').find({ id: sessionId }).value() as PresentationSession;
  if (!session) return;

  const step = session.steps.find(s => s.step === stepNum);
  if (step) {
    step.status = status;
    if (status === 'running') step.startedAt = new Date().toISOString();
    if (status === 'completed' || status === 'failed') {
      step.completedAt = new Date().toISOString();
      if (durationMs !== undefined) step.durationMs = durationMs;
    }
    if (details) step.details = details;
  }
  db.get('presentation_sessions').find({ id: sessionId }).assign(session).write();
}

// --------------- Routes ---------------

/**
 * POST /presentation-request
 * Digit Insurance creates a presentation request (OpenID4VP Authorization Request)
 */
router.post('/presentation-request', authenticate, (req, res) => {
  const { purpose, expectedCredentialTypes, requestedClaims } = req.body;

  const nonce = uuidv4();
  const requestId = uuidv4();

  const request: PresentationRequest = {
    id: requestId,
    verifierId: 'company-digit-001',
    verifierName: 'Digit Insurance',
    verifierDid: 'did:eu-dataspace:company-digit-001',
    nonce,
    purpose: purpose || 'Vehicle insurance underwriting — verify ownership and access vehicle data',
    expectedCredentialTypes: expectedCredentialTypes || ['OwnershipVC'],
    requestedClaims: requestedClaims || ['vin', 'make', 'model', 'year', 'ownerId'],
    callbackUrl: `${REGISTRY_BASE}/api/verifier/callback`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
  };

  db.get('presentation_requests').push(request).write();

  // Create a session to track processing
  const session: PresentationSession = {
    id: uuidv4(),
    requestId,
    status: 'waiting',
    steps: VP_FLOW_STEPS.map((name, i) => ({
      step: i + 1,
      name,
      status: 'pending' as const,
    })),
    startedAt: new Date().toISOString(),
  };
  db.get('presentation_sessions').push(session).write();

  // Build QR payload (OpenID4VP-style authorization request)
  const qrPayload = {
    type: 'openid4vp-authorization-request',
    client_id: request.verifierDid,
    client_metadata: {
      client_name: request.verifierName,
      logo_uri: null,
    },
    nonce,
    presentation_definition: {
      id: requestId,
      input_descriptors: [
        {
          id: 'ownership_vc',
          name: 'Vehicle Ownership Credential',
          purpose: request.purpose,
          constraints: {
            fields: [
              { path: ['$.type'], filter: { type: 'array', contains: { const: 'OwnershipVC' } } },
              { path: ['$.credentialSubject.vin'], optional: false },
            ],
          },
        },
      ],
    },
    response_uri: request.callbackUrl,
    response_type: 'vp_token',
    response_mode: 'direct_post',
    request_id: requestId,
  };

  // Deep link for same-device flow
  const deepLink = `smartsense-wallet://present?request_id=${requestId}&callback=${encodeURIComponent(request.callbackUrl)}&nonce=${nonce}`;

  res.status(201).json({
    ...request,
    sessionId: session.id,
    qrPayload,
    deepLink,
    qrData: JSON.stringify(qrPayload),
  });
});

/**
 * GET /presentation-request/:id
 * Wallet fetches presentation request details (e.g. after scanning QR)
 */
router.get('/presentation-request/:id', (req, res) => {
  const request = db.get('presentation_requests').find({ id: req.params.id }).value();
  if (!request) return res.status(404).json({ error: 'Presentation request not found' });

  // Check expiry
  if (new Date(request.expiresAt) < new Date() && request.status === 'pending') {
    db.get('presentation_requests').find({ id: req.params.id }).assign({ status: 'expired' }).write();
    return res.status(410).json({ error: 'Presentation request has expired' });
  }

  res.json(request);
});

/**
 * POST /callback
 * Wallet submits VP here. This triggers the full processing pipeline.
 */
router.post('/callback', async (req, res) => {
  const { requestId, vpToken } = req.body;

  if (!requestId || !vpToken) {
    return res.status(400).json({ error: 'requestId and vpToken are required' });
  }

  const request = db.get('presentation_requests').find({ id: requestId }).value() as PresentationRequest;
  if (!request) return res.status(404).json({ error: 'Presentation request not found' });
  if (request.status !== 'pending') {
    return res.status(409).json({ error: `Request already ${request.status}` });
  }

  // Find session
  const session = db.get('presentation_sessions').find({ requestId }).value() as PresentationSession;
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Mark request as fulfilled
  db.get('presentation_requests').find({ id: requestId }).assign({ status: 'fulfilled' }).write();
  updateSession(session.id, { status: 'processing', vpToken });

  // Process VP asynchronously (the insurance portal polls session status)
  processVPAsync(session.id, vpToken, request).catch(err => {
    console.error('[Verifier] VP processing error:', err.message);
  });

  res.json({ sessionId: session.id, status: 'processing' });
});

/**
 * GET /session/:id
 * Insurance portal polls this to get step-by-step progress
 */
router.get('/session/:id', (req, res) => {
  const session = db.get('presentation_sessions').find({ id: req.params.id }).value();
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

/**
 * GET /session-by-request/:requestId
 * Insurance portal can also look up session by request ID
 */
router.get('/session-by-request/:requestId', (req, res) => {
  const session = db.get('presentation_sessions').find({ requestId: req.params.requestId }).value();
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

/**
 * POST /decline
 * Wallet declines the presentation request
 */
router.post('/decline', (req, res) => {
  const { requestId } = req.body;
  const request = db.get('presentation_requests').find({ id: requestId });
  if (!request.value()) return res.status(404).json({ error: 'Request not found' });

  request.assign({ status: 'declined' }).write();

  const session = db.get('presentation_sessions').find({ requestId }).value();
  if (session) {
    updateSession(session.id, { status: 'failed', error: 'User declined the presentation request' });
  }

  res.json({ status: 'declined' });
});

/**
 * GET /did/:did
 * Public DID resolution endpoint
 */
router.get('/did/:did(*)', (req, res) => {
  const result = resolveDid(req.params.did);
  if (!result.didDocument) {
    return res.status(404).json({ error: 'DID not found', did: req.params.did });
  }
  res.json(result);
});

// --------------- VP Processing Pipeline ---------------

async function processVPAsync(sessionId: string, vpToken: unknown, request: PresentationRequest) {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Step 1: Parse VP
    updateSessionStep(sessionId, 1, 'running');
    await sleep(400); // Simulate processing time
    let t0 = Date.now();
    const vp = parseVP(vpToken as string | object);
    updateSessionStep(sessionId, 1, 'completed', {
      holder: vp.holder,
      credentialCount: vp.verifiableCredential.length,
      hasProof: !!vp.proof,
    }, Date.now() - t0);

    // Step 2: Extract credentials
    updateSessionStep(sessionId, 2, 'running');
    await sleep(300);
    t0 = Date.now();
    const credentials = extractCredentials(vp);
    const ownershipCred = credentials.find(c => c.type.includes('OwnershipVC'));

    if (!ownershipCred) {
      throw new Error('No OwnershipVC found in the presentation');
    }

    const vin = ownershipCred.subject.vin as string;
    if (!vin) throw new Error('OwnershipVC does not contain a VIN');

    updateSession(sessionId, { extractedCredentials: credentials, vehicleVin: vin });
    updateSessionStep(sessionId, 2, 'completed', {
      credentialTypes: credentials.map(c => c.type.join(', ')),
      issuer: ownershipCred.issuer,
      vin,
      holder: ownershipCred.subject.ownerId || ownershipCred.subject.ownerDid,
    }, Date.now() - t0);

    // Step 3: Validate VP
    updateSessionStep(sessionId, 3, 'running');
    await sleep(500);
    t0 = Date.now();
    const validation = validateVP(vp, {
      expectedCredentialTypes: request.expectedCredentialTypes,
      expectedChallenge: request.nonce,
      expectedDomain: 'digit-insurance',
      vehicleVin: vin,
    });

    if (!validation.valid) {
      throw new Error(`VP validation failed: ${validation.errors.join('; ')}`);
    }

    updateSessionStep(sessionId, 3, 'completed', {
      valid: true,
      challengeMatched: true,
      holderVerified: true,
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    }, Date.now() - t0);

    // Step 4: Resolve issuer DID
    updateSessionStep(sessionId, 4, 'running');
    await sleep(600);
    t0 = Date.now();
    const issuerDid = ownershipCred.issuer;
    const didResult = resolveDid(issuerDid);

    if (!didResult.didDocument) {
      throw new Error(`Could not resolve issuer DID: ${issuerDid}`);
    }

    updateSession(sessionId, { issuerDid, resolvedDidDocument: didResult.didDocument });
    updateSessionStep(sessionId, 4, 'completed', {
      issuerDid,
      serviceEndpointCount: (didResult.didDocument.service || []).length,
      verificationMethodCount: (didResult.didDocument.verificationMethod || []).length,
    }, Date.now() - t0);

    // Step 5: Discover service endpoints
    updateSessionStep(sessionId, 5, 'running');
    await sleep(400);
    t0 = Date.now();
    const insuranceEndpoint = selectEndpoint(didResult.didDocument, SERVICE_TYPES.VEHICLE_INSURANCE_DATA);

    if (!insuranceEndpoint) {
      throw new Error(`No ${SERVICE_TYPES.VEHICLE_INSURANCE_DATA} endpoint found in issuer DID document`);
    }

    const resolvedUrl = resolveEndpointUrl(insuranceEndpoint, { vin });

    updateSession(sessionId, { selectedEndpoint: { type: insuranceEndpoint.type, url: resolvedUrl } });
    updateSessionStep(sessionId, 5, 'completed', {
      selectedService: insuranceEndpoint.type,
      endpoint: resolvedUrl,
      allServices: (didResult.didDocument.service || []).map(s => s.type),
    }, Date.now() - t0);

    // Step 6: Call manufacturer endpoint with VP
    updateSessionStep(sessionId, 6, 'running');
    await sleep(300);
    t0 = Date.now();

    let vehicleData: unknown;
    try {
      const dataResp = await axios.post(resolvedUrl, {
        vpToken: vp,
        requestId: request.id,
        verifierDid: request.verifierDid,
      }, { timeout: 15000 });
      vehicleData = dataResp.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      throw new Error(`Manufacturer endpoint rejected request: ${msg}`);
    }

    updateSessionStep(sessionId, 6, 'completed', {
      httpStatus: 200,
      vpIncluded: true,
      endpoint: resolvedUrl,
    }, Date.now() - t0);

    // Step 7: Manufacturer validated & returned data
    updateSessionStep(sessionId, 7, 'running');
    await sleep(400);
    t0 = Date.now();

    updateSession(sessionId, {
      vehicleData,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    updateSessionStep(sessionId, 7, 'completed', {
      dataReceived: true,
      fieldsCount: vehicleData && typeof vehicleData === 'object' ? Object.keys(vehicleData).length : 0,
      source: 'manufacturer-authoritative',
      vpValidatedByIssuer: true,
    }, Date.now() - t0);

  } catch (error: any) {
    // Find the running step and mark it failed
    const session = db.get('presentation_sessions').find({ id: sessionId }).value() as PresentationSession;
    if (session) {
      const runningStep = session.steps.find(s => s.status === 'running');
      if (runningStep) {
        updateSessionStep(sessionId, runningStep.step, 'failed', { error: error.message });
      }
    }
    updateSession(sessionId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date().toISOString(),
    });
  }
}

export default router;
