/**
 * Stripe Module
 *
 * Export all Stripe utilities.
 */

import Stripe from "stripe";

export * from "./client";
export * from "./customer-manager";
export const stripePlatformClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});