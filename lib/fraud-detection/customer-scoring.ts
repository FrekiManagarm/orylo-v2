/**
 * Customer Scoring
 *
 * Updates customer reputation and trust scores based on Stripe data.
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { customerTrustScores, type CustomerMetadata } from "@/lib/db/schemas";
import { eq, and } from "drizzle-orm";
import { calculateTrustScore, type CustomerMetrics, type TrustTier } from "./trust-score";

/**
 * Update customer trust score after a transaction
 */
export async function updateCustomerScore(
  organizationId: string,
  stripeCustomerId: string,
  stripeClient: Stripe
): Promise<void> {
  try {
    // Fetch customer from Stripe
    const customer = await stripeClient.customers.retrieve(stripeCustomerId);
    if (customer.deleted) {
      console.log(`[Customer Score] Customer ${stripeCustomerId} is deleted`);
      return;
    }

    // Fetch charges for this customer
    const charges = await stripeClient.charges.list({
      customer: stripeCustomerId,
      limit: 100,
    });

    // Fetch disputes for this customer
    const allDisputes = await stripeClient.disputes.list({ limit: 100 });
    const customerDisputes = allDisputes.data.filter((d) =>
      charges.data.some((c) => c.id === d.charge)
    );

    // Fetch payment methods
    const paymentMethods = await stripeClient.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    // Fetch subscriptions
    const subscriptions = await stripeClient.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
    });

    // Calculate metrics
    const successfulCharges = charges.data.filter((c) => c.paid && !c.refunded);
    const failedCharges = charges.data.filter((c) => !c.paid);
    const refundedCharges = charges.data.filter((c) => c.refunded);

    const totalSpentCents = successfulCharges.reduce((sum, c) => sum + c.amount, 0);
    const totalSpent = totalSpentCents / 100; // Convert to euros
    const avgAmount = successfulCharges.length > 0 ? totalSpent / successfulCharges.length : 0;
    const maxAmount = successfulCharges.length > 0
      ? Math.max(...successfulCharges.map((c) => c.amount / 100))
      : 0;
    const minAmount = successfulCharges.length > 0
      ? Math.min(...successfulCharges.map((c) => c.amount / 100))
      : 0;

    // Account age (days since customer creation)
    const accountAge = Math.floor(
      (Date.now() - customer.created * 1000) / (24 * 60 * 60 * 1000)
    );

    // Time since last purchase
    const lastCharge = successfulCharges[0];
    const daysSinceLastPurchase = lastCharge
      ? Math.floor((Date.now() - lastCharge.created * 1000) / (24 * 60 * 60 * 1000))
      : undefined;

    // Purchase frequency (purchases per month)
    const purchaseFrequency =
      accountAge > 0 ? (successfulCharges.length / accountAge) * 30 : 0;

    // Location consistency - check card countries
    const countries = new Set(
      successfulCharges
        .map((c) => c.payment_method_details?.card?.country)
        .filter(Boolean)
    );
    const locationConsistency =
      countries.size <= 1 ? 100 : Math.max(0, 100 - countries.size * 20);

    // Build metrics object
    const metrics: CustomerMetrics = {
      accountAge,
      totalPurchases: successfulCharges.length,
      totalSpent,
      avgPurchaseAmount: avgAmount,
      lastPurchaseDate: lastCharge ? new Date(lastCharge.created * 1000) : undefined,
      daysSinceLastPurchase,
      disputeHistory: customerDisputes.length,
      refundHistory: refundedCharges.length,
      failedPayments: failedCharges.length,
      uniquePaymentMethods: paymentMethods.data.length,
      hasActiveSubscription: subscriptions.data.length > 0,
      purchaseFrequency,
      deviceConsistency: 60, // Default - could be enhanced with fingerprinting
      locationConsistency,
    };

    // Calculate trust score
    const trustResult = calculateTrustScore(metrics);

    // Get first and last purchase dates
    const firstCharge =
      successfulCharges.length > 0
        ? successfulCharges[successfulCharges.length - 1]
        : null;

    // Check if existing record exists
    const [existingScore] = await db
      .select()
      .from(customerTrustScores)
      .where(
        and(
          eq(customerTrustScores.organizationId, organizationId),
          eq(customerTrustScores.stripeCustomerId, stripeCustomerId)
        )
      )
      .limit(1);

    // Build metadata
    const metadata: CustomerMetadata = {
      notes: `Last updated: ${new Date().toISOString()}`,
      riskLevel: trustResult.tier,
    };

    // Build data matching the schema
    const scoreData = {
      organizationId,
      stripeCustomerId,
      email: customer.email || "",
      name: customer.name || undefined,

      // Purchase history metrics
      successfulPayments: successfulCharges.length,
      totalSpent: totalSpent.toFixed(2),
      avgPurchaseAmount: avgAmount.toFixed(2),
      maxPurchaseAmount: maxAmount.toFixed(2),
      minPurchaseAmount: minAmount.toFixed(2),

      // Risk metrics
      disputeHistory: customerDisputes.length,
      refundHistory: refundedCharges.length,
      failedPayments: failedCharges.length,
      chargebackHistory: customerDisputes.length, // Using disputes as proxy for chargebacks

      // Account timeline
      accountAge,
      firstPurchaseAt: firstCharge ? new Date(firstCharge.created * 1000) : undefined,
      lastPurchaseAt: lastCharge ? new Date(lastCharge.created * 1000) : undefined,
      daysSinceLastPurchase,

      // Behavioral metrics
      purchaseFrequency: purchaseFrequency.toFixed(2),
      uniquePaymentMethods: paymentMethods.data.length,
      hasActiveSubscription: subscriptions.data.length > 0,
      subscriptionCount: subscriptions.data.length,
      uniqueCardsUsed: paymentMethods.data.length,

      // Consistency metrics
      deviceConsistency: 60,
      locationConsistency,
      uniqueCountries: countries.size,
      primaryCountry: countries.size > 0 ? Array.from(countries)[0] : undefined,
      lastCountry: countries.size > 0 ? Array.from(countries)[0] : undefined,

      // Trust score
      trustScore: trustResult.score,
      tier: trustResult.tier,

      // Flags
      whitelisted: trustResult.shouldWhitelist,
      blacklisted: trustResult.shouldBlacklist,
      autoWhitelistedAt: trustResult.shouldWhitelist ? new Date() : undefined,
      autoBlacklistedAt: trustResult.shouldBlacklist ? new Date() : undefined,

      // Metadata
      metadata,

      // Score calculation
      scoreCalculatedAt: new Date(),
      scoreCalculationMethod: "v1",

      updatedAt: new Date(),
    };

    if (existingScore) {
      // Update existing record with previous score tracking
      await db
        .update(customerTrustScores)
        .set({
          ...scoreData,
          previousTrustScore: existingScore.trustScore,
          trustScoreChange: trustResult.score - existingScore.trustScore,
          previousTier: existingScore.tier as TrustTier,
          tierChangedAt: existingScore.tier !== trustResult.tier ? new Date() : existingScore.tierChangedAt,
        })
        .where(eq(customerTrustScores.id, existingScore.id));
    } else {
      // Insert new record
      await db.insert(customerTrustScores).values(scoreData);
    }

    console.log(
      `[Trust Score] Updated ${stripeCustomerId}: ${trustResult.score}/100 (${trustResult.tier})`
    );
  } catch (error) {
    console.error("[Trust Score] Error updating customer score:", error);
  }
}

