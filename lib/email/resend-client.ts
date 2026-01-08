/**
 * Resend Email Client
 *
 * Configured Resend SDK instance for sending emails.
 */

import { Resend } from "resend";

// Validate API key at module load time (skip in test environment)
const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

if (!isTest && !process.env.RESEND_API_KEY) {
  throw new Error(
    "RESEND_API_KEY environment variable is required but not set"
  );
}

/**
 * Resend client instance (singleton)
 * In test environment, uses a dummy key
 */
export const resend = new Resend(
  process.env.RESEND_API_KEY || (isTest ? "test_key" : "")
);

/**
 * Default sender email address for alerts
 */
export const ALERTS_FROM_EMAIL =
  process.env.ALERTS_FROM_EMAIL || "alerts@orylo.com";
