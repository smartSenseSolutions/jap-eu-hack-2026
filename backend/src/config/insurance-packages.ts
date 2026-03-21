export interface InsurancePackage {
  id: string;
  name: string;
  scoreBand: string;
  riskLevel: string;
  coverageHighlights: string[];
  premiumMultiplier: number;
  basePremiumEur: number;
  indicativePremiumRange: [number, number];
  standardAddOns: string[];
  evAddOns: string[];
  exclusions: string[];
  recommendationReason: string;
}

export const INSURANCE_PACKAGES: InsurancePackage[] = [
  {
    id: 'PKG_PREMIUM_PLUS',
    name: 'Premium Plus',
    scoreBand: 'premium_plus',
    riskLevel: 'Very Low Risk',
    coverageHighlights: [
      'Fully comprehensive — zero excess option available',
      'New-for-old vehicle replacement up to 3 years',
      'Worldwide driving cover included',
      'Guaranteed courtesy car for duration of repair',
      'Battery degradation cover for EV/HEV vehicles',
      'Cyber-security cover for connected vehicle systems',
      'Agreed value payout — no depreciation deductions',
    ],
    premiumMultiplier: 0.85,
    basePremiumEur: 900,
    indicativePremiumRange: [800, 1050],
    standardAddOns: ['Legal expense protection', 'GAP cover', 'Key & lock replacement', 'Premium roadside assistance'],
    evAddOns: ['Charging cable theft cover', 'Home EV charger insurance', 'Range anxiety roadside assistance'],
    exclusions: [],
    recommendationReason: 'Exceptional vehicle score (85–100) qualifies for best-in-class comprehensive cover at a preferential premium.',
  },
  {
    id: 'PKG_PREMIUM',
    name: 'Premium',
    scoreBand: 'premium',
    riskLevel: 'Low Risk',
    coverageHighlights: [
      'Fully comprehensive with low excess',
      'New-for-old vehicle replacement up to 2 years',
      'European driving cover included',
      'Guaranteed courtesy car',
      'Battery protection cover for EV/HEV',
    ],
    premiumMultiplier: 1.0,
    basePremiumEur: 1100,
    indicativePremiumRange: [950, 1250],
    standardAddOns: ['Legal expense protection', 'GAP cover', 'Standard roadside assistance'],
    evAddOns: ['Charging cable theft cover', 'Home EV charger insurance'],
    exclusions: [],
    recommendationReason: 'Strong vehicle condition and compliance record (70–84) supports comprehensive cover at competitive rates.',
  },
  {
    id: 'PKG_STANDARD',
    name: 'Standard',
    scoreBand: 'standard',
    riskLevel: 'Medium Risk',
    coverageHighlights: [
      'Fully comprehensive with standard excess',
      'UK and European driving cover',
      'Third-party fire and theft as standard',
      'Standard roadside assistance',
    ],
    premiumMultiplier: 1.2,
    basePremiumEur: 1350,
    indicativePremiumRange: [1150, 1550],
    standardAddOns: ['Legal expense protection', 'Premium roadside assistance upgrade'],
    evAddOns: ['EV charging equipment cover'],
    exclusions: ['New-for-old replacement not included'],
    recommendationReason: 'Vehicle meets standard risk profile (55–69). Comprehensive cover with standard terms recommended.',
  },
  {
    id: 'PKG_BASIC_PLUS',
    name: 'Basic Plus',
    scoreBand: 'basic_plus',
    riskLevel: 'High Risk',
    coverageHighlights: [
      'Third-party, fire and theft',
      'Optional comprehensive upgrade available on inspection',
      'Standard excess applies',
    ],
    premiumMultiplier: 1.5,
    basePremiumEur: 1600,
    indicativePremiumRange: [1400, 1900],
    standardAddOns: ['Legal expense protection'],
    evAddOns: [],
    exclusions: [
      'New-for-old replacement not included',
      'Worldwide cover not included',
      'Battery warranty claims excluded',
    ],
    recommendationReason: 'Higher risk profile (40–54) due to vehicle age or condition. Basic Plus provides essential protection.',
  },
  {
    id: 'PKG_BASIC',
    name: 'Basic / Manual Review',
    scoreBand: 'basic',
    riskLevel: 'Very High Risk',
    coverageHighlights: [
      'Third-party liability cover only',
      'Manual underwriter review required before comprehensive upgrade',
      'Subject to physical inspection before binding',
    ],
    premiumMultiplier: 2.0,
    basePremiumEur: 2000,
    indicativePremiumRange: [1800, 2500],
    standardAddOns: [],
    evAddOns: [],
    exclusions: [
      'Comprehensive cover requires manual underwriter review',
      'Battery-specific cover excluded pending inspection',
      'New-for-old replacement not available',
    ],
    recommendationReason: 'Vehicle score (0–39) requires manual underwriter review. Third-party cover available immediately.',
  },
];
