/**
 * Composite Risk Score Calculator
 *
 * Combines the general fraud risk score with card testing suspicion score
 * to produce a unified risk assessment.
 */

import type {
  CompositeRiskScore,
  CompositeScoreBreakdown,
  CompositeScoreWeights,
  CompositeRiskLevel,
  CompositeRiskDisplay,
  FraudDecision,
  FraudConfidence,
} from "./types";
import { clampScore } from "./utils";

// ==========================================
// DEFAULT WEIGHTS
// ==========================================

/**
 * Default weights for composite score calculation
 * Total should equal 1.0
 */
export const DEFAULT_COMPOSITE_WEIGHTS: CompositeScoreWeights = {
  riskScore: 0.6, // 60% from general risk score
  cardTestingScore: 0.4, // 40% from card testing
};

/**
 * Alternative weights when card testing data is present
 * Gives more importance to card testing detection
 */
export const CARD_TESTING_FOCUSED_WEIGHTS: CompositeScoreWeights = {
  riskScore: 0.5,
  cardTestingScore: 0.5,
};

// ==========================================
// RISK LEVEL THRESHOLDS
// ==========================================

export const COMPOSITE_RISK_THRESHOLDS = {
  MINIMAL: 20,
  LOW: 35,
  MODERATE: 50,
  ELEVATED: 65,
  HIGH: 80,
  CRITICAL: 100,
} as const;

// ==========================================
// MAIN CALCULATION FUNCTIONS
// ==========================================

/**
 * Calculate composite risk score from individual scores
 */
export function calculateCompositeScore(
  riskScore: number,
  cardTestingScore: number = 0,
  cardTestingTrackerId?: string,
  customWeights?: CompositeScoreWeights
): CompositeRiskScore {
  // Clamp input scores to 0-100
  const clampedRiskScore = clampScore(riskScore);
  const clampedCardTestingScore = clampScore(cardTestingScore);
  const hasCardTestingData = cardTestingScore > 0 || !!cardTestingTrackerId;

  // Determine weights based on whether we have card testing data
  const weights =
    customWeights ||
    (hasCardTestingData ? CARD_TESTING_FOCUSED_WEIGHTS : DEFAULT_COMPOSITE_WEIGHTS);

  // Calculate weighted contributions
  let riskScoreContribution: number;
  let cardTestingContribution: number;

  if (hasCardTestingData) {
    // Both scores contribute
    riskScoreContribution = clampedRiskScore * weights.riskScore;
    cardTestingContribution = clampedCardTestingScore * weights.cardTestingScore;
  } else {
    // Only risk score available - use full weight
    riskScoreContribution = clampedRiskScore;
    cardTestingContribution = 0;
  }

  // Calculate total score
  const totalScore = clampScore(riskScoreContribution + cardTestingContribution);

  // Determine risk level
  const riskLevel = getRiskLevelFromScore(totalScore);

  // Determine decision and confidence
  const decision = getDecisionFromCompositeScore(totalScore);
  const confidence = getConfidenceFromCompositeScore(
    totalScore,
    clampedRiskScore,
    clampedCardTestingScore
  );

  // Build breakdown
  const breakdown: CompositeScoreBreakdown = {
    riskScore: clampedRiskScore,
    cardTestingScore: clampedCardTestingScore,
    riskScoreContribution: Math.round(riskScoreContribution),
    cardTestingContribution: Math.round(cardTestingContribution),
    hasCardTestingData,
    cardTestingTrackerId,
  };

  // Determine primary risk source
  const primaryRiskSource = determinePrimaryRiskSource(
    clampedRiskScore,
    clampedCardTestingScore
  );

  // Generate summary
  const summary = generateScoreSummary(
    totalScore,
    riskLevel,
    primaryRiskSource,
    breakdown
  );

  return {
    totalScore,
    riskLevel,
    breakdown,
    decision,
    confidence,
    summary,
  };
}

