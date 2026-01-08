# Epic 1: Refonte Architecture Fraud Detection (Strangler Fig Pattern)

### Epic Goal

Refactoriser l'architecture de détection de fraude pour atteindre :
- **Modularité** : Architecture pluggable avec separation of concerns
- **Performance** : Réduction de 30-50% de la latence webhook (1,500ms → 1,000ms)
- **Testabilité** : 60%+ code coverage (objectif 80% post-refonte)
- **Maintainabilité** : Code clair, documenté, facilement extensible

**Sans interrompre** le service en production ni créer de breaking changes.

### Epic Description

**Contexte Brownfield Existant** :

Le système actuel fonctionne avec cette architecture :
- **Webhook handler monolithique** : `stripe-webhook-handlers.ts` (1,251 lignes) avec 15+ handlers
- **Detection engine procédural** : `engine.ts` (492 lignes) avec 15 règles hardcodées
- **11 modules fragmentés** : Responsabilités mélangées, duplication de logique
- **0% test coverage** : Aucun test, développement risqué
- **Performance limite** : ~1,500ms latence moyenne (objectif < 2s, mais tight)

**Stack Technique** (Non-négociable) :
- Next.js 16 App Router + TypeScript strict
- PostgreSQL (Neon) + Drizzle ORM
- Stripe Connect multi-tenant
- Better Auth (NOT NextAuth)
- **Bun** comme package manager
- Vercel serverless deployment

**Integration Points Critiques** :
- `app/api/webhooks/stripe/[accountId]/route.ts` : Point d'entrée webhook
- `lib/actions/stripe-webhook-handlers.ts` : Logique métier handlers
- `lib/fraud-detection/` : Modules de détection (11 fichiers)
- `lib/db/schemas/` : Schémas database (fraudDetections, customerTrustScores, etc.)

**Enhancement Specifics** :

Cette refonte va introduire :

1. **Nouvelle Architecture Modulaire** :
   - `lib/fraud-detection/core/` : Engine, pipeline, orchestration
   - `lib/fraud-detection/detectors/` : Detectors pluggables (card-testing, velocity, trust, custom, geographic)
   - `lib/fraud-detection/services/` : Services (context-builder, scoring, AI)
   - `lib/fraud-detection/repositories/` : Abstractions DB avec interfaces
   - `lib/actions/webhooks/` : Handlers décomposés par domaine

2. **Patterns Architecturaux** :
   - **Strangler Fig** : Nouveau code remplace progressivement l'ancien
   - **Repository Pattern** : Abstraire DB access
   - **Chain of Responsibility** : Detection pipeline
   - **Strategy Pattern** : Scoring strategies configurables
   - **Dependency Injection** : Pour testabilité

3. **Optimisations Performance** :
   - Parallélisation queries DB (Promise.all)
   - Cache in-memory pour données stables
   - AI async avec Trigger.dev
   - Early exit pour cas évidents

4. **Infrastructure Testing** :
   - Vitest setup avec mocks Stripe, DB, OpenAI
   - 60% coverage V1 (modules critiques)
   - Shadow mode pour validation progressive
   - Performance regression tests automatisés

### Stories

#### **Phase 1 : Foundation & Setup (Week 1-2)**

**Story 1.1: Setup Testing Infrastructure**

As a developer,
I want a complete testing infrastructure with Vitest and mocks,
So that I can write tests for nouveau code dès le début.

**Acceptance Criteria** :
1. Vitest configuré avec coverage reporting (v8)
2. Mocks créés pour Stripe, DB (Drizzle), OpenAI
3. Fixtures de test pour TransactionContext, PaymentIntent, Charge
4. Scripts package.json : `bun test`, `bun test:watch`, `bun test:coverage`
5. CI/CD configuré pour exécuter tests automatiquement
6. Documentation des patterns de testing (README tests)

**Integration Verification** :
- IV1: Tests existants ne sont PAS requis (code legacy as-is)
- IV2: Nouveau code doit avoir tests dès création
- IV3: Mock Stripe retourne données réalistes (basées sur Stripe docs)

---

**Story 1.2: Create Core Interfaces and Types**

As a developer,
I want des interfaces claires pour tous les modules principaux,
So that je peux implémenter les modules de façon découplée et testable.

