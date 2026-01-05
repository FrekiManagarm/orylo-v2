/**
 * Stripe Webhook Event Handlers
 *
 * Contains all handler functions for Stripe webhook events.
 * Used by the webhook route to process different event types.
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import {
  fraudDetections,
  alerts,
  stripeConnections,
  webhookEventsLog,
} from "@/lib/db/schemas";
import { eq } from "drizzle-orm";

import {
  detectFraud,
  generateCardFingerprint,
  buildTransactionContext,
  trackPaymentAttempt,
  updateCustomerScore,
  getCustomerTrustScore,
  type CustomerTier,
} from "@/lib/fraud-detection";

import { type DetectionContext } from "@/lib/db/schemas/fraudDetections";
import { getConnectedStripeClient, getChargeFromPaymentIntent } from "@/lib/stripe";
import { generateFraudExplanation } from "@/lib/mastra";
import { revalidatePath } from "next/cache";

// Type for connection parameter
export type StripeConnection = typeof stripeConnections.$inferSelect;

// ============================================================================
// PAYMENT INTENT HANDLERS
// ============================================================================

/**
 * Handle payment_intent.created - Main fraud detection entry point
 */
export async function handlePaymentIntentCreated(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const organizationId = connection.organizationId;

  console.log(`[Fraud] Analyzing payment: ${paymentIntent.id}`);

  // Get Stripe client for this connected account
  if (!connection.accessToken) {
    throw new Error("No access token for Stripe connection");
  }
  const stripeClient = getConnectedStripeClient(connection.accessToken);

  // Get charge details if available
  const charge = await getChargeFromPaymentIntent(stripeClient, paymentIntent);

  // STEP 1: Build transaction context using new context-builder
  const context = await buildTransactionContext(
    paymentIntent,
    charge,
    organizationId,
    {
      includeVelocity: true,
      includeCustomer: true,
      invoiceId: paymentIntent.id,
      sessionId: paymentIntent.metadata?.session_id || paymentIntent.metadata?.checkout_session_id,
      ipAddress: paymentIntent.metadata?.ip_address || charge?.metadata?.ip_address,
      userAgent: paymentIntent.metadata?.user_agent,
    }
  );

  // Enrich with customer data if we have a customer ID but no context.customer
  if (paymentIntent.customer && !context.customer) {
    const customerId = typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer.id;

    const customerScore = await getCustomerTrustScore(organizationId, customerId);

    if (customerScore) {
      context.customer = {
        id: customerId,
        email: customerScore.email,
        accountAge: customerScore.accountAge,
        totalPurchases: customerScore.totalPurchases,
        totalSpent: customerScore.totalSpent,
        avgPurchaseAmount: customerScore.totalPurchases > 0
          ? customerScore.totalSpent / customerScore.totalPurchases
          : 0,
        disputeHistory: customerScore.disputeHistory,
        refundHistory: 0,
        failedPayments: 0,
        chargebackHistory: customerScore.disputeHistory,
        purchaseFrequency: 0,
        hasActiveSubscription: false,
        uniquePaymentMethods: 0,
        trustScore: customerScore.trustScore,
        tier: customerScore.tier as CustomerTier,
        isWhitelisted: customerScore.whitelisted,
        isBlacklisted: customerScore.blacklisted,
      };
    }
  }

  // STEP 2: Rules-based detection
  const detection = detectFraud(context);

  console.log(
    `[Fraud] Decision: ${detection.decision}, Score: ${detection.riskScore}`
  );

  // STEP 3: Generate AI explanation
  let aiExplanation = "";
  let aiTokensUsed = 0;
  let aiLatencyMs = 0;

  try {
    const result = await generateFraudExplanation({
      decision: detection.decision,
      riskScore: detection.riskScore,
      confidence: detection.confidence,
      factors: detection.factors,
      transaction: {
        amount: context.amount,
        currency: context.currency,
        customerEmail: context.customerEmail,
        cardBrand: context.cardBrand,
        cardLast4: context.cardLast4,
      },
      customer: context.customer
        ? {
          totalPurchases: context.customer.totalPurchases,
          disputeHistory: context.customer.disputeHistory,
          trustScore: context.customer.trustScore,
          tier: context.customer.tier,
        }
        : undefined,
    });

    aiExplanation = result.text;
    aiTokensUsed = result.tokensUsed || 0;
    aiLatencyMs = result.latencyMs;

    console.log(`[Fraud] AI explanation generated in ${aiLatencyMs}ms`);
  } catch (error) {
    console.error("[Fraud] AI generation failed:", error);
    aiExplanation = formatFallbackExplanation(detection);
  }

  // STEP 4: Build detection context for database storage
  const detectionContext: DetectionContext = {
    ipAddress: context.ipAddress,
    ipCountry: context.ipCountry,
    ipRegion: context.ipRegion,
    ipCity: context.ipCity,
    cardLast4: context.cardLast4,
    cardBrand: context.cardBrand,
    cardCountry: context.cardCountry,
    cardFingerprint: context.cardFingerprint,
    cardFunding: context.cardFunding,
    deviceFingerprint: context.deviceFingerprint,
    userAgent: context.userAgent,
    deviceType: context.deviceType,
    browser: context.browser,
    velocity: context.velocity
      ? {
        attemptsLastHour: context.velocity.attemptsLastHour,
        attemptsLastDay: context.velocity.attemptsLastDay,
        uniqueCardsUsed: context.velocity.uniqueCardsUsed,
        rapidAttempts: context.velocity.rapidAttempts || context.velocity.attemptsLastHour > 5,
      }
      : undefined,
    customer: context.customer
      ? {
        id: context.customer.id,
        accountAge: context.customer.accountAge,
        totalPurchases: context.customer.totalPurchases,
        totalSpent: context.customer.totalSpent,
        avgPurchaseAmount: context.customer.avgPurchaseAmount,
        disputeHistory: context.customer.disputeHistory,
        refundHistory: context.customer.refundHistory,
        trustScore: context.customer.trustScore,
        tier: context.customer.tier,
        whitelisted: context.customer.isWhitelisted,
      }
      : undefined,
    transactionPatterns: {
      unusualAmount: detection.factors.some(f =>
        f.type === "unusual_amount" || f.type === "very_high_amount"
      ),
      unusualTime: detection.factors.some(f => f.type === "unusual_time"),
      newDevice: detection.factors.some(f => f.type === "new_device"),
      newLocation: detection.factors.some(f => f.type === "new_location"),
    },
  };

  // STEP 5: Track payment attempt for card testing detection (before saving fraud detection)
  let cardTestingTrackerId: string | null = null;
  if (context.cardFingerprint) {
    const trackingResult = await trackPaymentAttempt(
      organizationId,
      paymentIntent.id, // invoiceId
      {
        cardFingerprint: context.cardFingerprint,
        cardLast4: context.cardLast4 || "****",
        cardBrand: context.cardBrand || "unknown",
        paymentIntentId: paymentIntent.id,
        status: detection.decision === "BLOCK" ? "blocked" : "succeeded",
        failureReason: detection.decision === "BLOCK" ? "fraud_blocked" : undefined,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        ipAddress: context.ipAddress,
      },
      context.sessionId
    );
    cardTestingTrackerId = trackingResult.trackerId;
  }

  // STEP 6: Save to database with card testing tracker reference
  const [savedAnalysis] = await db
    .insert(fraudDetections)
    .values({
      organizationId,
      paymentIntentId: paymentIntent.id,
      stripeCustomerId: context.stripeCustomerId || null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      customerEmail: context.customerEmail || null,
      riskScore: detection.riskScore,
      decision: detection.decision,
      confidence: detection.confidence,
      factors: detection.factors,
      signals: {
        factors: detection.factors,
        confidence: detection.confidence,
        velocity: context.velocity,
        customerTier: context.customer?.tier,
        adjustments: detection.adjustments,
      },
      agentsUsed: ["fraud-explanation-generator"],
      aiExplanation,
      aiGeneratedAt: new Date(),
      aiModel: "gpt-4o-mini",
      aiTokensUsed,
      aiLatencyMs,
      detectionContext,
      cardTestingTrackerId,
      blocked: detection.decision === "BLOCK",
      actionTaken:
        detection.decision === "BLOCK"
          ? "blocked"
          : detection.decision === "REVIEW"
            ? "flagged"
            : "none",
      actionTakenAt: new Date(),
    })
    .returning();

  // STEP 7: Take action based on decision
  if (detection.decision === "BLOCK") {
    console.log(`[Fraud] BLOCKING payment: ${paymentIntent.id}`);

    try {
      await stripeClient.paymentIntents.cancel(paymentIntent.id);
      console.log(`[Fraud] Payment cancelled successfully`);
    } catch (error) {
      console.error("[Fraud] Failed to cancel payment:", error);
    }

    // Create critical alert
    await db.insert(alerts).values({
      organizationId,
      type: "high_risk_transaction",
      severity: "critical",
      title: "🚨 Transaction à haut risque bloquée",
      message: `Paiement de ${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()} bloqué.\n\n${aiExplanation.substring(0, 500)}`,
      relatedId: savedAnalysis.id.toString(),
      relatedFraudDetectionId: savedAnalysis.id,
      data: {
        paymentIntentId: paymentIntent.id,
        riskScore: detection.riskScore,
        factors: detection.factors.slice(0, 5), // Top 5 factors
        cardTesting: detection.factors.some(f =>
          f.type === "card_testing" || f.type === "card_testing_critical"
        ),
      },
    });
  } else if (detection.decision === "REVIEW") {
    // Create warning alert for review
    await db.insert(alerts).values({
      organizationId,
      type: "review_required",
      severity: "warning",
      title: "⚠️ Transaction nécessitant vérification",
      message: `Paiement de ${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()} signalé pour vérification.\n\n${aiExplanation.substring(0, 500)}`,
      relatedId: savedAnalysis.id.toString(),
      relatedFraudDetectionId: savedAnalysis.id,
      data: {
        paymentIntentId: paymentIntent.id,
        riskScore: detection.riskScore,
        factors: detection.factors.slice(0, 5),
      },
    });
  }

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/card-testing");
  revalidatePath("/dashboard/alerts");
  revalidatePath("/dashboard")
}

