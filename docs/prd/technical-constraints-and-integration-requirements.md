# Technical Constraints and Integration Requirements

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
