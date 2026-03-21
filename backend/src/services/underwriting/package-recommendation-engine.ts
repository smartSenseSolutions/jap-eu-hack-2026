/**
 * Package Recommendation Engine
 *
 * Selects the appropriate insurance package based on the score band,
 * vehicle type (EV/ICE), and score result. Returns a fully-formed
 * package recommendation with premium estimate and explanation.
 */

import { INSURANCE_PACKAGES, InsurancePackage } from '../../config/insurance-packages';
import type { ScoreResult } from './insurance-scoring-engine';

export interface PackageRecommendation {
  packageId: string;
  packageName: string;
  scoreBand: string;
  riskLevel: string;
  totalScore: number;
  estimatedAnnualPremiumEur: number;
  indicativePremiumRange: [number, number];
  coverageHighlights: string[];
  recommendedAddOns: string[];
  exclusions: string[];
  recommendationReason: string;
  evSpecificNote?: string;
  underwriterNote?: string;
}

export function recommendPackage(scoreResult: ScoreResult): PackageRecommendation {
  const pkg = INSURANCE_PACKAGES.find(p => p.id === scoreResult.scoreBand.packageId)
    ?? INSURANCE_PACKAGES[INSURANCE_PACKAGES.length - 1];

  const estimatedPremium = Math.round(pkg.basePremiumEur * pkg.premiumMultiplier);

  const recommendedAddOns: string[] = [...pkg.standardAddOns];
  let evSpecificNote: string | undefined;
  let underwriterNote: string | undefined;

  if (scoreResult.isEV) {
    recommendedAddOns.push(...pkg.evAddOns);
    evSpecificNote = pkg.evAddOns.length > 0
      ? `EV-specific covers recommended: ${pkg.evAddOns.slice(0, 2).join(', ')}${pkg.evAddOns.length > 2 ? ` +${pkg.evAddOns.length - 2} more` : ''}.`
      : 'Standard EV covers available — check with your broker for battery warranty add-ons.';
  }

  if (pkg.id === 'PKG_BASIC') {
    underwriterNote = 'This vehicle requires manual underwriter review before comprehensive cover can be bound. Our team will contact you within 2 business days.';
  } else if (scoreResult.totalScore >= 85) {
    underwriterNote = 'Top-tier vehicle score — eligible for fast-track binding with no additional inspection required.';
  }

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    scoreBand: scoreResult.scoreBand.id,
    riskLevel: pkg.riskLevel,
    totalScore: scoreResult.totalScore,
    estimatedAnnualPremiumEur: estimatedPremium,
    indicativePremiumRange: pkg.indicativePremiumRange,
    coverageHighlights: pkg.coverageHighlights,
    recommendedAddOns,
    exclusions: pkg.exclusions,
    recommendationReason: pkg.recommendationReason,
    evSpecificNote,
    underwriterNote,
  };
}
