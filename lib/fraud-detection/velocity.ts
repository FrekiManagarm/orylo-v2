/**
 * Velocity Tracking
 *
 * Tracks payment attempts and detects card testing patterns.
 * Key feature: detecting when multiple different cards are tried on the same session.
 */

import { db } from "@/lib/db";
import { cardTestingTrackers, type CardTestingAttempt, type SuspicionReason } from "@/lib/db/schemas";
import { eq, and } from "drizzle-orm";

export interface VelocityMetrics {
  attemptsLastHour: number;
  attemptsLastDay: number;
  uniqueCardsUsed: number;
  failedAttempts: number;
  suspicionScore: number;
}

/**
 * Calculate velocity metrics for a session
 */
export async function calculateVelocityMetrics(
  organizationId: string,
  invoiceId: string,
  sessionId?: string
): Promise<VelocityMetrics> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [tracker] = await db
    .select()
    .from(cardTestingTrackers)
    .where(
      and(
        eq(cardTestingTrackers.organizationId, organizationId),
        eq(cardTestingTrackers.invoiceId, invoiceId),
        sessionId ? eq(cardTestingTrackers.sessionId, sessionId) : undefined
      )
    )
    .limit(1);

  if (!tracker || !tracker.attempts || tracker.attempts.length === 0) {
    return {
      attemptsLastHour: 0,
      attemptsLastDay: 0,
      uniqueCardsUsed: 0,
      failedAttempts: 0,
      suspicionScore: 0,
    };
  }

  const attempts = tracker.attempts;

  const attemptsLastHour = attempts.filter(
    (a) => new Date(a.timestamp) > oneHourAgo
  ).length;

  const attemptsLastDay = attempts.filter(
    (a) => new Date(a.timestamp) > oneDayAgo
  ).length;

  const uniqueCardsUsed = new Set(attempts.map((a) => a.cardFingerprint)).size;

  const failedAttempts = attempts.filter((a) => a.status === "failed").length;

  return {
    attemptsLastHour,
    attemptsLastDay,
    uniqueCardsUsed,
    failedAttempts,
    suspicionScore: tracker.suspicionScore,
  };
}

/**
 * Track a payment attempt for card testing detection
 */
export async function trackPaymentAttempt(
  organizationId: string,
  invoiceId: string,
  attempt: Omit<CardTestingAttempt, "timestamp">,
  sessionId?: string
): Promise<{
  trackerId: string;
  suspicionScore: number;
  reasons: SuspicionReason[];
  recommendation: "ALLOW" | "REVIEW" | "BLOCK";
  blocked: boolean;
}> {
  const [existingTracker] = await db
    .select()
    .from(cardTestingTrackers)
    .where(
      and(
        eq(cardTestingTrackers.organizationId, organizationId),
        eq(cardTestingTrackers.invoiceId, invoiceId)
      )
    )
    .limit(1);

  const attemptWithTimestamp: CardTestingAttempt = {
    ...attempt,
    timestamp: new Date().toISOString(),
  };

  if (!existingTracker) {
    // First attempt for this invoice
    const [newTracker] = await db
      .insert(cardTestingTrackers)
      .values({
        organizationId,
        invoiceId,
        sessionId: sessionId || null,
        attempts: [attemptWithTimestamp],
        uniqueCards: 1,
        suspicionScore: 0,
        suspicionReasons: [],
        recommendation: "ALLOW",
      })
      .returning();

    return {
      trackerId: newTracker.id,
      suspicionScore: 0,
      reasons: [],
      recommendation: "ALLOW",
      blocked: false,
    };
  }

  // Update existing tracker
  const currentAttempts = existingTracker.attempts || [];
  const updatedAttempts = [...currentAttempts, attemptWithTimestamp];

  // Calculate metrics
  const uniqueCards = new Set(updatedAttempts.map((a) => a.cardFingerprint)).size;
  const failedCount = updatedAttempts.filter((a) => a.status === "failed").length;
  const totalAttempts = updatedAttempts.length;

  // Calculate suspicion score and reasons
  const { suspicionScore, reasons } = calculateSuspicionScore(
    uniqueCards,
    failedCount,
    totalAttempts,
    updatedAttempts
  );

  // Determine recommendation
  let recommendation: "ALLOW" | "REVIEW" | "BLOCK" = "ALLOW";
  let blocked = false;

  if (suspicionScore >= 80) {
    recommendation = "BLOCK";
    blocked = true;
  } else if (suspicionScore >= 50) {
    recommendation = "REVIEW";
  }

  // Update database
  await db
    .update(cardTestingTrackers)
    .set({
      attempts: updatedAttempts,
      uniqueCards,
      suspicionScore,
      suspicionReasons: reasons,
      recommendation,
      blocked,
      updatedAt: new Date(),
    })
    .where(eq(cardTestingTrackers.id, existingTracker.id));

  return {
    trackerId: existingTracker.id,
    suspicionScore,
    reasons,
    recommendation,
    blocked,
  };
}

/**
 * Calculate suspicion score for card testing
 */
