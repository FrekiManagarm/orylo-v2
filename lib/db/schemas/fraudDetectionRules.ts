import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ==========================================
// TYPES FOR JSONB FIELDS
// ==========================================

export interface RuleCondition {
  field: string; // riskScore, amount, cardCountry, customerTier, etc.
  operator:
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equals"
  | "less_than_or_equals"
  | "contains"
  | "not_contains"
  | "in"
  | "not_in";
  value: unknown;
  logicalOperator?: "AND" | "OR"; // for multiple conditions
  subConditions?: RuleCondition[];
}

export interface RuleActionParams {
  blockReason?: string;
  alertMessage?: string;
  scoreAdjustment?: number; // +/- to risk score
  priority?: number;
  require3DS?: boolean;
  notifyMerchant?: boolean;
}

// ==========================================
// FRAUD DETECTION RULES TABLE
// ==========================================
export const fraudDetectionRules = pgTable(
  "fraud_detection_rules",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // ==========================================
    // RULE DEFINITION
    // ==========================================
    name: text("name").notNull(),
    description: text("description"),

    // ==========================================
    // RULE LOGIC
    // ==========================================
    condition: jsonb("condition").$type<RuleCondition>().notNull(),

    // ==========================================
    // RULE ACTION
    // ==========================================
    action: text("action").notNull(), // allow, block, review, alert, require_3ds
    actionParams: jsonb("action_params").$type<RuleActionParams>().default({}),

    // Threshold (optional, for score-based rules)
    threshold: integer("threshold"),

    // ==========================================
    // RULE STATUS
    // ==========================================
    enabled: boolean("enabled").default(true).notNull(),
    priority: integer("priority").default(0).notNull(), // Higher = executed first

    // ==========================================
    // USAGE STATISTICS
    // ==========================================
    timesTriggered: integer("times_triggered").default(0).notNull(),
    lastTriggeredAt: timestamp("last_triggered_at"),

    // ==========================================
    // EFFECTIVENESS METRICS
    // ==========================================
    truePositives: integer("true_positives").default(0).notNull(), // correctly caught fraud
    falsePositives: integer("false_positives").default(0).notNull(), // incorrectly flagged

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("fraud_rules_org_enabled_idx").on(table.organizationId, table.enabled),
    index("fraud_rules_priority_idx").on(table.priority),
    index("fraud_rules_action_idx").on(table.action),
  ]
);

// ==========================================
// RELATIONS
// ==========================================
export const fraudDetectionRulesRelations = relations(
  fraudDetectionRules,
  ({ one }) => ({
    organization: one(organization, {
      fields: [fraudDetectionRules.organizationId],
      references: [organization.id],
    }),
  })
);

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export type FraudDetectionRule = InferSelectModel<typeof fraudDetectionRules>;
export type NewFraudDetectionRule = InferInsertModel<typeof fraudDetectionRules>;

export const fraudDetectionRulesInsertSchema =
  createInsertSchema(fraudDetectionRules);
export const fraudDetectionRulesSelectSchema =
  createSelectSchema(fraudDetectionRules);
