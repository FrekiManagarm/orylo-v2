/**
 * Context Builder
 *
 * Builds transaction context from Stripe data for fraud detection.
 */

import Stripe from "stripe";
import type {
  TransactionContext,
  CustomerContext,
  VelocityMetrics,
} from "./types";
import { getCustomerContext } from "./customer-scoring";
import { calculateVelocityMetrics } from "./velocity";
import { generateCardFingerprint, extractTimeInfo } from "./utils";

// ==========================================
// MAIN BUILDER
// ==========================================

/**
 * Build complete transaction context from Stripe PaymentIntent
 */
export async function buildTransactionContext(
  paymentIntent: Stripe.PaymentIntent,
  charge: Stripe.Charge | null,
  organizationId: string,
  options?: {
    includeVelocity?: boolean;
    includeCustomer?: boolean;
    invoiceId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<TransactionContext> {
  const now = new Date();
  const timeInfo = extractTimeInfo(now);

  // Extract card details from charge
  const cardDetails = extractCardDetails(charge);

  // Build base context
  const context: TransactionContext = {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    customerEmail: charge?.billing_details?.email || paymentIntent.receipt_email || undefined,
    customerName: charge?.billing_details?.name || undefined,
    description: paymentIntent.description || undefined,

    // Stripe references
    stripeChargeId: charge?.id,
    stripeInvoiceId: (paymentIntent as { invoice?: string }).invoice || undefined,
    stripeCustomerId: paymentIntent.customer as string | undefined,

    // Card details
    ...cardDetails,

    // Location data
    ipAddress: options?.ipAddress,

    // Device data
    deviceFingerprint: options?.deviceFingerprint,
    userAgent: options?.userAgent,

    // Timing
    timestamp: now,
    hourOfDay: timeInfo.hourOfDay,
    dayOfWeek: timeInfo.dayOfWeek,

    // Session/Invoice
    invoiceId: options?.invoiceId,
    sessionId: options?.sessionId,
    metadata: (paymentIntent.metadata as Record<string, string>) || undefined,
  };

  // Enrich with customer data if requested
  if (options?.includeCustomer && paymentIntent.customer) {
    const customerContext = await getCustomerContext(
      organizationId,
      paymentIntent.customer as string
    );
    if (customerContext) {
      context.customer = {
        ...customerContext,
        tier: customerContext.tier as CustomerContext["tier"],
        // Add default values for required fields not returned by getCustomerContext
        refundHistory: 0,
        failedPayments: 0,
        chargebackHistory: 0,
        purchaseFrequency: 0,
        hasActiveSubscription: false,
        uniquePaymentMethods: 0,
      };
    }
  }

  // Enrich with velocity data if requested
  if (options?.includeVelocity && options.invoiceId) {
    const velocityMetrics = await calculateVelocityMetrics(
      organizationId,
      options.invoiceId,
      options.sessionId
    );
    context.velocity = velocityMetrics;
  }

  return context;
}

/**
 * Build context from raw data (without Stripe API calls)
 */
export function buildContextFromData(data: {
  paymentIntentId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  stripeCustomerId?: string;
  cardLast4?: string;
  cardBrand?: string;
  cardCountry?: string;
  cardFingerprint?: string;
  cardFunding?: string;
  ipAddress?: string;
  ipCountry?: string;
  customer?: CustomerContext;
  velocity?: VelocityMetrics;
  invoiceId?: string;
  sessionId?: string;
  metadata?: Record<string, string>;
}): TransactionContext {
  const now = new Date();
  const timeInfo = extractTimeInfo(now);

  return {
    paymentIntentId: data.paymentIntentId,
    amount: data.amount,
    currency: data.currency,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    stripeCustomerId: data.stripeCustomerId,
    cardLast4: data.cardLast4,
    cardBrand: data.cardBrand,
    cardCountry: data.cardCountry,
    cardFingerprint: data.cardFingerprint,
    cardFunding: data.cardFunding,
    ipAddress: data.ipAddress,
    ipCountry: data.ipCountry,
    timestamp: now,
    hourOfDay: timeInfo.hourOfDay,
    dayOfWeek: timeInfo.dayOfWeek,
    customer: data.customer,
    velocity: data.velocity,
    invoiceId: data.invoiceId,
    sessionId: data.sessionId,
    metadata: data.metadata,
  };
}

// ==========================================
// ENRICHMENT FUNCTIONS
// ==========================================

/**
 * Enrich context with customer data
 */
export async function enrichWithCustomerData(
  context: TransactionContext,
  organizationId: string
): Promise<TransactionContext> {
  if (!context.stripeCustomerId) {
    return context;
  }

  const customerContext = await getCustomerContext(
    organizationId,
    context.stripeCustomerId
  );

  if (customerContext) {
    return {
      ...context,
      customer: {
        ...customerContext,
        tier: customerContext.tier as CustomerContext["tier"],
        // Add default values for required fields not returned by getCustomerContext
        refundHistory: 0,
        failedPayments: 0,
        chargebackHistory: 0,
        purchaseFrequency: 0,
        hasActiveSubscription: false,
        uniquePaymentMethods: 0,
      },
    };
  }

  return context;
}

/**
 * Enrich context with velocity data
 */
export async function enrichWithVelocityData(
  context: TransactionContext,
  organizationId: string,
  invoiceId: string,
  sessionId?: string
): Promise<TransactionContext> {
  const velocityMetrics = await calculateVelocityMetrics(
    organizationId,
    invoiceId,
    sessionId
  );

  return {
    ...context,
    velocity: velocityMetrics,
    invoiceId,
    sessionId,
  };
}

/**
 * Enrich context with IP geolocation data
 * Note: This is a placeholder - actual implementation would use an IP geolocation service
 */
export function enrichWithIpData(
  context: TransactionContext,
  ipData: {
    country?: string;
    region?: string;
    city?: string;
  }
): TransactionContext {
  return {
    ...context,
    ipCountry: ipData.country,
    ipRegion: ipData.region,
    ipCity: ipData.city,
  };
}

/**
 * Enrich context with device data
 */
export function enrichWithDeviceData(
  context: TransactionContext,
  deviceData: {
    fingerprint?: string;
    userAgent?: string;
    deviceType?: string;
    browser?: string;
  }
): TransactionContext {
  return {
    ...context,
    deviceFingerprint: deviceData.fingerprint,
    userAgent: deviceData.userAgent,
    deviceType: deviceData.deviceType,
    browser: deviceData.browser,
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Extract card details from Stripe charge
 */
function extractCardDetails(charge: Stripe.Charge | null): {
  cardLast4?: string;
  cardBrand?: string;
  cardCountry?: string;
  cardFingerprint?: string;
  cardFunding?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
} {
  if (!charge) {
    return {};
  }

  const card = charge.payment_method_details?.card;
  if (!card) {
    return {};
  }

  // Generate fingerprint if we have enough data
  let fingerprint = card.fingerprint;
  if (!fingerprint && card.last4 && card.brand) {
    fingerprint = generateCardFingerprint(
      card.last4,
      card.brand,
      card.exp_month,
      card.exp_year
    );
  }

  return {
    cardLast4: card.last4 || undefined,
    cardBrand: card.brand || undefined,
    cardCountry: card.country || undefined,
    cardFingerprint: fingerprint || undefined,
    cardFunding: card.funding || undefined,
    cardExpMonth: card.exp_month || undefined,
    cardExpYear: card.exp_year || undefined,
  };
}

/**
 * Get charge from PaymentIntent
 */
export async function getChargeFromPaymentIntent(
  stripeClient: Stripe,
  paymentIntent: Stripe.PaymentIntent
): Promise<Stripe.Charge | null> {
  const latestCharge = paymentIntent.latest_charge;

  if (!latestCharge) {
    return null;
  }

  if (typeof latestCharge === "string") {
    try {
      return await stripeClient.charges.retrieve(latestCharge);
    } catch {
      return null;
    }
  }

  return latestCharge;
}

/**
 * Create minimal context for quick checks
 */
export function createMinimalContext(
  paymentIntentId: string,
  amount: number,
  currency: string
): TransactionContext {
  const now = new Date();
  const timeInfo = extractTimeInfo(now);

  return {
    paymentIntentId,
    amount,
    currency,
    timestamp: now,
    hourOfDay: timeInfo.hourOfDay,
    dayOfWeek: timeInfo.dayOfWeek,
  };
}
