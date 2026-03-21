/**
 * Insurance Scoring Engine
 *
 * Deterministic, rule-based scoring engine that calculates a total vehicle
 * insurance score (0–100) from a JASPAR-normalised dataset.
 * Each factor is independently explainable.
 */

import {
  SCORING_FACTORS,
  SCORE_BANDS,
  AGE_SCORE_RULES,
  NCAP_SCORE_MAP,
  BATTERY_SOH_RULES,
  CONDITION_SCORE_RULES,
  MILEAGE_SCORE_RULES,
  OWNER_COUNT_RULES,
  INCIDENT_COUNT_RULES,
  ScoreBand,
} from '../../config/insurance-scoring-rules';
import type { JasparInsuranceDataset } from './dpp-to-jaspar-transformer';

export interface FactorScore {
  factorId: string;
  factorName: string;
  score: number;
  maxScore: number;
  percentage: number;
  explanation: string;
}

export interface ScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  scoreBand: ScoreBand;
  factorScores: FactorScore[];
  scoringTimestamp: string;
  isEV: boolean;
}

// ─── Factor calculators ────────────────────────────────────────────────────────

function scoreVehicleAge(jaspar: JasparInsuranceDataset): FactorScore {
  const ageYears = jaspar.vehicleProfile.vehicleAgeYears;
  const rule = AGE_SCORE_RULES.find(r => ageYears <= r.maxAgeYears)!;
  const maxScore = 15;
  return {
    factorId: 'vehicle_age',
    factorName: 'Vehicle Age',
    score: rule.score,
    maxScore,
    percentage: Math.round((rule.score / maxScore) * 100),
    explanation: `Vehicle is ${ageYears} year${ageYears !== 1 ? 's' : ''} old — score ${rule.score}/${maxScore}`,
  };
}

function scoreSafety(jaspar: JasparInsuranceDataset): FactorScore {
  const ncap = jaspar.regulatoryCompliance.ncapSafetyRating;
  const maxScore = 15;
  let score = 0;
  let explanation: string;

  if (ncap != null) {
    score = NCAP_SCORE_MAP[Math.min(5, Math.max(0, Math.round(ncap)))] ?? 0;
    explanation = `NCAP ${ncap}/5 stars → ${score}/${maxScore} pts`;
  } else {
    score = jaspar.regulatoryCompliance.hasTypeApproval ? 6 : 3;
    explanation = `No NCAP rating — partial credit for ${jaspar.regulatoryCompliance.hasTypeApproval ? 'EU type approval' : 'missing data'}: ${score}/${maxScore}`;
  }

  return { factorId: 'safety', factorName: 'Safety Rating', score, maxScore, percentage: Math.round((score / maxScore) * 100), explanation };
}

function scoreCompliance(jaspar: JasparInsuranceDataset): FactorScore {
  const reg = jaspar.regulatoryCompliance;
  const maxScore = 10;
  let score = 0;
  const parts: string[] = [];

  if (reg.hasTypeApproval) { score += 3; parts.push('EU type approval +3'); }
  if (reg.roadworthyCertValid) { score += 3; parts.push('roadworthy cert valid +3'); }
  const homo = String(reg.homologationStatus || '').toLowerCase();
  if (homo === 'approved') { score += 2; parts.push('homologation approved +2'); }
  const std = String(reg.emissionsStandard || '').toLowerCase();
  if (std.includes('euro 6') || std.includes('bev') || std.includes('zev')) {
    score += 2; parts.push('Euro 6d/BEV emissions +2');
  }
  score = Math.min(score, maxScore);

  return {
    factorId: 'compliance',
    factorName: 'Regulatory Compliance',
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    explanation: parts.length > 0 ? parts.join(', ') : `No compliance data available: ${score}/${maxScore}`,
  };
}