/**
 * Handle payment_intent.succeeded - Update customer scores
 */
export async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const organizationId = connection.organizationId;

  if (!paymentIntent.customer) {
    console.log("[Webhook] No customer on payment intent, skipping score update");
    return;
  }

  if (!connection.accessToken) {
    console.error("[Webhook] No access token for connection");
    return;
  }

  const stripeClient = getConnectedStripeClient(connection.accessToken);
  const customerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer.id;

  // Update customer reputation score
  await updateCustomerScore(organizationId, customerId, stripeClient);

  // Update fraud analysis to mark as successful
  await db
    .update(fraudDetections)
    .set({
      actualOutcome: "legitimate",
      actionTaken: "none",
      blocked: false,
      updatedAt: new Date(),
    })
    .where(eq(fraudDetections.paymentIntentId, paymentIntent.id));

  // Track successful payment for velocity metrics
  const charge = await getChargeFromPaymentIntent(stripeClient, paymentIntent);
  const card = charge?.payment_method_details?.card;

  let cardTestingTrackerId: string | null = null;
  if (card) {
    const cardFingerprint = generateCardFingerprint(
      card.last4 || "",
      card.brand || ""
    );

    const result = await trackPaymentAttempt(
      organizationId,
      paymentIntent.id,
      {
        cardFingerprint,
        cardLast4: card.last4 || "****",
        cardBrand: card.brand || "unknown",
        paymentIntentId: paymentIntent.id,
        status: "succeeded",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      paymentIntent.metadata?.session_id
    );
    cardTestingTrackerId = result.trackerId;
  }

  // Update fraud detection with card testing tracker link if exists
  if (cardTestingTrackerId) {
    await db
      .update(fraudDetections)
      .set({
        cardTestingTrackerId,
        updatedAt: new Date(),
      })
      .where(eq(fraudDetections.paymentIntentId, paymentIntent.id));
  }
}

