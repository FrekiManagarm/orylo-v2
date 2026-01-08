# Requirements

### Functional Requirements

#### Architecture & Modularité

**FR1: Décomposition du Webhook Handler Monolithique**

Le système doit décomposer `stripe-webhook-handlers.ts` (1,251 lignes) en modules indépendants à responsabilité unique :
- **Orchestrator pattern** : Un orchestrator léger qui route vers des handlers spécialisés
- **Handler par domaine** : Payment handlers, Charge handlers, Customer handlers, Checkout handlers séparés
- **Separation of concerns** : Logique métier séparée de l'IO, des appels API, et du state management
- **Chaque module < 300 lignes** : Facilite la compréhension et le testing

**FR2: Refonte du Moteur de Détection avec Architecture Pluggable**

Le système doit remplacer `engine.ts` par une architecture modulaire pluggable :
- **Detection Pipeline** : Chain of Responsibility pattern avec étapes configurables
- **Rule Engine** : Système de règles extensible sans modifier le core
- **Pluggable Detectors** : Card testing, velocity, trust score, custom rules comme plugins indépendants
- **Scoring Strategy** : Stratégie de calcul de score configurable (additif, multiplicatif, ML-based)
- **Configuration-driven** : Règles et seuils externalisés (config file ou DB)

**FR3: Abstraction des Dépendances Externes**

Le système doit abstraire toutes les dépendances externes avec interfaces :
- **Repository Pattern** : Abstraire les accès DB avec interfaces `IFraudDetectionRepository`, `ICustomerRepository`, etc.
- **Service Layer** : Abstraire Stripe API avec `IStripeService`, OpenAI avec `IAIExplanationService`
- **Dependency Injection** : Injection des dépendances via constructeur ou provider
- **Mockable** : Toutes les interfaces mockables pour tests unitaires

**FR4: Context Building Modulaire**

Le système doit refactorer `context-builder.ts` avec une architecture modulaire :
- **Context Providers** : Providers indépendants pour Customer, Velocity, Card, Device
- **Parallel Loading** : Charger les contextes en parallèle (Promise.all)
- **Lazy Loading** : Charger uniquement les contextes nécessaires selon les règles actives
- **Cache Layer** : Cache Redis/Memory pour contexts fréquemment accédés

#### Performance & Scalabilité

**FR5: Parallélisation des Queries Database**

Le système doit paralléliser toutes les queries DB indépendantes :
- **Promise.all pour queries parallèles** : Context loading, custom rules loading, customer scores en parallèle
- **Batch operations** : Charger plusieurs enregistrements en une query quand possible
- **Connection pooling** : Réutiliser les connexions DB (déjà géré par Neon, mais optimiser)
- **Query optimization** : Ajouter indexes si nécessaires, optimiser les requêtes lentes

**FR6: Système de Cache Intelligent**

Le système doit implémenter un cache intelligent et progressif :
- **V1 - In-Memory Cache (Node.js Map)** : Cache local pour données stables (custom rules, customer scores)
- **V2 - Redis Cache (optionnel)** : Upgrade vers cache distribué si volume justifie (Vercel KV, Upstash)
- **TTL conservatifs** : Durées courtes pour éviter stale data (custom rules: 60s, scores: 5min)
- **Event-based invalidation** : Invalidation sur events critiques (dispute.created, rule.updated)
- **Cache sélectif** : Seulement données read-heavy et low-change (pas velocity metrics)

**FR7: AI Explanation Asynchrone**

Le système doit rendre la génération d'explication IA non-bloquante :
- **Queue asynchrone avec Trigger.dev** : Générer explication IA en background (après sauvegarde DB)
- **Fallback immédiat** : Retourner explication simplifiée immédiatement, puis enrichir via webhook
- **Trigger.dev pour job processing** : Serverless-native, excellent DX, built-in retry et monitoring
- **Retry logic automatique** : Retry avec exponential backoff en cas d'échec OpenAI API
- **Priority queue** : Haute priorité pour décisions BLOCK/REVIEW, normale pour ALLOW

**FR8: Optimisation du Flow de Détection**

Le système doit optimiser le flow de détection :
- **Early exit** : Sortir rapidement pour cas évidents (whitelist, blacklist)
- **Lazy evaluation** : Ne calculer les métriques coûteuses que si nécessaire
- **Batching** : Grouper les opérations DB (alerts, logs) quand possible
- **Streaming response** : Retourner décision immédiatement, puis logs/analytics

#### Testabilité & Qualité

**FR9: Architecture Testable avec Dependency Injection**

