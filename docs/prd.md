# Orylo V2 - PRD Refonte Architecture Détection de Fraude

---

## Introduction

### Scope Assessment

✅ **PRD Complet Justifié** - Cette refonte est un changement majeur nécessitant une planification complète :

- **Composants Critiques Affectés** : Webhook handlers + 11 modules de détection de fraude
- **Volume de Code** : ~5,500 lignes (1,251 lignes webhook handlers + 4,200 lignes fraud detection)
- **Impact Architectural** : Refonte complète du moteur de détection et du flow webhook
- **Risque Business** : Système de détection de fraude = cœur métier, aucune interruption tolérée
- **Dépendances** : Multiples (DB, Stripe API, Mastra AI, alertes, billing)

**Type d'Enhancement** :
- ✅ Major Feature Modification
- ✅ Performance/Scalability Improvements  
- ✅ Technology Stack Upgrade (architecture interne)
- ✅ Bug Fix and Stability Improvements

**Impact Assessment** : 🔴 **Major Impact** - Changements architecturaux profonds sur le cœur du système

---

## Existing Project Overview

### Analysis Source

- **✅ Document-project disponible** : `docs/architecture.md` (v1.1 - 8 janvier 2026)
- **✅ Analyse IDE en temps réel** : Codebase chargé et analysé
- **✅ Fichiers clés analysés** :
  - `lib/actions/stripe-webhook-handlers.ts` (1,251 lignes)
  - `lib/fraud-detection/` (11 fichiers, ~4,200 lignes)
  - `app/api/webhooks/stripe/[accountId]/route.ts` (245 lignes)
  - Schémas DB : `fraudDetections`, `customerTrustScores`, `cardTestingTrackers`, etc.

### Current Project State

**Orylo V2** est une **plateforme SaaS de détection de fraude** pour marchands Stripe, spécialisée dans la détection des attaques de **card testing**. Le système analyse les transactions en temps réel via webhooks Stripe, applique un moteur de règles basé sur des scores, et génère des explications IA pour chaque décision.

**Flow Actuel de Détection** :
```
Stripe Webhook → route.ts → stripe-webhook-handlers.ts → 
buildTransactionContext() → trackPaymentAttempt() (card testing) → 
applyCustomRules() → detectFraud() (rules-based engine) → 
generateFraudExplanation() (AI) → calculateCompositeScore() → 
DB Save (fraudDetections) → Actions (block payment, create alerts)
```

