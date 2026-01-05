CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_fraud_detection_id" integer,
	"related_customer_id" integer,
	"related_card_testing_id" integer,
	"related_id" text,
	"data" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"dismissed" boolean DEFAULT false NOT NULL,
	"dismissed_at" timestamp,
	"dismissed_by" text,
	"archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"action_taken" text,
	"action_taken_at" timestamp,
	"action_note" text,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp,
	"slack_sent" boolean DEFAULT false NOT NULL,
	"slack_sent_at" timestamp,
	"discord_sent" boolean DEFAULT false NOT NULL,
	"discord_sent_at" timestamp,
	"sms_sent" boolean DEFAULT false NOT NULL,
	"sms_sent_at" timestamp,
	"priority" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"expired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"period_type" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_transactions" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"avg_transaction_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"transactions_allowed" integer DEFAULT 0 NOT NULL,
	"transactions_blocked" integer DEFAULT 0 NOT NULL,
	"transactions_review" integer DEFAULT 0 NOT NULL,
	"fraud_amount_blocked" numeric(12, 2) DEFAULT '0' NOT NULL,
	"avg_risk_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"max_risk_score" integer DEFAULT 0 NOT NULL,
	"min_risk_score" integer DEFAULT 0 NOT NULL,
	"new_customers" integer DEFAULT 0 NOT NULL,
	"returning_customers" integer DEFAULT 0 NOT NULL,
	"vip_customers" integer DEFAULT 0 NOT NULL,
	"suspicious_customers" integer DEFAULT 0 NOT NULL,
	"card_testing_incidents" integer DEFAULT 0 NOT NULL,
	"card_testing_blocked" integer DEFAULT 0 NOT NULL,
	"card_testing_attempts" integer DEFAULT 0 NOT NULL,
	"chargebacks_received" integer DEFAULT 0 NOT NULL,
	"chargeback_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"alerts_generated" integer DEFAULT 0 NOT NULL,
	"alerts_critical" integer DEFAULT 0 NOT NULL,
	"alerts_resolved" integer DEFAULT 0 NOT NULL,
	"rules_triggered" integer DEFAULT 0 NOT NULL,
	"custom_rules_triggered" integer DEFAULT 0 NOT NULL,
	"ai_analyses_performed" integer DEFAULT 0 NOT NULL,
	"ai_tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_analytics_org_period" UNIQUE("organization_id","period_type","period_start")
);
--> statement-breakpoint
CREATE TABLE "card_testing_trackers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"session_id" text,
	"attempts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unique_cards" integer DEFAULT 0 NOT NULL,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"successful_attempts" integer DEFAULT 0 NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"blocked_attempts" integer DEFAULT 0 NOT NULL,
	"suspicion_score" integer DEFAULT 0 NOT NULL,
	"suspicion_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendation" text,
	"blocked" boolean DEFAULT false NOT NULL,
	"blocked_at" timestamp,
	"blocked_reason" text,
	"unique_ips" integer DEFAULT 0 NOT NULL,
	"primary_ip" text,
	"first_attempt_at" timestamp,
	"last_attempt_at" timestamp,
	"attempt_duration_seconds" integer,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution" text,
	"action_taken" boolean DEFAULT false NOT NULL,
	"action_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_testing_org_invoice_unique" UNIQUE("organization_id","invoice_id")
);
--> statement-breakpoint
CREATE TABLE "customer_trust_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"successful_payments" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"avg_purchase_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_purchase_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"min_purchase_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"dispute_history" integer DEFAULT 0 NOT NULL,
	"refund_history" integer DEFAULT 0 NOT NULL,
	"failed_payments" integer DEFAULT 0 NOT NULL,
	"chargeback_history" integer DEFAULT 0 NOT NULL,
	"card_testing_attempts" integer DEFAULT 0 NOT NULL,
	"fraud_rules_triggered" integer DEFAULT 0 NOT NULL,
	"account_age" integer DEFAULT 0 NOT NULL,
	"first_purchase_at" timestamp,
	"last_purchase_at" timestamp,
	"days_since_last_purchase" integer,
	"purchase_frequency" numeric(5, 2) DEFAULT '0' NOT NULL,
	"purchase_velocity" numeric(5, 2) DEFAULT '0' NOT NULL,
	"unique_payment_methods" integer DEFAULT 0 NOT NULL,
	"has_active_subscription" boolean DEFAULT false NOT NULL,
	"subscription_count" integer DEFAULT 0 NOT NULL,
	"avg_time_between_transactions" integer,
	"unique_cards_used" integer DEFAULT 0 NOT NULL,
	"device_consistency" integer DEFAULT 50 NOT NULL,
	"location_consistency" integer DEFAULT 50 NOT NULL,
	"payment_method_consistency" integer DEFAULT 50 NOT NULL,
	"unique_countries" integer DEFAULT 0 NOT NULL,
	"primary_country" text,
	"last_country" text,
	"trust_score" integer DEFAULT 50 NOT NULL,
	"previous_trust_score" integer,
	"trust_score_change" integer,
	"tier" text DEFAULT 'new' NOT NULL,
	"previous_tier" text,
	"tier_changed_at" timestamp,
	"whitelisted" boolean DEFAULT false NOT NULL,
	"blacklisted" boolean DEFAULT false NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"whitelisted_at" timestamp,
	"whitelisted_by" text,
	"whitelist_reason" text,
	"blacklisted_at" timestamp,
	"blacklisted_by" text,
	"blacklist_reason" text,
	"auto_whitelisted_at" timestamp,
	"auto_blacklisted_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"risk_alert_active" boolean DEFAULT false NOT NULL,
	"risk_alert_reason" text,
	"risk_alert_created_at" timestamp,
	"score_calculated_at" timestamp,
	"score_calculation_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_org_customer" UNIQUE("organization_id","stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "fraud_detection_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"condition" jsonb NOT NULL,
	"action" text NOT NULL,
	"action_params" jsonb DEFAULT '{}'::jsonb,
	"threshold" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"times_triggered" integer DEFAULT 0 NOT NULL,
	"last_triggered_at" timestamp,
	"true_positives" integer DEFAULT 0 NOT NULL,
	"false_positives" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fraud_detections" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"payment_intent_id" text NOT NULL,
	"stripe_charge_id" text,
	"stripe_invoice_id" text,
	"stripe_customer_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"customer_email" text,
	"customer_name" text,
	"description" text,
	"risk_score" integer NOT NULL,
	"decision" text NOT NULL,
	"confidence" text NOT NULL,
	"factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"agents_used" text[] DEFAULT '{}' NOT NULL,
	"ai_explanation" text,
	"ai_model" text,
	"ai_generated_at" timestamp,
	"ai_tokens_used" integer,
	"ai_latency_ms" integer,
	"detection_context" jsonb,
	"merchant_override" text,
	"override_reason" text,
	"override_note" text,
	"override_at" timestamp,
	"actual_outcome" text,
	"outcome_confirmed_at" timestamp,
	"outcome_note" text,
	"chargeback_received" boolean DEFAULT false NOT NULL,
	"chargeback_amount" integer,
	"chargeback_reason" text,
	"chargeback_received_at" timestamp,
	"blocked" boolean DEFAULT false NOT NULL,
	"action_taken" text,
	"action_taken_at" timestamp,
	"refund_id" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fraud_detections_payment_intent_id_unique" UNIQUE("payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	"phone_number" text,
	"stripe_account_id" text,
	"stripe_access_token" text,
	"stripe_refresh_token" text,
	"stripe_scope" text,
	"stripe_connected_at" timestamp,
	"webhook_endpoint_id" text,
	"webhook_secret" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"plan_period" text DEFAULT 'monthly' NOT NULL,
	"subscription_status" text,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"trial_started_at" timestamp,
	"trial_ends_at" timestamp,
	"monthly_transaction_limit" integer DEFAULT 1000 NOT NULL,
	"transactions_this_month" integer DEFAULT 0 NOT NULL,
	"monthly_reset_date" timestamp,
	"has_early_bird_pricing" boolean DEFAULT false NOT NULL,
	"early_bird_price" numeric(10, 2),
	"early_bird_locked_at" timestamp,
	"settings" jsonb DEFAULT '{"emailAlerts":true,"autoBlock":true,"autoBlockThreshold":80,"reviewThreshold":60,"blockThreshold":80,"require3DSScore":70,"whitelistTrustedCustomers":true,"notifyOnBlock":true,"notifyOnReview":true,"shadowMode":false}'::jsonb NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"onboarding_config" jsonb,
	"first_transaction_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organization_stripe_account_id_unique" UNIQUE("stripe_account_id")
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text,
	"stripe_event_id" text NOT NULL,
	"stripe_event_type" text NOT NULL,
	"stripe_account" text,
	"payload" jsonb NOT NULL,
	"response" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp,
	"processing_duration" integer,
	"status_code" integer,
	"error" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"error_stack" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"created_fraud_detection_id" integer,
	"created_alert_id" integer,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_log_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"stripe_account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"scope" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"livemode" boolean DEFAULT false NOT NULL,
	"webhook_secret" text,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_connections_stripe_account_id_unique" UNIQUE("stripe_account_id"),
	CONSTRAINT "stripe_connections_org_account_unique" UNIQUE("organization_id","stripe_account_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_related_fraud_detection_id_fraud_detections_id_fk" FOREIGN KEY ("related_fraud_detection_id") REFERENCES "public"."fraud_detections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_related_customer_id_customer_trust_scores_id_fk" FOREIGN KEY ("related_customer_id") REFERENCES "public"."customer_trust_scores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_related_card_testing_id_card_testing_trackers_id_fk" FOREIGN KEY ("related_card_testing_id") REFERENCES "public"."card_testing_trackers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_summaries" ADD CONSTRAINT "analytics_summaries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_testing_trackers" ADD CONSTRAINT "card_testing_trackers_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_trust_scores" ADD CONSTRAINT "customer_trust_scores_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_detection_rules" ADD CONSTRAINT "fraud_detection_rules_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_detections" ADD CONSTRAINT "fraud_detections_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events_log" ADD CONSTRAINT "webhook_events_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events_log" ADD CONSTRAINT "webhook_events_log_created_fraud_detection_id_fraud_detections_id_fk" FOREIGN KEY ("created_fraud_detection_id") REFERENCES "public"."fraud_detections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events_log" ADD CONSTRAINT "webhook_events_log_created_alert_id_alerts_id_fk" FOREIGN KEY ("created_alert_id") REFERENCES "public"."alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD CONSTRAINT "stripe_connections_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alerts_org_created_idx" ON "alerts" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "alerts_severity_idx" ON "alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "alerts_type_idx" ON "alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "alerts_read_idx" ON "alerts" USING btree ("read");--> statement-breakpoint
CREATE INDEX "alerts_dismissed_idx" ON "alerts" USING btree ("dismissed");--> statement-breakpoint
CREATE INDEX "alerts_category_idx" ON "alerts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "alerts_org_read_idx" ON "alerts" USING btree ("organization_id","read");--> statement-breakpoint
CREATE INDEX "alerts_org_severity_idx" ON "alerts" USING btree ("organization_id","severity");--> statement-breakpoint
CREATE INDEX "alerts_org_category_idx" ON "alerts" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "analytics_org_period_idx" ON "analytics_summaries" USING btree ("organization_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "analytics_period_type_idx" ON "analytics_summaries" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "analytics_period_start_idx" ON "analytics_summaries" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX "card_testing_org_invoice_idx" ON "card_testing_trackers" USING btree ("organization_id","invoice_id");--> statement-breakpoint
CREATE INDEX "card_testing_blocked_idx" ON "card_testing_trackers" USING btree ("organization_id","blocked");--> statement-breakpoint
CREATE INDEX "card_testing_score_idx" ON "card_testing_trackers" USING btree ("organization_id","suspicion_score");--> statement-breakpoint
CREATE INDEX "card_testing_created_at_idx" ON "card_testing_trackers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "card_testing_resolved_idx" ON "card_testing_trackers" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "customer_scores_org_customer_idx" ON "customer_trust_scores" USING btree ("organization_id","stripe_customer_id");--> statement-breakpoint
CREATE INDEX "customer_scores_email_idx" ON "customer_trust_scores" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customer_scores_tier_idx" ON "customer_trust_scores" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "customer_scores_trust_score_idx" ON "customer_trust_scores" USING btree ("trust_score");--> statement-breakpoint
CREATE INDEX "customer_scores_whitelisted_idx" ON "customer_trust_scores" USING btree ("whitelisted");--> statement-breakpoint
CREATE INDEX "customer_scores_blacklisted_idx" ON "customer_trust_scores" USING btree ("blacklisted");--> statement-breakpoint
CREATE INDEX "customer_scores_org_tier_idx" ON "customer_trust_scores" USING btree ("organization_id","tier");--> statement-breakpoint
CREATE INDEX "customer_scores_org_score_idx" ON "customer_trust_scores" USING btree ("organization_id","trust_score");--> statement-breakpoint
CREATE INDEX "fraud_rules_org_enabled_idx" ON "fraud_detection_rules" USING btree ("organization_id","enabled");--> statement-breakpoint
CREATE INDEX "fraud_rules_priority_idx" ON "fraud_detection_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "fraud_rules_action_idx" ON "fraud_detection_rules" USING btree ("action");--> statement-breakpoint
CREATE INDEX "fraud_detections_organization_idx" ON "fraud_detections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fraud_detections_decision_idx" ON "fraud_detections" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "fraud_detections_risk_score_idx" ON "fraud_detections" USING btree ("risk_score");--> statement-breakpoint
CREATE INDEX "fraud_detections_customer_email_idx" ON "fraud_detections" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "fraud_detections_stripe_customer_idx" ON "fraud_detections" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "fraud_detections_detected_at_idx" ON "fraud_detections" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "fraud_detections_payment_intent_idx" ON "fraud_detections" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "fraud_detections_org_decision_idx" ON "fraud_detections" USING btree ("organization_id","decision");--> statement-breakpoint
CREATE INDEX "fraud_detections_org_date_idx" ON "fraud_detections" USING btree ("organization_id","detected_at");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_stripe_account_idx" ON "organization" USING btree ("stripe_account_id");--> statement-breakpoint
CREATE INDEX "organization_plan_idx" ON "organization" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "organization_subscription_status_idx" ON "organization" USING btree ("subscription_status");--> statement-breakpoint
CREATE INDEX "organization_slug_idx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "webhook_events_stripe_event_type_idx" ON "webhook_events_log" USING btree ("stripe_event_type");--> statement-breakpoint
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events_log" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "webhook_events_error_idx" ON "webhook_events_log" USING btree ("error");--> statement-breakpoint
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events_log" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "webhook_events_org_idx" ON "webhook_events_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_events_stripe_account_idx" ON "webhook_events_log" USING btree ("stripe_account");--> statement-breakpoint
CREATE INDEX "stripe_connections_org_idx" ON "stripe_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stripe_connections_account_idx" ON "stripe_connections" USING btree ("stripe_account_id");