**Acceptance Criteria** :
1. Interface `IDetector` définie (detect, canHandle, priority)
2. Interface `IFraudDetectionRepository` définie (CRUD operations)
3. Interface `IContextBuilderService` définie (build, buildParallel)
4. Interface `IScoringStrategy` définie (aggregate, calculate)
5. Types core réorganisés dans `lib/fraud-detection/core/types.ts` (< 200 lignes)
6. Branded types créés (`OrganizationId`, `PaymentIntentId`, `CustomerId`)
7. JSDoc complet pour toutes interfaces

**Integration Verification** :
- IV1: Types existants (`lib/fraud-detection/types.ts`) restent inchangés temporairement
- IV2: Nouveau code utilise nouveaux types, ancien code utilise anciens types
- IV3: Aucune compilation error introduite

---

#### **Phase 2 : Context Builder & Detectors (Week 3-6)**

**Story 2.1: Refactor Context Builder with Parallelization**

As a system,
I want to build transaction context en parallèle plutôt que séquentiellement,
So that la latence de construction de context est réduite de 40%.

**Acceptance Criteria** :
1. Nouveau `context-builder.service.ts` créé avec interface `IContextBuilderService`
2. Context providers séparés (CustomerProvider, VelocityProvider, CardProvider)
3. Parallel loading avec Promise.all pour providers indépendants
4. Lazy loading : charger seulement contextes nécessaires selon règles actives
5. **Performance** : Baseline établi, nouveau code mesure latence < baseline -30%
6. Tests unitaires : 80%+ coverage context-builder
7. **Shadow mode** : Execute ancien + nouveau, compare, log divergences

**Integration Verification** :
- IV1: Ancien `buildTransactionContext()` reste fonctionnel
- IV2: Nouveau service retourne exactement même structure `TransactionContext`
- IV3: Aucun breaking change dans `handlePaymentIntentCreated()`
- IV4: Performance mesurée : baseline (200ms) → nouveau (< 140ms)

**Rollback Considerations** :
- Feature flag `USE_NEW_CONTEXT_BUILDER` pour activer/désactiver
- Rollback immédiat possible via env var
- Monitoring : alertes si latence > baseline + 50ms

---

**Story 2.2: Implement Pluggable Detection Engine**

As a developer,
I want un detection engine modulaire avec detectors pluggables,
So that je peux ajouter/modifier des règles sans toucher au core engine.

**Acceptance Criteria** :
1. `FraudDetectionEngine` créé avec detection pipeline (Chain of Responsibility)
2. Base `IDetector` interface implémentée
3. Detectors initiaux créés :
   - `GeographicDetector` (IP country vs card country)
   - `VelocityDetector` (attempts, rapid payment)
   - `AmountDetector` (unusual amounts, thresholds)
   - `BlacklistDetector` (instant block)
4. Pipeline exécute detectors par priorité
5. Scoring strategy pluggable (additif V1, multiplicatif/ML optionnel V2)
6. **Config-driven rules** : Seuils externalisés dans `fraud-detection.config.ts`
7. Tests unitaires : 90%+ coverage engine + each detector

**Integration Verification** :
- IV1: Ancien `engine.ts` reste fonctionnel (pas touché)
- IV2: Nouveau engine retourne même format `FraudDetectionResult`
- IV3: **Shadow mode** : Compare décisions ancien vs nouveau (> 99% agreement)
- IV4: Performance égale ou meilleure

**Rollback Considerations** :
- Feature flag `USE_NEW_ENGINE` pour routing
- Shadow mode obligatoire avant activation (1-2 semaines)
- Automatic rollback si agreement < 95%

---

**Story 2.3: Migrate Card Testing & Trust Score Detectors**

As a system,
I want card testing et trust score comme detectors indépendants,
So que la logique est modulaire et réutilisable.

**Acceptance Criteria** :
1. `CardTestingDetector` créé (wraps existing `card-testing.ts` logic)
2. `TrustScoreDetector` créé (wraps existing `trust-score.ts` logic)
3. `CustomRulesDetector` intégré (déjà développé - Story 2.1 complétée)
4. Chaque detector isolé avec tests unitaires 85%+
5. Integration dans detection pipeline
6. **Performance** : Aucune régression vs code actuel

**Integration Verification** :
- IV1: Modules existants (`card-testing.ts`, `trust-score.ts`) restent inchangés
- IV2: Detectors wrappent logique existante (delegation pattern)
- IV3: Comportement identique à 99%+
- IV4: Tests vérifient edge cases connus

