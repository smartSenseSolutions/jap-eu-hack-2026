<p align="center">
  <img src="https://img.shields.io/badge/EU--Japan%20Hackathon-2026-blueviolet?style=for-the-badge" alt="EU-Japan Hackathon 2026"/>
  <img src="https://img.shields.io/badge/Dataspaces-Interoperability-blue?style=for-the-badge" alt="Dataspaces"/>
  <img src="https://img.shields.io/badge/W3C-Verifiable%20Credentials-green?style=for-the-badge" alt="W3C VC"/>
  <img src="https://img.shields.io/badge/Gaia--X-Compliant-orange?style=for-the-badge" alt="Gaia-X"/>
</p>

# Universal Dataspace Interoperability Gateway

### *One gateway. Every dataspace. Trusted everywhere.*

> Bridging EU (Eclipse Dataspace Connector) and Japanese (CADDE) data ecosystems through DID-based discovery, protocol translation, and verifiable trust — demonstrated via a real-world cross-border vehicle insurance use case.

---

## The Problem

Today's dataspaces are **islands**. The EU ecosystem speaks EDC + Gaia-X. Japan operates on CADDE. India has its own emerging standards. Each has different protocols, trust models, policy languages, and data formats.

A Japanese insurer cannot verify a European vehicle's Digital Product Passport. A European manufacturer cannot share data with a Japanese partner without rebuilding integrations from scratch. **Cross-border data sharing is fragmented, expensive, and trust-deficient.**

There is no universal translator between dataspaces — until now.

---

## The Solution

The **Universal Dataspace Interoperability Gateway** acts as a **protocol translator + trust bridge** between incompatible dataspace ecosystems. It doesn't replace existing infrastructure — it connects them.

```
┌──────────────┐                                      ┌──────────────┐
│   EU  Stack   │                                      │  Japan Stack  │
│  EDC + Gaia-X │ ◄──── Universal Gateway ────► │    CADDE      │
│  ODRL + VP    │    (Translate ↔ Trust ↔ Route)       │  JASPAR + VP  │
└──────────────┘                                      └──────────────┘
```

**What the gateway does:**
- **Discovers** data services via DID resolution (no hardcoded endpoints)
- **Translates** between EDC and CADDE protocols seamlessly
- **Transforms** data formats (EU Digital Product Passport → Japanese JASPAR standard)
- **Enforces** trust through W3C Verifiable Credentials, Gaia-X compliance, and consent-gated access

---

## Live Demo: Cross-Border Vehicle Insurance

We demonstrate the gateway through an end-to-end scenario where a **Japanese insurer** underwrites a policy for a **European-manufactured vehicle**, touching every layer of the interoperability stack.

### The Actors

| Actor | Role | DID |
|---|---|---|
| **TATA Motors** | Vehicle manufacturer & data provider (EU) | `did:eu-dataspace:company-tata-001` |
| **Digit Insurance** | Insurer & data consumer (Japan) | `did:eu-dataspace:company-digit-001` |
| **Mario Sanchez** | Vehicle owner & consent holder | `did:smartsense:mario-sanchez` |

### Demo Flow (Step by Step)

```
 ① TATA registers vehicle → DPP published to EDC
 ② Mario purchases vehicle → OwnershipVC issued to wallet
 ③ Digit agent requests insurance quote → enters VIN
 ④ Mario receives consent request → approves in wallet
 ⑤ Backend resolves TATA's DID → discovers EDC endpoint
 ⑥ 7-step EDC sovereign negotiation completes
 ⑦ DPP fetched from TATA's data plane
 ⑧ DPP transformed to JASPAR format (24-field mapping)
 ⑨ 9-factor scoring engine calculates risk (0–100)
 ⑩ Dynamic insurance package recommended with premium
 ⑪ InsuranceVC issued to Mario's wallet
```

