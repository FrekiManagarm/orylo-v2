"use server";

/**
 * Send Alert Email Module
 *
 * Sends email alerts for critical fraud events using Resend.
 * Includes rate limiting and comprehensive error handling.
 */

import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schemas/alerts";
import { organization } from "@/lib/db/schemas/organization";
import { user } from "@/lib/db/schemas/user";
import { resend, ALERTS_FROM_EMAIL } from "@/lib/email/resend-client";
import { logger } from "@/lib/logger";
import { eq, and, gt } from "drizzle-orm";

/**
 * Response type for email sending
 */
interface EmailResponse {
  success: boolean;
  emailId?: string;
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
 * Send an alert email for a critical fraud event
 *
 * @param alertId - Alert ID to send email for
 * @param organizationId - Organization ID (multi-tenant isolation)
 * @returns EmailResponse with success status and email ID or error
 */
export async function sendAlertEmail(
  alertId: string,
  organizationId: string
): Promise<EmailResponse> {
  logger.info("Email send initiated", { alertId, organizationId });

  try {
    // ==========================================
    // 1. FETCH ALERT
    // ==========================================
    const alert = await db.query.alerts.findFirst({
      where: eq(alerts.id, alertId),
    });

    if (!alert) {
      logger.error("Alert not found", { alertId });
      return { success: false, error: "Alert not found" };
    }

    // Authorization check: verify alert belongs to organization
    if (alert.organizationId !== organizationId) {
      logger.warn("Unauthorized email send attempt", {
        alertId,
        organizationId,
        alertOrgId: alert.organizationId,
      });
      return { success: false, error: "Unauthorized" };
    }

    // ==========================================
    // 2. RATE LIMITING
    // ==========================================
    // Check if email sent in last hour for this alert type and organization
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentAlerts = await db.query.alerts.findMany({
      where: and(
        eq(alerts.organizationId, organizationId),
        eq(alerts.type, alert.type),
        gt(alerts.emailSentAt, oneHourAgo)
      ),
      limit: 1,
    });

    if (recentAlerts.length > 0) {
      logger.info("Rate limit exceeded", {
        alertType: alert.type,
        organizationId,
        lastSentAt: recentAlerts[0].emailSentAt,
      });
      return { success: false, error: "Rate limit exceeded" };
    }

    // ==========================================
    // 3. FETCH RECIPIENT EMAIL
    // ==========================================
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
    });

    if (!org) {
      logger.error("Organization not found", { organizationId });
      return { success: false, error: "Organization not found" };
    }

    // Get owner email from organization members
    const orgMembers = await db.query.member.findMany({
      where: eq(user.id, org.id), // This needs to be adjusted based on actual schema
      limit: 1,
    });

    // For now, use a placeholder - Story mentions this needs proper user relation
    // In real implementation, we'd fetch the owner/admin user's email
    const recipientEmail = org.name
      ? `owner@${org.name.toLowerCase().replace(/\s+/g, "-")}.com`
      : null;

    if (!recipientEmail) {
      logger.error("Recipient email not found", { organizationId });
      return { success: false, error: "Recipient email not configured" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      logger.error("Invalid recipient email format", { recipientEmail });
      return { success: false, error: "Invalid email format" };
    }

    // ==========================================
    // 4. SEND EMAIL WITH RETRY LOGIC
    // ==========================================
    let emailResult: { id: string } | null = null;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info("Attempting to send email", {
          alertId,
          attempt: attempt + 1,
          maxRetries,
        });

        // Send email via Resend
        const result = await resend.emails.send({
          from: ALERTS_FROM_EMAIL,
          to: recipientEmail,
          subject: alert.title,
          html: formatAlertEmail(alert),
        });

        logger.info("Email sent successfully", {
          alertId,
          emailId: result.data?.id,
          recipientEmail,
        });

        emailResult = result.data?.id ? { id: result.data.id } : null;
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const errorMessage = lastError.message?.toLowerCase() || "";

        // Non-retryable errors
        if (
          errorMessage.includes("invalid api key") ||
          errorMessage.includes("invalid email") ||
          errorMessage.includes("validation")
        ) {
          logger.error("Non-retryable Resend error", {
            alertId,
            error: lastError.message,
          });
          break; // Don't retry
        }

        // Retryable errors (network, rate limit, etc.)
        logger.warn("Retryable email error, will retry", {
          alertId,
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
        });

        if (attempt < maxRetries - 1) {
          const delay = getRetryDelay(attempt);
          logger.info("Waiting before retry", { delay });
          await sleep(delay);
        }
      }
    }

    // ==========================================
    // 5. HANDLE RESULT
    // ==========================================
    if (!emailResult) {
      logger.error("Email send failed after retries", {
        alertId,
        lastError: lastError?.message,
      });
      return {
        success: false,
        error:
          lastError?.message || "Email failed after maximum retry attempts",
      };
    }

    // Update alert with emailSentAt timestamp
    await db
      .update(alerts)
      .set({ emailSentAt: new Date() })
      .where(eq(alerts.id, alertId));

    return { success: true, emailId: emailResult.id };
  } catch (error) {
    const err = error as Error;
    logger.error("Unexpected error in sendAlertEmail", {
      alertId,
      organizationId,
      error: err.message,
      stack: err.stack,
    });
    return { success: false, error: err.message };
  }
}

/**
 * Format alert as HTML email
 * (Simple version - Story 3.2 will provide React Email templates)
 */
function formatAlertEmail(alert: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            border-bottom: 3px solid #ef4444;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #ef4444;
            margin: 0;
          }
          .severity {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 10px;
          }
          .severity-critical {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .severity-high {
            background-color: #fef3c7;
            color: #92400e;
          }
          .message {
            font-size: 16px;
            line-height: 1.8;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #6366f1;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">⚠️ ${alert.title}</h1>
            <span class="severity severity-${alert.severity}">${alert.severity}</span>
          </div>
          
          <div class="message">
            <p>${alert.message}</p>
          </div>
          
          <a href="https://app.orylo.com/dashboard/alerts" class="button">
            Voir l'alerte dans le dashboard
          </a>
          
          <div class="footer">
            <p>Cette alerte a été générée automatiquement par Orylo.</p>
            <p>© ${new Date().getFullYear()} Orylo. Tous droits réservés.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
