import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';
import { getVCBaseUrl } from '../services/gaiax/vc-builder';

const router = Router();

router.get('/', (req, res) => {
  const credentials = db.get('credentials').value();
  res.json(credentials);
});

router.get('/company/:companyId', (req, res) => {
  const credentials = db.get('credentials').filter({ issuerId: req.params.companyId }).value();
  res.json(credentials);
});

// Public credential resolution endpoint — makes credential URIs resolvable
router.get('/:id', (req, res) => {
  const credential = db.get('credentials').find({ id: req.params.id }).value();
  if (!credential) return res.status(404).json({ error: 'Credential not found' });

  const baseUrl = getVCBaseUrl();

  // For OrgVC, resolve issuer to the Legal Participant VC URL
  let issuer = credential.issuerId;
  if (credential.type === 'OrgVC' && credential.subjectId) {
    const orgCred = db.get('org_credentials').find({ companyId: credential.subjectId }).value();
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

router.post('/', authenticate, (req, res) => {
  const { v4: uuidv4 } = require('uuid');
  const credential = { id: uuidv4(), ...req.body };
  db.get('credentials').push(credential).write();
  res.status(201).json(credential);
});

export default router;