---

#### **Phase 3 : Handlers & Performance (Week 7-9)**

**Story 3.1: Decompose Webhook Handler Monolith**

As a maintainer,
I want webhook handlers décomposés par domaine métier,
So that le code est maintenable et chaque handler < 300 lignes.

**Acceptance Criteria** :
1. Nouveau `webhook-orchestrator.ts` créé (< 150 lignes) - routes events
2. Handlers spécialisés créés :
   - `payment-handlers.ts` (payment_intent.* events)
   - `charge-handlers.ts` (charge.*, dispute.* events)
   - `customer-handlers.ts` (customer.* events)
   - `checkout-handlers.ts` (checkout.session.* events)
3. Chaque handler module < 300 lignes
4. Séparation orchestration (routing) vs logique métier (handlers)
5. Tests unitaires : 75%+ coverage handlers

**Integration Verification** :
- IV1: Ancien `stripe-webhook-handlers.ts` reste fonctionnel temporairement
- IV2: Route webhook principale (`route.ts`) mise à jour pour utiliser orchestrator
- IV3: Tous event types gérés identiquement
- IV4: **Canary deployment** : 1% → 10% → 50% → 100% traffic

**Rollback Considerations** :
- Feature flag `USE_NEW_HANDLERS` per event type si nécessaire
- Rollback granulaire par handler si problème spécifique
- Monitoring event processing success rate par type

---

**Story 3.2: Implement AI Async Processing with Trigger.dev**

As a system,
I want générer les explications IA de façon asynchrone,
So that la latence webhook est réduite de 50% (500-1000ms économisés).

**Acceptance Criteria** :
1. Trigger.dev setup et configuré (`TRIGGER_DEV_API_KEY` env var)
2. Job `generateFraudExplanationJob` créé dans `lib/jobs/ai-explanation.job.ts`
3. Fallback explanation immédiate (formatFallbackExplanation)
4. Enqueue job après DB save dans `handlePaymentIntentCreated()`
5. Webhook job met à jour `fraudDetections.aiExplanation` + `aiGeneratedAt`
6. Retry automatique (3 tentatives) avec exponential backoff
7. Priority queue : HIGH pour BLOCK/REVIEW, NORMAL pour ALLOW
8. **Performance** : Webhook latency réduite de 500-1000ms

**Integration Verification** :
- IV1: Fallback explanation testée (OpenAI down scenario)
- IV2: Job execution monitored (success rate, latency)
- IV3: UI dashboard affiche explanation dès disponible (pas de freeze)
- IV4: Graceful degradation si Trigger.dev down (fallback sync)

**Rollback Considerations** :
- Feature flag `USE_ASYNC_AI` pour activer/désactiver
- Circuit breaker si Trigger.dev unhealthy
- Fallback vers génération synchrone si queue saturée

---

**Story 3.3: Add In-Memory Cache for Stable Data**

As a system,
I want cacher les données stables (custom rules, customer scores),
So that les DB queries répétitives sont éliminées et latence réduite.

**Acceptance Criteria** :
1. `CacheService` créé avec interface `ICacheService` (get, set, invalidate)
2. In-memory cache implementation (Node.js Map avec TTL)
3. Cache pour :
   - Custom rules (TTL: 60s)
   - Customer trust scores (TTL: 5min)
   - Velocity metrics (PAS de cache - trop volatile)
4. Event-based invalidation (dispute.created, rule.updated)
5. Cache hit/miss metrics logged
6. **Performance** : 20-30% réduction queries DB

**Integration Verification** :
- IV1: Cache miss = fetch DB (transparent fallback)
- IV2: Conservative TTLs empêchent stale data
- IV3: Event invalidation testée (updates propagent)
- IV4: Monitoring cache hit rate (target > 70%)

**Rollback Considerations** :
- Feature flag `ENABLE_CACHE` pour activer/désactiver
- Cache disabled par défaut en dev/staging (testing)
- Automatic invalidation si stale data détectée

---

#### **Phase 4 : Migration Complete & Cleanup (Week 10)**

**Story 4.1: Validate Shadow Mode Results & Enable New Code**

As a product owner,
I want valider que le nouveau code produit les mêmes décisions que l'ancien,
So that je peux migrer en production avec confiance.

