import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ==========================================
// STRIPE CONNECTIONS TABLE
// ==========================================
export const stripeConnections = pgTable(
  "stripe_connections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // Stripe Account Details
    stripeAccountId: text("stripe_account_id").notNull().unique(),

    // OAuth Tokens (Encrypted)
    accessToken: text("access_token"), // Encrypted
    refreshToken: text("refresh_token"), // Encrypted
    scope: text("scope"),

    // Connection Status
    isActive: boolean("is_active").default(true).notNull(),
    livemode: boolean("livemode").default(false).notNull(),

    // Webhook Configuration
    webhookSecret: text("webhook_secret"), // Webhook signing secret

    // Sync Tracking
    lastSyncAt: timestamp("last_sync_at"),

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("stripe_connections_org_idx").on(table.organizationId),
    index("stripe_connections_account_idx").on(table.stripeAccountId),
    unique("stripe_connections_org_account_unique").on(
      table.organizationId,
      table.stripeAccountId
    ),
  ]
);

// ==========================================
// RELATIONS
// ==========================================
export const stripeConnectionsRelations = relations(
  stripeConnections,
  ({ one }) => ({
    organization: one(organization, {
      fields: [stripeConnections.organizationId],
      references: [organization.id],
    }),
  })
);

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export type StripeConnection = InferSelectModel<typeof stripeConnections>;
export type NewStripeConnection = InferInsertModel<typeof stripeConnections>;

export const stripeConnectionsInsertSchema =
  createInsertSchema(stripeConnections);
export const stripeConnectionsSelectSchema =
  createSelectSchema(stripeConnections);