**Déploiement** : Vercel (serverless, Next.js 16 App Router)  
**Database** : PostgreSQL via Neon Serverless + Drizzle ORM  
**Performance Actuelle** : ~1,000-2,000ms par webhook (limite de l'objectif NFR1 : < 2s)

---

## Available Documentation Analysis

### Available Documentation

✅ **Documentation Existante (Très Complète)** :

- ✅ **Tech Stack Documentation** : `docs/architecture.md` - Section "Actual Tech Stack" avec toutes versions
- ✅ **Source Tree/Architecture** : `docs/architecture.md` - Structure complète du projet
- ✅ **Coding Standards** : `.cursor/rules/patterns.mdc` - Patterns et conventions
- ✅ **API Documentation** : `docs/architecture.md` - Section "API Specifications"
- ✅ **External API Documentation** : Stripe SDK, OpenAI, Better Auth bien documentés
- ✅ **Technical Debt Documentation** : `docs/architecture.md` - Section "Technical Debt and Known Issues" avec 5 workarounds documentés
- ❌ **Test Documentation** : Aucun test actuellement (0% coverage)

**Qualité de la Documentation** : Excellente - L'architecture document est très détaillé avec flow diagrams, patterns, et workarounds documentés.

---

## Enhancement Scope Definition

### Enhancement Type

✅ **Types Applicables** :
- ✅ **Major Feature Modification** - Refonte complète du moteur de détection
- ✅ **Performance/Scalability Improvements** - Optimisation des queries, parallélisation, cache
- ✅ **Technology Stack Upgrade** - Nouvelle architecture interne modulaire
- ✅ **Bug Fix and Stability Improvements** - Correction des workarounds, ajout de tests

### Enhancement Description

**Refonte architecturale complète** des systèmes de webhook handling et de fraud detection pour passer d'une **architecture monolithique procédurale** à une **architecture modulaire, testable, et performante**.

**Portée** :
1. **Décomposition du webhook handler monolithique** (1,251 lignes) en modules responsabilité unique
2. **Refonte du moteur de détection** avec architecture pluggable et patterns avancés
3. **Ajout de testabilité** avec dependency injection et interfaces
4. **Optimisation des performances** avec parallélisation, cache, et async processing
5. **Amélioration de la maintenabilité** avec documentation, types stricts, et séparation des concerns

### Impact Assessment

🔴 **Major Impact** - Changements architecturaux profonds :

- **Codebase** : ~5,500 lignes de code critique à refactoriser
- **Flow Métier** : Modification du flow de détection (tout en maintenant compatibilité)
- **Performance** : Objectif de réduction de 30-50% de la latence webhook
- **Testabilité** : Passage de 0% à 80%+ coverage sur code critique
- **Risque** : Élevé - Système de production critique, migration progressive obligatoire

---

## Goals and Background Context

### Goals

**Objectifs Principaux** :

1. **Modularité** : Décomposer le monolithe en modules à responsabilité unique, facilement testables et maintenables
2. **Performance** : Réduire la latence webhook de 30-50% via parallélisation, cache, et async processing
3. **Testabilité** : Atteindre 80%+ code coverage avec tests unitaires + intégration sur code critique
4. **Extensibilité** : Faciliter l'ajout de nouvelles règles de détection sans modifier le core engine
5. **Maintenabilité** : Améliorer la clarté du code avec separation of concerns et documentation
6. **Fiabilité** : Éliminer les 5 workarounds documentés et ajouter error handling robuste
7. **Observabilité** : Améliorer le logging et les métriques pour debugging et monitoring

### Background Context

**Pourquoi cette refonte est nécessaire maintenant ?**

**Problèmes Actuels Identifiés** :

#### 1. **Webhook Handler Monolithique Ingérable** 🔴

- **Fichier** : `lib/actions/stripe-webhook-handlers.ts` (1,251 lignes)
- **Problème** : Toute la logique métier dans un seul fichier avec 15+ handlers différents
- **Handler principal** : `handlePaymentIntentCreated()` = 350 lignes avec 8 STEPS imbriqués
- **Impact** : Impossible à tester, difficile à maintenir, risque élevé de régression

#### 2. **Moteur de Détection Simpliste et Rigide** 🔴

- **Fichier** : `lib/fraud-detection/engine.ts` (492 lignes)
- **Problème** : 
  - Score additif simpliste (`riskScore += weight`) avec seuils hardcodés arbitraires
  - 15 règles hardcodées (impossible d'ajuster sans redéploiement)
  - Pas de corrélation entre facteurs (chaque règle évalue indépendamment)
  - Difficile d'ajouter de nouvelles règles (modification directe du fichier)

**Exemple du problème** :
```typescript
// Seuils arbitraires hardcodés - d'où viennent ces valeurs ?
if (context.ipCountry !== context.cardCountry) {
  riskScore += 30;  // Pourquoi 30 et pas 25 ou 35 ?
}
if (context.velocity.attemptsLastHour >= 10) {
  riskScore += 25;  // Pourquoi >= 10 et pas 8 ou 12 ?
}
```

#### 3. **Performance Limitée** ⚠️

- **Queries DB séquentielles** : Aucune parallélisation, toutes les queries bloquantes
- **Pas de cache** : Custom rules, customer scores, velocity metrics refetchés à chaque webhook
- **AI bloquante** : OpenAI API call (500-1000ms) bloque le webhook handler
- **Latence actuelle** : 1,000-2,000ms (objectif < 2s, mais **très limite**)

**Impact** : Risque de dépassement du timeout Vercel (10s) lors de pics de charge

#### 4. **Aucune Testabilité** 🔴

- **0% code coverage** sur 5,500 lignes de code critique
- **Impossible à tester** : Dépendances externes (Stripe, DB, OpenAI) non mockables
- **Logique mélangée** : Business logic + IO + side effects dans les mêmes fonctions
- **Pas d'interfaces** : Aucune abstraction, pas de dependency injection

**Impact** : Développement lent (peur de casser), bugs en production, dette technique croissante

#### 5. **Fragmentation des Responsabilités** ⚠️

- **11 fichiers** avec responsabilités mélangées et dupliquées
- **3 systèmes de scoring** différents (`riskScore`, `trustScore`, `suspicionScore`) avec logiques redondantes
- **Types éparpillés** : `types.ts` de 503 lignes avec tous les types mélangés
- **Pas de cohérence** : Chaque module a son propre pattern de calcul de score

**Impact** : Code difficile à comprendre, duplication de logique, maintenance complexe

#### 6. **Dette Technique Documentée** ⚠️

**5 workarounds critiques documentés** dans `docs/architecture.md` :
1. AI Model Casting (`as unknown as MastraLanguageModel`) - risque de casse
2. Device Consistency Default (60 hardcodé) - scoring imprécis
3. Location Consistency Simplistic - pas de géolocalisation IP
4. Webhook Secret Fallback - confusion dev/prod
5. Card Testing Session ID fallback - détection moins précise

**Contexte Business** :

- **Croissance du produit** : Nouvelles features à ajouter (FR6, FR10, FR15, FR20)
- **Demandes clients** : Règles personnalisées configurables, performance améliorée
- **Compétitivité** : Besoin d'itérer rapidement sur les algorithmes de détection
- **Scalabilité** : Préparation pour augmentation du volume de transactions

**Pourquoi maintenant ?**

- **Moment idéal** : 3 stories techniques déjà complétées (auto-refund, custom-rules, email-alerts)
- **Base solide** : Documentation architecture excellente, patterns établis
- **Risque maîtrisé** : Possibilité de migration progressive sans interruption de service
- **ROI élevé** : Amélioration de la vélocité de développement pour futures features

---

## Requirements

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

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Stack Technique Actuel (Non-Négociable)** :

| Catégorie | Technologie | Version | Contrainte |
|-----------|-------------|---------|------------|
| **Runtime** | Node.js via Vercel | 18+ | Serverless, pas de long-running processes |
| **Framework** | Next.js | 16.1.1 | App Router (NOT Pages Router) |
| **Language** | TypeScript | 5.x | Strict mode OBLIGATOIRE |
| **Package Manager** | **Bun** | 1.2.3 | **CRITIQUE: TOUJOURS utiliser bun** (jamais npm/yarn/pnpm) |
| **Database** | PostgreSQL (Neon) | Serverless | Connection pooling géré par Neon |
| **ORM** | Drizzle ORM | 0.45.1 | Avec drizzle-zod pour validation |
| **Auth** | Better Auth | 1.4.9 | **NOT NextAuth** - Organizations plugin |
| **Payments** | Stripe SDK | 20.1.0 | Connect API pour multi-tenant |
| **AI** | Mastra AI + OpenAI | gpt-4o-mini | Via @ai-sdk/openai |
| **Queue** | **Trigger.dev** | Latest | Pour AI async processing |
| **Cache** | In-Memory (V1) | Native Map | Redis/Vercel KV optionnel V2 |
| **Testing** | Vitest | TBD | Recommandé pour Next.js/TS |
| **Logging** | tslog | 4.10.2 | Déjà en place, structured logging |

**Contraintes Techniques Critiques** :

1. **Vercel Serverless Limitations** :
   - Timeout max : 10 secondes (hobby), 60s (pro) → webhook DOIT répondre < 10s
   - Memory max : 1024MB → optimiser memory usage
   - Cold starts : Minimiser bundle size pour fast cold starts
   - No persistent storage : Utiliser DB ou cache externe

2. **Bun Package Manager** :
   - **TOUJOURS utiliser `bun add`, `bun install`, `bun run`**
   - **JAMAIS npm, yarn, ou pnpm** (risque de lock file conflicts)
   - Scripts package.json optimisés pour Bun

3. **Better Auth (NOT NextAuth)** :
   - Multi-organization avec plugin Organizations
   - Session-based auth (pas JWT par défaut)
   - Toutes queries DOIVENT filtrer par `organizationId`

4. **Stripe Connect Multi-Tenant** :
   - Chaque organization a son propre Stripe account
   - Utiliser `getConnectedStripeClient(accessToken)` pour API calls
   - **JAMAIS** utiliser client Stripe global

### Integration Approach

#### Database Integration Strategy

**Principes** :
- **Zero Breaking Changes** : Aucune modification de schéma incompatible
- **Additive Only** : Seulement ajout de colonnes optionnelles si nécessaire
- **Repository Pattern** : Abstraire accès DB avec interfaces

**Nouveaux Modules DB** :

```typescript
// lib/db/repositories/fraud-detection.repository.ts
export interface IFraudDetectionRepository {
  create(detection: NewFraudDetection): Promise<FraudDetection>;
  findById(id: string): Promise<FraudDetection | null>;
  findByOrganization(orgId: string, filters: Filters): Promise<FraudDetection[]>;
}

// Implementation avec Drizzle
export class DrizzleFraudDetectionRepository implements IFraudDetectionRepository {
  constructor(private db: Database) {}
  
  async create(detection: NewFraudDetection) {
    const [result] = await this.db
      .insert(fraudDetections)
      .values(detection)
      .returning();
    return result;
  }
  // ... autres méthodes
}
```

**Migrations (Si Nécessaires)** :
- Utiliser `bun run db:generate` pour générer migrations Drizzle
- Tester sur DB de staging avant production
- Scripts rollback pour chaque migration
- **Aucune migration prévue dans V1** (schémas actuels suffisants)

#### API Integration Strategy

**Server Actions Pattern** :
- **Maintenir** toutes les Server Actions existantes sans breaking changes
- **Ajouter** nouvelles Server Actions pour nouvelle architecture
- **Gradual Migration** : Router vers nouveau code progressivement

```typescript
// Exemple: Migration progressive avec feature flag
"use server";

export async function analyzeFraud(paymentIntentId: string) {
  const useNewEngine = process.env.USE_NEW_FRAUD_ENGINE === 'true';
  
  if (useNewEngine) {
    return newFraudService.analyze(paymentIntentId);
  }
  return legacyAnalyzeFraud(paymentIntentId); // Ancien code
}
```

**API Routes** :
- **Webhook route** (`app/api/webhooks/stripe/[accountId]/route.ts`) : Simplifier orchestration
- **Fraud analyses routes** : Aucune modification (déjà optimales)
- **Nouveaux endpoints** : Aucun prévu dans V1

#### Frontend Integration Strategy

**Aucun Changement UI Requis** :
- Dashboard reste identique (pas de breaking changes visuels)
- Même comportement utilisateur
- Performance égale ou meilleure (latence réduite = UX améliorée)

**Composants Dashboard Affectés (Monitoring Seulement)** :
- `components/dashboard/pages/transactions-page.tsx` : Affiche nouvelles métriques si disponibles
- `components/dashboard/pages/card-testing-page.tsx` : Peut bénéficier de perf améliorée
- **Aucune modification obligatoire** : Améliorations optionnelles post-refonte

#### Testing Integration Strategy

**Test Framework Setup** :

```bash
# Installation Vitest
bun add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom

# Configuration vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**Mock Strategy** :

```typescript
// tests/mocks/stripe.mock.ts
export const createStripeMock = () => ({
  paymentIntents: {
    retrieve: vi.fn(),
    cancel: vi.fn(),
  },
  charges: {
    retrieve: vi.fn(),
  },
  // ... autres mocks
});

// tests/mocks/db.mock.ts
export const createDbMock = () => ({
  query: {
    fraudDetections: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn(),
    }),
  }),
});
```

**Test Organization** :

```
lib/
  fraud-detection/
    engine.ts
    __tests__/
      engine.test.ts           # Unit tests
      engine.integration.test.ts # Integration tests
  actions/
    stripe-webhook-handlers.ts
    __tests__/
      webhook-handlers.test.ts