**End-to-end time:** ~30–60 seconds

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    6 React Portals (Vite + Tailwind CSS)                │
│                                                                         │
│  Dataspace    TATA Admin    Showroom    Wallet    Insurance    Company   │
│  Registry     Fleet Mgmt    Marketplace Creds     Underwriting Directory │
│  :3001        :3002         :3003       :3004     :3005        :3006     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS / REST
                  ┌─────────────▼──────────────┐
                  │    Express.js API (:8000)    │
                  │    Prisma ORM + PostgreSQL   │
                  └──┬────┬────┬────┬────┬──────┘
                     │    │    │    │    │
           ┌─────────┘    │    │    │    └───────────────┐
           ▼              ▼    ▼    ▼                    ▼
      Keycloak 26     walt.id  Gaia-X  EDC Tractus-X   CADDE
      ─────────       ──────   ──────  ─────────────   ─────
      OIDC Auth       OID4VCI  GXDCH   Sovereign Data  Cross-Domain
      RS256 JWT       OID4VP   Notary  ODRL Policies   JP Interop
      4 Roles         Wallet   Compl.  7-Step Negot.   Asset Bridge
```

### The 4-Layer Gateway

| Layer | What It Does | Implementation |
|---|---|---|
| **Discovery** | Resolves DIDs to find data service endpoints | `did:web`, `did:eu-dataspace`, `did:smartsense` → DID Documents with `DataService` endpoints |
| **Protocol Translation** | Bridges EDC ↔ CADDE negotiation protocols | EDC consumer service handles catalog query, contract negotiation, transfer, and EDR exchange |
| **Data Transformation** | Converts between data standards | DPP-to-JASPAR transformer maps 24 fields across 7 categories with data quality tracking |
| **Trust Enforcement** | Ensures all parties are verified and consent is granted | Gaia-X compliance VCs, OpenID4VP verification, nonce-based challenges, 1-hour access sessions |

---

## Key Features

- **DID-Based Service Discovery** — No hardcoded URLs. EDC endpoints are resolved dynamically from issuer DIDs, making the system truly decentralized
- **Sovereign Data Exchange** — Full 7-step EDC contract negotiation (catalog → negotiate → agree → transfer → EDR → auth → fetch) with ODRL policy enforcement
- **Gaia-X Compliance Pipeline** — Organizations submit Legal Participant VCs through notary signing → registry validation → GXDCH SHACL compliance check
- **OpenID4VP Verification** — 11-step verifiable presentation pipeline: parse → extract → validate proof → resolve DID → discover service → negotiate → fetch
- **Consent-Gated Access** — Every data request requires explicit owner approval. Access sessions expire after 1 hour with full audit trail
- **Cross-Standard Data Transformation** — EU Digital Product Passport → Japanese JASPAR format with completeness scoring and unmapped field reporting
- **Explainable AI-Ready Scoring** — 9-factor insurance scoring engine with per-factor breakdowns, enabling transparent underwriting decisions
- **Real Cryptography** — RSA-2048 keypairs, RS256 JWT signing, x5c certificate chains, nonce-based replay prevention
- **SSE Real-Time Progress** — EDC negotiation streams step-by-step progress to the frontend via Server-Sent Events

---

## Security & Trust Model

| Mechanism | Purpose | Detail |
|---|---|---|
| **Nonce-Based Challenges** | Prevent VP replay attacks | Random nonce embedded in every presentation request with expiry |
| **RSA-2048 JWS Signing** | Cryptographic proof of origin | Persistent keypairs in `.keys/`, RS256 algorithm, x5c certificate chain |
| **Consent Gates** | User-controlled data sharing | Explicit approval required; denied requests are logged for audit |
| **AccessSession TTL** | Time-bound data access | 1-hour expiry on all access sessions; no persistent tokens |
| **ODRL Policies** | Provider-controlled usage rules | Embedded in EDC catalog; enforced before any data transfer |
| **Gaia-X Compliance VCs** | Organizational trust | Notary-signed, registry-validated, SHACL-checked credentials |
| **VP Proof Validation** | Credential authenticity | JWT signature verification against issuer's published public key |

---

## Dynamic Insurance Underwriting Engine

### DPP → JASPAR Transformation

The transformer converts European Digital Product Passports into the Japanese JASPAR automotive data standard:

```
DPP (TATA_DPP_v1)                    JASPAR (DIGIT_JASPAR_v1)
─────────────────                     ────────────────────────
stateOfHealth.mileageKm          →    technicalCondition.odometer
performance.motorType            →    vehicleProfile.powertrain
emissions.co2GPerKm              →    sustainabilityMetrics.emissions
damageHistory                    →    riskIndicators.incidents
compliance.typeApproval          →    regulatoryCompliance.certifications
ownershipChain                   →    ownershipAndProvenance
serviceHistory                   →    technicalCondition.maintenanceLog
```

**24 fields mapped** across 7 categories with data quality tracking (completeness %, warnings for missing critical fields).

### 9-Factor Scoring Engine (100 Points)

| # | Factor | Max Points | Scoring Logic |
|---|---|---|---|
| 1 | **Vehicle Age** | 15 | 0 yrs → 15 pts … 10+ yrs → 0 pts |
| 2 | **Safety Rating** | 15 | 5★ NCAP → 15 pts, 4★ → 12, 3★ → 9, 2★ → 6, 1★ → 3 |
| 3 | **Regulatory Compliance** | 10 | Type approval +3, roadworthy +3, homologation +2, Euro 6/BEV +2 |
| 4 | **Powertrain & Battery** | 10 | Battery SoH ≥95% → 10 pts (EV-specific logic) |
| 5 | **Sustainability** | 5 | BEV → 3 pts, CO₂ <50g/km → 2 pts, efficiency label bonus |
| 6 | **Ownership Confidence** | 15 | Manufacturer credential +3, single owner → 8 pts, data source +2 |
| 7 | **Mileage & Usage** | 15 | ≤5K km → 15 pts … >150K km → 1 pt |
| 8 | **Damage History** | 10 | 0 incidents → 10 pts, major damage penalty, unrepaired deduction |
| 9 | **Data Completeness** | 5 | ≥90% fields → 5 pts, ≥80% → 4 pts, ≥70% → 3 pts |

### Risk Bands & Insurance Packages

| Score | Band | Risk Level | Annual Premium | Coverage |
|---|---|---|---|---|
| 85–100 | **Premium Plus** | Very Low | €800 – €1,050 | Fully comprehensive, zero excess, new-for-old (3yr), worldwide |
| 70–84 | **Premium** | Low | €950 – €1,250 | Fully comprehensive, low excess, European coverage |
| 55–69 | **Standard** | Medium | €1,150 – €1,550 | Comprehensive with standard excess |
| 40–54 | **Basic Plus** | High | €1,400 – €1,900 | Third-party, fire & theft |
| 0–39 | **Basic** | Very High | €1,800 – €2,500 | Third-party only (manual underwriter review required) |

EV-specific add-ons: charging cable theft coverage, home charger insurance, battery warranty extension.

---

## Interoperability Matrix

| Dimension | EU Stack | Japan Stack | Gateway Bridge |
|---|---|---|---|
| **Protocol** | Eclipse Dataspace Connector (Tractus-X) | CADDE | EDC consumer service translates between both |
| **Identity** | `did:web`, `did:eu-dataspace` | `did:smartsense` | Universal DID resolver handles all methods |
| **Trust** | Gaia-X GXDCH (Notary + Compliance) | Verifiable Credentials | Both validated before data exchange |
| **Policy** | ODRL | Consent-based | ODRL policies + consent gates enforced together |
| **Data Format** | Digital Product Passport (DPP) | JASPAR | DPP-to-JASPAR transformer with quality scoring |
| **Credential Flow** | OID4VCI / OID4VP (walt.id) | VP Verification | Same VC/VP stack bridges both ecosystems |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| **Backend** | Node.js 20, Express.js, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 16 (15+ models) |
| **Identity** | Keycloak 26 (OIDC, RS256), walt.id (OID4VCI, OID4VP, Wallet) |
| **Dataspaces** | Eclipse Dataspace Connector (Tractus-X), CADDE, ODRL |
| **Compliance** | Gaia-X GXDCH (Notary, Registry, Compliance APIs) |
| **Cryptography** | RSA-2048, RS256 JWT, x5c chains, W3C Verifiable Credentials |
| **Infrastructure** | Docker Compose, Kubernetes + Helm 3, AWS ECR, nginx + cert-manager |

---

## Use Cases Beyond Automotive

The Universal Dataspace Interoperability Gateway is **sector-agnostic**. The same 4-layer architecture applies to:

| Sector | Data Provider | Data Consumer | Credential |
|---|---|---|---|
| **Healthcare** | Hospital (EU) | Research institute (JP) | PatientConsentVC + MedicalRecordDPP |
| **Supply Chain** | Manufacturer | Customs authority | OriginCertificateVC + ShipmentDPP |
| **Energy** | Grid operator | Carbon auditor | EnergyProductionVC + GridDataDPP |
| **Finance** | Bank (EU) | Regulator (JP) | ComplianceVC + TransactionDPP |

Replace the DPP schema, swap the scoring engine, keep the gateway.

---

## Future Scope

- **Multi-Dataspace Mesh** — Connect 3+ dataspaces (EU + JP + India + ASEAN) through federated gateway routing
- **EBSI/eIDAS Integration** — European Blockchain Services Infrastructure for cross-border legal identity
- **AI-Powered Scoring** — ML models trained on historical underwriting data using the 9-factor framework
- **Catena-X Alignment** — Native support for automotive industry Catena-X use cases (battery passport, traceability)
- **Real-Time Policy Negotiation** — Dynamic ODRL policy generation based on data sensitivity and consumer trust level
- **Zero-Knowledge Proofs** — Prove vehicle meets insurance criteria without revealing raw DPP data

---

## Why This Matters

**$4.2 trillion** in annual cross-border trade depends on trusted data exchange. Today, every new bilateral data-sharing agreement requires custom integration — different protocols, different trust models, different formats.

This gateway proves that **a single interoperability layer can bridge fundamentally different dataspace architectures** while preserving:
- **Data sovereignty** — Providers keep control through EDC + ODRL
- **User consent** — Owners decide who sees their data
- **Organizational trust** — Gaia-X compliance ensures only verified participants
- **Standards compliance** — Both EU and Japanese standards respected, not replaced

**One gateway. Every dataspace. Trusted everywhere.**

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ / npm 10+

### Quick Start

```bash
git clone https://github.com/smartSenseSolutions/jap-eu-hack-2026.git
cd jap-eu-hack-2026
npm install
cp backend/.env.example backend/.env
docker compose up -d
```

Access the portals:

| Portal | URL | Role |
|---|---|---|
| Dataspace Registry | http://localhost:3001 | Organization admin |
| TATA Admin | http://localhost:3002 | Fleet management |
| Public Showroom | http://localhost:3003 | Vehicle marketplace |
| Wallet | http://localhost:3004 | Credential holder |
| Insurance | http://localhost:3005 | Underwriting agent |
| Company Directory | http://localhost:3006 | Company admin |

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design & component interactions |
| [Backend API](docs/backend.md) | API reference & service documentation |
| [Frontend Portals](docs/frontend.md) | Portal breakdown & shared packages |
| [Database Schema](docs/database.md) | 15+ models & relationships |
| [DevOps](docs/devops.md) | Docker, Helm & Kubernetes deployment |
| [Vehicle Purchase Flow](docs/flows/vehicle-purchase.md) | Purchase → OwnershipVC issuance |
| [Insurance Verification](docs/flows/insurance-verification.md) | 11-step OpenID4VP pipeline |
| [EDC Negotiation](docs/flows/edc-negotiation.md) | 7-step sovereign data exchange |
| [Gaia-X Compliance](docs/flows/gaiax-compliance.md) | Organization verification |
| [Consent Access](docs/flows/consent-access.md) | Consent-gated data sharing |

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

<p align="center">
  <strong>Built for the EU-Japan Hackathon 2026</strong><br/>
  by <a href="https://smartsensesolutions.com">SmartSense Solutions</a>
</p>
