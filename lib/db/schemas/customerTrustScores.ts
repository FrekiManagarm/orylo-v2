import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ==========================================
// TYPES FOR JSONB FIELDS
// ==========================================

export interface CustomerMetadata {
  notes?: string;
  tags?: string[];
  internalId?: string; // merchant's internal customer ID
  segment?: string; // customer segment
  riskLevel?: string;
  customFields?: Record<string, unknown>;
}

// ==========================================
// CUSTOMER TRUST SCORES TABLE
// ==========================================
export const customerTrustScores = pgTable(
  "customer_trust_scores",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // Customer Identification
    stripeCustomerId: text("stripe_customer_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),

    // ==========================================
    // PURCHASE HISTORY METRICS
    // ==========================================
    successfulPayments: integer("successful_payments").default(0).notNull(),
    totalSpent: decimal("total_spent", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    avgPurchaseAmount: decimal("avg_purchase_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),
    maxPurchaseAmount: decimal("max_purchase_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),
    minPurchaseAmount: decimal("min_purchase_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),

    // ==========================================
    // RISK METRICS
    // ==========================================
    disputeHistory: integer("dispute_history").default(0).notNull(),
    refundHistory: integer("refund_history").default(0).notNull(),
    failedPayments: integer("failed_payments").default(0).notNull(),
    chargebackHistory: integer("chargeback_history").default(0).notNull(),
    cardTestingAttempts: integer("card_testing_attempts").default(0).notNull(),
    fraudRulesTriggered: integer("fraud_rules_triggered").default(0).notNull(),

    // ==========================================
    // ACCOUNT TIMELINE
    // ==========================================
    accountAge: integer("account_age").default(0).notNull(), // days since first purchase
    firstPurchaseAt: timestamp("first_purchase_at"),
    lastPurchaseAt: timestamp("last_purchase_at"),
    daysSinceLastPurchase: integer("days_since_last_purchase"),

    // ==========================================
    // BEHAVIORAL METRICS
    // ==========================================
    purchaseFrequency: decimal("purchase_frequency", { precision: 5, scale: 2 })
      .default("0")
      .notNull(), // purchases per month
    purchaseVelocity: decimal("purchase_velocity", { precision: 5, scale: 2 })
      .default("0")
      .notNull(), // recent activity vs historical
    uniquePaymentMethods: integer("unique_payment_methods").default(0).notNull(),
    hasActiveSubscription: boolean("has_active_subscription")
      .default(false)
      .notNull(),
    subscriptionCount: integer("subscription_count").default(0).notNull(),
    averageTimeBetweenTransactions: integer("avg_time_between_transactions"), // in seconds
    uniqueCardsUsed: integer("unique_cards_used").default(0).notNull(),

    // ==========================================
    // CONSISTENCY METRICS (0-100)
    // ==========================================
    deviceConsistency: integer("device_consistency").default(50).notNull(),
    locationConsistency: integer("location_consistency").default(50).notNull(),
    paymentMethodConsistency: integer("payment_method_consistency")
      .default(50)
      .notNull(),

    // Countries used
    uniqueCountries: integer("unique_countries").default(0).notNull(),
    primaryCountry: text("primary_country"),
    lastCountry: text("last_country"),

    // ==========================================
    // COMPUTED TRUST SCORE
    // ==========================================
    trustScore: integer("trust_score").default(50).notNull(), // 0-100
    previousTrustScore: integer("previous_trust_score"), // for tracking changes
    trustScoreChange: integer("trust_score_change"), // +/- from previous

    // ==========================================
    // TIER CLASSIFICATION
    // ==========================================
    tier: text("tier").default("new").notNull(), // blocked, suspicious, new, trusted, vip
    previousTier: text("previous_tier"),
    tierChangedAt: timestamp("tier_changed_at"),

    // ==========================================
    // FLAGS
    // ==========================================
    whitelisted: boolean("whitelisted").default(false).notNull(),
    blacklisted: boolean("blacklisted").default(false).notNull(),
    manualOverride: boolean("manual_override").default(false).notNull(),

    // Whitelisting details
    whitelistedAt: timestamp("whitelisted_at"),
    whitelistedBy: text("whitelisted_by"), // user_id or 'system'
    whitelistReason: text("whitelist_reason"),

    // Blacklisting details
    blacklistedAt: timestamp("blacklisted_at"),
    blacklistedBy: text("blacklisted_by"),
    blacklistReason: text("blacklist_reason"),

    // Auto whitelist/blacklist
    autoWhitelistedAt: timestamp("auto_whitelisted_at"),
    autoBlacklistedAt: timestamp("auto_blacklisted_at"),

    // ==========================================
    // NOTES & TAGS
    // ==========================================
    metadata: jsonb("metadata").$type<CustomerMetadata>().default({}),

    // ==========================================
    // RISK ALERTS
    // ==========================================
    riskAlertActive: boolean("risk_alert_active").default(false).notNull(),
    riskAlertReason: text("risk_alert_reason"),
    riskAlertCreatedAt: timestamp("risk_alert_created_at"),

    // ==========================================
    // SCORE CALCULATION
    // ==========================================
    scoreCalculatedAt: timestamp("score_calculated_at"),
    scoreCalculationMethod: text("score_calculation_method"), // v1, v2, etc.

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("customer_scores_org_customer_idx").on(
      table.organizationId,
      table.stripeCustomerId
    ),
    unique("unique_org_customer").on(
      table.organizationId,
      table.stripeCustomerId
    ),
    index("customer_scores_email_idx").on(table.email),
    index("customer_scores_tier_idx").on(table.tier),
    index("customer_scores_trust_score_idx").on(table.trustScore),
    index("customer_scores_whitelisted_idx").on(table.whitelisted),
    index("customer_scores_blacklisted_idx").on(table.blacklisted),
    // Composite indexes for common queries
    index("customer_scores_org_tier_idx").on(table.organizationId, table.tier),
    index("customer_scores_org_score_idx").on(
      table.organizationId,
      table.trustScore
    ),
  ]
);

// ==========================================
// RELATIONS
// ==========================================
export const customerTrustScoresRelations = relations(
  customerTrustScores,
  ({ one }) => ({
    organization: one(organization, {
      fields: [customerTrustScores.organizationId],
      references: [organization.id],
    }),
  })
);

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export type CustomerTrustScore = InferSelectModel<typeof customerTrustScores>;
export type NewCustomerTrustScore = InferInsertModel<typeof customerTrustScores>;

export const customerTrustScoresInsertSchema =
  createInsertSchema(customerTrustScores);
export const customerTrustScoresSelectSchema =
  createSelectSchema(customerTrustScores);
