"use server";

import { db } from "@/lib/db";
import { FraudDetection, fraudDetections } from "@/lib/db/schemas";
import { cardTestingTrackers, CardTestingAttempt } from "@/lib/db/schemas/cardTestingTrackers";
import { eq, desc, and, gte, lte, sql, or } from "drizzle-orm";
import { auth } from "@/lib/auth/auth.server";
import { headers } from "next/headers";

import type { CardTestingTracker } from "@/lib/db/schemas/cardTestingTrackers";

export type FraudAnalysisFilters = {
  riskScoreRange?: "low" | "medium" | "high";
  compositeRiskLevel?: "minimal" | "low" | "moderate" | "elevated" | "high" | "critical";
  actions?: string[];
  dateRange?: "24h" | "7d" | "30d" | "all";
};

export type FraudDetectionWithCardTesting = FraudDetection & {
  cardTestingTracker: CardTestingTracker | null;
};

export async function getFraudAnalyses(options?: {
  limit?: number;
  offset?: number;
  filters?: FraudAnalysisFilters;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const org = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!session?.user?.id || !org?.id) {
      throw new Error("Unauthorized");
    }

    // Build conditions array
    const conditions = [eq(fraudDetections.organizationId, org.id)];

    // Apply filters
    if (options?.filters) {
      const { riskScoreRange, compositeRiskLevel, actions, dateRange } = options.filters;

      // Risk Score filter (legacy)
      if (riskScoreRange) {
        if (riskScoreRange === "low") {
          conditions.push(lte(fraudDetections.riskScore, 30));
        } else if (riskScoreRange === "medium") {
          conditions.push(
            and(
              gte(fraudDetections.riskScore, 30),
              lte(fraudDetections.riskScore, 70)
            )!
          );
        } else if (riskScoreRange === "high") {
          conditions.push(gte(fraudDetections.riskScore, 70));
        }
      }

      // Composite Risk Level filter (new)
      if (compositeRiskLevel) {
        conditions.push(eq(fraudDetections.compositeRiskLevel, compositeRiskLevel));
      }

      // Actions filter
      if (actions && actions.length > 0) {
        const actionConditions = actions.map((action) =>
          eq(fraudDetections.decision, action)
        );
        conditions.push(or(...actionConditions)!);
      }

      // Date range filter
      if (dateRange && dateRange !== "all") {
        const now = new Date();
        let startDate: Date;

        if (dateRange === "24h") {
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (dateRange === "7d") {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          // 30d
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        conditions.push(gte(fraudDetections.createdAt, startDate));
      }
    }

    let query = db
      .select({
        fraudDetection: fraudDetections,
        cardTestingTracker: cardTestingTrackers,
      })
      .from(fraudDetections)
      .leftJoin(
        cardTestingTrackers,
        eq(fraudDetections.cardTestingTrackerId, cardTestingTrackers.id)
      )
      .where(and(...conditions))
      .orderBy(desc(fraudDetections.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit) as unknown as typeof query;
    }

    if (options?.offset) {
      query = query.offset(options.offset) as unknown as typeof query;
    }

    const results = await query;
    
    // Transform results to include cardTestingTracker in each fraud detection
    const analyses: FraudDetectionWithCardTesting[] = results.map((row) => ({
      ...row.fraudDetection,
      cardTestingTracker: row.cardTestingTracker,
    }));
    
    return analyses;
  } catch (error) {
    console.error("Error fetching fraud analyses:", error);
    throw error;
  }
}

export async function getTotalFraudAnalysesCount(filters?: FraudAnalysisFilters) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const org = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!session?.user?.id || !org?.id) {
      throw new Error("Unauthorized");
    }

    // Build conditions array
    const conditions = [eq(fraudDetections.organizationId, org.id)];

    // Apply same filters as getFraudAnalyses
    if (filters) {
      const { riskScoreRange, actions, dateRange } = filters;

      if (riskScoreRange) {
        if (riskScoreRange === "low") {
          conditions.push(lte(fraudDetections.riskScore, 30));
        } else if (riskScoreRange === "medium") {
          conditions.push(
            and(
              gte(fraudDetections.riskScore, 30),
              lte(fraudDetections.riskScore, 70)
            )!
          );
        } else if (riskScoreRange === "high") {
          conditions.push(gte(fraudDetections.riskScore, 70));
        }
      }

      if (actions && actions.length > 0) {
        const actionConditions = actions.map((action) =>
          eq(fraudDetections.actionTaken, action)
        );
        conditions.push(or(...actionConditions)!);
      }

      if (dateRange && dateRange !== "all") {
        const now = new Date();
        let startDate: Date;

        if (dateRange === "24h") {
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (dateRange === "7d") {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        conditions.push(gte(fraudDetections.createdAt, startDate));
      }
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(fraudDetections)
      .where(and(...conditions));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error fetching fraud analyses count:", error);
    throw error;
  }
}

export async function getFraudAnalysisById(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const org = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!session?.user?.id || !org?.id) {
      throw new Error("Unauthorized");
    }

    const analysis = await db
      .select()
      .from(fraudDetections)
      .where(eq(fraudDetections.id, parseInt(id)))
      .limit(1);

    if (!analysis[0] || analysis[0].organizationId !== org.id) {
      throw new Error("Fraud analysis not found");
    }

    return analysis[0];
  } catch (error) {
    console.error("Error fetching fraud analysis:", error);
    throw error;
  }
}

