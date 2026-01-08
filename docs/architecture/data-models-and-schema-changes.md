# Data Models and Schema Changes

### New Data Models

#### Table: `fraud_detection_cache` (Nouveau)

**Purpose** : Cache distribué pour customer scores, velocity metrics, et custom rules

```typescript
// lib/db/schemas/fraudDetectionCache.ts
export const fraudDetectionCache = pgTable("fraud_detection_cache", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cacheKey: text("cache_key").notNull(),
  cacheValue: jsonb("cache_value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cache_key_expires").on(table.cacheKey, table.expiresAt),
]);
```

#### Extensions: `fraud_detections` (Modifications additives)

```sql
ALTER TABLE fraud_detections 
  ADD COLUMN detection_version VARCHAR(10),
  ADD COLUMN pipeline_metrics JSONB,
  ADD COLUMN rule_execution_details JSONB;
```

**Backward Compatibility** : Toutes colonnes nullable, V1 continue sans les remplir

---