/**
 * Handle payment_intent.payment_failed - Track failed attempts
 */
export async function handlePaymentIntentFailed(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const organizationId = connection.organizationId;

  // Get session ID from metadata or use payment intent ID
  const sessionId =
    paymentIntent.metadata?.session_id ||
    paymentIntent.metadata?.checkout_session_id ||
    paymentIntent.id;

  if (!connection.accessToken) {
    console.error("[Webhook] No access token for connection");
    return;
  }

  const stripeClient = getConnectedStripeClient(connection.accessToken);
  const charge = await getChargeFromPaymentIntent(stripeClient, paymentIntent);
  const card = charge?.payment_method_details?.card;

  // Extract failure information
  const failureCode = (paymentIntent as { last_payment_error?: { code?: string } })
    .last_payment_error?.code;
  const failureMessage = (paymentIntent as { last_payment_error?: { message?: string } })
    .last_payment_error?.message;

  const cardFingerprint = card
    ? generateCardFingerprint(card.last4 || "", card.brand || "")
    : generateCardFingerprint("0000", "unknown");

  // Track failed payment attempt
  const result = await trackPaymentAttempt(
    organizationId,
    paymentIntent.id, // invoiceId
    {
      cardFingerprint,
      cardLast4: card?.last4 || "****",
      cardBrand: card?.brand || "unknown",
      paymentIntentId: paymentIntent.id,
      status: "failed",
      failureCode,
      failureReason: failureMessage,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      ipAddress: paymentIntent.metadata?.ip_address,
    },
    sessionId
  );

  // If card testing detected, create alert
  if (result.recommendation === "BLOCK" || result.suspicionScore >= 70) {
    await db.insert(alerts).values({
      organizationId,
      type: "card_testing_detected",
      severity: "critical",
      title: "🚨 Test de carte détecté",
      message: `${result.reasons.map((r) => r.label).join(", ")}. Score de suspicion: ${result.suspicionScore}/100`,
      relatedCardTestingId: result.trackerId,
      data: {
        sessionId,
        paymentIntentId: paymentIntent.id,
        suspicionScore: result.suspicionScore,
        reasons: result.reasons,
        recommendation: result.recommendation,
        failureCode,
      },
    });
  }

  // Update fraud detection record if exists, link to card testing tracker
  await db
    .update(fraudDetections)
    .set({
      actualOutcome: "payment_failed",
      cardTestingTrackerId: result.trackerId,
      updatedAt: new Date(),
    })
    .where(eq(fraudDetections.paymentIntentId, paymentIntent.id));
}

