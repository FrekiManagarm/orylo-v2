/**
 * Card Testing Detection
 *
 * Advanced analysis for detecting card testing patterns.
 * Card testing is when fraudsters try multiple stolen card numbers
 * to find valid ones before making larger purchases.
 */

import { db } from "@/lib/db";
import {
  cardTestingTrackers,
  type CardTestingAttempt,
  type SuspicionReason,
} from "@/lib/db/schemas";
import { eq, and } from "drizzle-orm";
import type {
  CardTestingAnalysis,
  CardTestingReason,
  FraudDecision,
} from "./types";

// ==========================================
// ANALYSIS FUNCTIONS
// ==========================================

/**
 * Analyze card testing pattern for an invoice
 */
export async function analyzeCardTestingPattern(
  organizationId: string,
  invoiceId: string
): Promise<CardTestingAnalysis> {
  const [tracker] = await db
    .select()
    .from(cardTestingTrackers)
    .where(
      and(
        eq(cardTestingTrackers.organizationId, organizationId),
        eq(cardTestingTrackers.invoiceId, invoiceId)
      )
    )
    .limit(1);

  if (!tracker || !tracker.attempts || tracker.attempts.length === 0) {
    return createEmptyAnalysis();
  }

  const attempts = tracker.attempts;
  const analysis = calculateCardTestingMetrics(attempts);

  return {
    suspicionScore: tracker.suspicionScore,
    isCardTesting: tracker.suspicionScore >= 50,
    shouldBlock: tracker.blocked || tracker.suspicionScore >= 80,
    reasons: convertToCardTestingReasons(tracker.suspicionReasons || []),
    metrics: analysis.metrics,
    recommendation: getRecommendation(tracker.suspicionScore),
  };
}

/**
 * Quick check if an attempt looks like card testing
 */
export function isCardTestingAttempt(
  attempts: CardTestingAttempt[],
  currentAttempt: Omit<CardTestingAttempt, "timestamp">
): {
  isLikelyCardTesting: boolean;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let confidence = 0;

  // Check unique cards count
  const allAttempts = [
    ...attempts,
    { ...currentAttempt, timestamp: new Date().toISOString() },
  ];
  const uniqueCards = new Set(allAttempts.map((a) => a.cardFingerprint)).size;

  if (uniqueCards >= 5) {
    confidence += 50;
    reasons.push(`${uniqueCards} cartes différentes détectées`);
  } else if (uniqueCards >= 3) {
    confidence += 35;
    reasons.push(`${uniqueCards} cartes différentes utilisées`);
  } else if (uniqueCards >= 2) {
    confidence += 20;
    reasons.push(`${uniqueCards} cartes différentes`);
  }

  // Check failure rate
  const failedCount = allAttempts.filter((a) => a.status === "failed").length;
  const failureRate = allAttempts.length > 0 ? failedCount / allAttempts.length : 0;

  if (failureRate >= 0.8 && failedCount >= 3) {
    confidence += 30;
    reasons.push(`Taux d'échec très élevé (${Math.round(failureRate * 100)}%)`);
  } else if (failureRate >= 0.5 && failedCount >= 2) {
    confidence += 15;
    reasons.push(`Taux d'échec élevé (${Math.round(failureRate * 100)}%)`);
  }

  // Check for rapid attempts
  if (allAttempts.length >= 3) {
    const sorted = [...allAttempts].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const first = new Date(sorted[0].timestamp).getTime();
    const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const durationMinutes = (last - first) / 1000 / 60;

    if (sorted.length >= 5 && durationMinutes < 5) {
      confidence += 25;
      reasons.push(`${sorted.length} tentatives en moins de 5 minutes`);
    } else if (sorted.length >= 3 && durationMinutes < 10) {
      confidence += 15;
      reasons.push(`${sorted.length} tentatives en ${Math.round(durationMinutes)} minutes`);
    }
  }

  // Check for small amounts
  const smallAmounts = allAttempts.filter((a) => a.amount && a.amount < 500);
  if (smallAmounts.length >= 3) {
    confidence += 15;
    reasons.push(`${smallAmounts.length} tentatives avec petits montants`);
  }

  // Normalize confidence to 0-100
  confidence = Math.min(100, confidence);

  return {
    isLikelyCardTesting: confidence >= 50,
    confidence,
    reasons,
  };
}

/**
 * Get card testing analysis from database
 */
export async function getCardTestingAnalysis(
  organizationId: string,
  invoiceId: string
): Promise<CardTestingAnalysis | null> {
  const [tracker] = await db
    .select()
    .from(cardTestingTrackers)
    .where(
      and(
        eq(cardTestingTrackers.organizationId, organizationId),
        eq(cardTestingTrackers.invoiceId, invoiceId)
      )
    )
    .limit(1);

  if (!tracker) {
    return null;
  }

  const attempts = tracker.attempts || [];
  const metrics = calculateCardTestingMetrics(attempts);

  return {
    suspicionScore: tracker.suspicionScore,
    isCardTesting: tracker.suspicionScore >= 50,
    shouldBlock: tracker.blocked,
    reasons: convertToCardTestingReasons(tracker.suspicionReasons || []),
    metrics: metrics.metrics,
    recommendation: tracker.recommendation || "ALLOW",
  };
}