/**
 * Get customer trust score from database
 */
export async function getCustomerTrustScore(
  organizationId: string,
  stripeCustomerId: string
): Promise<{
  id: number;
  stripeCustomerId: string;
  email: string;
  trustScore: number;
  tier: string;
  totalPurchases: number;
  totalSpent: number;
  disputeHistory: number;
  whitelisted: boolean;
  blacklisted: boolean;
  accountAge: number;
  lastPurchaseAt: Date | null;
} | null> {
  const [score] = await db
    .select()
    .from(customerTrustScores)
    .where(
      and(
        eq(customerTrustScores.organizationId, organizationId),
        eq(customerTrustScores.stripeCustomerId, stripeCustomerId)
      )
    )
    .limit(1);

  if (!score) {
    return null;
  }

  return {
    id: score.id,
    stripeCustomerId: score.stripeCustomerId,
    email: score.email,
    trustScore: score.trustScore,
    tier: score.tier,
    totalPurchases: score.successfulPayments,
    totalSpent: parseFloat(score.totalSpent),
    disputeHistory: score.disputeHistory,
    whitelisted: score.whitelisted,
    blacklisted: score.blacklisted,
    accountAge: score.accountAge,
    lastPurchaseAt: score.lastPurchaseAt,
  };
}

/**
 * Get customer context for fraud detection
 */
