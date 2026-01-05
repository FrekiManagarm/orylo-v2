import {
  decimal,
  index,
  integer,
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
// ANALYTICS SUMMARIES TABLE
// ==========================================
export const analyticsSummaries = pgTable(
  "analytics_summaries",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // ==========================================
    // TIME PERIOD
    // ==========================================
    periodType: text("period_type").notNull(), // daily, weekly, monthly
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // ==========================================
    // TRANSACTION METRICS
    // ==========================================
    totalTransactions: integer("total_transactions").default(0).notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    avgTransactionAmount: decimal("avg_transaction_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),

    // ==========================================
    // DETECTION METRICS
    // ==========================================
    transactionsAllowed: integer("transactions_allowed").default(0).notNull(),
    transactionsBlocked: integer("transactions_blocked").default(0).notNull(),
    transactionsReview: integer("transactions_review").default(0).notNull(),

    fraudAmountBlocked: decimal("fraud_amount_blocked", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),

    // ==========================================
    // RISK SCORES
    // ==========================================
    avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    maxRiskScore: integer("max_risk_score").default(0).notNull(),
    minRiskScore: integer("min_risk_score").default(0).notNull(),

    // ==========================================
    // CUSTOMER METRICS
    // ==========================================
    newCustomers: integer("new_customers").default(0).notNull(),
    returningCustomers: integer("returning_customers").default(0).notNull(),
    vipCustomers: integer("vip_customers").default(0).notNull(),
    suspiciousCustomers: integer("suspicious_customers").default(0).notNull(),

    // ==========================================
    // CARD TESTING
    // ==========================================
    cardTestingIncidents: integer("card_testing_incidents").default(0).notNull(),
    cardTestingBlocked: integer("card_testing_blocked").default(0).notNull(),
    cardTestingAttempts: integer("card_testing_attempts").default(0).notNull(),

    // ==========================================
    // CHARGEBACKS
    // ==========================================
    chargebacksReceived: integer("chargebacks_received").default(0).notNull(),
    chargebackAmount: decimal("chargeback_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    // ==========================================
    // ALERTS
    // ==========================================
    alertsGenerated: integer("alerts_generated").default(0).notNull(),
    alertsCritical: integer("alerts_critical").default(0).notNull(),
    alertsResolved: integer("alerts_resolved").default(0).notNull(),

    // ==========================================
    // RULES
    // ==========================================
    rulesTriggered: integer("rules_triggered").default(0).notNull(),
    customRulesTriggered: integer("custom_rules_triggered").default(0).notNull(),

    // ==========================================
    // AI USAGE
    // ==========================================
    aiAnalysesPerformed: integer("ai_analyses_performed").default(0).notNull(),
    aiTokensUsed: integer("ai_tokens_used").default(0).notNull(),

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("analytics_org_period_idx").on(
      table.organizationId,
      table.periodType,
      table.periodStart
    ),
    unique("unique_analytics_org_period").on(
      table.organizationId,
      table.periodType,
      table.periodStart
    ),
    index("analytics_period_type_idx").on(table.periodType),
    index("analytics_period_start_idx").on(table.periodStart),
  ]
);

// ==========================================
// RELATIONS
// ==========================================
export const analyticsSummariesRelations = relations(
  analyticsSummaries,
  ({ one }) => ({
    organization: one(organization, {
      fields: [analyticsSummaries.organizationId],
      references: [organization.id],
    }),
  })
);

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export type AnalyticsSummary = InferSelectModel<typeof analyticsSummaries>;
export type NewAnalyticsSummary = InferInsertModel<typeof analyticsSummaries>;

export const analyticsSummariesInsertSchema =
  createInsertSchema(analyticsSummaries);
export const analyticsSummariesSelectSchema =
  createSelectSchema(analyticsSummaries);