function calculateSuspicionScore(
  uniqueCards: number,
  failedCount: number,
  totalAttempts: number,
  attempts: CardTestingAttempt[]
): { suspicionScore: number; reasons: SuspicionReason[] } {
  let score = 0;
  const reasons: SuspicionReason[] = [];

  // Multiple unique cards (MAIN SIGNAL)
  if (uniqueCards >= 5) {
    score += 50;
    reasons.push({
      label: "Card Testing Critique",
      description: `${uniqueCards} cartes différentes utilisées sur la même session`,
      weight: 50,
      severity: "high",
    });
  } else if (uniqueCards >= 3) {
    score += 35;
    reasons.push({
      label: "Card Testing Probable",
      description: `${uniqueCards} cartes différentes utilisées`,
      weight: 35,
      severity: "high",
    });
  } else if (uniqueCards >= 2) {
    score += 20;
    reasons.push({
      label: "Cartes Multiples",
      description: `${uniqueCards} cartes différentes utilisées`,
      weight: 20,
      severity: "medium",
    });
  }

  // High failure rate
  const failureRate = totalAttempts > 0 ? failedCount / totalAttempts : 0;
  if (failureRate >= 0.8 && failedCount >= 3) {
    score += 30;
    reasons.push({
      label: "Taux d'échec très élevé",
      description: `${failedCount}/${totalAttempts} tentatives échouées (${Math.round(failureRate * 100)}%)`,
      weight: 30,
      severity: "high",
    });
  } else if (failureRate >= 0.5 && failedCount >= 2) {
    score += 15;
    reasons.push({
      label: "Taux d'échec élevé",
      description: `${failedCount}/${totalAttempts} tentatives échouées`,
      weight: 15,
      severity: "medium",
    });
  }

  // Rapid attempts (within short time window)
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sortedAttempts.length >= 3) {
    const first = new Date(sortedAttempts[0].timestamp).getTime();
    const last = new Date(sortedAttempts[sortedAttempts.length - 1].timestamp).getTime();
    const durationMinutes = (last - first) / 1000 / 60;

    if (sortedAttempts.length >= 5 && durationMinutes < 5) {
      score += 25;
      reasons.push({
        label: "Tentatives très rapides",
        description: `${sortedAttempts.length} tentatives en ${Math.round(durationMinutes)} min`,
        weight: 25,
        severity: "high",
      });
    } else if (sortedAttempts.length >= 3 && durationMinutes < 10) {
      score += 15;
      reasons.push({
        label: "Tentatives rapides",
        description: `${sortedAttempts.length} tentatives en ${Math.round(durationMinutes)} min`,
        weight: 15,
        severity: "medium",
      });
    }
  }

  // Small amounts pattern (card testing often uses small amounts)
  const smallAmounts = attempts.filter((a) => a.amount && a.amount < 500); // < €5
  if (smallAmounts.length >= 3) {
    score += 15;
    reasons.push({
      label: "Petits montants répétés",
      description: `${smallAmounts.length} tentatives avec montant < 5€`,
      weight: 15,
      severity: "medium",
    });
  }

  // Different card brands (less common but suspicious)
  const uniqueBrands = new Set(attempts.map((a) => a.cardBrand)).size;
  if (uniqueBrands >= 3) {
    score += 10;
    reasons.push({
      label: "Marques de cartes variées",
      description: `${uniqueBrands} marques différentes (Visa, Mastercard, etc.)`,
      weight: 10,
      severity: "low",
    });
  }

  // Clamp score to 0-100
  const suspicionScore = Math.max(0, Math.min(100, score));

  return {
    suspicionScore,
    reasons: reasons.sort((a, b) => b.weight - a.weight),
  };
}

/**
 * Check if a session should be blocked
 */
export async function shouldBlockSession(
  organizationId: string,
  invoiceId: string,
  sessionId?: string
): Promise<{ blocked: boolean; reason?: string }> {
  const conditions = [
    eq(cardTestingTrackers.organizationId, organizationId),
    eq(cardTestingTrackers.invoiceId, invoiceId),
    ...(sessionId ? [eq(cardTestingTrackers.sessionId, sessionId)] : []),
  ];

  const [tracker] = await db
    .select()
    .from(cardTestingTrackers)
    .where(and(...conditions))
    .limit(1);

  if (!tracker) {
    return { blocked: false };
  }

  if (tracker.blocked) {
    return {
      blocked: true,
      reason: `Session bloquée: ${tracker.uniqueCards} cartes différentes détectées`,
    };
  }

  if (tracker.suspicionScore >= 80) {
    return {
      blocked: true,
      reason: `Score de suspicion critique: ${tracker.suspicionScore}/100`,
    };
  }

  return { blocked: false };
}

/**
 * Get session tracking summary
 */
export async function getSessionSummary(
  organizationId: string,
  invoiceId: string,
  sessionId?: string
): Promise<{
  exists: boolean;
  uniqueCards: number;
  totalAttempts: number;
  suspicionScore: number;
  recommendation: "ALLOW" | "REVIEW" | "BLOCK" | null;
  reasons: SuspicionReason[];
} | null> {
  const conditions = [
    eq(cardTestingTrackers.organizationId, organizationId),
    eq(cardTestingTrackers.invoiceId, invoiceId),
    ...(sessionId ? [eq(cardTestingTrackers.sessionId, sessionId)] : []),
  ];

  const [tracker] = await db
    .select()
    .from(cardTestingTrackers)
    .where(and(...conditions))
    .limit(1);

  if (!tracker) {
    return null;
  }

  return {
    exists: true,
    uniqueCards: tracker.uniqueCards,
    totalAttempts: tracker.attempts?.length || 0,
    suspicionScore: tracker.suspicionScore,
    recommendation: tracker.recommendation,
    reasons: tracker.suspicionReasons || [],
  };
}
