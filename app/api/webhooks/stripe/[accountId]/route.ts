/**
 * Stripe Webhook Handler for Connected Accounts
 *
 * Handles payment events from Stripe Connect merchants and performs
 * real-time fraud detection with AI-powered explanations.
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeConnections, webhookEventsLog } from "@/lib/db/schemas";
import { and, eq } from "drizzle-orm";
import { checkTransactionsLimit } from "@/lib/autumn";
import { decrypt } from "@/lib/stripe/encryption";

// Import all webhook handlers
import {
  handlePaymentIntentCreated,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleDisputeCreated,
  handleChargeRefunded,
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handleCheckoutAsyncPaymentSucceeded,
  handleCheckoutAsyncPaymentFailed,
  handleCustomerCreated,
  handleSubscriptionCreated,
  handleSubscriptionDeleted,
  handleRadarFraudWarning,
  handleInvoicePaymentFailed,
} from "@/lib/actions/stripe-webhook-handlers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const connection = await db.query.stripeConnections.findFirst({
    where: and(
      eq(stripeConnections.stripeAccountId, accountId),
      eq(stripeConnections.isActive, true),
    ),
    with: {
      organization: true,
    },
  });

  if (!connection) {
    console.error(`❌ No active connection found for account ${accountId}`);
    return NextResponse.json(
      { error: "Stripe account not connected" },
      { status: 404 },
    );
  }

  const organizationId = connection.organizationId;

  // 2. Verify webhook signature
  const signature = req.headers.get("stripe-signature");

  if (!signature || !connection.webhookSecret) {
    console.error("❌ Missing signature or webhook secret");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  // Lire le corps brut comme Buffer puis convertir en string
  const rawBody = await req.arrayBuffer();
  const body = Buffer.from(rawBody).toString("utf-8");

  let webhookSecret = decrypt(connection.webhookSecret);

  // En développement local avec Stripe CLI
  const stripeCliSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (
    stripeCliSecret &&
    (webhookSecret === "whsec_local_dev_secret" ||
      process.env.NODE_ENV === "development")
  ) {
    console.log("🔧 Using Stripe CLI webhook secret from environment");
    webhookSecret = stripeCliSecret;
  }

  const stripe = new Stripe(decrypt(connection.accessToken ?? ""), {
    apiVersion: "2025-12-15.clover",
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Vérification de sécurité
  if (event.account && event.account !== accountId) {
    console.error(
      `❌ Account mismatch: expected ${accountId}, got ${event.account}`,
    );
    return NextResponse.json({ error: "Account mismatch" }, { status: 400 });
  }

  console.log("event", event.data.object);

  console.log(`✅ Webhook verified: ${event.type} (${event.id})`);

  // 3. Log webhook in database
  const [webhookEvent] = await db
    .insert(webhookEventsLog)
    .values({
      organizationId,
      stripeEventType: event.type,
      stripeEventId: event.id,
      stripeAccount: accountId,
      payload: event.data.object as any,
      processed: false,
    })
    .returning();

  // 4. Check Autumn limits before processing
  const limitsCheck = await checkTransactionsLimit(organizationId);

  if (!limitsCheck.allowed) {
    console.warn(`⚠️ Transaction limit reached for org ${organizationId}`);

    await db
      .update(webhookEventsLog)
      .set({
        processed: true,
        processedAt: new Date(),
        response: { skipped: true, reason: "limit_reached" },
      })
      .where(eq(webhookEventsLog.id, webhookEvent.id));

    return NextResponse.json({
      received: true,
      processed: false,
      reason: "limit_reached",
    });
  }

  try {
    switch (event.type) {
      // Payment Intent events
      case "payment_intent.created":
        await handlePaymentIntentCreated(event, connection);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event, connection);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event, connection);
        break;

      // Charge events
      case "charge.dispute.created":
        await handleDisputeCreated(event, connection);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event, connection);
        break;

      // Checkout Session events
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event, connection);
        break;

      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event, connection);
        break;

      case "checkout.session.async_payment_succeeded":
        await handleCheckoutAsyncPaymentSucceeded(event, connection);
        break;

      case "checkout.session.async_payment_failed":
        await handleCheckoutAsyncPaymentFailed(event, connection);
        break;

      // Customer events
      case "customer.created":
        await handleCustomerCreated(event, connection);
        break;

      // Subscription events
      case "customer.subscription.created":
        await handleSubscriptionCreated(event, connection);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event, connection);
        break;

      // Radar events (Stripe's native fraud detection)
      case "radar.early_fraud_warning.created":
        await handleRadarFraudWarning(event, connection);
        break;

      // Invoice events
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event, connection);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    await db
      .update(webhookEventsLog)
      .set({
        processed: true,
        processedAt: new Date(),
        response: { status: "processed" },
      })
      .where(eq(webhookEventsLog.id, webhookEvent.id));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);

    // Log error in webhook event
    await db
      .update(webhookEventsLog)
      .set({
        processed: true,
        processedAt: new Date(),
        response: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error"
        },
      })
      .where(eq(webhookEventsLog.id, webhookEvent.id));

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
