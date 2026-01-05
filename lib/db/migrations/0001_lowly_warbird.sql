ALTER TABLE "alerts" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "related_fraud_detection_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "related_customer_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "related_card_testing_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "analytics_summaries" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "card_testing_trackers" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "customer_trust_scores" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "fraud_detection_rules" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "fraud_detections" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "webhook_events_log" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "webhook_events_log" ALTER COLUMN "created_fraud_detection_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "webhook_events_log" ALTER COLUMN "created_alert_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "fraud_detections" ADD COLUMN "card_testing_tracker_id" text;--> statement-breakpoint
ALTER TABLE "fraud_detections" ADD CONSTRAINT "fraud_detections_card_testing_tracker_id_card_testing_trackers_id_fk" FOREIGN KEY ("card_testing_tracker_id") REFERENCES "public"."card_testing_trackers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fraud_detections_card_testing_tracker_idx" ON "fraud_detections" USING btree ("card_testing_tracker_id");