/**
 * Mark a card testing tracker as resolved
 */
export async function resolveCardTesting(
  organizationId: string,
  invoiceId: string,
  resolution: "allowed" | "blocked" | "expired",
  resolvedBy: string
): Promise<void> {
  await db
    .update(cardTestingTrackers)
    .set({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cardTestingTrackers.organizationId, organizationId),
        eq(cardTestingTrackers.invoiceId, invoiceId)
      )
    );
}

/**
 * Block an invoice for card testing
 */
export async function blockForCardTesting(
  organizationId: string,
  invoiceId: string,
  reason: string
): Promise<void> {
  await db
    .update(cardTestingTrackers)
    .set({
      blocked: true,
      blockedAt: new Date(),
      blockedReason: reason,
      recommendation: "BLOCK",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cardTestingTrackers.organizationId, organizationId),
        eq(cardTestingTrackers.invoiceId, invoiceId)
      )
    );
}

/**
 * Get all active card testing trackers for an organization
 */
export async function getActiveCardTestingTrackers(
  organizationId: string,
  limit: number = 10
): Promise<
  Array<{
    invoiceId: string;
    uniqueCards: number;
    totalAttempts: number;
    suspicionScore: number;
    blocked: boolean;
    recommendation: FraudDecision | null;
    createdAt: Date;
  }>
> {
  const trackers = await db
    .select({
      invoiceId: cardTestingTrackers.invoiceId,
      uniqueCards: cardTestingTrackers.uniqueCards,
      totalAttempts: cardTestingTrackers.totalAttempts,
      suspicionScore: cardTestingTrackers.suspicionScore,
      blocked: cardTestingTrackers.blocked,
      recommendation: cardTestingTrackers.recommendation,
      createdAt: cardTestingTrackers.createdAt,
    })
    .from(cardTestingTrackers)
    .where(
      and(
        eq(cardTestingTrackers.organizationId, organizationId),
        eq(cardTestingTrackers.resolved, false)
      )
    )
    .orderBy(cardTestingTrackers.suspicionScore)
    .limit(limit);

  return trackers;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createEmptyAnalysis(): CardTestingAnalysis {
  return {
    suspicionScore: 0,
    isCardTesting: false,
    shouldBlock: false,
    reasons: [],
    metrics: {
      uniqueCards: 0,
      totalAttempts: 0,
      failureRate: 0,
      timespanSeconds: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
    },
    recommendation: "ALLOW",
  };
}

function calculateCardTestingMetrics(attempts: CardTestingAttempt[]): {
  metrics: CardTestingAnalysis["metrics"];
} {
  if (attempts.length === 0) {
    return {
      metrics: {
        uniqueCards: 0,
        totalAttempts: 0,
        failureRate: 0,
        timespanSeconds: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
      },
    };
  }

  const uniqueCards = new Set(attempts.map((a) => a.cardFingerprint)).size;
  const successfulAttempts = attempts.filter((a) => a.status === "succeeded").length;
  const failedAttempts = attempts.filter((a) => a.status === "failed").length;
  const failureRate = attempts.length > 0 ? failedAttempts / attempts.length : 0;

  // Calculate timespan
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const first = new Date(sorted[0].timestamp).getTime();
  const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const timespanSeconds = Math.floor((last - first) / 1000);

  return {
    metrics: {
      uniqueCards,
      totalAttempts: attempts.length,
      failureRate,
      timespanSeconds,
      successfulAttempts,
      failedAttempts,
    },
  };
}

function convertToCardTestingReasons(
  suspicionReasons: SuspicionReason[]
): CardTestingReason[] {
  return suspicionReasons.map((r) => ({
    label: r.label,
    description: r.description,
    weight: r.weight,
    severity: r.severity,
  }));
}

function getRecommendation(suspicionScore: number): FraudDecision {
  if (suspicionScore >= 80) return "BLOCK";
  if (suspicionScore >= 50) return "REVIEW";
  return "ALLOW";
}

// ==========================================
// SCORING THRESHOLDS
// ==========================================

export const CARD_TESTING_THRESHOLDS = {
  // Number of unique cards
  CARDS_WARNING: 2,
  CARDS_SUSPICIOUS: 3,
  CARDS_CRITICAL: 5,

  // Failure rate
  FAILURE_RATE_WARNING: 0.5,
  FAILURE_RATE_CRITICAL: 0.8,

  // Time-based
  RAPID_ATTEMPTS_WINDOW_MINUTES: 5,
  RAPID_ATTEMPTS_COUNT: 5,

  // Suspicion score
  SCORE_WARNING: 50,
  SCORE_CRITICAL: 80,

  // Small amounts (in cents)
  SMALL_AMOUNT_THRESHOLD: 500, // €5
} as const;
