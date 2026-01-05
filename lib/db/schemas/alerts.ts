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
import { fraudDetections } from "./fraudDetections";
import { customerTrustScores } from "./customerTrustScores";
import { cardTestingTrackers } from "./cardTestingTrackers";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ==========================================
// ALERTS TABLE
// ==========================================
export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // ==========================================
    // ALERT CLASSIFICATION
    // ==========================================
    type: text("type").notNull(), // FRAUD_BLOCKED, REVIEW_NEEDED, CARD_TESTING, HIGH_RISK_CUSTOMER, CHARGEBACK_RECEIVED, LIMIT_REACHED, etc.
    severity: text("severity").notNull(), // info, warning, high, critical
    category: text("category"), // fraud, customer, system, billing

    // ==========================================
    // ALERT CONTENT
    // ==========================================
    title: text("title").notNull(),
    message: text("message").notNull(),

    // ==========================================
    // RELATED ENTITIES
    // ==========================================
    relatedFraudDetectionId: text("related_fraud_detection_id").references(
      () => fraudDetections.id,
      { onDelete: "set null" }
    ),
    relatedCustomerId: text("related_customer_id").references(
      () => customerTrustScores.id,
      { onDelete: "set null" }
    ),
    relatedCardTestingId: text("related_card_testing_id").references(
      () => cardTestingTrackers.id,
      { onDelete: "set null" }
    ),

    // Legacy: generic related ID (for backwards compatibility)
    relatedId: text("related_id"),

    // ==========================================
    // ADDITIONAL CONTEXT
    // ==========================================
    data: jsonb("data").$type<Record<string, unknown>>(),

    // ==========================================
    // STATUS & ACTIONS
    // ==========================================
    read: boolean("read").default(false).notNull(),
    readAt: timestamp("read_at"),

    dismissed: boolean("dismissed").default(false).notNull(),
    dismissedAt: timestamp("dismissed_at"),
    dismissedBy: text("dismissed_by"), // user_id

    archived: boolean("archived").default(false).notNull(),
    archivedAt: timestamp("archived_at"),

    actionTaken: text("action_taken"), // viewed, override_allowed, override_blocked, dismissed, resolved
    actionTakenAt: timestamp("action_taken_at"),
    actionNote: text("action_note"),

    // ==========================================
    // NOTIFICATION STATUS
    // ==========================================
    emailSent: boolean("email_sent").default(false).notNull(),
    emailSentAt: timestamp("email_sent_at"),

    slackSent: boolean("slack_sent").default(false).notNull(),
    slackSentAt: timestamp("slack_sent_at"),

    discordSent: boolean("discord_sent").default(false).notNull(),
    discordSentAt: timestamp("discord_sent_at"),

    smsSent: boolean("sms_sent").default(false).notNull(),
    smsSentAt: timestamp("sms_sent_at"),

    // ==========================================
    // PRIORITY
    // ==========================================
    priority: integer("priority").default(0).notNull(), // Higher = more important

    // ==========================================
    // EXPIRATION
    // ==========================================
    expiresAt: timestamp("expires_at"),
    expired: boolean("expired").default(false).notNull(),

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("alerts_org_created_idx").on(table.organizationId, table.createdAt),
    index("alerts_severity_idx").on(table.severity),
    index("alerts_type_idx").on(table.type),
    index("alerts_read_idx").on(table.read),
    index("alerts_dismissed_idx").on(table.dismissed),
    index("alerts_category_idx").on(table.category),
    // Composite indexes
    index("alerts_org_read_idx").on(table.organizationId, table.read),
    index("alerts_org_severity_idx").on(table.organizationId, table.severity),
    index("alerts_org_category_idx").on(table.organizationId, table.category),
  ]
);

// ==========================================
// RELATIONS
// ==========================================
export const alertsRelations = relations(alerts, ({ one }) => ({
  organization: one(organization, {
    fields: [alerts.organizationId],
    references: [organization.id],
  }),
  fraudDetection: one(fraudDetections, {
    fields: [alerts.relatedFraudDetectionId],
    references: [fraudDetections.id],
  }),
  customer: one(customerTrustScores, {
    fields: [alerts.relatedCustomerId],
    references: [customerTrustScores.id],
  }),
  cardTestingTracker: one(cardTestingTrackers, {
    fields: [alerts.relatedCardTestingId],
    references: [cardTestingTrackers.id],
  }),
}));

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export type Alert = InferSelectModel<typeof alerts>;
export type NewAlert = InferInsertModel<typeof alerts>;

export const alertsInsertSchema = createInsertSchema(alerts);
export const alertsSelectSchema = createSelectSchema(alerts);
