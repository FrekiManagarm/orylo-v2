# Source Tree

### New File Organization

```
lib/
  ├── fraud-detection-v2/              # 🆕 NOUVELLE ARCHITECTURE
  │   ├── core/
  │   │   ├── engine.ts
  │   │   ├── interfaces.ts
  │   │   └── types.ts
  │   ├── detectors/
  │   │   ├── card-testing.detector.ts
  │   │   ├── trust-score.detector.ts
  │   │   ├── custom-rules.detector.ts
  │   │   ├── geographic.detector.ts
  │   │   └── velocity.detector.ts
  │   ├── services/
  │   │   ├── context-builder.service.ts
  │   │   ├── cache.service.ts
  │   │   └── providers/
  │   └── __tests__/
  ├── webhook-handlers-v2/
  │   ├── orchestrator.ts
  │   ├── handlers/
  │   │   ├── payment.handlers.ts
  │   │   ├── charge.handlers.ts
  │   │   └── customer.handlers.ts
  │   └── __tests__/
  └── fraud-detection/                 # ✅ LEGACY (preserved)
```

---
