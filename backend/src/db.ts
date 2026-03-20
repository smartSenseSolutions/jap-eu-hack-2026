/* eslint-disable @typescript-eslint/no-explicit-any */
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import path from 'path';
import { seedCredentials, seedCompanies, seedCars, seedWallet, seedOrgCredentials } from './seed-data';

interface DbSchema {
  companies: any[];
  credentials: any[];
  cars: any[];
  wallet: Record<string, { credentialIds: string[] }>;
  consent: any[];
  purchases: any[];
  insurance_policies: any[];
  org_credentials: any[];
  edc_transactions: any[];
  vehicle_audit_log: any[];
  access_sessions: any[];
  presentation_requests: any[];
  presentation_sessions: any[];
}

const adapter = new FileSync<DbSchema>(path.join(__dirname, '../data/db.json'));
const db = low(adapter);

// Set defaults
db.defaults({
  companies: [],
  credentials: [],
  cars: [],
  wallet: {},
  consent: [],
  purchases: [],
  insurance_policies: [],
  org_credentials: [],
  edc_transactions: [],
  vehicle_audit_log: [],
  access_sessions: [],
  presentation_requests: [],
  presentation_sessions: []
}).write();

// Seed essential data so the demo works from a fresh DB
for (const cred of seedCredentials) {
  if (!db.get('credentials').find({ id: cred.id }).value()) {
    db.get('credentials').push(cred).write();
  }
}

for (const comp of seedCompanies) {
  if (!db.get('companies').find({ id: comp.id }).value()) {
    db.get('companies').push(comp).write();
  }
}

for (const car of seedCars) {
  if (!db.get('cars').find({ vin: car.vin }).value()) {
    db.get('cars').push(car).write();
  }
}

// Seed wallet entries
for (const [userId, walletData] of Object.entries(seedWallet)) {
  if (!db.get('wallet').get(userId).value()) {
    db.get('wallet').set(userId, walletData).write();
  }
}

// Seed org_credentials (Gaia-X Legal Participant records)
for (const orgCred of seedOrgCredentials) {
  if (!db.get('org_credentials').find({ id: orgCred.id }).value()) {
    db.get('org_credentials').push(orgCred).write();
  }
}

export default db;