function scorePowertrainReliability(jaspar: JasparInsuranceDataset): FactorScore {
  const tech = jaspar.technicalCondition;
  const isEV = jaspar.vehicleProfile.propulsionType === 'BEV' ||
               jaspar.vehicleProfile.propulsionType === 'HEV' ||
               jaspar.vehicleProfile.propulsionType === 'PHEV';
  const maxScore = 10;
  let score = 0;
  let explanation: string;

  if (isEV && tech.batteryStateOfHealthPct != null) {
    const rule = BATTERY_SOH_RULES.find(r => tech.batteryStateOfHealthPct! >= r.minSoh)!;
    score = rule.score;
    explanation = `Battery SoH ${tech.batteryStateOfHealthPct}% → ${score}/${maxScore} pts`;
  } else {
    const rule = CONDITION_SCORE_RULES.find(r => tech.overallConditionScore >= r.minRating)!;
    score = rule.score;
    explanation = `Overall condition ${tech.overallConditionScore}/10 → ${score}/${maxScore} pts${isEV ? ' (battery SoH unavailable)' : ''}`;
  }

  return { factorId: 'powertrain_reliability', factorName: 'Powertrain & Battery', score, maxScore, percentage: Math.round((score / maxScore) * 100), explanation };
}

function scoreSustainability(jaspar: JasparInsuranceDataset): FactorScore {
  const sus = jaspar.sustainabilityMetrics;
  const maxScore = 5;
  let score = 0;
  const parts: string[] = [];

  const co2 = sus.co2EmissionsGPerKm;
  if (co2 === 0) { score += 3; parts.push('BEV/zero emission +3'); }
  else if (co2 > 0 && co2 < 50)  { score += 2; parts.push(`low CO2 (${co2}g/km) +2`); }
  else if (co2 < 120) { score += 1; parts.push(`moderate CO2 (${co2}g/km) +1`); }
  else { parts.push('CO2 data unavailable or high'); }

  const label = String(sus.energyEfficiencyLabel || '').toUpperCase();
  if (label === 'A+++' || label === 'A++') { score += 2; parts.push(`${label} label +2`); }
  else if (label === 'A+' || label === 'A') { score += 1; parts.push(`${label} label +1`); }

  score = Math.min(score, maxScore);
  return { factorId: 'sustainability', factorName: 'Sustainability & Emissions', score, maxScore, percentage: Math.round((score / maxScore) * 100), explanation: parts.join(', ') || `No sustainability data: ${score}/${maxScore}` };
}

function scoreOwnershipConfidence(jaspar: JasparInsuranceDataset): FactorScore {
  const own = jaspar.ownershipAndProvenance;
  const maxScore = 15;
  let score = 0;
  const parts: string[] = [];

  // Manufacturer credential (max 5)
  if (own.hasManufacturerCredential) {
    score += 3; parts.push('manufacturer credential present +3');
  }
  if (own.manufacturerVerified) {
    score += 2; parts.push('credential active/verified +2');
  }

  // Owner count (max 8) — fewer owners = better
  const ownerRule = OWNER_COUNT_RULES.find(r => own.currentOwnerCount <= r.maxOwners)!;
  score += ownerRule.score;
  parts.push(`${own.currentOwnerCount} owner(s) → +${ownerRule.score}`);

  // Data provenance bonus (max 2)
  if (own.dataProvenance === 'MANUFACTURER_AUTHORITATIVE') {
    score += 2; parts.push('authoritative data source +2');
  }

  score = Math.min(score, maxScore);
  return { factorId: 'ownership_confidence', factorName: 'Ownership & Provenance', score, maxScore, percentage: Math.round((score / maxScore) * 100), explanation: parts.join(', ') || `No provenance data: ${score}/${maxScore}` };
}

function scoreMileageUsage(jaspar: JasparInsuranceDataset): FactorScore {
  const km = jaspar.vehicleProfile.totalKmDriven;
  const maxScore = 15;
  const rule = MILEAGE_SCORE_RULES.find(r => km <= r.maxKm)!;
  return {
    factorId: 'mileage_usage',
    factorName: 'Mileage & Usage',
    score: rule.score,
    maxScore,
    percentage: Math.round((rule.score / maxScore) * 100),
    explanation: `${km.toLocaleString()} km driven → ${rule.score}/${maxScore} pts`,
  };
}