Le système doit être 100% testable avec DI :
- **Interfaces pour tous les services** : `IFraudDetectionEngine`, `IStripeService`, `IAIService`, etc.
- **Constructor injection** : Injecter dépendances via constructeur
- **Factory pattern** : Factories pour créer instances avec dépendances mockées
- **Pure functions** : Maximiser les pure functions pour faciliter tests

**FR10: Tests Unitaires Complets**

Le système doit avoir 80%+ coverage avec tests unitaires :
- **Test framework** : Vitest (recommandé pour Next.js/TypeScript)
- **Mocking** : Mocks pour Stripe, DB, OpenAI, Redis
- **Tests par module** : Chaque module avec sa suite de tests
- **Edge cases** : Tests pour tous les edge cases documentés

**FR11: Tests d'Intégration End-to-End**

Le système doit avoir des tests d'intégration :
- **Webhook simulation** : Simuler webhooks Stripe complets
- **DB test** : Tests avec DB réelle (test DB séparée)
- **Flow complet** : Tester le flow de détection de bout en bout
- **Regression tests** : Tests de non-régression pour comportement actuel

#### Maintenabilité & Extensibilité

**FR12: Documentation du Code et des Décisions**

Le système doit être documenté :
- **JSDoc complet** : Toutes les fonctions publiques avec JSDoc
- **Architecture Decision Records (ADR)** : Documenter les décisions architecturales majeures
- **Flow diagrams** : Diagrammes Mermaid pour flows complexes
- **Examples** : Exemples d'utilisation pour chaque module

**FR13: Type Safety Strict**

Le système doit avoir un typage strict :
- **No `any` types** : Aucun `any`, utiliser `unknown` si nécessaire
- **Branded types** : Types branded pour éviter confusion (e.g., `OrganizationId`, `PaymentIntentId`)
- **Exhaustive checks** : Switch exhaustifs avec `never` checks
- **Runtime validation** : Zod pour validation runtime des inputs critiques

**FR14: Configuration Externalisée et Deployment Strategy**

Le système doit avoir une configuration simple et efficace :
- **Config file** : `fraud-detection.config.ts` pour seuils et paramètres (versionné Git)
- **Env vars** : Variables d'environnement pour secrets, URLs, et feature toggles simples
- **Vercel Gradual Rollout** : Déploiements progressifs (1% → 10% → 50% → 100%) au lieu de feature flags complexes
- **DB-driven config (optionnel)** : Config dynamique via DB pour seuils ajustables sans redéploiement (V2)

**FR15: Observabilité et Monitoring**

Le système doit avoir une observabilité complète :
- **Structured logging** : Logs structurés avec contexte (tslog déjà utilisé)
- **Métriques** : Métriques de performance (latence, throughput, error rate)
- **Tracing** : Tracing distribué pour suivre requests (OpenTelemetry)
- **Alerting** : Alertes pour anomalies (latence élevée, error rate)

### Non-Functional Requirements

**NFR1: Performance - Latence Webhook**

- **Objectif** : Réduire latence moyenne de 1,500ms à **< 1,000ms** (-33%)
- **Latence P95** : < 1,500ms (actuellement ~2,000ms)
- **Latence P99** : < 2,000ms
- **Méthode** : Parallélisation, cache, AI async

**NFR2: Testabilité - Code Coverage Progressif**

- **Objectif V1 (Sprint 1-2)** : Atteindre **60%+ coverage** sur modules critiques (actuellement 0%)
- **Objectif V2 (Sprint 3-4)** : Augmenter à **70%+ coverage** avec edge cases
- **Objectif V3 (Post-refonte)** : Stabiliser à **80%+ coverage** avec mutation testing
- **Modules critiques prioritaires** : `engine`, `handlers`, `context-builder` (90%+ dès V1)
- **Tests unitaires V1** : > 300 tests (focus critical path)
- **Tests intégration V1** : > 30 tests (flow complet webhook)
- **Quality over quantity** : Mutation testing pour valider efficacité des tests

**NFR3: Maintenabilité - Complexité du Code**

- **Objectif** : Réduire complexité cyclomatique moyenne de ~15 à **< 10**
- **Taille des fichiers** : Aucun fichier > 500 lignes (actuellement 1,251 max)
- **Taille des fonctions** : Aucune fonction > 50 lignes
- **DRY principle** : Éliminer duplication de code (DRY score > 90%)

**NFR4: Scalabilité - Throughput**

- **Objectif** : Supporter **1,000 webhooks/minute** par instance Vercel
- **Concurrency** : Gérer 100 webhooks simultanés sans degradation
- **Resource usage** : Memory usage < 512MB par instance

**NFR5: Fiabilité - Error Rate**

