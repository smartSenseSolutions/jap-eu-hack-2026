"use strict";
/**
 * VP/VC Processing Service
 * Standards-aligned Verifiable Presentation and Credential processing.
 * Uses real RSA cryptographic signing (JWT) and verification — no mocks.
 *
 * Signing: VCs are signed as vc+jwt by the issuer's private key.
 *          VPs are signed as vp+jwt by the holder's private key.
 * Verification: VP/VC JWTs are verified using the signer's public key.
 *
 * Each entity (TATA Motors, users) gets a persistent RSA keypair.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicKeyForDid = getPublicKeyForDid;
exports.signVC = signVC;
exports.verifyVCJwt = verifyVCJwt;
exports.createVerifiablePresentation = createVerifiablePresentation;
exports.parseVP = parseVP;
exports.extractCredentials = extractCredentials;
exports.validateVP = validateVP;
exports.buildOwnershipVC = buildOwnershipVC;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
// --------------- Key Management ---------------
const KEYS_DIR = path_1.default.join(__dirname, '../../.keys');
/**
 * Get or generate a persistent RSA keypair for an entity.
 * Keys are stored at .keys/{entityId}-private.pem and .keys/{entityId}-public.pem
 */
function getOrCreateKeyPair(entityId) {
    const privPath = path_1.default.join(KEYS_DIR, `${entityId}-private.pem`);
    const pubPath = path_1.default.join(KEYS_DIR, `${entityId}-public.pem`);
    if (fs_1.default.existsSync(privPath) && fs_1.default.existsSync(pubPath)) {
        return {
            privateKey: fs_1.default.readFileSync(privPath, 'utf-8'),
            publicKey: fs_1.default.readFileSync(pubPath, 'utf-8'),
        };
    }
    // Generate new keypair
    const { publicKey, privateKey } = crypto_1.default.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    if (!fs_1.default.existsSync(KEYS_DIR))
        fs_1.default.mkdirSync(KEYS_DIR, { recursive: true });
    fs_1.default.writeFileSync(privPath, privateKey, { mode: 0o600 });
    fs_1.default.writeFileSync(pubPath, publicKey);
    console.log(`[VP-Processor] Generated keypair for ${entityId}`);
    return { privateKey, publicKey };
}
// Entity key aliases
const ISSUER_ENTITY = 'tata-motors'; // Manufacturer signs VCs
const HOLDER_PREFIX = 'holder-'; // Each user gets a keypair
function getIssuerKeys() {
    return getOrCreateKeyPair(ISSUER_ENTITY);
}
function getHolderKeys(holderId) {
    return getOrCreateKeyPair(`${HOLDER_PREFIX}${holderId}`);
}
/**
 * Get the public key for any known entity DID.
 * Used by verifiers to verify signatures.
 */
function getPublicKeyForDid(did) {
    if (did === 'did:eu-dataspace:company-tata-001') {
        return getIssuerKeys().publicKey;
    }
    if (did.startsWith('did:smartsense:')) {
        const userId = did.replace('did:smartsense:', '');
        const pubPath = path_1.default.join(KEYS_DIR, `${HOLDER_PREFIX}${userId}-public.pem`);
        if (fs_1.default.existsSync(pubPath)) {
            return fs_1.default.readFileSync(pubPath, 'utf-8');
        }
    }
    return null;
}
// --------------- VC Signing (Issuer) ---------------
/**
 * Sign a VC as a JWT (vc+jwt format per VC-JOSE-COSE spec).
 * The issuer (TATA Motors) signs with its private key.
 */
function signVC(vcPayload, issuerDid) {
    const keys = getIssuerKeys();
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        ...vcPayload,
        iss: issuerDid,
        sub: vcPayload.credentialSubject?.ownerDid || issuerDid,
        nbf: now,
        exp: now + 365 * 24 * 3600, // 1 year
        iat: now,
        jti: vcPayload.id || `urn:uuid:${(0, uuid_1.v4)()}`,
    };
    return jsonwebtoken_1.default.sign(payload, keys.privateKey, {
        algorithm: 'RS256',
        header: {
            alg: 'RS256',
            typ: 'vc+jwt',
            kid: `${issuerDid}#key-1`,
        },
    });
}
/**
 * Verify a VC JWT and return the decoded payload.
 */
function verifyVCJwt(vcJwt, issuerPublicKey) {
    const decoded = jsonwebtoken_1.default.verify(vcJwt, issuerPublicKey, {
        algorithms: ['RS256'],
    });
    return decoded;
}
// --------------- VP Creation (Holder/Wallet) ---------------
/**
 * Create and sign a Verifiable Presentation as JWT.
 * The holder signs with their private key, binding the VCs to the presentation.
 */
