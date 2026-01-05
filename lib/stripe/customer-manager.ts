/**
 * Customer Manager
 *
 * Utilities for managing Stripe customers.
 */

import Stripe from "stripe";

/**
 * Get or create a Stripe customer by email
 */
export async function getOrCreateCustomer(
  stripeClient: Stripe,
  email: string,
  metadata?: Record<string, string>
): Promise<string> {
  // Search for existing customer
  const existingCustomers = await stripeClient.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    console.log(`[Customer] Found existing: ${existingCustomers.data[0].id}`);
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripeClient.customers.create({
    email,
    metadata: {
      created_by: "orylo",
      ...metadata,
    },
  });

  console.log(`[Customer] Created new: ${customer.id}`);
  return customer.id;
}

/**
 * Ensure a PaymentIntent has a customer attached
 * If not, tries to create one from available email
 */
export async function ensurePaymentIntentHasCustomer(
  stripeClient: Stripe,
  paymentIntent: Stripe.PaymentIntent
): Promise<string | null> {
  // Customer already exists
  if (paymentIntent.customer) {
    return paymentIntent.customer as string;
  }

  // Try to get email from various sources
  const latestCharge = paymentIntent.latest_charge;
  let charge: Stripe.Charge | null = null;

  if (typeof latestCharge === "string") {
    charge = await stripeClient.charges.retrieve(latestCharge);
  } else if (latestCharge) {
    charge = latestCharge;
  }

  const email =
    charge?.billing_details?.email ||
    paymentIntent.receipt_email ||
    null;

  if (!email) {
    console.log("[Customer] No email found, cannot create customer");
    return null;
  }

  // Get or create customer
  const customerId = await getOrCreateCustomer(stripeClient, email);

  // Attach to payment intent (if possible)
  try {
    await stripeClient.paymentIntents.update(paymentIntent.id, {
      customer: customerId,
    });
    console.log(`[Customer] Attached ${customerId} to payment intent`);
  } catch (error) {
    // Payment intent might be in a state where customer can't be updated
    console.error("[Customer] Failed to attach customer:", error);
  }

  return customerId;
}

/**
 * Get customer details from Stripe
 */
export async function getCustomerDetails(
  stripeClient: Stripe,
  customerId: string
): Promise<{
  id: string;
  email: string | null;
  name: string | null;
  created: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const customer = await stripeClient.customers.retrieve(customerId);

    if (customer.deleted) {
      return null;
    }

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name ?? null,
      created: new Date(customer.created * 1000),
      metadata: (customer.metadata as Record<string, string>) || {},
    };
  } catch (error) {
    console.error("[Customer] Failed to retrieve:", error);
    return null;
  }
}

/**
 * Get charge details from PaymentIntent
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