// ============================================================================
// CHARGE HANDLERS
// ============================================================================

/**
 * Handle charge.dispute.created - Update customer reputation
 */
export async function handleDisputeCreated(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const dispute = event.data.object as Stripe.Dispute;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Dispute created: ${dispute.id}`);

  if (!connection.accessToken) {
    console.error("[Webhook] No access token for connection");
    return;
  }

  const stripeClient = getConnectedStripeClient(connection.accessToken);
  const chargeId =
    typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
  const charge = await stripeClient.charges.retrieve(chargeId);

  if (charge.customer) {
    const customerId =
      typeof charge.customer === "string" ? charge.customer : charge.customer.id;

    // Update customer reputation (will recalculate with new dispute)
    await updateCustomerScore(organizationId, customerId, stripeClient);

    // Create critical alert
    await db.insert(alerts).values({
      organizationId,
      type: "chargeback_detected",
      severity: "critical",
      title: "🚨 Litige détecté",
      message: `Un litige de ${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()} a été ouvert. Raison: ${dispute.reason}`,
      data: {
        disputeId: dispute.id,
        chargeId,
        customerId,
        amount: dispute.amount,
        reason: dispute.reason,
        status: dispute.status,
      },
    });

    // Mark the original fraud analysis as actual fraud (for learning)
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (paymentIntentId) {
      await db
        .update(fraudDetections)
        .set({
          actualOutcome: "fraud_confirmed",
          chargebackReceived: true,
          chargebackAmount: dispute.amount,
          chargebackReason: dispute.reason,
          chargebackReceivedAt: new Date(),
          actionTaken: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(fraudDetections.paymentIntentId, paymentIntentId));
    }
  }
}

/**
 * Handle charge.refunded - Track refunds
 */
export async function handleChargeRefunded(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const charge = event.data.object as Stripe.Charge;
  const organizationId = connection.organizationId;

  if (charge.customer) {
    if (!connection.accessToken) {
      console.error("[Webhook] No access token for connection");
      return;
    }
    const stripeClient = getConnectedStripeClient(connection.accessToken);
    const customerId =
      typeof charge.customer === "string" ? charge.customer : charge.customer.id;

    // Update customer reputation
    await updateCustomerScore(organizationId, customerId, stripeClient);
  }

  // Update fraud analysis
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (paymentIntentId) {
    await db
      .update(fraudDetections)
      .set({
        actionTaken: "refunded",
        actualOutcome: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(fraudDetections.paymentIntentId, paymentIntentId));
  }
}

// ============================================================================
// CHECKOUT SESSION HANDLERS
// ============================================================================

/**
 * Handle checkout.session.completed - Log successful checkout
 */
export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Checkout session completed: ${session.id}`);

  // Extract useful data for fraud analysis
  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  // Log checkout completion for pattern analysis
  await db.insert(webhookEventsLog).values({
    organizationId,
    stripeEventType: "checkout.session.completed",
    stripeEventId: event.id,
    stripeAccount: connection.stripeAccountId,
    payload: {
      sessionId: session.id,
      mode: session.mode,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail,
      customerId,
      paymentIntentId: session.payment_intent,
      subscriptionId: session.subscription,
      clientReferenceId: session.client_reference_id,
    } as any,
    processed: true,
    processedAt: new Date(),
    response: { status: "logged" },
  });

  // If high-value checkout, create info alert
  if (session.amount_total && session.amount_total >= 50000) { // >= 500€
    await db.insert(alerts).values({
      organizationId,
      type: "high_value_checkout",
      severity: "info",
      title: "💰 Checkout de valeur élevée complété",
      message: `Checkout de ${((session.amount_total || 0) / 100).toFixed(2)} ${session.currency?.toUpperCase()} complété par ${customerEmail || "client inconnu"}.`,
      data: {
        sessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail,
        customerId,
        mode: session.mode,
      },
    });
  }
}

