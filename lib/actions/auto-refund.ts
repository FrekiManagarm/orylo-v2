"use server";

/**
 * Auto-Refund Module
 *
 * Automatically refunds fraudulent payments that succeeded before detection.
 * Includes retry logic, idempotency checks, and comprehensive logging.
 */

import { db } from "@/lib/db";
import { fraudDetections } from "@/lib/db/schemas/fraudDetections";
import { stripeConnections } from "@/lib/db/schemas/stripeConnections";
import { getConnectedStripeClient } from "@/lib/stripe/client";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

/**
 * Response type for refund operations
 */
interface RefundResponse {
  success: boolean;
  refundId?: string;
  error?: string;
}

/**
 * Exponential backoff delay calculator
 */
function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
}

/**
 * Sleep utility for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Automatically refund a fraudulent payment
 *
 * @param paymentIntentId - Stripe Payment Intent ID
 * @param organizationId - Organization ID (multi-tenant isolation)
 * @param fraudDetectionId - Fraud detection record ID
 * @returns RefundResponse with success status and refund ID or error message
 */
export async function autoRefundFraudulentPayment(
  paymentIntentId: string,
  organizationId: string,
  fraudDetectionId: string
): Promise<RefundResponse> {
  logger.info("Auto-refund initiated", {
    paymentIntentId,
    organizationId,
    fraudDetectionId,
  });

  try {
    // ==========================================
    // 1. FETCH FRAUD DETECTION RECORD
    // ==========================================
    const fraudDetection = await db.query.fraudDetections.findFirst({
      where: eq(fraudDetections.id, fraudDetectionId),
    });

    if (!fraudDetection) {
      logger.error("Fraud detection not found", { fraudDetectionId });
      return { success: false, error: "Fraud detection not found" };
    }

    // Verify organization ownership (security)
    if (fraudDetection.organizationId !== organizationId) {
      logger.warn("Unauthorized refund attempt", {
        fraudDetectionId,
        organizationId,
      });
      return { success: false, error: "Unauthorized" };
    }

    // ==========================================
    // 2. IDEMPOTENCY CHECK
    // ==========================================
    if (fraudDetection.refundId) {
      logger.info("Refund already exists", {
        fraudDetectionId,
        refundId: fraudDetection.refundId,
      });
      return { success: true, refundId: fraudDetection.refundId };
    }

    // ==========================================
    // 3. VERIFY REFUND ELIGIBILITY
    // ==========================================
    const shouldRefund =
      fraudDetection.actualOutcome === "fraud_confirmed" ||
      (fraudDetection.riskScore >= 80 && fraudDetection.decision === "BLOCK");

    if (!shouldRefund) {
      logger.info("Refund not eligible", {
        fraudDetectionId,
        riskScore: fraudDetection.riskScore,
        decision: fraudDetection.decision,
        actualOutcome: fraudDetection.actualOutcome,
      });
      return { success: false, error: "Not eligible for refund" };
    }

    // ==========================================
    // 4. GET STRIPE CLIENT FOR CONNECTED ACCOUNT
    // ==========================================
    const stripeConnection = await db.query.stripeConnections.findFirst({
      where: eq(stripeConnections.organizationId, organizationId),
    });

    if (!stripeConnection || !stripeConnection.accessToken) {
      logger.error("Stripe connection not found", { organizationId });
      return { success: false, error: "Stripe connection not configured" };
    }

    const stripe = getConnectedStripeClient(stripeConnection.accessToken);

    // ==========================================
    // 5. CREATE REFUND WITH RETRY LOGIC
    // ==========================================
    let refund: Stripe.Refund | null = null;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info("Attempting refund", {
          paymentIntentId,
          attempt: attempt + 1,
          maxRetries,
        });

        refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: "fraudulent",
          metadata: {
            fraud_detection_id: fraudDetectionId,
            auto_refunded: "true",
            organization_id: organizationId,
          },
        });

        logger.info("Refund successful", {
          refundId: refund.id,
          paymentIntentId,
          fraudDetectionId,
          amount: refund.amount,
        });

        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (error instanceof Stripe.errors.StripeError) {
          const stripeError = error as Stripe.errors.StripeError;

          // Non-retryable errors
          if (
            stripeError.code === "charge_already_refunded" ||
            stripeError.code === "payment_intent_invalid_parameter" ||
            stripeError.code === "resource_missing"
          ) {
            logger.error("Non-retryable Stripe error", {
              paymentIntentId,
              code: stripeError.code,
              message: stripeError.message,
            });

            // Handle specific error cases
            if (stripeError.code === "charge_already_refunded") {
              return {
                success: false,
                error: "Payment already refunded",
              };
            }

            if (stripeError.code === "resource_missing") {
              return {
                success: false,
                error: "Payment not found",
              };
            }

            return { success: false, error: stripeError.message };
          }

          // Retryable errors (network, rate limit, etc.)
          logger.warn("Retryable Stripe error, will retry", {
            paymentIntentId,
            attempt: attempt + 1,
            maxRetries,
            code: stripeError.code,
            message: stripeError.message,
          });

          if (attempt < maxRetries - 1) {
            const delay = getRetryDelay(attempt);
            logger.info("Waiting before retry", { delay });
            await sleep(delay);
          }
        } else {
          // Non-Stripe error
          logger.error("Unexpected error during refund", {
            paymentIntentId,
            error: lastError.message,
            stack: lastError.stack,
          });
          break; // Don't retry non-Stripe errors
        }
      }
    }

    // ==========================================
    // 6. HANDLE RESULT
    // ==========================================
    if (!refund) {
      logger.error("Refund failed after retries", {
        paymentIntentId,
        fraudDetectionId,
        lastError: lastError?.message,
      });
      return {
        success: false,
        error:
          lastError?.message || "Refund failed after maximum retry attempts",
      };
    }

    return { success: true, refundId: refund.id };
  } catch (error) {
    const err = error as Error;
    logger.error("Unexpected error in autoRefundFraudulentPayment", {
      paymentIntentId,
      organizationId,
      fraudDetectionId,
      error: err.message,
      stack: err.stack,
    });
    return { success: false, error: err.message };
  }
}