**Acceptance Criteria** :
1. Shadow mode exécuté pendant 1-2 semaines minimum
2. Agreement analysis : > 99% agreement entre ancien et nouveau
3. Divergences analysées et expliquées (améliorations intentionnelles)
4. Performance validation : nouveau code ≤ ancien code latency
5. Décision GO/NO-GO basée sur métriques objectives
6. Canary deployment : 1% → 10% → 50% → 100% avec validation

**Integration Verification** :
- IV1: Automated tests valident agreement threshold
- IV2: Manual review des divergences > 1%
- IV3: Performance P95 < baseline + 100ms
- IV4: Error rate unchanged ou réduit

**Rollback Considerations** :
- Automatic rollback si metrics dégradent
- Manual rollback 24/7 disponible
- Rollback plan documenté et testé

---

**Story 4.2: Remove Legacy Code & Finalize Documentation**

As a maintainer,
I want supprimer l'ancien code et finaliser la documentation,
So that le codebase est clean et les futurs développeurs ont une référence claire.

**Acceptance Criteria** :
1. Ancien code supprimé :
   - Legacy `stripe-webhook-handlers.ts` (ancien monolithe)
   - Legacy `engine.ts` (ancien engine)
   - Legacy `context-builder.ts` (ancien builder)
2. Feature flags retirés (nouveau code par défaut)
3. Documentation complète :
   - Architecture Decision Records (ADRs)
   - Flow diagrams (Mermaid)
   - API documentation (JSDoc complet)
   - Testing guide
   - Troubleshooting guide
4. CHANGELOG.md mis à jour avec breaking changes (aucun normalement)
5. Migration guide pour futurs ajouts de detectors

**Integration Verification** :
- IV1: Aucune référence à ancien code dans codebase
- IV2: Tous les tests passent (nouveau code seulement)
- IV3: Documentation reviewed et approved
- IV4: Onboarding nouveau dev testé avec docs

---

### Epic Dependencies & Sequencing

**Recommended Development Order** :

```
Week 1-2:  Story 1.1 (Tests) + 1.2 (Interfaces)
           ↓
Week 3-4:  Story 2.1 (Context Builder) - PARALLEL QUERIES
           ↓ (Quick Win: -20% latency)
Week 5-6:  Story 2.2 (Engine) + 2.3 (Detectors) - SHADOW MODE
           ↓
Week 7-8:  Story 3.1 (Handlers) + 3.2 (AI Async) - MAJOR GAINS
           ↓ (Quick Win: -50% latency totale)
Week 9:    Story 3.3 (Cache) - OPTIMIZATION
           ↓
Week 10:   Story 4.1 (Validation) + 4.2 (Cleanup) - FINALIZATION
```

**Critical Dependencies** :
- Story 2.2 DÉPEND de Story 1.2 (interfaces requis)
- Story 2.3 DÉPEND de Story 2.2 (pipeline doit exister)
- Story 3.1 PEUT être parallèle à Story 2.x
- Story 3.2 PEUT être parallèle (indépendant)
- Story 4.1 DÉPEND de toutes les stories précédentes
- Story 4.2 DÉPEND de Story 4.1 (validation GO)

**Parallelization Opportunities** :
- Story 1.1 + 1.2 peuvent être parallèles (2 devs)
- Story 3.1 + 3.2 peuvent être parallèles (2 devs)
- Story 3.3 peut être parallèle à Story 3.1/3.2

### Epic Definition of Done

✅ **Functional** :
- Nouveau code produit décisions identiques à ancien code (99%+ agreement)
- Tous les webhook event types gérés correctement
- Aucun breaking change pour utilisateurs finaux
- Performance objectifs atteints (-30% minimum latency)

✅ **Technical** :
- 60%+ code coverage sur modules critiques (engine, handlers, builders)
- Tous tests unitaires passent (> 300 tests)
- Tous tests d'intégration passent (> 30 tests)
- Performance tests automatisés en place
- Shadow mode validation complétée

✅ **Operational** :
- Migration 100% complétée en production
- Ancien code supprimé (cleanup)
- Monitoring et alerting configurés
- Documentation complète et reviewée
- Rollback plan testé

✅ **Business** :
- 0 incidents critiques pendant migration
- Error rate inchangée ou réduite
- Customer satisfaction maintenue (pas de plaintes)
- Vélocité dev améliorée (feedback post-migration)

---
