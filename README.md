# EU-JAP Hack 2026 — Decentralized Vehicle Dataspace

A multi-portal decentralized dataspace platform for vehicle lifecycle management. Built on W3C Verifiable Credentials, Gaia-X compliance, Eclipse Dataspace Connectors (EDC), and OpenID4VP presentation flows — enabling cross-border, consent-driven vehicle data sharing between manufacturers, insurers, and vehicle owners.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Portal Applications](#portal-applications)
- [Technical Flows](#technical-flows)
  - [Flow 1: Vehicle Purchase & Credential Issuance](#flow-1-vehicle-purchase--credential-issuance)
  - [Flow 2: OpenID4VP Insurance Verification](#flow-2-openid4vp-insurance-verification)
  - [Flow 3: EDC Sovereign Data Negotiation](#flow-3-edc-sovereign-data-negotiation)
  - [Flow 4: Gaia-X Compliance Verification](#flow-4-gaia-x-compliance-verification)
  - [Flow 5: Consent-Based Data Access (Legacy)](#flow-5-consent-based-data-access-legacy)
- [Standards & Specifications](#standards--specifications)
- [Cryptographic Implementation](#cryptographic-implementation)
- [DID Resolution Architecture](#did-resolution-architecture)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Docker & Deployment](#docker--deployment)
- [Project Structure](#project-structure)

---

## Architecture Overview

```
                          ┌─────────────────────┐
                          │   Keycloak (8080)    │
                          │   OIDC / OAuth2      │
                          └──────────┬──────────┘
                                     │ JWT tokens
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
    ┌────┴────┐  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
    │Dataspace│  │  TATA   │  │  TATA   │  │  Wallet │  │Insurance│  │Company │
    │  Portal │  │  Admin  │  │  Public │  │  Portal │  │  Portal │  │Registry│
    │  :3001  │  │  :3002  │  │  :3003  │  │  :3004  │  │  :3005  │  │  :3006 │
    └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
         │            │            │            │            │            │
         └────────────┴────────────┴─────┬──────┴────────────┴────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │  Backend API (:8000) │
                              │  Express + Prisma    │
                              └──┬───┬───┬───┬───┬──┘
                                 │   │   │   │   │
              ┌──────────────────┘   │   │   │   └──────────────────┐
              │                      │   │   │                      │
     ┌────────┴──────┐  ┌───────────┴┐  │  ┌┴───────────┐  ┌──────┴────────┐
     │ VP Processor   │  │DID Resolver│  │  │EDC Consumer│  │ Gaia-X Suite  │
     │ (RSA signing)  │  │(did:web +  │  │  │(7-step     │  │ (Orchestrator │
     │ VC-JOSE-COSE   │  │ did:eu-ds) │  │  │ negotiation│  │  VP Signer    │
     └────────────────┘  └────────────┘  │  │ SSE stream)│  │  VC Builder)  │
                                         │  └────────────┘  └───────┬───────┘
                                         │                          │
                               ┌─────────┴──┐             ┌────────┴────────┐
                               │ PostgreSQL  │             │  External APIs   │
                               │   :5432     │             │  - GXDCH Notary │
                               └─────────────┘             │  - GXDCH Comply │
                                                           │  - walt.id      │
                                                           │  - EDC Tractus-X│
                                                           └─────────────────┘
```

**Key Participants:**
- **TATA Motors** — Vehicle manufacturer, issues OwnershipVCs, hosts Digital Product Passports, operates EDC provider connector
- **Digit Insurance** — Insurance verifier, requests VPs via OpenID4VP, calculates premiums from DPP data
- **Mario Sanchez** — Vehicle owner, holds credentials in SmartSense Wallet, presents VPs
- **EU APAC Dataspace** — Registry operator, manages organizational trust via Gaia-X compliance

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | Keycloak 26.0, OIDC via `react-oidc-context` |
| Crypto | `jsonwebtoken` (RS256), `crypto` (RSA-2048 keypairs) |
| Credentials | walt.id (OID4VCI issuance), W3C VC Data Model v1/v2 |
| Dataspace | Eclipse Dataspace Connector (Tractus-X), ODRL policies |
| Trust | Gaia-X GXDCH (Notary + Compliance), did:web resolution |
| Infra | Docker, Helm, HAProxy Ingress, cert-manager (Let's Encrypt) |

---

## Applications

| Application | Port | Description |
|---|---|---|
| **Backend API** | 8000 | Express.js API with Prisma ORM, Gaia-X compliance, EDC integration |
| **Portal Dataspace** | 3001 | Organization registry, Gaia-X credential management |
| **Portal TATA Admin** | 3002 | Fleet management, vehicle DPP creation, inventory |
| **Portal TATA Public** | 3003 | Digital showroom, car marketplace for buyers |
| **Portal Wallet** | 3004 | Digital identity wallet, credential storage, DPP viewer |
| **Portal Insurance** | 3005 | Smart vehicle coverage, consent-based data access |
| **Portal Company** | 3006 | Company directory, organization credential viewer |
| **Keycloak** | 8080 | OAuth2/OIDC identity provider |
| **Walt.id Wallet API** | 7001 | SSI wallet for Verifiable Credentials |
| **Walt.id Issuer API** | 7002 | OID4VCI credential issuance |
| **Walt.id Verifier API** | 7003 | OID4VP credential verification |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- ngrok (for Gaia-X did:web resolution and EDC callbacks)

### 1. Start infrastructure

```bash
docker compose up keycloak waltid-wallet-api waltid-issuer-api waltid-verifier-api postgres -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 4. Start all services

```bash
npm run dev             # Starts backend + all 6 portals concurrently
```

Or start individually:
```bash
npm run dev:backend     # Backend API on :8000
npm run dev:dataspace   # Dataspace Portal on :3001
npm run dev:admin       # TATA Admin on :3002
npm run dev:public      # TATA Public on :3003
npm run dev:wallet      # SmartSense Wallet on :3004
npm run dev:insurance   # Insurance Portal on :3005
npm run dev:company     # Company Registry on :3006
```

### 5. Login credentials

| Portal | Port | Role | Username | Password |
|--------|------|------|----------|----------|
| TATA Motors Admin | 3002 | admin | tata-admin | tata-admin |
| TATA Motors Public | 3003 | customer | mario-sanchez | mario |
| SmartSense Wallet | 3004 | customer | mario-sanchez | mario |
| Digit Insurance | 3005 | insurance_agent | digit-agent | digit |
| Dataspace Portal | 3001 | company_admin | company-admin | company |
| Company Registry | 3006 | company_admin | company-admin | company |

> **Note:** Set `AUTH_ENABLED=false` in `backend/.env` to bypass Keycloak for development. The backend will accept unauthenticated requests with mock user context.

---

## Portal Applications

### 1. EU APAC Dataspace Portal (`:3001`)
Organization registry and Gaia-X credential management. Register organizations with VAT/EORI/CIN identifiers, trigger Gaia-X compliance verification, and manage the trust framework.

### 2. TATA Motors Admin (`:3002`)
Fleet and Digital Product Passport management. Create vehicles, manage DPP data (condition, damage history, service records, emissions), and view the vehicle registry.

### 3. TATA Motors Public Showroom (`:3003`)
Public vehicle marketplace. Browse available vehicles, view DPPs, and purchase vehicles. On purchase, an **OwnershipVC** is issued to the buyer's wallet.

### 4. SmartSense Wallet (`:3004`)
Digital credential wallet for vehicle owners. View held credentials (SelfVC, OwnershipVC, InsuranceVC), manage consent requests, generate Verifiable Presentations, and view Digital Product Passports.

### 5. Digit Insurance Portal (`:3005`)
Insurance underwriting portal. Initiate VP-based ownership verification via OpenID4VP, view the 7-step verification pipeline, calculate premiums from DPP data, and issue insurance policies.

### 6. Company Registry (`:3006`)
Organization directory. Browse registered organizations and verify their Gaia-X compliance credentials.

---

## Technical Flows

### Flow 1: Vehicle Purchase & Credential Issuance

**Actors:** Mario (buyer) on Public Showroom, TATA Motors (issuer)

```
Public Showroom (:3003)                  Backend (:8000)                    Wallet (:3004)
       │                                      │                                  │
       │  POST /api/purchases                 │                                  │
       │  { userId, vin }                     │                                  │
       ├─────────────────────────────────────>│                                  │
       │                                      │  1. Find car by VIN              │
       │                                      │  2. Create OwnershipVC           │
       │                                      │     - issuer: TATA Motors        │
       │                                      │     - subject: { vin, make,      │
       │                                      │       model, ownerDid }          │
       │                                      │  3. Store credential in DB       │
       │                                      │  4. Add to user's wallet         │
       │                                      │  5. Mark car as "sold"           │
       │                                      │  6. Issue via walt.id OID4VCI    │
       │                                      │     (non-blocking)               │
       │  { purchase, credential }            │                                  │
       │<─────────────────────────────────────│                                  │
       │                                      │                                  │
       │  Shows "Car ID" URL:                 │                                  │
       │  /api/vehicle-registry/vehicles/{vin}│       Credential appears         │
       │                                      │       in wallet on refresh       │
```

**What gets created:**
- `OwnershipVC` credential in `credentials` table
- Entry in `wallet_credentials` join table
- `purchase` record in `purchases` table
- Car `status` set to `sold`, `ownerId` set to buyer

**Car ID:** Each vehicle gets a resolvable URL (`http://localhost:8000/api/vehicle-registry/vehicles/{vin}`) — this is the manufacturer-hosted, owner-controlled digital identity of the vehicle.

---

### Flow 2: OpenID4VP Insurance Verification

**Actors:** Digit Insurance (verifier), Mario (holder/prover), TATA Motors (issuer/manufacturer)

This is the core VP flow — a 4-screen frontend flow backed by a 7-step server-side verification pipeline.

#### Step-by-step:

```
Insurance Portal (:3005)        Backend (:8000)           Wallet (:3004)        TATA Manufacturer
       │                              │                        │                      │
  ┌────┴────┐                         │                        │                      │
  │Screen 1 │  Enter VIN              │                        │                      │
  │         │  "Request Ownership     │                        │                      │
  │         │   Proof"                │                        │                      │
  └────┬────┘                         │                        │                      │
       │                              │                        │                      │
       │  POST /api/verifier/         │                        │                      │
       │    presentation-request      │                        │                      │
       ├─────────────────────────────>│                        │                      │
       │                              │  Creates:              │                      │
       │                              │  - PresentationRequest │                      │
       │                              │    (nonce, purpose,    │                      │
       │                              │     expectedTypes)     │                      │
       │                              │  - PresentationSession │                      │
       │                              │    (7 pending steps)   │                      │
       │  { id, sessionId, nonce,     │                        │                      │
       │    qrPayload, deepLink }     │                        │                      │
       │<─────────────────────────────│                        │                      │
       │                              │                        │                      │
  ┌────┴────┐                         │                        │                      │
  │Screen 2 │  Shows:                 │                        │                      │
  │         │  - "Open in Wallet"     │                        │                      │
  │         │    link to :3004        │                        │                      │
  │         │  - Nonce (copyable)     │                        │                      │
  │         │  - VP paste field       │                        │                      │
  │         │  Polls session status   │                        │                      │
  └────┬────┘                         │                        │                      │
       │                              │                   ┌────┴────┐                 │
       │                              │                   │ Wallet  │                 │
       │                              │                   │ User    │                 │
       │                              │                   │ clicks  │                 │
       │                              │                   │"Generate│                 │
       │                              │                   │  VP"    │                 │
       │                              │                   │ enters  │                 │
       │                              │                   │ nonce   │                 │
       │                              │                   └────┬────┘                 │
       │                              │                        │                      │
       │                              │  POST /api/wallet-vp/  │                      │
       │                              │    generate-vp         │                      │
       │                              │  { userId,             │                      │
       │                              │    credentialIds,      │                      │
       │                              │    challenge: nonce,   │                      │
       │                              │    domain }            │                      │
       │                              │<───────────────────────│                      │
       │                              │                        │                      │
       │                              │  1. Fetch OwnershipVC  │                      │
       │                              │     from DB            │                      │
       │                              │  2. formatAsW3CVC()    │                      │
       │                              │     - Sign VC with     │                      │
       │                              │       TATA's RSA key   │                      │
       │                              │       (vc+jwt)         │                      │
       │                              │  3. createVerifiable   │                      │
       │                              │     Presentation()     │                      │
       │                              │     - Sign VP with     │                      │
       │                              │       holder's RSA key │                      │
       │                              │       (vp+jwt)         │                      │
       │                              │     - Embed challenge  │                      │
       │                              │       nonce + domain   │                      │
       │                              │                        │                      │
       │                              │  { vp (signed JSON) }  │                      │
       │                              │────────────────────────>│                      │
       │                              │                        │                      │
       │                              │                   User copies VP              │
       │                              │                   from modal, pastes          │
       │                              │                   in insurance portal         │
       │                              │                        │                      │
       │  POST /api/verifier/callback │                        │                      │
       │  { requestId, vpToken }      │                        │                      │
       ├─────────────────────────────>│                        │                      │
       │                              │                        │                      │
       │  { sessionId, status:        │  ═══════════════════════════════════════      │
       │    "processing" }            │  ║  7-STEP ASYNC PIPELINE (processVPAsync) ║  │
       │<─────────────────────────────│  ═══════════════════════════════════════      │
       │                              │                        │                      │
       │  Polls GET /api/verifier/    │  Step 1: Parse VP      │                      │
       │    session/{id}              │    parseVP(vpToken)     │                      │
       │    every 1.5s                │    → holder, creds,    │                      │
       │                              │      proof             │                      │
  ┌────┴────┐                         │                        │                      │
  │Screen 3 │                         │  Step 2: Extract VCs   │                      │
  │ 7-step  │                         │    extractCredentials() │                      │
  │ stepper │                         │    → OwnershipVC,      │                      │
  │ with    │                         │      issuer, VIN       │                      │
  │ live    │                         │                        │                      │
  │ status  │                         │  Step 3: Validate VP   │                      │
  │ badges  │                         │    validateVP()        │                      │
  │         │                         │    → JWT sig verify    │                      │
  │         │                         │      (RS256)           │                      │
  │         │                         │    → Challenge nonce   │                      │
  │         │                         │    → Credential types  │                      │
  │         │                         │    → VIN match         │                      │
  │         │                         │    → Expiry + freshness│                      │
  │         │                         │                        │                      │
  │         │                         │  Step 4: Resolve DID   │                      │
  │         │                         │    resolveDid(issuer)  │                      │
  │         │                         │    → DID document with │                      │
  │         │                         │      service endpoints │                      │
  │         │                         │                        │                      │
  │         │                         │  Step 5: Discover      │                      │
  │         │                         │    Endpoints           │                      │
  │         │                         │    selectEndpoint(     │                      │
  │         │                         │     VehicleInsurance   │                      │
  │         │                         │     DataService)       │                      │
  │         │                         │    → /vehicles/{vin}/  │                      │
  │         │                         │      insurance-data-vp │                      │
  │         │                         │                        │                      │
  │         │                         │  Step 6: Call Mfr      │                      │
  │         │                         │    POST resolved URL   │                      │
  │         │                         │    with VP included    ├─────────────────────>│
  │         │                         │                        │  Manufacturer:       │
  │         │                         │                        │  1. parseVP()        │
  │         │                         │                        │  2. extractCreds()   │
  │         │                         │                        │  3. validateVP()     │
  │         │                         │                        │  4. Check owner      │
  │         │                         │                        │     matches car      │
  │         │                         │                        │  5. Return vehicle   │
  │         │                         │   vehicleData (DPP,    │     data + DPP      │
  │         │                         │   condition, damage)   │<─────────────────────│
  │         │                         │                        │                      │
  │         │                         │  Step 7: Data received │                      │
  │         │                         │    Store vehicleData   │                      │
  │         │                         │    Session → completed │                      │
  └────┬────┘                         │                        │                      │
       │                              │                        │                      │
  ┌────┴────┐                         │                        │                      │
  │Screen 4 │  Insurance Quote        │                        │                      │
  │         │  - Vehicle condition    │                        │                      │
  │         │  - Damage history       │                        │                      │
  │         │  - Premium breakdown    │                        │                      │
  │         │  - Issue policy         │                        │                      │
  └─────────┘                         │                        │                      │
```

#### QR Payload (OpenID4VP Authorization Request)

```json
{
  "type": "openid4vp-authorization-request",
  "client_id": "did:eu-dataspace:company-digit-001",
  "client_metadata": { "client_name": "Digit Insurance" },
  "nonce": "uuid-v4",
  "presentation_definition": {
    "id": "request-uuid",
    "input_descriptors": [{
      "id": "ownership_vc",
      "name": "Vehicle Ownership Credential",
      "constraints": {
        "fields": [
          { "path": ["$.type"], "filter": { "type": "array", "contains": { "const": "OwnershipVC" } } },
          { "path": ["$.credentialSubject.vin"], "optional": false }
        ]
      }
    }]
  },
  "response_uri": "http://localhost:8000/api/verifier/callback",
  "response_type": "vp_token",
  "response_mode": "direct_post"
}
```

#### Premium Calculation

After VP verification, the DPP data feeds into transparent premium calculation:

```
Base Premium:                      €800 (fixed)
+ Damage Adjustment:               €120 × incident count
+ Age Adjustment:                   €30 × (years - 3)  if age > 3
+ Condition Adjustment:
    if overallRating < 8:          +€80 × (8 - rating)
    if overallRating > 8:          -€30 × (rating - 8)
+ Battery Health (EV only):
    if battery < 80%:              +€5 × (80 - battery%)
    if battery > 90%:              -€50
─────────────────────────────────────────────────
= Annual Premium                   (minimum €600)
```

---

### Flow 3: EDC Sovereign Data Negotiation

**Actors:** Digit Insurance (consumer connector), TATA Motors (provider connector)

The EDC flow uses the Eclipse Dataspace Connector protocol for sovereign data exchange with ODRL policy enforcement. Progress is streamed via Server-Sent Events (SSE).

```
Insurance Portal         Backend (:8000)              Consumer EDC              Provider EDC
       │                      │                     (Tractus-X)               (TATA Motors)
       │  POST /api/edc/      │                          │                          │
       │   negotiate           │                          │                          │
       │  { vin, stream:true } │                          │                          │
       ├──────────────────────>│                          │                          │
       │                       │                          │                          │
       │  SSE stream opens     │  Step 1: Query Catalog   │                          │
       │  ◄─ step event        │  POST /v3/catalog/request│                          │
       │                       ├─────────────────────────>│  DSP protocol            │
       │                       │                          ├─────────────────────────>│
       │                       │  { assetId, offerId }    │  DCAT catalog response   │
       │                       │<─────────────────────────│<─────────────────────────│
       │                       │                          │                          │
       │  ◄─ step event        │  Step 2: Contract Neg    │                          │
       │                       │  POST /v3/contract       │                          │
       │                       │   negotiations           │                          │
       │                       ├─────────────────────────>│  ODRL offer              │
       │                       │  { negotiationId }       │─────────────────────────>│
       │                       │<─────────────────────────│                          │
       │                       │                          │                          │
       │  ◄─ step event        │  Step 3: Poll Agreement  │                          │
       │                       │  GET /v3/contract        │                          │
       │                       │   negotiations/{id}      │  Bilateral negotiation   │
       │                       │  (poll every 5s, 3x)     │<────────────────────────>│
       │                       ├─────────────────────────>│                          │
       │                       │  { contractAgreementId } │                          │
       │                       │<─────────────────────────│                          │
       │                       │                          │                          │
       │  ◄─ step event        │  Step 4: Init Transfer   │                          │
       │                       │  POST /v3/transfer       │                          │
       │                       │   processes              │  HttpData-PULL           │
       │                       ├─────────────────────────>│─────────────────────────>│
       │                       │  { transferId }          │                          │
       │                       │<─────────────────────────│                          │
       │                       │                          │                          │
       │  ◄─ step event        │  Step 5: Get EDR Entry   │                          │
       │                       │  POST /v3/edrs/request   │                          │
       │                       ├─────────────────────────>│                          │
       │                       │  { transferProcessId }   │                          │
       │                       │<─────────────────────────│                          │
       │                       │                          │                          │
       │  ◄─ step event        │  Step 6: Get Auth Token  │                          │
       │                       │  GET /v2/edrs/{id}/      │                          │
       │                       │   dataaddress            │                          │
       │                       ├─────────────────────────>│                          │
       │                       │  { endpoint, auth token }│                          │
       │                       │<─────────────────────────│                          │
       │                       │                          │                          │
       │  ◄─ step event        │  Step 7: Fetch Data      │                          │
       │                       │  GET {data-plane-url}    │                          │
       │                       │  Authorization: {token}   │       Data Plane         │
       │                       ├─────────────────────────────────────────────────────>│
       │                       │                          │                          │
       │                       │  Vehicle DPP data        │                          │
       │                       │<─────────────────────────────────────────────────────│
       │  ◄─ complete event    │                          │                          │
       │  { vehicleData }      │                          │                          │
       │<──────────────────────│                          │                          │
```

**EDC Configuration** (`.env`):
```bash
EDC_CONSUMER_MANAGEMENT_URL=https://consumer-controlplane.example.com/management
EDC_CONSUMER_API_KEY=your-api-key
# Provider DSP URL and BPNL are now discovered dynamically from the issuer DID document
# DataService entry format: serviceEndpoint = "<DSP_URL>#<BPNL>"
```

---

### Flow 4: Gaia-X Compliance Verification

**Actors:** TATA Motors (participant), GXDCH Lab (notary + compliance), Backend (VP signer)

This is the **only flow that interacts with real external infrastructure**. The backend signs VCs/VPs with a `did:web` DID that is publicly resolvable via ngrok, and the GXDCH compliance service fetches our DID document to verify signatures.

```
Dataspace Portal         Backend (:8000)              GXDCH Notary              GXDCH Compliance
       │                      │                     (lab.gaia-x.eu)           (lab.gaia-x.eu)
       │  POST /api/org-      │                          │                          │
       │   credentials/:id/   │                          │                          │
       │   verify              │                          │                          │
       ├──────────────────────>│                          │                          │
       │                       │                          │                          │
       │                       │  Step 1: Build & Sign    │                          │
       │                       │  LegalParticipantVC      │                          │
       │                       │  (gx:LegalPerson)        │                          │
       │                       │  Sign as vc+jwt with     │                          │
       │                       │  did:web RSA key         │                          │
       │                       │                          │                          │
       │                       │  Step 2: Notary Check    │                          │
       │                       │  GET /v2/registration-   │                          │
       │                       │   numbers/{type}/{id}    │                          │
       │                       ├─────────────────────────>│                          │
       │                       │  Registration Number VC  │  Validates against:      │
       │                       │  (signed JWT from notary)│  EU VIES, GLEIF, etc.    │
       │                       │<─────────────────────────│                          │
       │                       │                          │                          │
       │                       │  Step 3: Build VP with   │                          │
       │                       │  3 VCs (all vc+jwt):     │                          │
       │                       │  1. LegalParticipantVC   │                          │
       │                       │  2. RegistrationNumberVC │                          │
       │                       │  3. TermsAndConditionsVC │                          │
       │                       │                          │                          │
       │                       │  Wrap in EnvelopedVC     │                          │
       │                       │  format, sign as vp+jwt  │                          │
       │                       │  with x5c cert chain     │                          │
       │                       │                          │                          │
       │                       │  Step 4: Submit VP-JWT   │                          │
       │                       │  POST /api/credential-   │                          │
       │                       │   offers/standard-       │                          │
       │                       │   compliance             │                          │
       │                       │  Content-Type:           │                          │
       │                       │   application/vp+jwt     │                          │
       │                       ├──────────────────────────────────────────────────────>│
       │                       │                          │  GXDCH:                  │
       │                       │                          │  1. Decode VP-JWT        │
       │                       │                          │  2. Fetch did:web DID    │
       │                       │                          │     document from our    │
       │                       │                          │     ngrok URL            │
       │                       │                          │  3. Verify VP signature  │
       │                       │                          │  4. JSON-LD expansion    │
       │                       │                          │  5. SHACL shape          │
       │                       │                          │     validation           │
       │                       │  ComplianceCredential    │  6. Issue compliance     │
       │                       │  (201 Created)           │     credential           │
       │                       │<──────────────────────────────────────────────────────│
       │                       │                          │                          │
       │  { verified, VCs }    │  Step 5: Store results   │                          │
       │<──────────────────────│                          │                          │
```

**Key point about JSON-LD:** We don't run a JSON-LD processor. We structure our VCs with the correct `@context` URIs (`https://www.w3.org/ns/credentials/v2`, `https://w3id.org/gaia-x/development#`) and the GXDCH compliance service performs JSON-LD expansion and SHACL validation on their side.

**Key point about DID resolution:** The Gaia-X flow uses `did:web` (a registered W3C DID method). Our backend hosts the DID document at `/.well-known/did.json` and `/:path/did.json`, exposed publicly via ngrok. When GXDCH receives our VP-JWT, it resolves our DID by fetching this document to get our public key for signature verification.

**DID Document served at `/.well-known/did.json`:**
```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/jws-2020/v1"],
  "id": "did:web:{ngrok-domain}:{path}",
  "verificationMethod": [{
    "id": "did:web:{ngrok-domain}:{path}#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:web:{ngrok-domain}:{path}",
    "publicKeyJwk": { "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256" }
  }],
  "authentication": ["did:web:{ngrok-domain}:{path}#key-1"],
  "assertionMethod": ["did:web:{ngrok-domain}:{path}#key-1"]
}
```

---

### Flow 5: Consent-Based Data Access (Legacy)

The older consent flow where the insurance agent requests data access and the vehicle owner approves/denies in their wallet. This has been superseded by the VP flow (Flow 2) but remains available at `/legacy` in the insurance portal.

```
Insurance Portal         Backend             Wallet (polling)         Vehicle Owner
       │                    │                      │                      │
       │  POST /consent/    │                      │                      │
       │   request          │                      │                      │
       ├───────────────────>│  Store consent       │                      │
       │                    │  (status: pending)   │                      │
       │                    │                      │                      │
       │                    │                      │  GET /consent/       │
       │                    │                      │   pending/{userId}   │
       │                    │                      │  (every 3s)         │
       │                    │                      │<─────────────────────│
       │                    │                      │                      │
       │                    │                      │  Shows consent modal │
       │                    │                      │  with requester info,│
       │                    │                      │  Car ID, data scope  │
       │                    │                      │                      │
       │                    │  PUT /consent/       │                      │
       │                    │   {id}/approve       │    User approves     │
       │                    │<─────────────────────│<─────────────────────│
       │                    │                      │                      │
       │                    │  Creates access      │                      │
       │                    │  session (1hr TTL)   │                      │
       │                    │  + audit log entry   │                      │
       │                    │                      │                      │
       │  Polls consent     │                      │                      │
       │  status → approved │                      │                      │
       │  Proceeds to       │                      │                      │
       │  data fetch        │                      │                      │
```

---

## Standards & Specifications

| Standard | Implementation | Compliance Level |
|----------|---------------|-----------------|
| **W3C VC Data Model v1** | Core VC/VP structure for vehicle credentials | Spec-compliant |
| **W3C VC Data Model v2** | Used in Gaia-X LegalParticipant VCs | Spec-compliant |
| **VC-JOSE-COSE** | JWT signing with `typ: vc+jwt` / `typ: vp+jwt` headers, RS256 | Spec-compliant |
| **JsonWebSignature2020** | Proof type for all VCs and VPs | Spec-compliant |
| **OpenID4VP** | Presentation request/response structure (simplified) | Inspired, not strict |
| **OID4VCI** | Credential issuance via walt.id | Delegated to walt.id |
| **did:web** | Used for Gaia-X flow, hosted DID document via ngrok | Spec-compliant (W3C registered) |
| **did:eu-dataspace** | Custom DID method for vehicle dataspace entities | Proprietary (hardcoded resolution) |
| **did:smartsense** | Custom DID method for wallet users | Proprietary (hardcoded resolution) |
| **Gaia-X Trust Framework** | LegalParticipant VCs, GXDCH notary + compliance | Real integration (lab environment) |
| **Catena-X CX-0143** | DPP vocabulary context for vehicle data | Vocabulary reference only |
| **IDSA / EDC** | Tractus-X connectors, ODRL policies, DSP protocol | Real integration |
| **JSON-LD** | Context URIs present in all VCs; expansion done by GXDCH | Structural only (no local processor) |

### Two Separate Credential Ecosystems

The project runs **two independent DID/credential systems**:

| Aspect | Gaia-X Flow | Vehicle VP Flow |
|--------|------------|-----------------|
| DID Method | `did:web` (externally resolvable via ngrok) | `did:eu-dataspace` / `did:smartsense` (local lookup) |
| DID Resolution | GXDCH fetches `/.well-known/did.json` | Hardcoded in `did-resolver.ts` |
| JSON-LD Processing | Delegated to GXDCH compliance service | Not performed (context URLs decorative) |
| Signing Keys | Shared RSA key with x5c cert chain | Per-entity RSA keys in `.keys/` |
| Verification | GXDCH verifies signatures externally | `validateVP()` verifies locally |
| VC Types | gx:LegalPerson, gx:Issuer, RegistrationNumber | OwnershipVC, InsuranceVC, SelfVC |

---

## Cryptographic Implementation

All signing uses **real RSA-2048 cryptography** — no mocks.

### Key Management

```
backend/.keys/
├── tata-motors-private.pem          # TATA Motors issuer key (signs VCs)
├── tata-motors-public.pem
├── holder-mario-sanchez-private.pem  # Mario's holder key (signs VPs)
├── holder-mario-sanchez-public.pem
├── gaiax-private.pem                # Gaia-X VP signer key (did:web)
└── gaiax-public.pem
```

Keys are generated on first use via `crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })` and persisted to disk.

### VC Signing (Issuer)

```typescript
// backend/src/services/vp-processor.ts → signVC()
jwt.sign(vcPayload, issuerPrivateKey, {
  algorithm: 'RS256',
  header: { alg: 'RS256', typ: 'vc+jwt', kid: 'did:eu-dataspace:company-tata-001#key-1' }
});
```

### VP Signing (Holder)

```typescript
// backend/src/services/vp-processor.ts → createVerifiablePresentation()
jwt.sign(vpPayload, holderPrivateKey, {
  algorithm: 'RS256',
  header: { alg: 'RS256', typ: 'vp+jwt', kid: 'did:smartsense:mario-sanchez#key-1' }
});
```

### VP Validation

```typescript
// backend/src/services/vp-processor.ts → validateVP()
// 1. Verify VP JWT signature with holder's public key
jwt.verify(vp.proof.jws, holderPublicKey, { algorithms: ['RS256'] });
// 2. Verify embedded VC JWT signatures with issuer's public key
jwt.verify(vc.proof.jws, issuerPublicKey, { algorithms: ['RS256'] });
// 3. Validate challenge nonce, domain, credential types, VIN, expiry, freshness
```

### Gaia-X Signing (VP Signer)

```typescript
// backend/src/services/gaiax/vp-signer.ts
jwt.sign(vpPayload, rsaPrivateKey, {
  algorithm: 'RS256',
  header: { alg: 'RS256', typ: 'vp+jwt', cty: 'vp', kid, x5c: [selfSignedCert] }
});
```

---

## DID Resolution Architecture

### did:web (Gaia-X — externally resolvable)

```
GXDCH compliance service                          Backend (:8000) via ngrok
         │                                              │
         │  Decodes JWT kid header:                     │
         │  did:web:{ngrok-domain}:{path}#key-1         │
         │                                              │
         │  HTTP GET                                    │
         │  https://{ngrok-domain}/{path}/did.json      │
         ├─────────────────────────────────────────────>│
         │                                              │  Serves DID document with
         │  { id, verificationMethod: [{ publicKeyJwk }]│  RSA public key as JWK
         │<─────────────────────────────────────────────│
         │                                              │
         │  Extracts public key → verifies JWT sig      │
```

### did:eu-dataspace / did:smartsense (Vehicle flow — local only)

```typescript
// backend/src/services/did-resolver.ts
// Hardcoded lookup table — no external resolution
resolveDid('did:eu-dataspace:company-tata-001')
→ {
    didDocument: {
      id: 'did:eu-dataspace:company-tata-001',
      service: [
        { type: 'VehicleRegistryService', serviceEndpoint: '{base}/api/vehicle-registry/...' },
        { type: 'VehicleDPPService', serviceEndpoint: '{base}/api/vehicle-registry/...' },
        { type: 'VehicleInsuranceDataService', serviceEndpoint: '{base}/api/.../insurance-data-vp' },
        { type: 'VPVerificationService', serviceEndpoint: '{base}/api/.../verify-vp' },
      ],
      verificationMethod: [{ type: 'JsonWebKey2020', ... }]
    }
  }
```

---

## Data Model

### Database (PostgreSQL + Prisma ORM)

| Table | Purpose | Key Fields |
|-----------|---------|------------|
| `companies` | Registered organizations | id, name, vatId, did, credentialId |
| `credentials` | All Verifiable Credentials | id, type, issuerId, status, credentialSubject |
| `cars` | Vehicle records with DPP | vin, make, model, ownerId, status, dpp |
| `wallets` / `wallet_credentials` | User credential wallets | userId, credentialId (join table) |
| `consents` | Data access consent records | requesterId, userId, vin, status |
| `purchases` | Vehicle purchase records | userId, vin, credentialId |
| `insurance_policies` | Issued insurance policies | policyNumber, vin, premium, credentialId |
| `org_credentials` | Gaia-X org credentials | companyId, vcJwt, verificationStatus, issuedVCs |
| `edc_transactions` | EDC negotiation logs | vin, steps[], status, contractAgreementId |
| `vehicle_audit_log` | Audit trail for vehicle data access | vin, action, actor, timestamp |
| `access_sessions` | Active data access sessions (1hr TTL) | vin, requesterId, consentId |
| `presentation_requests` | OpenID4VP requests | nonce, expectedCredentialTypes, status |
| `presentation_sessions` | VP verification sessions | requestId, steps[7], vehicleData |

### Migrations & Seeding

```bash
cd backend
npx prisma migrate dev        # Create/apply migrations (dev)
npx prisma migrate deploy     # Apply migrations (production)
npx prisma db seed             # Seed demo data
```

### Credential Types

| Type | Issuer | Subject | Purpose |
|------|--------|---------|---------|
| `OwnershipVC` | TATA Motors | Vehicle owner | Proves vehicle ownership (VIN, make, model) |
| `InsuranceVC` | Digit Insurance | Insured person | Insurance policy proof (policy#, premium, coverage) |
| `SelfVC` | EU APAC Dataspace | Individual | Identity credential (name, nationality, email) |
| `gx:LegalPerson` | Self-signed (did:web) | Organization | Gaia-X Legal Participant (legal name, registration#, address) |

---

## API Reference

### Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/verifier/presentation-request` | Yes | Create OpenID4VP presentation request |
| `POST` | `/api/verifier/callback` | No | Submit VP (wallet callback) |
| `GET` | `/api/verifier/session/:id` | No | Poll VP verification session status |
| `POST` | `/api/wallet-vp/generate-vp` | No | Generate signed VP from credentials |
| `GET` | `/api/wallet-vp/credentials/:userId/ownership` | No | Get user's OwnershipVCs |
| `POST` | `/api/edc/negotiate` | Yes | Start 7-step EDC negotiation (SSE) |
| `GET` | `/api/edc/transactions` | No | List EDC transaction history |
| `POST` | `/api/org-credentials` | Yes | Create Gaia-X org credential |
| `POST` | `/api/org-credentials/:id/verify` | Yes | Trigger Gaia-X compliance verification |
| `POST` | `/api/purchases` | Yes | Purchase vehicle, issue OwnershipVC |
| `POST` | `/api/insurance` | Yes | Issue insurance policy + InsuranceVC |
| `POST` | `/api/consent/request` | Yes | Request data access consent |
| `PUT` | `/api/consent/:id/approve` | Yes | Approve consent, create access session |
| `GET` | `/api/wallet/:userId` | Yes | Get wallet with resolved credentials |
| `GET` | `/api/vehicle-registry/vehicles/:vin` | No | Get vehicle data + DPP |
| `POST` | `/api/vehicle-registry/vehicles/:vin/insurance-data-vp` | No | VP-validated insurance data endpoint |

### DID & VC Resolution

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/.well-known/did.json` | did:web DID document (Gaia-X) |
| `GET` | `/:path/did.json` | did:web DID document (alternative path) |
| `GET` | `/api/verifier/did/:did` | Resolve any known DID |
| `GET` | `/vc/:id` | Resolve LegalParticipant VC |
| `GET` | `/vc/:id/lrn` | Resolve Registration Number VC |
| `GET` | `/vc/:id/tandc` | Resolve Terms & Conditions VC |

---

## Configuration

### Environment Variables (`backend/.env`)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/eu_jap_hack

# Auth (set false to bypass Keycloak in dev)
AUTH_ENABLED=false
KEYCLOAK_URL=http://localhost:8080

# Server
APP_BASE_URL=http://localhost:8000     # Or ngrok URL for public access
PORT=8000

# Walt.id (credential services)
WALTID_ISSUER_URL=http://localhost:7002
WALTID_WALLET_URL=http://localhost:7001
WALTID_VERIFIER_URL=http://localhost:7003

# Gaia-X
GAIAX_MOCK_MODE=true                   # true = instant mock, false = real GXDCH
GAIAX_DID_DOMAIN=your-ngrok-domain.ngrok-free.app
GAIAX_DID_PATH=v7
GAIAX_TIMEOUT=15000

# EDC Connectors
ENABLE_EDC=true
EDC_CONSUMER_MANAGEMENT_URL=https://consumer-controlplane.example.com/management
EDC_CONSUMER_API_KEY=your-api-key
# EDC_PARTNER_BPN and EDC_PARTNER_DSP_URL removed — discovered from issuer DID DataService
EDC_NEGOTIATION_INITIAL_DELAY_MS=5000
EDC_NEGOTIATION_POLL_INTERVAL_MS=5000
EDC_NEGOTIATION_MAX_RETRIES=3
```

### Keycloak Roles

| Role | Portal | Description |
|---|---|---|
| `admin` | TATA Admin | Fleet management, vehicle creation |
| `customer` | Public / Wallet | Car purchases, wallet access |
| `insurance_agent` | Insurance | Policy issuance, consent requests |
| `company_admin` | Dataspace / Company | Organization registration, Gaia-X verification |

---

## Docker & Deployment

### Build all images

```bash
./scripts/build-and-push.sh
```

### Build a single image

```bash
./scripts/build-and-push.sh backend
./scripts/build-and-push.sh portal-wallet
```

### Custom tag

```bash
IMAGE_TAG=2.0.0 ./scripts/build-and-push.sh
```

### ECR Repositories

| Repository |
|---|
| `public.ecr.aws/smartsensesolutions/eu-jap-hack/backend` |
| `public.ecr.aws/smartsensesolutions/eu-jap-hack/portal-dataspace` |
| `public.ecr.aws/smartsensesolutions/eu-jap-hack/portal-tata-admin` |
| `public.ecr.aws/smartsensesolutions/eu-jap-hack/portal-tata-public` |
| `public.ecr.aws/smartsensesolutions/eu-jap-hack/portal-wallet` |
| `public.ecr.aws/smartsensesolutions/eu-jap-hack/portal-insurance` |
| `public.ecr.aws/smartsensesolutions/eu-jap-hack/portal-company` |

### Kubernetes (Helm)

Helm chart located at `helm/eu-jap-hack/`.

```bash
helm install eu-jap-hack ./helm/eu-jap-hack -f your-values.yaml
```

Example values:

```yaml
global:
  imageRegistry: "public.ecr.aws/smartsensesolutions"

tls:
  enabled: true
  clusterIssuer: letsencrypt-prod

ingressClassName: haproxy

backend:
  ingress:
    host: api.yourdomain.com
  env:
    DATABASE_URL: "postgresql://user:pass@db-host:5432/eu_jap_hack"

portalDataspace:
  ingress:
    host: dataspace.yourdomain.com
```

Features:
- HAProxy Ingress with TLS (cert-manager / Let's Encrypt)
- Per-service ingress with individual TLS certificates
- ConfigMap-based Walt.id configuration
- Keycloak realm auto-import
- Backend secrets for DATABASE_URL
- No database dependency in chart (external PostgreSQL)

---

## Project Structure

```
eu-jap-hack-2026/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Express server, route mounting, DID doc hosting
│   │   ├── db.ts                       # Prisma client setup
│   │   ├── middleware/
│   │   │   └── auth.ts                 # Keycloak JWT verification, role checks
│   │   ├── routes/
│   │   │   ├── verifier.ts             # OpenID4VP presentation request + 7-step pipeline
│   │   │   ├── wallet-vp.ts            # VP generation from wallet credentials
│   │   │   ├── vehicle-registry.ts     # Vehicle CRUD, DPP, VP-validated endpoints
│   │   │   ├── edc.ts                  # EDC negotiation with SSE streaming
│   │   │   ├── insurance.ts            # Insurance policy issuance
│   │   │   ├── consent.ts              # Consent request/approve/deny
│   │   │   ├── org-credentials.ts      # Gaia-X org credential management
│   │   │   ├── credentials.ts          # VC CRUD and resolution
│   │   │   ├── cars.ts                 # Vehicle management
│   │   │   ├── companies.ts            # Organization registration
│   │   │   ├── wallet.ts               # User wallet management
│   │   │   ├── purchases.ts            # Vehicle purchases + OwnershipVC issuance
│   │   │   └── vc.ts                   # walt.id credential issuance proxy
│   │   ├── services/
│   │   │   ├── vp-processor.ts         # VP/VC signing, parsing, validation (RSA crypto)
│   │   │   ├── did-resolver.ts         # DID resolution + service endpoint discovery
│   │   │   ├── edcConsumerService.ts   # 7-step EDC negotiation orchestration
│   │   │   ├── edcService.ts           # EDC asset/contract registration (provider side)
│   │   │   ├── waltid.ts              # walt.id API integration (OID4VCI)
│   │   │   └── gaiax/
│   │   │       ├── orchestrator.ts     # 5-step Gaia-X compliance flow
│   │   │       ├── vp-signer.ts        # VP/VC JWT signing + DID doc generation
│   │   │       ├── vc-builder.ts       # Gaia-X VC construction (LegalPerson, T&C)
│   │   │       ├── live-client.ts      # Real GXDCH API calls
│   │   │       ├── mock-adapter.ts     # Mock Gaia-X for development
│   │   │       ├── client.ts           # Mock/live client selection
│   │   │       ├── config.ts           # Gaia-X configuration
│   │   │       └── types.ts            # Type definitions
│   │   └── __tests__/
│   │       ├── vp-processor.test.ts    # VP/VC signing & validation tests
│   │       └── did-resolver.test.ts    # DID resolution tests
│   ├── prisma/
│   │   ├── schema.prisma               # Database schema
│   │   ├── migrations/                 # Database migrations
│   │   └── seed.ts                     # Demo data seeding
│   ├── .keys/                          # RSA keypairs (generated at runtime)
│   ├── Dockerfile
│   ├── docker-entrypoint.sh            # Migrate + seed + start
│   └── .env                            # Environment configuration
│
├── apps/
│   ├── portal-dataspace/               # Org registry + Gaia-X (:3001)
│   ├── portal-tata-admin/              # Fleet & DPP management (:3002)
│   ├── portal-tata-public/             # Public showroom (:3003)
│   ├── portal-wallet/                  # Digital credential wallet (:3004)
│   ├── portal-insurance/               # Insurance + VP verification (:3005)
│   ├── portal-company/                 # Company directory (:3006)
│   └── Dockerfile                      # Shared frontend Dockerfile (ARG APP_NAME)
│
├── packages/
│   ├── auth/                           # Shared OIDC auth (Keycloak, roles, hooks)
│   ├── shared-types/                   # Catena-X / AAS type definitions
│   └── ui-tokens/                      # Shared design tokens
│
├── helm/
│   └── eu-jap-hack/                    # Helm chart (11 services, HAProxy ingress, TLS)
│
├── keycloak/
│   ├── realm-export.json               # Pre-configured Keycloak realm
│   └── themes/smartsense-loire/        # Custom Keycloak theme
│
├── waltid/                             # walt.id service configuration
│   ├── wallet-api/
│   ├── issuer-api/
│   └── verifier-api/
│
├── scripts/
│   ├── build-and-push.sh              # Docker build & ECR push script
│   ├── verify-gaiax.ts                 # CLI: Gaia-X compliance verification
│   └── seed-org-credential.ts          # CLI: Seed organization credentials
│
├── docker-compose.yml                  # Keycloak + walt.id + PostgreSQL services
└── package.json                        # NPM workspaces root
```
