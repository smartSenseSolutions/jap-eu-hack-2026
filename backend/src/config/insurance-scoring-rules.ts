export interface ScoringFactor {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export const SCORING_FACTORS: ScoringFactor[] = [
  { id: 'vehicle_age', name: 'Vehicle Age', description: 'Age and depreciation profile of the vehicle', maxScore: 15 },
  { id: 'safety', name: 'Safety Rating', description: 'NCAP rating and EU type approval compliance', maxScore: 15 },
  { id: 'compliance', name: 'Regulatory Compliance', description: 'EU type approval, roadworthy certificate, homologation status', maxScore: 10 },
  { id: 'powertrain_reliability', name: 'Powertrain & Battery', description: 'Engine/battery state of health and overall condition score', maxScore: 10 },
  { id: 'sustainability', name: 'Sustainability & Emissions', description: 'CO₂ emissions, energy efficiency label, recyclability', maxScore: 5 },
  { id: 'ownership_confidence', name: 'Ownership & Provenance', description: 'Manufacturer credential, number of previous owners', maxScore: 15 },
  { id: 'mileage_usage', name: 'Mileage & Usage', description: 'Total kilometres driven relative to vehicle age', maxScore: 15 },
  { id: 'damage_history', name: 'Damage & Service History', description: 'Incident count, severity, service compliance', maxScore: 10 },
  { id: 'data_completeness', name: 'Data Completeness', description: 'Quality and completeness of submitted vehicle data', maxScore: 5 },
];

export const TOTAL_MAX_SCORE = SCORING_FACTORS.reduce((s, f) => s + f.maxScore, 0); // 100

export interface ScoreBand {
  id: string;
  label: string;
  min: number;
  max: number;
  packageId: string;
  riskLevel: string;
  colorClass: string;
}

export const SCORE_BANDS: ScoreBand[] = [
  { id: 'premium_plus', label: 'Premium Plus', min: 85, max: 100, packageId: 'PKG_PREMIUM_PLUS', riskLevel: 'Very Low Risk', colorClass: 'emerald' },
  { id: 'premium',      label: 'Premium',      min: 70, max: 84,  packageId: 'PKG_PREMIUM',      riskLevel: 'Low Risk',       colorClass: 'blue'    },
  { id: 'standard',     label: 'Standard',     min: 55, max: 69,  packageId: 'PKG_STANDARD',     riskLevel: 'Medium Risk',    colorClass: 'amber'   },
  { id: 'basic_plus',   label: 'Basic Plus',   min: 40, max: 54,  packageId: 'PKG_BASIC_PLUS',   riskLevel: 'High Risk',      colorClass: 'orange'  },
  { id: 'basic',        label: 'Basic / Manual Review', min: 0, max: 39, packageId: 'PKG_BASIC', riskLevel: 'Very High Risk', colorClass: 'red'     },
];

export const AGE_SCORE_RULES: { maxAgeYears: number; score: number }[] = [
  { maxAgeYears: 1, score: 15 },
  { maxAgeYears: 2, score: 13 },
  { maxAgeYears: 3, score: 11 },
  { maxAgeYears: 5, score: 8 },
  { maxAgeYears: 8, score: 5 },
  { maxAgeYears: 10, score: 2 },
  { maxAgeYears: Infinity, score: 0 },
];

export const NCAP_SCORE_MAP: Record<number, number> = {
  5: 15, 4: 12, 3: 8, 2: 4, 1: 2, 0: 0,
};

export const BATTERY_SOH_RULES: { minSoh: number; score: number }[] = [
  { minSoh: 95, score: 10 },
  { minSoh: 90, score: 8 },
  { minSoh: 85, score: 6 },
  { minSoh: 80, score: 4 },
  { minSoh: 0,  score: 2 },
];

export const CONDITION_SCORE_RULES: { minRating: number; score: number }[] = [
  { minRating: 9.0, score: 10 },
  { minRating: 8.0, score: 8 },
  { minRating: 7.0, score: 6 },
  { minRating: 6.0, score: 4 },
  { minRating: 0,   score: 2 },
];

// Mileage scoring: lower km = better score
export const MILEAGE_SCORE_RULES: { maxKm: number; score: number }[] = [
  { maxKm: 5000,    score: 15 },
  { maxKm: 15000,   score: 13 },
  { maxKm: 30000,   score: 11 },
  { maxKm: 60000,   score: 9 },
  { maxKm: 100000,  score: 6 },
  { maxKm: 150000,  score: 3 },
  { maxKm: Infinity, score: 1 },
];

// Owner count scoring: fewer owners = better
export const OWNER_COUNT_RULES: { maxOwners: number; score: number }[] = [
  { maxOwners: 1, score: 8 },
  { maxOwners: 2, score: 5 },
  { maxOwners: 3, score: 3 },
  { maxOwners: Infinity, score: 1 },
];

// Damage incident scoring: fewer incidents = better
export const INCIDENT_COUNT_RULES: { maxIncidents: number; score: number }[] = [
  { maxIncidents: 0, score: 10 },
  { maxIncidents: 1, score: 7 },
  { maxIncidents: 2, score: 5 },
  { maxIncidents: 3, score: 3 },
  { maxIncidents: Infinity, score: 1 },
];