function createVerifiablePresentation(holderDid, credentials, options = {}) {
    const holderId = holderDid.replace('did:smartsense:', '');
    const keys = getHolderKeys(holderId);
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);
    // Sign embedded VCs with issuer key if they don't already have JWTs
    const signedCredentials = credentials.map(vc => {
        if (vc._jwt)
            return vc; // Already signed
        const issuerDid = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id || 'did:eu-dataspace:company-tata-001';
        const vcJwt = signVC({
            '@context': vc['@context'],
            type: vc.type,
            id: vc.id,
            issuer: vc.issuer,
            issuanceDate: vc.issuanceDate,
            credentialSubject: vc.credentialSubject,
        }, issuerDid);
        return {
            ...vc,
            _jwt: vcJwt,
            proof: {
                type: 'JsonWebSignature2020',
                created: vc.issuanceDate,
                proofPurpose: 'assertionMethod',
                verificationMethod: `${issuerDid}#key-1`,
                jws: vcJwt,
            },
        };
    });
    // Create VP JWT payload
    const vpPayload = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: holderDid,
        verifiableCredential: signedCredentials.map(vc => ({
            '@context': vc['@context'],
            type: vc.type,
            id: vc.id,
            issuer: vc.issuer,
            issuanceDate: vc.issuanceDate,
            credentialSubject: vc.credentialSubject,
            proof: vc.proof,
        })),
        nonce: options.challenge,
        domain: options.domain,
        iss: holderDid,
        sub: holderDid,
        aud: options.domain,
        nbf: nowSec,
        exp: nowSec + 3600, // 1 hour
        iat: nowSec,
        jti: `urn:uuid:${(0, uuid_1.v4)()}`,
    };
    // Sign the VP with holder's private key
    const vpJwt = jsonwebtoken_1.default.sign(vpPayload, keys.privateKey, {
        algorithm: 'RS256',
        header: {
            alg: 'RS256',
            typ: 'vp+jwt',
            kid: `${holderDid}#key-1`,
        },
    });
    // Build the VP object with real cryptographic proof
    const vp = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/security/suites/jws-2020/v1',
        ],
        type: ['VerifiablePresentation'],
        holder: holderDid,
        verifiableCredential: signedCredentials,
        proof: {
            type: 'JsonWebSignature2020',
            created: now.toISOString(),
            challenge: options.challenge,
            domain: options.domain,
            proofPurpose: 'authentication',
            verificationMethod: `${holderDid}#key-1`,
            jws: vpJwt,
        },
        _jwt: vpJwt,
    };
    return vp;
}
// --------------- VP Parsing ---------------
function parseVP(input) {
    let vp;
    if (typeof input === 'string') {
        // Try as JSON first
        try {
            vp = JSON.parse(input);
        }
        catch {
            // Could be a JWT string — try to decode
            try {
                const decoded = jsonwebtoken_1.default.decode(input, { complete: true });
                if (decoded && typeof decoded.payload === 'object') {
                    vp = decoded.payload;
                    vp._jwt = input;
                }
                else {
                    throw new Error('VP is not valid JSON or JWT');
                }
            }
            catch {
                throw new Error('VP is not valid JSON or JWT');
            }
        }
    }
    else {
        vp = input;
    }
    // Structure validation
    if (!vp['@context'] || !Array.isArray(vp['@context'])) {
        throw new Error('VP missing @context');
    }
    if (!vp.type || !vp.type.includes('VerifiablePresentation')) {
        throw new Error('VP missing type VerifiablePresentation');
    }
    if (!vp.holder || typeof vp.holder !== 'string') {
        throw new Error('VP missing holder');
    }
    if (!vp.verifiableCredential || !Array.isArray(vp.verifiableCredential) || vp.verifiableCredential.length === 0) {
        throw new Error('VP contains no verifiable credentials');
    }
    return vp;
}
// --------------- VC Extraction ---------------
function extractCredentials(vp) {
    return vp.verifiableCredential.map(vc => {
        const issuerStr = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id;
        const issuerName = typeof vc.issuer === 'object' ? vc.issuer?.name : undefined;
        return {
            type: vc.type,
            issuer: issuerStr || 'unknown',
            issuerName,
            subject: vc.credentialSubject,
            issuanceDate: vc.issuanceDate,
            expirationDate: vc.expirationDate,
            id: vc.id,
        };
    });
}
// --------------- VP Validation (with real crypto) ---------------
function validateVP(vp, options = {}) {
    const errors = [];
    const warnings = [];
    const credentials = extractCredentials(vp);
    let cryptoVerified = false;
    // 1. Proof presence
    if (!vp.proof) {
        errors.push('VP has no proof');
    }
    // 2. Cryptographic signature verification (REAL)
    if (vp.proof?.jws) {
        const holderPubKey = getPublicKeyForDid(vp.holder);
        if (holderPubKey) {
            try {
                jsonwebtoken_1.default.verify(vp.proof.jws, holderPubKey, { algorithms: ['RS256'] });
                cryptoVerified = true;
            }
            catch (err) {
                errors.push(`VP signature verification failed: ${err.message}`);
            }
        }
        else {
            warnings.push(`Could not resolve public key for holder ${vp.holder} — structural validation only`);
        }
    }
    else if (vp.proof) {
        warnings.push('VP proof has no JWS — cannot perform cryptographic verification');
    }
    // 3. Verify embedded VC signatures
    for (const vc of vp.verifiableCredential) {
        if (vc.proof?.jws) {
            const issuerDid = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id;
            if (issuerDid) {
                const issuerPubKey = getPublicKeyForDid(issuerDid);
                if (issuerPubKey) {
                    try {
                        jsonwebtoken_1.default.verify(vc.proof.jws, issuerPubKey, { algorithms: ['RS256'] });
                    }
                    catch (err) {
                        errors.push(`VC signature verification failed for ${vc.id || vc.type.join(',')}: ${err.message}`);
                    }
                }
            }
        }
    }
    // 4. Challenge/nonce match
    if (options.expectedChallenge && vp.proof?.challenge !== options.expectedChallenge) {
        errors.push(`Challenge mismatch: expected ${options.expectedChallenge}, got ${vp.proof?.challenge}`);
    }
    // 5. Domain match
    if (options.expectedDomain && vp.proof?.domain !== options.expectedDomain) {
        warnings.push(`Domain mismatch: expected ${options.expectedDomain}, got ${vp.proof?.domain}`);
    }
    // 6. Credential type check
    if (options.expectedCredentialTypes && options.expectedCredentialTypes.length > 0) {
        const hasExpected = credentials.some(c => options.expectedCredentialTypes.some(et => c.type.includes(et)));
        if (!hasExpected) {
            errors.push(`None of the credentials match expected types: ${options.expectedCredentialTypes.join(', ')}`);
        }
    }
    // 7. Issuer check
    if (options.expectedIssuer) {
        const matchesIssuer = credentials.some(c => c.issuer === options.expectedIssuer);
        if (!matchesIssuer) {
            warnings.push(`No credential issued by expected issuer: ${options.expectedIssuer}`);
        }
    }
    // 8. Expiry check
    if (options.checkExpiry !== false) {
        const now = new Date();
        for (const cred of credentials) {
            if (cred.expirationDate && new Date(cred.expirationDate) < now) {
                errors.push(`Credential ${cred.id || cred.type.join(',')} has expired`);
            }
        }
    }
    // 9. Holder-subject match for vehicle
    if (options.checkHolderSubjectMatch !== false && options.vehicleVin) {
        const ownershipCred = credentials.find(c => c.type.includes('OwnershipVC'));
        if (ownershipCred) {
            if (ownershipCred.subject.vin !== options.vehicleVin) {
                errors.push(`OwnershipVC VIN (${ownershipCred.subject.vin}) does not match requested VIN (${options.vehicleVin})`);
            }
            const subjectId = ownershipCred.subject.ownerId || ownershipCred.subject.holderId;
            const holderIdPart = vp.holder.split(':').pop();
            if (subjectId && holderIdPart && String(subjectId) !== holderIdPart) {
                warnings.push(`Holder DID (${vp.holder}) may not match credential subject (${subjectId})`);
            }
        }
    }
    // 10. Freshness check
    if (vp.proof?.created) {
        const proofAge = Date.now() - new Date(vp.proof.created).getTime();
        const maxAge = 60 * 60 * 1000; // 1 hour
        if (proofAge > maxAge) {
            errors.push('VP proof is older than 1 hour');
        }
        if (proofAge < 0) {
            warnings.push('VP proof timestamp is in the future');
        }
    }
    return {
        valid: errors.length === 0,
        holder: vp.holder,
        credentials,
        errors,
        warnings,
        cryptoVerified,
    };
}
// --------------- VC Builder ---------------
function buildOwnershipVC(ownerId, vin, carData, issuerDid) {
    const vcId = `urn:uuid:${(0, uuid_1.v4)()}`;
    const issuanceDate = new Date().toISOString();
    const vc = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/catenax/vehicle/v1',
        ],
        type: ['VerifiableCredential', 'OwnershipVC'],
        id: vcId,
        issuer: {
            id: issuerDid,
            name: 'TATA Motors Limited',
        },
        issuanceDate,
        credentialSubject: {
            ownerId,
            ownerDid: `did:smartsense:${ownerId}`,
            vin,
            make: carData.make,
            model: carData.model,
            year: carData.year,
            variant: carData.variant,
            vehicleRegistryEndpoint: `${process.env.APP_BASE_URL || 'http://localhost:8000'}/api/vehicle-registry/vehicles/${vin}`,
            issuedBy: issuerDid,
        },
    };
    // Sign the VC with the issuer's real private key
    const vcJwt = signVC({
        '@context': vc['@context'],
        type: vc.type,
        id: vc.id,
        issuer: vc.issuer,
        issuanceDate: vc.issuanceDate,
        credentialSubject: vc.credentialSubject,
    }, issuerDid);
    vc.proof = {
        type: 'JsonWebSignature2020',
        created: issuanceDate,
        proofPurpose: 'assertionMethod',
        verificationMethod: `${issuerDid}#key-1`,
        jws: vcJwt,
    };
    vc._jwt = vcJwt;
    return vc;
}