/**
 * Quick composite score calculation (just the number)
 */
export function quickCompositeScore(
  riskScore: number,
  cardTestingScore: number = 0
): number {
  const hasCardTesting = cardTestingScore > 0;
  const weights = hasCardTesting
    ? CARD_TESTING_FOCUSED_WEIGHTS
    : DEFAULT_COMPOSITE_WEIGHTS;

  if (hasCardTesting) {
    return clampScore(
      riskScore * weights.riskScore + cardTestingScore * weights.cardTestingScore
    );
  }

  return clampScore(riskScore);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get risk level from composite score
 */
export function getRiskLevelFromScore(score: number): CompositeRiskLevel {
  if (score <= COMPOSITE_RISK_THRESHOLDS.MINIMAL) return "minimal";
  if (score <= COMPOSITE_RISK_THRESHOLDS.LOW) return "low";
  if (score <= COMPOSITE_RISK_THRESHOLDS.MODERATE) return "moderate";
  if (score <= COMPOSITE_RISK_THRESHOLDS.ELEVATED) return "elevated";
  if (score <= COMPOSITE_RISK_THRESHOLDS.HIGH) return "high";
  return "critical";
}

/**
 * Get fraud decision from composite score
 */
export function getDecisionFromCompositeScore(score: number): FraudDecision {
  if (score <= COMPOSITE_RISK_THRESHOLDS.LOW) return "ALLOW";
  if (score <= COMPOSITE_RISK_THRESHOLDS.ELEVATED) return "REVIEW";
  return "BLOCK";
}

/**
 * Get confidence level based on score alignment
 */
export function getConfidenceFromCompositeScore(
  totalScore: number,
  riskScore: number,
  cardTestingScore: number
): FraudConfidence {
  // High confidence when both scores agree
  const scoreDifference = Math.abs(riskScore - cardTestingScore);

  if (totalScore <= 15 || totalScore >= 85) {
    // Very low or very high scores are usually clear
    return scoreDifference <= 20 ? "high" : "medium";
  }

  if (scoreDifference <= 15) {
    return "high"; // Both scores align
  } else if (scoreDifference <= 30) {
    return "medium";
  }

  return "low"; // Scores disagree significantly
}

/**
 * Determine which score is the primary risk contributor
 */
function determinePrimaryRiskSource(
  riskScore: number,
  cardTestingScore: number
): "general" | "card_testing" | "both" | "none" {
  const riskThreshold = 30;
  const isRiskHigh = riskScore > riskThreshold;
  const isCardTestingHigh = cardTestingScore > riskThreshold;

  if (!isRiskHigh && !isCardTestingHigh) return "none";
  if (isRiskHigh && isCardTestingHigh) {
    // Both are high, determine which is higher
    if (Math.abs(riskScore - cardTestingScore) <= 10) return "both";
    return riskScore > cardTestingScore ? "general" : "card_testing";
  }
  return isRiskHigh ? "general" : "card_testing";
}

/**
 * Generate human-readable summary
 */
function generateScoreSummary(
  totalScore: number,
  riskLevel: CompositeRiskLevel,
  primaryRiskSource: "general" | "card_testing" | "both" | "none",
  breakdown: CompositeScoreBreakdown
): CompositeRiskScore["summary"] {
  const labels: Record<CompositeRiskLevel, string> = {
    minimal: "Risque minimal",
    low: "Risque faible",
    moderate: "Risque modéré",
    elevated: "Risque élevé",
    high: "Risque très élevé",
    critical: "Risque critique",
  };

  const sourceDescriptions: Record<typeof primaryRiskSource, string> = {
    none: "Aucun signal de risque significatif détecté.",
    general: `Le score de risque général (${breakdown.riskScore}/100) est le principal contributeur.`,
    card_testing: `Pattern de card testing détecté (${breakdown.cardTestingScore}/100) comme principal facteur de risque.`,
    both: `Risques multiples : score général (${breakdown.riskScore}/100) et card testing (${breakdown.cardTestingScore}/100).`,
  };

  return {
    label: labels[riskLevel],
    description: sourceDescriptions[primaryRiskSource],
    primaryRiskSource,
  };
}

// ==========================================
// DISPLAY UTILITIES
// ==========================================

/**
 * Get display information for composite risk level
 */
export function getCompositeRiskDisplay(
  level: CompositeRiskLevel
): CompositeRiskDisplay {
  const displays: Record<CompositeRiskLevel, CompositeRiskDisplay> = {
    minimal: {
      level: "minimal",
      label: "Minimal",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500/50",
      description: "Transaction sûre - Aucun signal de risque",
    },
    low: {
      level: "low",
      label: "Faible",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/50",
      description: "Risque faible - Surveillance standard",
    },
    moderate: {
      level: "moderate",
      label: "Modéré",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/50",
      description: "Risque modéré - Vérification recommandée",
    },
    elevated: {
      level: "elevated",
      label: "Élevé",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/50",
      description: "Risque élevé - Analyse approfondie requise",
    },
    high: {
      level: "high",
      label: "Très élevé",
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/50",
      description: "Risque très élevé - Action immédiate recommandée",
    },
    critical: {
      level: "critical",
      label: "Critique",
      color: "text-rose-400",
      bgColor: "bg-rose-500/20",
      borderColor: "border-rose-500/50",
      description: "Risque critique - Blocage automatique recommandé",
    },
  };

  return displays[level];
}

/**
 * Format composite score for display with breakdown
 */
export function formatCompositeScore(
  compositeScore: CompositeRiskScore
): {
  display: CompositeRiskDisplay;
  formattedTotal: string;
  breakdown: {
    riskScore: { value: number; percentage: number };
    cardTestingScore: { value: number; percentage: number };
  };
} {
  const display = getCompositeRiskDisplay(compositeScore.riskLevel);
  const { breakdown, totalScore } = compositeScore;

  // Calculate percentages for breakdown visualization
  const riskPercentage =
    totalScore > 0
      ? Math.round((breakdown.riskScoreContribution / totalScore) * 100)
      : 0;
  const cardTestingPercentage =
    totalScore > 0
      ? Math.round((breakdown.cardTestingContribution / totalScore) * 100)
      : 0;

  return {
    display,
    formattedTotal: `${totalScore}/100`,
    breakdown: {
      riskScore: {
        value: breakdown.riskScore,
        percentage: riskPercentage,
      },
      cardTestingScore: {
        value: breakdown.cardTestingScore,
        percentage: cardTestingPercentage,
      },
    },
  };
}

// ==========================================
// BATCH OPERATIONS
// ==========================================

/**
 * Calculate composite scores for multiple fraud detections
 */
export function calculateBatchCompositeScores(
  detections: Array<{
    id: string;
    riskScore: number;
    cardTestingTrackerId?: string | null;
    cardTestingSuspicionScore?: number;
  }>
): Map<string, CompositeRiskScore> {
  const results = new Map<string, CompositeRiskScore>();

  for (const detection of detections) {
    const compositeScore = calculateCompositeScore(
      detection.riskScore,
      detection.cardTestingSuspicionScore || 0,
      detection.cardTestingTrackerId || undefined
    );
    results.set(detection.id, compositeScore);
  }

  return results;
}

/**
 * Sort detections by composite score (highest risk first)
 */
export function sortByCompositeRisk<
  T extends { riskScore: number; cardTestingSuspicionScore?: number }
>(detections: T[]): T[] {
  return [...detections].sort((a, b) => {
    const scoreA = quickCompositeScore(
      a.riskScore,
      a.cardTestingSuspicionScore || 0
    );
    const scoreB = quickCompositeScore(
      b.riskScore,
      b.cardTestingSuspicionScore || 0
    );
    return scoreB - scoreA;
  });
}
