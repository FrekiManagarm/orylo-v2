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
import { alerts } from "./alerts";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ==========================================
// WEBHOOK EVENTS LOG TABLE
// ==========================================
export const webhookEventsLog = pgTable(
  "webhook_events_log",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),

    // ==========================================
    // STRIPE EVENT DETAILS
    // ==========================================
    stripeEventId: text("stripe_event_id").notNull().unique(),
    stripeEventType: text("stripe_event_type").notNull(),
    stripeAccount: text("stripe_account"), // Connected account ID

    // ==========================================
    // PAYLOAD
    // ==========================================
    payload: jsonb("payload").notNull(),
    response: jsonb("response"),

    // ==========================================
    // PROCESSING STATUS
    // ==========================================
    processed: boolean("processed").default(false).notNull(),
    processedAt: timestamp("processed_at"),
    processingDuration: integer("processing_duration"), // milliseconds
    statusCode: integer("status_code"),

    // ==========================================
    // ERROR HANDLING
    // ==========================================
    error: boolean("error").default(false).notNull(),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    retryCount: integer("retry_count").default(0).notNull(),
    lastRetryAt: timestamp("last_retry_at"),

    // ==========================================
    // CREATED ENTITIES
    // ==========================================
    createdFraudDetectionId: text("created_fraud_detection_id").references(
      () => fraudDetections.id,
      { onDelete: "set null" }
    ),
    createdAlertId: text("created_alert_id").references(() => alerts.id, {
      onDelete: "set null",
    }),

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("webhook_events_stripe_event_type_idx").on(table.stripeEventType),
    index("webhook_events_processed_idx").on(table.processed),
    index("webhook_events_error_idx").on(table.error),
    index("webhook_events_received_at_idx").on(table.receivedAt),
    index("webhook_events_org_idx").on(table.organizationId),
    index("webhook_events_stripe_account_idx").on(table.stripeAccount),
  ]
);

// ==========================================
// RELATIONS
// ==========================================
export const webhookEventsLogRelations = relations(
  webhookEventsLog,
  ({ one }) => ({
    organization: one(organization, {
      fields: [webhookEventsLog.organizationId],
      references: [organization.id],
    }),
    fraudDetection: one(fraudDetections, {
      fields: [webhookEventsLog.createdFraudDetectionId],
      references: [fraudDetections.id],
    }),
    alert: one(alerts, {
      fields: [webhookEventsLog.createdAlertId],
      references: [alerts.id],
    }),
  })
);

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export type WebhookEventLog = InferSelectModel<typeof webhookEventsLog>;
export type NewWebhookEventLog = InferInsertModel<typeof webhookEventsLog>;

export const webhookEventsLogInsertSchema =
  createInsertSchema(webhookEventsLog);
export const webhookEventsLogSelectSchema =
  createSelectSchema(webhookEventsLog);