/**
 * Handle checkout.session.expired - Track abandoned checkouts
 */
export async function handleCheckoutSessionExpired(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Checkout session expired: ${session.id}`);

  // Log for abandoned cart analysis
  await db.insert(webhookEventsLog).values({
    organizationId,
    stripeEventType: "checkout.session.expired",
    stripeEventId: event.id,
    stripeAccount: connection.stripeAccountId,
    payload: {
      sessionId: session.id,
      mode: session.mode,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_email || session.customer_details?.email,
      expiresAt: session.expires_at,
    } as any,
    processed: true,
    processedAt: new Date(),
    response: { status: "expired_logged" },
  });
}

/**
 * Handle checkout.session.async_payment_succeeded
 */
export async function handleCheckoutAsyncPaymentSucceeded(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Async payment succeeded for checkout: ${session.id}`);

  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  if (customerId && connection.accessToken) {
    const stripeClient = getConnectedStripeClient(connection.accessToken);
    await updateCustomerScore(organizationId, customerId, stripeClient);
  }
}

/**
 * Handle checkout.session.async_payment_failed
 */
export async function handleCheckoutAsyncPaymentFailed(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Async payment failed for checkout: ${session.id}`);

  await db.insert(alerts).values({
    organizationId,
    type: "async_payment_failed",
    severity: "warning",
    title: "⚠️ Paiement asynchrone échoué",
    message: `Le paiement asynchrone pour la session ${session.id} a échoué.`,
    data: {
      sessionId: session.id,
      amount: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_email || session.customer_details?.email,
    },
  });
}

// ============================================================================
// CUSTOMER & SUBSCRIPTION HANDLERS
// ============================================================================

/**
 * Handle customer.created - Initialize trust score for new customers
 */
export async function handleCustomerCreated(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const customer = event.data.object as Stripe.Customer;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] New customer created: ${customer.id}`);

  if (!connection.accessToken) {
    return;
  }

  const stripeClient = getConnectedStripeClient(connection.accessToken);

  // Initialize customer trust score
  await updateCustomerScore(organizationId, customer.id, stripeClient);
}

/**
 * Handle customer.subscription.created - Track new subscriptions
 */
export async function handleSubscriptionCreated(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const subscription = event.data.object as Stripe.Subscription;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Subscription created: ${subscription.id}`);

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  // Update customer score (subscriptions improve trust)
  if (connection.accessToken) {
    const stripeClient = getConnectedStripeClient(connection.accessToken);
    await updateCustomerScore(organizationId, customerId, stripeClient);
  }

  // Log subscription creation
  await db.insert(webhookEventsLog).values({
    organizationId,
    stripeEventType: "customer.subscription.created",
    stripeEventId: event.id,
    stripeAccount: connection.stripeAccountId,
    payload: {
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      startDate: subscription.start_date,
      cancelAt: subscription.cancel_at,
    } as any,
    processed: true,
    processedAt: new Date(),
    response: { status: "logged" },
  });
}

/**
 * Handle customer.subscription.deleted - Track churned subscriptions
 */
export async function handleSubscriptionDeleted(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const subscription = event.data.object as Stripe.Subscription;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Subscription deleted: ${subscription.id}`);

  await db.insert(webhookEventsLog).values({
    organizationId,
    stripeEventType: "customer.subscription.deleted",
    stripeEventId: event.id,
    stripeAccount: connection.stripeAccountId,
    payload: {
      subscriptionId: subscription.id,
      customerId: typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
      canceledAt: subscription.canceled_at,
      cancellationDetails: subscription.cancellation_details,
    } as any,
    processed: true,
    processedAt: new Date(),
    response: { status: "logged" },
  });
}