export type CardTestingData = {
  trackers: any[];
  totalSuspicionScore: number;
  totalAttempts: number;
  hasCardTesting: boolean;
};

export async function getCardTestingDataByPaymentIntent(
  paymentIntentId: string
): Promise<CardTestingData> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const org = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!session?.user?.id || !org?.id) {
      throw new Error("Unauthorized");
    }

    // Récupérer tous les trackers de l'organisation
    const trackers = await db
      .select()
      .from(cardTestingTrackers)
      .where(eq(cardTestingTrackers.organizationId, org.id));

    // Filtrer les trackers qui contiennent ce paymentIntentId dans leurs attempts
    const relevantTrackers = trackers.filter((tracker) => {
      const attempts = tracker.attempts as CardTestingAttempt[];
      return attempts.some((attempt) => attempt.paymentIntentId === paymentIntentId);
    });

    // Calculer la somme des suspicionScore
    const totalSuspicionScore = relevantTrackers.reduce(
      (sum, tracker) => sum + (tracker.suspicionScore || 0),
      0
    );

    // Compter le nombre total d'attempts liés à ce paymentIntent
    const totalAttempts = relevantTrackers.reduce(
      (sum, tracker) => {
        const attempts = tracker.attempts as CardTestingAttempt[];
        return sum + attempts.filter((a) => a.paymentIntentId === paymentIntentId).length;
      },
      0
    );

    return {
      trackers: relevantTrackers,
      totalSuspicionScore,
      totalAttempts,
      hasCardTesting: relevantTrackers.length > 0,
    };
  } catch (error) {
    console.error("Error fetching card testing data:", error);
    return {
      trackers: [],
      totalSuspicionScore: 0,
      totalAttempts: 0,
      hasCardTesting: false,
    };
  }
}

export async function getDashboardStats() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const org = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!session?.user?.id || !org?.id) {
      throw new Error("Unauthorized");
    }

    // Get current month date range
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Get previous month date range
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // Get current month stats
    const currentMonthStats = await db
      .select({
        totalTransactions: sql<number>`count(*)::int`,
        totalBlocked: sql<number>`count(case when ${fraudDetections.blocked} = true then 1 end)::int`,
        totalAmount: sql<number>`sum(case when ${fraudDetections.blocked} = true then ${fraudDetections.amount} else 0 end)::int`,
        avgRiskScore: sql<number>`avg(${fraudDetections.riskScore})::int`,
      })
      .from(fraudDetections)
      .where(
        and(
          eq(fraudDetections.organizationId, org.id),
          gte(fraudDetections.createdAt, startOfCurrentMonth),
          lte(fraudDetections.createdAt, endOfCurrentMonth),
        ),
      );

    // Get previous month stats
    const lastMonthStats = await db
      .select({
        totalTransactions: sql<number>`count(*)::int`,
        totalBlocked: sql<number>`count(case when ${fraudDetections.blocked} = true then 1 end)::int`,
        totalAmount: sql<number>`sum(case when ${fraudDetections.blocked} = true then ${fraudDetections.amount} else 0 end)::int`,
        avgRiskScore: sql<number>`avg(${fraudDetections.riskScore})::int`,
      })
      .from(fraudDetections)
      .where(
        and(
          eq(fraudDetections.organizationId, org.id),
          gte(fraudDetections.createdAt, startOfLastMonth),
          lte(fraudDetections.createdAt, endOfLastMonth),
        ),
      );

    const current = currentMonthStats[0] || {
      totalTransactions: 0,
      totalBlocked: 0,
      totalAmount: 0,
      avgRiskScore: 0,
    };

    const previous = lastMonthStats[0] || {
      totalTransactions: 0,
      totalBlocked: 0,
      totalAmount: 0,
      avgRiskScore: 0,
    };

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      transactionsAnalyzed: {
        value: current.totalTransactions,
        change: calculateChange(
          current.totalTransactions,
          previous.totalTransactions,
        ),
      },
      fraudsBlocked: {
        value: current.totalBlocked,
        change: calculateChange(current.totalBlocked, previous.totalBlocked),
      },
      moneySaved: {
        value: current.totalAmount, // Amount in cents
        change: calculateChange(current.totalAmount, previous.totalAmount),
      },
      avgRiskScore: {
        value: current.avgRiskScore,
        change: calculateChange(current.avgRiskScore, previous.avgRiskScore),
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
}
