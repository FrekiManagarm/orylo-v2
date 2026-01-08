# Component Architecture

### New Components Overview

1. **FraudDetectionEngine** : Orchestration pipeline, exécution detectors
2. **ContextBuilderService** : Context builder parallélisé
3. **Pluggable Detectors** : CardTesting, TrustScore, Custom, Geographic, Velocity
4. **WebhookOrchestrator** : Router events vers handlers spécialisés
5. **CacheService** : Cache layer (Memory + Redis optionnel)

### Component Interaction Diagram

```mermaid
graph TB
    A[Stripe Webhook] --> B[WebhookOrchestrator]
    B --> C[PaymentHandlers]
    C --> D[FraudDetectionEngine]
    D --> E[ContextBuilderService]
    E --> F1[CustomerProvider]
    E --> F2[VelocityProvider]
    E --> F3[CardProvider]
    F1 & F2 & F3 -.parallel.-> E
    E --> G[TransactionContext]
    G --> H[Detection Pipeline]
    H --> I1[CardTestingDetector]
    H --> I2[TrustScoreDetector]
    H --> I3[CustomRulesDetector]
    I1 & I2 & I3 --> J[ScoringStrategy]
    J --> K[FraudDetectionResult]
    K --> L[(PostgreSQL)]
    K --> M[Trigger.dev AI Queue]
    
    style D fill:#4f46e5
    style E fill:#4f46e5
    style H fill:#4f46e5
```

---
