/**
 * Trust Score Algorithm
 *
 * Calculates a customer's trust score based on their transaction history,
 * behavior patterns, and risk indicators.
 */

export interface CustomerMetrics {
  // Historique
  accountAge: number; // days since first purchase
  totalPurchases: number; // total successful payments
  totalSpent: number; // total amount spent (€)
  avgPurchaseAmount: number; // average per purchase

  // Récence
  lastPurchaseDate?: Date;
  daysSinceLastPurchase?: number;

  // Problèmes
  disputeHistory: number; // number of disputes/chargebacks
  refundHistory: number; // number of refunds
  failedPayments: number; // number of failed payments

  // Comportement
  uniquePaymentMethods: number; // number of different cards used
  hasActiveSubscription: boolean;
  purchaseFrequency: number; // purchases per month

  // Cohérence
  deviceConsistency: number; // 0-100
  locationConsistency: number; // 0-100
}

export type TrustTier =
  | "blocked"
  | "suspicious"
  | "new"
  | "trusted"
  | "vip";

export interface TrustScoreResult {
  score: number;
  tier: TrustTier;
  factors: TrustFactor[];
  shouldWhitelist: boolean;
  shouldBlacklist: boolean;
}

export interface TrustFactor {
  type: string;
  impact: number; // positive = trust, negative = risk
  description: string;
  category: "positive" | "negative" | "neutral";
}

/**
 * Calculate trust score from customer metrics
 * @returns Score between 0-100
 */
