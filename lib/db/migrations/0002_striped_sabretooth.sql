ALTER TABLE "fraud_detections" ADD COLUMN "composite_score" integer;--> statement-breakpoint
ALTER TABLE "fraud_detections" ADD COLUMN "composite_risk_level" text;--> statement-breakpoint
ALTER TABLE "fraud_detections" ADD COLUMN "card_testing_suspicion_score" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "fraud_detections_composite_score_idx" ON "fraud_detections" USING btree ("composite_score");--> statement-breakpoint
CREATE INDEX "fraud_detections_composite_risk_level_idx" ON "fraud_detections" USING btree ("composite_risk_level");--> statement-breakpoint
CREATE INDEX "fraud_detections_org_composite_score_idx" ON "fraud_detections" USING btree ("organization_id","composite_score");