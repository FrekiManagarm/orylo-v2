# Infrastructure and Deployment

### Deployment Strategy: Gradual Rollout

**Phase 1** : Deploy V2 code (Shadow Mode, disabled)
**Phase 2** : Enable Shadow Mode (V2 parallel V1, no impact)
**Phase 3** : Gradual rollout 1% → 5% → 25% → 50% → 100%
**Phase 4** : Cleanup (remove V1 code)

### Environment Variables

```bash
ENABLE_V2_FRAUD_DETECTION=false
ENABLE_V2_SHADOW_MODE=false
TRIGGER_API_KEY=<key>
UPSTASH_REDIS_REST_URL=<url>  # Optionnel
```

### Rollback Strategy

**Method** : Feature flag toggle (instant)  
**Triggers** : Latence > 2s, Error rate > 1%, Agreement < 95%  
**Procedure** : Set `ENABLE_V2_FRAUD_DETECTION=false` → Redeploy (< 2min)

---