export async function getCustomerContext(
  organizationId: string,
  stripeCustomerId: string
): Promise<{
  id: string;
  accountAge: number;
  totalPurchases: number;
  totalSpent: number;
  avgPurchaseAmount: number;
  disputeHistory: number;
  trustScore: number;
  tier: string;
  lastPurchaseDate?: Date;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
} | null> {
  const score = await getCustomerTrustScore(organizationId, stripeCustomerId);

  if (!score) {
    return null;
  }

  return {
    id: score.stripeCustomerId,
    accountAge: score.accountAge,
    totalPurchases: score.totalPurchases,
    totalSpent: score.totalSpent,
    avgPurchaseAmount: score.totalPurchases > 0 ? score.totalSpent / score.totalPurchases : 0,
    disputeHistory: score.disputeHistory,
    trustScore: score.trustScore,
    tier: score.tier,
    lastPurchaseDate: score.lastPurchaseAt || undefined,
    isWhitelisted: score.whitelisted,
    isBlacklisted: score.blacklisted,
  };
}

/**
 * Manually whitelist a customer
 */
export async function whitelistCustomer(
  organizationId: string,
  stripeCustomerId: string,
  whitelistedBy?: string,
  reason?: string
): Promise<void> {
  await db
    .update(customerTrustScores)
    .set({
      whitelisted: true,
      blacklisted: false,
      whitelistedAt: new Date(),
      whitelistedBy: whitelistedBy || "manual",
      whitelistReason: reason,
      manualOverride: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customerTrustScores.organizationId, organizationId),
        eq(customerTrustScores.stripeCustomerId, stripeCustomerId)
      )
    );
}

/**
 * Manually blacklist a customer
 */
export async function blacklistCustomer(
  organizationId: string,
  stripeCustomerId: string,
  blacklistedBy?: string,
  reason?: string
): Promise<void> {
  await db
    .update(customerTrustScores)
    .set({
      blacklisted: true,
      whitelisted: false,
      blacklistedAt: new Date(),
      blacklistedBy: blacklistedBy || "manual",
      blacklistReason: reason,
      manualOverride: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customerTrustScores.organizationId, organizationId),
        eq(customerTrustScores.stripeCustomerId, stripeCustomerId)
      )
    );
}

/**
 * Remove customer from whitelist/blacklist
 */
export async function resetCustomerLists(
  organizationId: string,
  stripeCustomerId: string
): Promise<void> {
  await db
    .update(customerTrustScores)
    .set({
      whitelisted: false,
      blacklisted: false,
      manualOverride: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customerTrustScores.organizationId, organizationId),
        eq(customerTrustScores.stripeCustomerId, stripeCustomerId)
      )
    );
}

/**
 * Set risk alert for a customer
 */
export async function setCustomerRiskAlert(
  organizationId: string,
  stripeCustomerId: string,
  reason: string
): Promise<void> {
  await db
    .update(customerTrustScores)
    .set({
      riskAlertActive: true,
      riskAlertReason: reason,
      riskAlertCreatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customerTrustScores.organizationId, organizationId),
        eq(customerTrustScores.stripeCustomerId, stripeCustomerId)
      )
    );
}

/**
 * Clear risk alert for a customer
 */
export async function clearCustomerRiskAlert(
  organizationId: string,
  stripeCustomerId: string
): Promise<void> {
  await db
    .update(customerTrustScores)
    .set({
      riskAlertActive: false,
      riskAlertReason: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customerTrustScores.organizationId, organizationId),
        eq(customerTrustScores.stripeCustomerId, stripeCustomerId)
      )
    );
}

/**
 * @deprecated Use getCustomerTrustScore instead
 */
export async function getCustomerReputation(
  organizationId: string,
  stripeCustomerId: string
) {
  const score = await getCustomerTrustScore(organizationId, stripeCustomerId);

  if (!score) {
    return null;
  }

  return {
    id: score.stripeCustomerId,
    trustScore: score.trustScore,
    tier: score.tier,
    totalPurchases: score.totalPurchases,
    totalSpent: score.totalSpent,
    disputeHistory: score.disputeHistory,
    isWhitelisted: score.whitelisted,
    isBlacklisted: score.blacklisted,
  };
}