```

### Code Organization and Standards

**Nouvelle Structure de Modules** :

```
lib/
  fraud-detection/
    # Core
    core/
      engine.ts                 # Orchestrator principal
      pipeline.ts               # Detection pipeline
      types.ts                  # Types core (réduit)
      
    # Detectors (Pluggable)
    detectors/
      base-detector.ts          # Interface IDetector
      card-testing-detector.ts  # Card testing detection
      velocity-detector.ts      # Velocity abuse detection
      trust-score-detector.ts   # Customer trust scoring
      custom-rules-detector.ts  # Custom rules (déjà fait)
      geographic-detector.ts    # Geographic mismatch
      
    # Services
    services/
      context-builder.service.ts    # Build transaction context
      scoring.service.ts             # Score aggregation strategies
      ai-explanation.service.ts      # AI explanation (async)
      
    # Repositories
    repositories/
      fraud-detection.repository.ts  # DB access
      customer.repository.ts
      rules.repository.ts
      
    # Utils
    utils/
      cache.util.ts             # Cache utilities
      validation.util.ts        # Input validation
      fingerprint.util.ts       # Fingerprinting utils
      
  actions/
    # Webhook Handlers (Décomposés)
    webhooks/
      webhook-orchestrator.ts    # Main orchestrator (< 150 lines)
      payment-handlers.ts        # Payment intent handlers
      charge-handlers.ts         # Charge handlers
      customer-handlers.ts       # Customer handlers
      checkout-handlers.ts       # Checkout handlers
