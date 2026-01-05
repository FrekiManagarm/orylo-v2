/**
 * Fraud Detection Utilities
 *
 * Helper functions for fraud detection.
 */

import crypto from "crypto";
import type {
  TransactionContext,
  FraudDecision,
  CustomerTier,
  RiskScoreDisplay,
  DecisionDisplay,
  TierDisplay,
} from "./types";

// ==========================================
// FINGERPRINTING
// ==========================================

/**
 * Generate a unique fingerprint for a card
 */
export function generateCardFingerprint(
  last4: string,
  brand: string,
  expMonth?: number,
  expYear?: number
): string {
  const data = `${last4}${brand}${expMonth || ""}${expYear || ""}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

/**
 * Generate a device fingerprint from user agent and other data
 */
export function generateDeviceFingerprint(
  userAgent?: string,
  ipAddress?: string,
  acceptLanguage?: string
): string {
  const data = `${userAgent || ""}${ipAddress || ""}${acceptLanguage || ""}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

// ==========================================
// TIME UTILITIES
// ==========================================

/**
 * Extract hour and day of week from a date
 */
export function extractTimeInfo(date: Date): {
  hourOfDay: number;
  dayOfWeek: number;
} {
  return {
    hourOfDay: date.getHours(),
    dayOfWeek: date.getDay(),
  };
}

/**
 * Check if a time is during unusual hours (3am-6am)
 */
export function isUnusualTime(hourOfDay: number): boolean {
  return hourOfDay >= 3 && hourOfDay < 6;
}

/**
 * Check if a time is during business hours
 */
export function isBusinessHours(hourOfDay: number, dayOfWeek: number): boolean {
  // Monday-Friday 9am-6pm
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWorkingHours = hourOfDay >= 9 && hourOfDay < 18;
  return isWeekday && isWorkingHours;
}

// ==========================================
// FORMATTING
// ==========================================

/**
 * Format amount for display
 */
export function formatAmount(cents: number, currency: string = "eur"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Format risk score for display
 */
export function formatRiskScore(score: number): RiskScoreDisplay {
  if (score <= 30) {
    return {
      label: "Faible",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
    };
  } else if (score <= 50) {
    return {
      label: "Modéré",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    };
  } else if (score <= 70) {
    return {
      label: "Élevé",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
    };
  } else {
    return {
      label: "Critique",
      color: "text-red-400",
      bgColor: "bg-red-500/20",
    };
  }
}

/**
 * Format fraud decision for display
 */
export function formatDecision(decision: FraudDecision): DecisionDisplay {
  switch (decision) {
    case "ALLOW":
      return {
        label: "Autorisé",
        color: "text-emerald-400",
        icon: "CheckCircle",
      };
    case "REVIEW":
      return {
        label: "À vérifier",
        color: "text-yellow-400",
        icon: "AlertTriangle",
      };
    case "BLOCK":
      return {
        label: "Bloqué",
        color: "text-red-400",
        icon: "XCircle",
      };
  }
}

/**
 * Format customer tier for display
 */
export function formatTier(tier: CustomerTier): TierDisplay {
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

// ==========================================
// CALCULATIONS
// ==========================================

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (24 * 60 * 60 * 1000));
}

/**
 * Calculate seconds between two dates
 */
export function secondsBetween(date1: Date, date2: Date): number {
  return Math.abs(Math.floor((date2.getTime() - date1.getTime()) / 1000));
}

// ==========================================
// VALIDATION
// ==========================================

/**
 * Validate transaction context for required fields
 */
export function validateTransactionContext(
  context: TransactionContext
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.paymentIntentId) {
    errors.push("Missing paymentIntentId");
  }

  if (!context.amount || context.amount <= 0) {
    errors.push("Invalid amount");
  }

  if (!context.currency) {
    errors.push("Missing currency");
  }

  if (!context.timestamp) {
    errors.push("Missing timestamp");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if an IP address looks suspicious
 * Note: This is a basic check - production would use an IP reputation service
 */
export function isSuspiciousIP(ipAddress: string): boolean {
  // Check for common VPN/proxy ranges (simplified)
  const suspiciousPatterns = [
    /^10\./,      // Private range
    /^192\.168\./, // Private range
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private range
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(ipAddress));
}

/**
 * Check if email domain is disposable/temporary
 * Note: This is a basic check - production would use a comprehensive list
 */
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    "tempmail.com",
    "throwaway.email",
    "guerrillamail.com",
    "10minutemail.com",
    "mailinator.com",
    "yopmail.com",
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}

// ==========================================
// THRESHOLDS
// ==========================================

export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 50,
  HIGH: 70,
  CRITICAL: 85,
} as const;

export const AMOUNT_THRESHOLDS = {
  SMALL: 500,     // €5 in cents
  MEDIUM: 10000,  // €100 in cents
  HIGH: 50000,    // €500 in cents
  VERY_HIGH: 100000, // €1000 in cents
} as const;

export const VELOCITY_THRESHOLDS = {
  ATTEMPTS_PER_HOUR_WARNING: 3,
  ATTEMPTS_PER_HOUR_CRITICAL: 5,
  UNIQUE_CARDS_WARNING: 2,
  UNIQUE_CARDS_SUSPICIOUS: 3,
  UNIQUE_CARDS_CRITICAL: 5,
} as const;

// ==========================================
// SCORE HELPERS
// ==========================================

/**
 * Clamp a score to 0-100 range
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get decision from risk score
 */
export function getDecisionFromScore(score: number): FraudDecision {
  if (score <= RISK_THRESHOLDS.LOW) return "ALLOW";
  if (score <= RISK_THRESHOLDS.HIGH) return "REVIEW";
  return "BLOCK";
}

/**
 * Get confidence level from score
 */
export function getConfidenceFromScore(
  score: number,
  decision: FraudDecision
): "low" | "medium" | "high" {
  if (decision === "ALLOW") {
    return score <= 15 ? "high" : "medium";
  } else if (decision === "BLOCK") {
    return score >= RISK_THRESHOLDS.CRITICAL ? "high" : "medium";
  }
  return "medium";
}