export function calculateTrustScore(metrics: CustomerMetrics): TrustScoreResult {
  let score = 50; // Start neutral
  const factors: TrustFactor[] = [];

  // ============================================
  // POSITIVE FACTORS (max +50 points)
  // ============================================

  // 1. Account Age (max +15)
  if (metrics.accountAge >= 365) {
    score += 15;
    factors.push({
      type: "account_age_excellent",
      impact: 15,
      description: "Client depuis plus d'1 an",
      category: "positive",
    });
  } else if (metrics.accountAge >= 180) {
    score += 12;
    factors.push({
      type: "account_age_good",
      impact: 12,
      description: "Client depuis plus de 6 mois",
      category: "positive",
    });
  } else if (metrics.accountAge >= 90) {
    score += 8;
    factors.push({
      type: "account_age_moderate",
      impact: 8,
      description: "Client depuis plus de 3 mois",
      category: "positive",
    });
  } else if (metrics.accountAge >= 30) {
    score += 4;
    factors.push({
      type: "account_age_new",
      impact: 4,
      description: "Client depuis plus d'1 mois",
      category: "positive",
    });
  } else if (metrics.accountAge >= 7) {
    score += 2;
    factors.push({
      type: "account_age_very_new",
      impact: 2,
      description: "Client depuis plus d'1 semaine",
      category: "positive",
    });
  }

  // 2. Purchase History (max +20)
  if (metrics.totalPurchases >= 50) {
    score += 20;
    factors.push({
      type: "purchase_history_power_user",
      impact: 20,
      description: `${metrics.totalPurchases} achats réussis - Client power user`,
      category: "positive",
    });
  } else if (metrics.totalPurchases >= 20) {
    score += 15;
    factors.push({
      type: "purchase_history_regular",
      impact: 15,
      description: `${metrics.totalPurchases} achats réussis - Client régulier`,
      category: "positive",
    });
  } else if (metrics.totalPurchases >= 10) {
    score += 12;
    factors.push({
      type: "purchase_history_returning",
      impact: 12,
      description: `${metrics.totalPurchases} achats réussis - Client fidèle`,
      category: "positive",
    });
  } else if (metrics.totalPurchases >= 5) {
    score += 8;
    factors.push({
      type: "purchase_history_multiple",
      impact: 8,
      description: `${metrics.totalPurchases} achats réussis`,
      category: "positive",
    });
  } else if (metrics.totalPurchases >= 2) {
    score += 4;
    factors.push({
      type: "purchase_history_second",
      impact: 4,
      description: "Client avec historique d'achat",
      category: "positive",
    });
  }

  // 3. Total Spending (max +10)
  if (metrics.totalSpent >= 10000) {
    score += 10;
    factors.push({
      type: "spending_vip",
      impact: 10,
      description: `${metrics.totalSpent.toFixed(0)}€ dépensés - Client VIP`,
      category: "positive",
    });
  } else if (metrics.totalSpent >= 5000) {
    score += 8;
    factors.push({
      type: "spending_high",
      impact: 8,
      description: `${metrics.totalSpent.toFixed(0)}€ dépensés`,
      category: "positive",
    });
  } else if (metrics.totalSpent >= 1000) {
    score += 6;
    factors.push({
      type: "spending_moderate",
      impact: 6,
      description: `${metrics.totalSpent.toFixed(0)}€ dépensés`,
      category: "positive",
    });
  } else if (metrics.totalSpent >= 500) {
    score += 4;
    factors.push({
      type: "spending_normal",
      impact: 4,
      description: `${metrics.totalSpent.toFixed(0)}€ dépensés`,
      category: "positive",
    });
  } else if (metrics.totalSpent >= 100) {
    score += 2;
    factors.push({
      type: "spending_low",
      impact: 2,
      description: `${metrics.totalSpent.toFixed(0)}€ dépensés`,
      category: "positive",
    });
  }

  // 4. Active Subscription (max +10)
  if (metrics.hasActiveSubscription) {
    score += 10;
    factors.push({
      type: "active_subscription",
      impact: 10,
      description: "Abonnement actif - Engagement fort",
      category: "positive",
    });
  }

  // 5. Purchase Frequency (max +5)
  if (metrics.purchaseFrequency >= 4) {
    score += 5;
    factors.push({
      type: "frequency_very_high",
      impact: 5,
      description: `${metrics.purchaseFrequency.toFixed(1)} achats/mois`,
      category: "positive",
    });
  } else if (metrics.purchaseFrequency >= 2) {
    score += 3;
    factors.push({
      type: "frequency_high",
      impact: 3,
      description: `${metrics.purchaseFrequency.toFixed(1)} achats/mois`,
      category: "positive",
    });
  } else if (metrics.purchaseFrequency >= 1) {
    score += 2;
    factors.push({
      type: "frequency_moderate",
      impact: 2,
      description: `${metrics.purchaseFrequency.toFixed(1)} achats/mois`,
      category: "positive",
    });
  }

  // 6. Consistency Bonus (max +10)
  const avgConsistency =
    (metrics.deviceConsistency + metrics.locationConsistency) / 2;
  if (avgConsistency >= 80) {
    score += 10;
    factors.push({
      type: "consistency_excellent",
      impact: 10,
      description: "Comportement très cohérent (appareil et localisation)",
      category: "positive",
    });
  } else if (avgConsistency >= 60) {
    score += 6;
    factors.push({
      type: "consistency_good",
      impact: 6,
      description: "Comportement cohérent",
      category: "positive",
    });
  } else if (avgConsistency >= 40) {
    score += 3;
    factors.push({
      type: "consistency_moderate",
      impact: 3,
      description: "Comportement partiellement cohérent",
      category: "positive",
    });
  }

  // ============================================
  // NEGATIVE FACTORS (max -70 points)
  // ============================================

  // 1. Disputes/Chargebacks (CRITICAL)
  if (metrics.disputeHistory > 0) {
    const penalty = metrics.disputeHistory * 30;
    score -= penalty;
    factors.push({
      type: "dispute_history",
      impact: -penalty,
      description: `${metrics.disputeHistory} litige(s) - Signal critique de fraude`,
      category: "negative",
    });
  }

  // 2. Refund Rate
  const refundRate =
    metrics.totalPurchases > 0
      ? metrics.refundHistory / metrics.totalPurchases
      : 0;

  if (refundRate >= 0.5) {
    score -= 25;
    factors.push({
      type: "refund_rate_critical",
      impact: -25,
      description: `Taux de remboursement élevé (${(refundRate * 100).toFixed(0)}%)`,
      category: "negative",
    });
  } else if (refundRate >= 0.3) {
    score -= 15;
    factors.push({
      type: "refund_rate_high",
      impact: -15,
      description: `Taux de remboursement ${(refundRate * 100).toFixed(0)}%`,
      category: "negative",
    });
  } else if (refundRate >= 0.2) {
    score -= 10;
    factors.push({
      type: "refund_rate_moderate",
      impact: -10,
      description: `Taux de remboursement ${(refundRate * 100).toFixed(0)}%`,
      category: "negative",
    });
  } else if (refundRate >= 0.1) {
    score -= 5;
    factors.push({
      type: "refund_rate_low",
      impact: -5,
      description: `Taux de remboursement ${(refundRate * 100).toFixed(0)}%`,
      category: "negative",
    });
  }

  // 3. Failed Payments
  const failureRate =
    metrics.totalPurchases > 0
      ? metrics.failedPayments / (metrics.totalPurchases + metrics.failedPayments)
      : 0;

  if (failureRate >= 0.5) {
    score -= 20;
    factors.push({
      type: "failure_rate_critical",
      impact: -20,
      description: `Taux d'échec élevé (${(failureRate * 100).toFixed(0)}%)`,
      category: "negative",
    });
  } else if (failureRate >= 0.3) {
    score -= 10;
    factors.push({
      type: "failure_rate_high",
      impact: -10,
      description: `Taux d'échec ${(failureRate * 100).toFixed(0)}%`,
      category: "negative",
    });
  } else if (failureRate >= 0.2) {
    score -= 5;
    factors.push({
      type: "failure_rate_moderate",
      impact: -5,
      description: `Taux d'échec ${(failureRate * 100).toFixed(0)}%`,
      category: "negative",
    });
  }

  // 4. Multiple Payment Methods (potential card testing)
  if (metrics.uniquePaymentMethods >= 5) {
    score -= 15;
    factors.push({
      type: "many_payment_methods_critical",
      impact: -15,
      description: `${metrics.uniquePaymentMethods} cartes différentes utilisées - Pattern suspect`,
      category: "negative",
    });
  } else if (metrics.uniquePaymentMethods >= 3) {
    score -= 8;
    factors.push({
      type: "many_payment_methods",
      impact: -8,
      description: `${metrics.uniquePaymentMethods} cartes différentes utilisées`,
      category: "negative",
    });
  }

  // 5. Inactivity Penalty
  if (
    metrics.daysSinceLastPurchase &&
    metrics.daysSinceLastPurchase > 365
  ) {
    score -= 10;
    factors.push({
      type: "inactivity_long",
      impact: -10,
      description: "Inactif depuis plus d'1 an",
      category: "negative",
    });
  } else if (
    metrics.daysSinceLastPurchase &&
    metrics.daysSinceLastPurchase > 180
  ) {
    score -= 5;
    factors.push({
      type: "inactivity_moderate",
      impact: -5,
      description: "Inactif depuis plus de 6 mois",
      category: "negative",
    });
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  const tier = getTrustTier(score);

  // Determine whitelist/blacklist status
  const shouldWhitelist = tier === "vip" || tier === "trusted";
  const shouldBlacklist = tier === "blocked";

  return {
    score,
    tier,
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    shouldWhitelist,
    shouldBlacklist,
  };
}

/**
 * Get trust tier from score
 */
export function getTrustTier(score: number): TrustTier {
  if (score < 20) return "blocked";
  if (score < 40) return "suspicious";
  if (score < 60) return "new";
  if (score < 80) return "trusted";
  return "vip";
}

/**
 * Get tier display information
 */
export function getTierInfo(tier: TrustTier): {
  label: string;
  color: string;
  description: string;
} {
  switch (tier) {
    case "vip":
      return {
        label: "VIP",
        color: "emerald",
        description: "Client de confiance maximale - Whitelist automatique",
      };
    case "trusted":
      return {
        label: "Trusted",
        color: "green",
        description: "Client de confiance - Friction réduite",
      };
    case "new":
      return {
        label: "New",
        color: "blue",
        description: "Nouveau client - Surveillance standard",
      };
    case "suspicious":
      return {
        label: "Suspicious",
        color: "orange",
        description: "Client suspect - Surveillance renforcée",
      };
    case "blocked":
      return {
        label: "Blocked",
        color: "red",
        description: "Client bloqué - Blacklist automatique",
      };
  }
}
