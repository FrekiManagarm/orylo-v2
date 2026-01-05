/**
 * Fraud Detection Engine
 *
 * Core rules-based fraud detection system.
 * Analyzes transaction context and returns risk assessment.
 */

import type {
  TransactionContext,
  FraudDetectionResult,
  FraudFactor,
  FraudDecision,
  FraudConfidence,
  FraudSeverity,
} from "./types";
import {
  clampScore,
  RISK_THRESHOLDS,
  AMOUNT_THRESHOLDS,
  VELOCITY_THRESHOLDS,
} from "./utils";

// Re-export types for backward compatibility
export type { TransactionContext, FraudDetectionResult, FraudFactor, FraudDecision, FraudConfidence };

// Re-export generateCardFingerprint from utils for backward compatibility
export { generateCardFingerprint } from "./utils";

/**
 * Main fraud detection function
 * Applies rules-based detection and returns risk assessment
 */
export function detectFraud(context: TransactionContext): FraudDetectionResult {
  let riskScore = 0;
  const factors: FraudFactor[] = [];

  // ============================================
  // INSTANT BLOCK CONDITIONS
  // ============================================

  // Blacklisted customer
  if (context.customer?.isBlacklisted) {
    return {
      decision: "BLOCK",
      riskScore: 100,
      factors: [
        {
          type: "blacklisted_customer",
          weight: 100,
          description: "Client sur liste noire",
          severity: "high",
        },
      ],
      confidence: "high",
      recommendedAction: "Blocage automatique - Client blacklisté",
    };
  }

  // ============================================
  // NEGATIVE SIGNALS (increase risk)
  // ============================================

  // RULE 1: Geographic Mismatch
  if (
    context.ipCountry &&
    context.cardCountry &&
    context.ipCountry !== context.cardCountry
  ) {
    const weight = 30;
    riskScore += weight;
    factors.push(createFactor(
      "geographic_mismatch",
      weight,
      `IP depuis ${context.ipCountry} mais carte émise en ${context.cardCountry}`,
      "high"
    ));
  }

  // RULE 2: Velocity Abuse
  if (context.velocity?.attemptsLastHour !== undefined) {
    if (context.velocity.attemptsLastHour >= VELOCITY_THRESHOLDS.ATTEMPTS_PER_HOUR_CRITICAL) {
      const weight = 25;
      riskScore += weight;
      factors.push(createFactor(
        "velocity_abuse",
        weight,
        `${context.velocity.attemptsLastHour} tentatives de paiement dans la dernière heure`,
        "high"
      ));
    } else if (context.velocity.attemptsLastHour >= VELOCITY_THRESHOLDS.ATTEMPTS_PER_HOUR_WARNING) {
      const weight = 15;
      riskScore += weight;
      factors.push(createFactor(
        "velocity_elevated",
        weight,
        `${context.velocity.attemptsLastHour} tentatives de paiement dans la dernière heure`,
        "medium"
      ));
    }
  }

  // RULE 3: Card Testing Pattern (SIGNATURE FEATURE)
  if (context.velocity?.uniqueCardsUsed !== undefined) {
    if (context.velocity.uniqueCardsUsed >= VELOCITY_THRESHOLDS.UNIQUE_CARDS_CRITICAL) {
      const weight = 50;
      riskScore += weight;
      factors.push(createFactor(
        "card_testing_critical",
        weight,
        `${context.velocity.uniqueCardsUsed} cartes différentes testées sur la même session - Pattern de card testing détecté`,
        "high"
      ));
    } else if (context.velocity.uniqueCardsUsed >= VELOCITY_THRESHOLDS.UNIQUE_CARDS_SUSPICIOUS) {
      const weight = 40;
      riskScore += weight;
      factors.push(createFactor(
        "card_testing",
        weight,
        `${context.velocity.uniqueCardsUsed} cartes différentes testées sur la même session`,
        "high"
      ));
    } else if (context.velocity.uniqueCardsUsed >= VELOCITY_THRESHOLDS.UNIQUE_CARDS_WARNING) {
      const weight = 20;
      riskScore += weight;
      factors.push(createFactor(
        "multiple_cards",
        weight,
        `${context.velocity.uniqueCardsUsed} cartes différentes utilisées`,
        "medium"
      ));
    }
  }

  // RULE 4: Rapid Attempts
  if (context.velocity?.rapidAttempts) {
    const weight = 15;
    riskScore += weight;
    factors.push(createFactor(
      "rapid_attempts",
      weight,
      "Tentatives multiples en quelques secondes",
      "high"
    ));
  }

  // RULE 5: New Account + High Amount
  if (context.customer) {
    const avgSpend =
      context.customer.totalPurchases > 0
        ? context.customer.totalSpent / context.customer.totalPurchases
        : 0;

    // Brand new account with unusually high amount
    if (context.customer.accountAge < 1 && context.amount > AMOUNT_THRESHOLDS.HIGH) {
      const weight = 25;
      riskScore += weight;
      factors.push(createFactor(
        "new_account_high_amount",
        weight,
        `Compte créé il y a moins de 24h avec montant élevé (${formatAmount(context.amount)}€)`,
        "high"
      ));
    }
    // Amount significantly higher than average
    else if (avgSpend > 0 && context.amount > avgSpend * 3) {
      const weight = 15;
      riskScore += weight;
      factors.push(createFactor(
        "unusual_amount",
        weight,
        `Montant 3× supérieur à la moyenne du client (${formatAmount(context.amount)}€ vs ${formatAmount(avgSpend)}€)`,
        "medium"
      ));
    }
  } else {
    // No customer history - first transaction
    const weight = 10;
    riskScore += weight;
    factors.push(createFactor(
      "unknown_customer",
      weight,
      "Première transaction de ce client",
      "low"
    ));
  }

  // RULE 6: Dispute History
  if (context.customer?.disputeHistory && context.customer.disputeHistory > 0) {
    const weight = Math.min(context.customer.disputeHistory * 20, 60);
    riskScore += weight;
    factors.push(createFactor(
      "dispute_history",
      weight,
      `Client avec ${context.customer.disputeHistory} litige(s) antérieur(s)`,
      "high"
    ));
  }

  // RULE 7: High-Risk Amount Patterns
  if (context.amount >= AMOUNT_THRESHOLDS.VERY_HIGH) {
    const weight = 15;
    riskScore += weight;
    factors.push(createFactor(
      "very_high_amount",
      weight,
      `Montant très élevé: ${formatAmount(context.amount)}€`,
      "medium"
    ));
  } else if (context.amount >= AMOUNT_THRESHOLDS.HIGH) {
    const weight = 8;
    riskScore += weight;
    factors.push(createFactor(
      "high_amount",
      weight,
      `Montant élevé: ${formatAmount(context.amount)}€`,
      "low"
    ));
  }

  // RULE 8: Suspicious small amounts (card testing pattern)
  if (
    context.amount <= AMOUNT_THRESHOLDS.SMALL &&
    context.velocity?.attemptsLastHour &&
    context.velocity.attemptsLastHour > 1
  ) {
    const weight = 20;
    riskScore += weight;
    factors.push(createFactor(
      "small_amount_pattern",
      weight,
      `Petits montants répétés (${formatAmount(context.amount)}€) - Pattern de test de carte`,
      "medium"
    ));
  }

  // RULE 9: Prepaid Card
  if (context.cardFunding === "prepaid") {
    const weight = 10;
    riskScore += weight;
    factors.push(createFactor(
      "prepaid_card",
      weight,
      "Carte prépayée utilisée (risque plus élevé)",
      "medium"
    ));
  }

  // RULE 10: Unusual Time (3am-6am)
  if (context.hourOfDay !== undefined && context.hourOfDay >= 3 && context.hourOfDay < 6) {
    const weight = 5;
    riskScore += weight;
    factors.push(createFactor(
      "unusual_time",
      weight,
      `Transaction à ${context.hourOfDay}h (heure inhabituelle)`,
      "low"
    ));
  }

  // ============================================
  // POSITIVE SIGNALS (reduce risk)
  // ============================================

  // Whitelisted customer - instant reduction
  if (context.customer?.isWhitelisted) {
    const reduction = 30;
    riskScore = Math.max(0, riskScore - reduction);
    factors.push(createFactor(
      "whitelisted_customer",
      -reduction,
      "Client sur liste blanche - Confiance élevée",
      "low"
    ));
  }

  // Trust Score Integration
  if (context.customer?.trustScore !== undefined && context.customer.tier) {
    const trustScore = context.customer.trustScore;
    const tier = context.customer.tier;

    if (tier === "vip") {
      const reduction = 30;
      riskScore = Math.max(0, riskScore - reduction);
      factors.push(createFactor(
        "vip_customer",
        -reduction,
        `Client VIP (Trust Score: ${trustScore}/100) - ${context.customer.totalPurchases} achats réussis`,
        "low"
      ));
    } else if (tier === "trusted") {
      const reduction = 20;
      riskScore = Math.max(0, riskScore - reduction);
      factors.push(createFactor(
        "trusted_customer",
        -reduction,
        `Client de confiance (Trust Score: ${trustScore}/100)`,
        "low"
      ));
    } else if (tier === "suspicious") {
      const penalty = 20;
      riskScore += penalty;
      factors.push(createFactor(
        "suspicious_customer",
        penalty,
        `Score de confiance bas (${trustScore}/100) - Problèmes antérieurs détectés`,
        "high"
      ));
    } else if (tier === "blocked") {
      // Auto-block
      riskScore = 100;
      factors.push(createFactor(
        "blocked_tier_customer",
        50,
        `Client bloqué - Trust Score critique (${trustScore}/100)`,
        "high"
      ));
    }
  }

  // Loyal Customer Bonus
  if (
    context.customer &&
    context.customer.totalPurchases >= 5 &&
    context.customer.disputeHistory === 0
  ) {
    const reduction = 15;
    riskScore = Math.max(0, riskScore - reduction);
    factors.push(createFactor(
      "loyal_customer",
      -reduction,
      `${context.customer.totalPurchases} achats réussis, aucun litige`,
      "low"
    ));
  }

  // Amount Within Normal Range
  if (context.customer && context.customer.totalPurchases > 0) {
    const avgSpend = context.customer.totalSpent / context.customer.totalPurchases;
    if (context.amount <= avgSpend * 1.5 && context.amount >= avgSpend * 0.5) {
      const reduction = 10;
      riskScore = Math.max(0, riskScore - reduction);
      factors.push(createFactor(
        "normal_amount",
        -reduction,
        "Montant dans la plage habituelle du client",
        "low"
      ));
    }
  }

  // Active Subscription Bonus
  if (context.customer?.hasActiveSubscription) {
    const reduction = 10;
    riskScore = Math.max(0, riskScore - reduction);
    factors.push(createFactor(
      "active_subscription",
      -reduction,
      "Client avec abonnement actif",
      "low"
    ));
  }

  // ============================================
  // FINAL DECISION
  // ============================================

  // Clamp score to 0-100
  riskScore = clampScore(riskScore);

  // Calculate adjustments breakdown
  const positiveAdjustments = factors
    .filter((f) => f.weight < 0)
    .reduce((sum, f) => sum + Math.abs(f.weight), 0);

  const negativeAdjustments = factors
    .filter((f) => f.weight > 0)
    .reduce((sum, f) => sum + f.weight, 0);

  let decision: FraudDecision;
  let confidence: FraudConfidence;
  let recommendedAction: string;

  if (riskScore <= RISK_THRESHOLDS.LOW) {
    decision = "ALLOW";
    confidence = riskScore <= 15 ? "high" : "medium";
    recommendedAction = "Autoriser la transaction";
  } else if (riskScore <= RISK_THRESHOLDS.HIGH) {
    decision = "REVIEW";
    confidence = "medium";
    recommendedAction = "Vérification manuelle recommandée avant de procéder";
  } else {
    decision = "BLOCK";
    confidence = riskScore >= RISK_THRESHOLDS.CRITICAL ? "high" : "medium";
    recommendedAction = "Bloquer et signaler la transaction comme frauduleuse";
  }

  return {
    decision,
    riskScore,
    factors: factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)),
    confidence,
    recommendedAction,
    baseScore: 0,
    adjustments: {
      positive: positiveAdjustments,
      negative: negativeAdjustments,
    },
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create a fraud factor object
 */
function createFactor(
  type: string,
  weight: number,
  description: string,
  severity: FraudSeverity
): FraudFactor {
  return {
    type: type as FraudFactor["type"],
    weight,
    description,
    severity,
  };
}

/**
 * Format amount from cents to euros
 */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Get decision color for UI
 */
export function getDecisionColor(decision: FraudDecision): string {
  const colors: Record<FraudDecision, string> = {
    ALLOW: "green",
    REVIEW: "orange",
    BLOCK: "red",
  };

  return colors[decision];
}

/**
 * Get decision label for UI
 */
export function getDecisionLabel(decision: FraudDecision): string {
  const labels: Record<FraudDecision, string> = {
    ALLOW: "Autorisé",
    REVIEW: "À vérifier",
    BLOCK: "Bloqué",
  };

  return labels[decision];
}