- **Objectif** : Error rate < 0.1% sur webhooks (actuellement ~0.5%)
- **Retry logic** : Retry automatique pour erreurs temporaires
- **Circuit breaker** : Circuit breaker pour services externes (Stripe, OpenAI)
- **Graceful degradation** : Continuer à fonctionner si AI service down (fallback)

**NFR6: Sécurité - Validation & Sanitization**

- **Validation** : Validation Zod pour tous les inputs externes
- **Sanitization** : Sanitization des données avant DB save
- **SQL injection** : Protection via Drizzle ORM (parameterized queries)
- **Rate limiting** : Rate limiting par organization pour éviter abuse

**NFR7: Observabilité - Monitoring & Alerting (Vercel-Native)**

- **V1 - Vercel Native Tools** :
  - Vercel Analytics pour métriques de base (latence, throughput, errors)
  - Vercel Logs pour logs centralisés avec recherche
  - Sentry pour error tracking et alerting (si pas déjà en place)
  - Structured logging avec `tslog` (déjà utilisé)
- **V2 - Advanced Observability (Optionnel)** :
  - Upgrade vers DataDog/New Relic si gaps identifiés
  - OpenTelemetry pour tracing distribué si nécessaire
  - Custom dashboards Grafana pour métriques métier

**NFR8: Performance Regression Testing Automatisé**

- **Baseline Performance** : Établir baseline avant refonte (latence P50/P95/P99, memory, CPU)
- **Automated Benchmarks** : Tests de performance automatisés dans CI/CD
- **Regression Detection** : Alertes si dégradation > 10% sur P95 latence
- **Load Testing** : Tests de charge réguliers (k6 ou Artillery) simulant 1,000 webhooks/min
- **Performance Budget** : 
  - P50 latency < 800ms
  - P95 latency < 1,500ms  
  - P99 latency < 2,000ms
  - Memory usage < 512MB per instance

**NFR9: Shadow Mode Validation**

- **Parallel Execution** : Exécuter ancien et nouveau code en parallèle pendant migration
- **Agreement Threshold** : 99%+ agreement entre ancien et nouveau (tolérance 1% pour améliorations)
- **Divergence Logging** : Logger toutes les divergences pour analyse
- **Automatic Rollback** : Rollback automatique si agreement < 95%
- **Validation Metrics** :
  - Decision agreement (ALLOW/BLOCK/REVIEW)
  - Score delta moyenne < 5 points
  - Latency comparison (nouveau doit être ≤ ancien)

**NFR10: Canary Deployment Strategy**

- **Gradual Rollout** : Déploiement progressif via Vercel
  - Phase 1: 1% traffic (1-2 jours) → monitoring intensif
  - Phase 2: 10% traffic (2-3 jours) → validation métriques
  - Phase 3: 50% traffic (3-5 jours) → A/B testing
  - Phase 4: 100% traffic → migration complète
- **Health Checks** : Vérifications automatiques à chaque phase
  - Error rate < baseline + 0.1%
  - P95 latency < baseline + 100ms
  - Aucun incident critique
- **Automatic Rollback Triggers** :
  - Error rate spike > 0.5%
  - Latency P95 > 2,500ms
  - Webhook failure rate > 1%
- **Manual Override** : Possibilité de rollback manuel immédiat 24/7

### Compatibility Requirements

**CR1: Backward Compatibility - API Existantes**

- **Server Actions** : Toutes les Server Actions existantes doivent continuer à fonctionner sans changement
- **API Routes** : Tous les endpoints API doivent retourner les mêmes formats de réponse
- **Signatures** : Aucun breaking change dans les signatures de fonctions exportées
- **Migration progressive** : Possibilité de rollback immédiat en cas de problème

**CR2: Database Schema Compatibility**

- **Pas de breaking changes** : Aucune modification de schéma DB qui casse les queries existantes
- **Additive changes only** : Seulement ajout de colonnes optionnelles si nécessaire
- **Migration scripts** : Scripts de migration testés pour toute modification DB
- **Rollback scripts** : Scripts de rollback pour chaque migration

**CR3: UI/UX Consistency**

- **Pas de changement UI** : Aucun changement visible pour l'utilisateur final
- **Même comportement** : Décisions de détection identiques à 99%+ (tolérance pour améliorations)
- **Même performance perçue** : Performance égale ou meilleure pour l'utilisateur
- **Feature parity** : Toutes les features existantes restent fonctionnelles

**CR4: Integration Compatibility**

- **Stripe webhooks** : Signature verification et processing identiques
- **Better Auth** : Aucun changement dans l'authentification/autorisation
- **Mastra AI** : Même intégration OpenAI (ou amélioration transparente)
- **Autumn billing** : Pas d'impact sur le système de billing

---