```

**Naming Conventions** (Existantes à Respecter) :
- **Files** : `kebab-case.ts` (e.g., `fraud-detection-engine.ts`)
- **Classes** : `PascalCase` (e.g., `FraudDetectionEngine`)
- **Interfaces** : `IPascalCase` (e.g., `IDetector`, `IRepository`)
- **Functions** : `camelCase` (e.g., `detectFraud`, `buildContext`)
- **Constants** : `SCREAMING_SNAKE_CASE` (e.g., `RISK_THRESHOLDS`)

**Documentation Standards** :

```typescript
/**
 * Detects fraud for a given transaction context
 * 
 * @param context - Transaction context with card, customer, velocity data
 * @param options - Optional detection options
 * @returns Fraud detection result with decision and factors
 * 
 * @example
 * ```ts
 * const result = await detectFraud(context);
 * if (result.decision === 'BLOCK') {
 *   await cancelPayment(context.paymentIntentId);
 * }
 * ```
 */
export async function detectFraud(
  context: TransactionContext,
  options?: DetectionOptions
): Promise<FraudDetectionResult> {
  // Implementation
}
```

### Deployment and Operations

**Deployment Strategy - Strangler Fig Pattern** :

**Phase 1 : Setup (Week 1-2)**
- Créer interfaces et abstractions
- Setup tests framework (Vitest)
- Créer mocks et fixtures
- **Livrable** : Foundation code + test infrastructure

**Phase 2 : Core Modules (Week 3-6)**
- Refactor context builder avec parallélisation
- Nouveau detection engine avec tests
- Shadow mode implementation
- **Livrable** : Nouveau engine en shadow mode (1% traffic)

**Phase 3 : Handlers & Optimization (Week 7-9)**
- Décomposer webhook handlers
- Implémenter AI async (Trigger.dev)
- Ajouter cache in-memory
- **Livrable** : Handlers refactorisés + perf gains visibles

**Phase 4 : Migration & Cleanup (Week 10)**
- Migration complète vers nouveau code
- Suppression ancien code
- Documentation finale
- **Livrable** : Migration 100% + documentation

**Vercel Deployment Configuration** :

```json
// vercel.json
{
  "env": {
    "USE_NEW_FRAUD_ENGINE": "true",
    "ENABLE_SHADOW_MODE": "false",
    "CACHE_TTL_CUSTOM_RULES": "60",
    "TRIGGER_DEV_API_KEY": "@trigger-api-key"
  },
  "regions": ["iad1"],
  "functions": {
    "app/api/webhooks/stripe/[accountId]/route.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  }
}
```

### Risk Assessment and Mitigation

**Risques Techniques Identifiés** :

#### **Risque 1 : Migration Progressive Échoue** 🔴 CRITIQUE

**Mitigation** :
- **Shadow Mode** : Exécuter ancien + nouveau en parallèle, comparer, utiliser ancien
- **Feature Flags** : Env vars pour activer/désactiver nouveau code module par module
- **Rollback Immédiat** : 1-click rollback via Vercel deployment history
- **Monitoring Intensif** : Alertes sur divergences > 1%

```typescript
// Shadow mode implementation
const SHADOW_MODE = process.env.ENABLE_SHADOW_MODE === 'true';

if (SHADOW_MODE) {
  const [legacy, newResult] = await Promise.allSettled([
    legacyEngine.detect(context),
    newEngine.detect(context)
  ]);
  
  // Compare and log divergences
  if (legacy.status === 'fulfilled' && newResult.status === 'fulfilled') {
    const divergence = compareResults(legacy.value, newResult.value);
    if (divergence > 0.01) {
      logger.warn('Shadow mode divergence detected', { divergence, legacy, new: newResult });
    }
  }
  
  // Always use legacy result in shadow mode
  return legacy.status === 'fulfilled' ? legacy.value : fallbackResult;
}
```

#### **Risque 2 : Performance Regression** ⚠️ MAJEUR

**Mitigation** :
- **Baseline Benchmarks** : Mesurer perf actuelle avant refonte (P50/P95/P99)
- **Automated Performance Tests** : Tests dans CI/CD qui fail si régression > 10%
- **Load Testing** : k6 tests réguliers simulant charge production
- **Canary Deployment** : 1% → 10% → 50% → 100% avec validation à chaque étape

#### **Risque 3 : Cache Stale Data** ⚠️ MAJEUR

**Mitigation** :
- **Conservative TTLs** : Commencer avec TTLs courts (60s), augmenter prudemment
- **Event-Based Invalidation** : Invalider cache sur events critiques
- **Cache Miss Fallback** : Toujours fetch DB si cache miss
- **Monitoring** : Tracker cache hit rate, divergences

#### **Risque 4 : Trigger.dev Queue Down** ⚠️ MINEUR

**Mitigation** :
- **Graceful Degradation** : Fallback vers génération synchrone si queue down
- **Circuit Breaker** : Skip queue si health check fail
- **Retry Logic** : Trigger.dev built-in retry automatique
- **Monitoring** : Alertes si queue backlog > 1000 jobs

---

---

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision** : **Single Comprehensive Epic** avec migration progressive

**Rationale** :
- Refonte architecturale = changements interdépendants (non séparables en epics distincts)
- Brownfield pattern = migration module-par-module, mais dans un flow cohérent
- Séparation en epics multiples créerait des dépendances complexes entre epics
- **Meilleure approche** : 1 epic, multiple stories séquencées avec validation progressive

**Epic Goal** : Transformer l'architecture monolithique de détection de fraude en une architecture modulaire, testable, et performante tout en maintenant 100% de compatibilité et 0% de downtime.

---

## Epic 1: Refonte Architecture Fraud Detection (Strangler Fig Pattern)

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
So that la logique est modulaire et réutilisable.

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

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-08 | 1.0 | PRD initial - Refonte architecture détection de fraude | John (PM) |

---