function scoreDamageHistory(jaspar: JasparInsuranceDataset): FactorScore {
  const risk = jaspar.riskIndicators;
  const maxScore = 10;
  let score = 0;
  const parts: string[] = [];

  // Incident count (max 10 from rules, but we cap at maxScore)
  const incidentRule = INCIDENT_COUNT_RULES.find(r => risk.totalDamageIncidents <= r.maxIncidents)!;
  score += incidentRule.score;
  parts.push(`${risk.totalDamageIncidents} incident(s) → +${incidentRule.score}`);

  // Penalty for major damage
  if (risk.majorDamageCount > 0) {
    const penalty = Math.min(risk.majorDamageCount * 2, 4);
    score = Math.max(0, score - penalty);
    parts.push(`${risk.majorDamageCount} major incident(s) → -${penalty}`);
  }

  // Penalty for unrepaired damage
  if (risk.hasUnrepairedDamage) {
    score = Math.max(0, score - 2);
    parts.push('unrepaired damage → -2');
  }

  // Service compliance bonus
  if (risk.serviceComplianceIndicator === 'COMPLIANT') {
    // no change, already accounted for in incident scoring
  } else if (risk.serviceComplianceIndicator === 'NON_COMPLIANT') {
    score = Math.max(0, score - 1);
    parts.push('non-compliant service history → -1');
  }

  score = Math.min(score, maxScore);
  return { factorId: 'damage_history', factorName: 'Damage & Service History', score, maxScore, percentage: Math.round((score / maxScore) * 100), explanation: parts.join(', ') || `No damage data: ${score}/${maxScore}` };
}

function scoreDataCompleteness(jaspar: JasparInsuranceDataset): FactorScore {
  const pct = jaspar.dataQuality.completenessPercent;
  const maxScore = 5;
  let score: number;

  if (pct >= 90)      score = 5;
  else if (pct >= 80) score = 4;
  else if (pct >= 70) score = 3;
  else if (pct >= 60) score = 2;
  else                score = 1;

  return {
    factorId: 'data_completeness',
    factorName: 'Data Completeness',
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    explanation: `Dataset ${pct}% complete (${jaspar.dataQuality.fieldsPresent}/${jaspar.dataQuality.fieldsExpected} fields) → ${score}/${maxScore}`,
  };
}

// ─── Main scoring function ─────────────────────────────────────────────────────

export function calculateInsuranceScore(jaspar: JasparInsuranceDataset): ScoreResult {
  const factorScores: FactorScore[] = [
    scoreVehicleAge(jaspar),
    scoreSafety(jaspar),
    scoreCompliance(jaspar),
    scorePowertrainReliability(jaspar),
    scoreSustainability(jaspar),
    scoreOwnershipConfidence(jaspar),
    scoreMileageUsage(jaspar),
    scoreDamageHistory(jaspar),
    scoreDataCompleteness(jaspar),
  ];

  const totalScore = Math.round(factorScores.reduce((s, f) => s + f.score, 0));
  const maxPossibleScore = SCORING_FACTORS.reduce((s, f) => s + f.maxScore, 0);
  const percentageScore = Math.round((totalScore / maxPossibleScore) * 100);

  const scoreBand = SCORE_BANDS.find(b => totalScore >= b.min && totalScore <= b.max)
    ?? SCORE_BANDS[SCORE_BANDS.length - 1];

  const isEV = jaspar.vehicleProfile.propulsionType === 'BEV' ||
               jaspar.vehicleProfile.propulsionType === 'HEV';

  return {
    totalScore,
    maxPossibleScore,
    percentageScore,
    scoreBand,
    factorScores,
    scoringTimestamp: new Date().toISOString(),
    isEV,
  };
}