// ============================================================================
// RADAR & INVOICE HANDLERS
// ============================================================================

/**
 * Handle radar.early_fraud_warning.created - Stripe's native fraud detection
 */
export async function handleRadarFraudWarning(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] 🚨 Radar fraud warning: ${warning.id}`);

  if (!connection.accessToken) {
    return;
  }

  const stripeClient = getConnectedStripeClient(connection.accessToken);
  const chargeId = typeof warning.charge === "string"
    ? warning.charge
    : warning.charge.id;

  // Get charge details
  const charge = await stripeClient.charges.retrieve(chargeId);
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;

  // Create critical alert
  await db.insert(alerts).values({
    organizationId,
    type: "radar_fraud_warning",
    severity: "critical",
    title: "🚨 Alerte Stripe Radar - Fraude potentielle",
    message: `Stripe Radar a détecté une activité suspecte. Type: ${warning.fraud_type}. Montant: ${(charge.amount / 100).toFixed(2)} ${charge.currency.toUpperCase()}`,
    data: {
      warningId: warning.id,
      chargeId,
      paymentIntentId,
      fraudType: warning.fraud_type,
      actionable: warning.actionable,
      amount: charge.amount,
      currency: charge.currency,
      customerEmail: charge.billing_details?.email,
    },
  });

  // Update fraud detection record if exists
  if (paymentIntentId) {
    await db
      .update(fraudDetections)
      .set({
        actualOutcome: "fraud_suspected",
        signals: {
          radarWarning: {
            id: warning.id,
            fraudType: warning.fraud_type,
            actionable: warning.actionable,
            createdAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(fraudDetections.paymentIntentId, paymentIntentId));
  }
}

/**
 * Handle invoice.payment_failed - Track failed invoice payments
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  connection: StripeConnection
) {
  const invoice = event.data.object as Stripe.Invoice;
  const organizationId = connection.organizationId;

  console.log(`[Webhook] Invoice payment failed: ${invoice.id}`);

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  // Create warning alert
  await db.insert(alerts).values({
    organizationId,
    type: "invoice_payment_failed",
    severity: "warning",
    title: "⚠️ Paiement de facture échoué",
    message: `La facture ${invoice.number || invoice.id} de ${((invoice.amount_due || 0) / 100).toFixed(2)} ${invoice.currency?.toUpperCase()} n'a pas pu être payée.`,
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      customerId,
      customerEmail: invoice.customer_email,
      amount: invoice.amount_due,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count,
      nextPaymentAttempt: invoice.next_payment_attempt,
    },
  });

  // Log for pattern analysis
  await db.insert(webhookEventsLog).values({
    organizationId,
    stripeEventType: "invoice.payment_failed",
    stripeEventId: event.id,
    stripeAccount: connection.stripeAccountId,
    payload: {
      invoiceId: invoice.id,
      customerId,
      amount: invoice.amount_due,
      attemptCount: invoice.attempt_count,
    } as any,
    processed: true,
    processedAt: new Date(),
    response: { status: "logged" },
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format fallback explanation when AI fails
 */
export function formatFallbackExplanation(detection: ReturnType<typeof detectFraud>): string {
  const decisionText =
    detection.decision === "BLOCK"
      ? "Transaction bloquée"
      : detection.decision === "REVIEW"
        ? "Vérification requise"
        : "Transaction autorisée";

  const topFactors = detection.factors
    .slice(0, 5)
    .map((f) => `- **${f.description}** (${f.weight > 0 ? "+" : ""}${f.weight} points)`)
    .join("\n");

  return `
**Résumé de la Décision:**
${decisionText} - Score de risque: ${detection.riskScore}/100

**Facteurs Analysés:**
${topFactors}

**Recommandation:**
${detection.recommendedAction || "Aucune action requise."}
  `.trim();
}
