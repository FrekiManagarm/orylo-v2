import {
  boolean,
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
import { fraudDetections } from "./fraudDetections";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ==========================================
// TYPES FOR JSONB FIELDS
// ==========================================

export interface CardTestingAttempt {
  cardFingerprint: string;
  cardLast4?: string;
  cardBrand?: string;
  paymentIntentId?: string;
  timestamp: string; // ISO string
  status: "succeeded" | "failed" | "blocked";
  failureReason?: string;
  failureCode?: string;
  ipAddress?: string;
  amount?: number;
  currency?: string;
}

export interface SuspicionReason {
  label: string;
  description: string;
  weight: number; // How much this adds to the score
  severity: "low" | "medium" | "high";
}

// ==========================================
// CARD TESTING TRACKERS TABLE
// ==========================================
export const cardTestingTrackers = pgTable(
  "card_testing_trackers",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // ==========================================
    // GROUPING KEY
    // ==========================================
    invoiceId: text("invoice_id").notNull(), // Primary grouping (invoice or checkout ID)
    sessionId: text("session_id"), // Optional: browser session

    // ==========================================
    // TRACKING DATA
    // ==========================================
    attempts: jsonb("attempts")
      .$type<CardTestingAttempt[]>()
      .default([])
      .notNull(),

    // ==========================================
    // COMPUTED METRICS
    // ==========================================
    uniqueCards: integer("unique_cards").default(0).notNull(),
    totalAttempts: integer("total_attempts").default(0).notNull(),
    successfulAttempts: integer("successful_attempts").default(0).notNull(),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    blockedAttempts: integer("blocked_attempts").default(0).notNull(),

    // ==========================================
    // SUSPICION INDICATORS
    // ==========================================
    suspicionScore: integer("suspicion_score").default(0).notNull(), // 0-100
    suspicionReasons: jsonb("suspicion_reasons")
      .$type<SuspicionReason[]>()
      .default([])
      .notNull(),

    // Recommendation: ALLOW, REVIEW, BLOCK
    recommendation: text("recommendation").$type<"ALLOW" | "REVIEW" | "BLOCK">(),

    // ==========================================
    // STATUS
    // ==========================================
    blocked: boolean("blocked").default(false).notNull(),
    blockedAt: timestamp("blocked_at"),
    blockedReason: text("blocked_reason"),

    // ==========================================
    // IP TRACKING
    // ==========================================
    uniqueIPs: integer("unique_ips").default(0).notNull(),
    primaryIP: text("primary_ip"),

    // ==========================================
    // TIME WINDOW
    // ==========================================
    firstAttemptAt: timestamp("first_attempt_at"),
    lastAttemptAt: timestamp("last_attempt_at"),
    attemptDurationSeconds: integer("attempt_duration_seconds"), // time between first and last

    // ==========================================
    // RESOLUTION
    // ==========================================
    resolved: boolean("resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: text("resolved_by"), // user_id or 'system'
    resolution: text("resolution"), // allowed, blocked, expired

    // Action taken
    actionTaken: boolean("action_taken").default(false).notNull(),
    actionType: text("action_type"), // refunded, canceled, none

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("card_testing_org_invoice_idx").on(
      table.organizationId,
      table.invoiceId
    ),
    unique("card_testing_org_invoice_unique").on(
      table.organizationId,
      table.invoiceId
    ),
    index("card_testing_blocked_idx").on(table.organizationId, table.blocked),
    index("card_testing_score_idx").on(
      table.organizationId,
      table.suspicionScore
    ),
    index("card_testing_created_at_idx").on(table.createdAt),
    index("card_testing_resolved_idx").on(table.resolved),
  ]
);

// ==========================================
// RELATIONS
// ==========================================
export const cardTestingTrackersRelations = relations(
  cardTestingTrackers,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [cardTestingTrackers.organizationId],
      references: [organization.id],
    }),
    fraudDetections: many(fraudDetections),
  })
);

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export type CardTestingTracker = InferSelectModel<typeof cardTestingTrackers>;
export type NewCardTestingTracker = InferInsertModel<typeof cardTestingTrackers>;

export const cardTestingTrackersInsertSchema =
  createInsertSchema(cardTestingTrackers);
export const cardTestingTrackersSelectSchema =
  createSelectSchema(cardTestingTrackers);
