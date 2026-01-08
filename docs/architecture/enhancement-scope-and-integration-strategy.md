# Enhancement Scope and Integration Strategy

### Enhancement Overview

**Enhancement Type** : Refonte Architecturale Multi-Facettes
- ✅ **Major Feature Modification** - Transformation complète du moteur de détection
- ✅ **Performance/Scalability Improvements** - Réduction latence 30-50%, parallélisation, cache
- ✅ **Technology Stack Upgrade** - Architecture interne modulaire avec patterns avancés
- ✅ **Bug Fix and Stability Improvements** - Élimination 5 workarounds + test coverage 0% → 80%+

**Scope** : Refonte architecturale complète des systèmes de webhook handling et fraud detection

**Portée Détaillée** :
1. **Décomposition Webhook Handler Monolithique** :
   - Fichier `lib/actions/stripe-webhook-handlers.ts` (1,251 lignes) → Modules à responsabilité unique
   - Handler `handlePaymentIntentCreated()` (350 lignes, 8 STEPS) → Orchestrator + Domain handlers
   - 15+ handlers Stripe différents → Architecture event-driven modulaire

2. **Refonte Moteur de Détection** :
   - `lib/fraud-detection/engine.ts` (492 lignes) → Pluggable Detection Pipeline
   - Score additif simpliste → Système de règles sophistiqué avec priorités
   - 15 règles hardcodées → Architecture extensible avec règles custom
   - Pas de corrélation → Analyse contextuelle avec machine learning

3. **Ajout Testabilité Complète** :
   - 0% coverage actuel → 80%+ coverage target
   - Dependency Injection pattern avec interfaces
   - Test framework (Vitest) + mocking strategy
   - Tests unitaires + intégration + E2E

4. **Optimisation Performances** :
   - Queries DB séquentielles → Parallélisation (Promise.all)
   - Pas de cache → Cache multi-niveau (Memory + Redis optionnel)
   - AI bloquante → AI asynchrone avec Trigger.dev
   - Latence 1-2s → Target < 1s

5. **Amélioration Maintenabilité** :
   - Code implicite → Documentation JSDoc complète + ADRs
   - Logique mélangée → Separation of concerns stricte
   - Pas d'observabilité → Structured logging + métriques + tracing

**Integration Impact Level** : 🔴 **MAJOR IMPACT**

- **Codebase** : ~5,500 lignes à refactoriser (20% du code fraud-related)
- **Architecture** : Transformation pattern monolithic → modular + event-driven
- **Data Flow** : Séquentiel bloquant → Parallèle + asynchrone
- **Dependencies** : Nouvelles (Trigger.dev, Vitest, Redis optionnel)
- **Risk** : Élevé - Système production critique, migration Strangler Fig obligatoire

### Integration Approach

#### Code Integration Strategy

**Pattern de Migration : Strangler Fig Pattern**

La refonte suivra le pattern **Strangler Fig** pour migration progressive sans downtime :

**Phase 1 : New Code Alongside Old (Sprint 1-2)** :
- Créer nouvelle architecture dans `lib/fraud-detection-v2/` et `lib/webhook-handlers-v2/`
- Ancienne architecture reste active dans `lib/fraud-detection/` et `lib/actions/stripe-webhook-handlers.ts`
- Feature flag `ENABLE_V2_FRAUD_DETECTION` pour toggle entre V1 et V2
- Tests E2E comparent V1 vs V2 pour vérifier équivalence comportementale

**Phase 2 : Gradual Traffic Migration (Sprint 3-4)** :
- Rollout progressif avec Vercel Split Testing : 1% → 5% → 25% → 50% → 100%
- Monitoring intensif : latence, accuracy, error rates
- Rollback automatique si métriques dégradées (latence > 2s, error rate > 1%)
- Shadow mode : V2 s'exécute en parallèle de V1 pour validation (sans impact décision)

**Phase 3 : Old Code Removal (Sprint 5)** :
- Une fois V2 à 100% et stable pendant 1 semaine :
  - Supprimer `lib/fraud-detection/` (old engine)
  - Supprimer handlers monolithiques de `lib/actions/stripe-webhook-handlers.ts`
  - Renommer `lib/fraud-detection-v2/` → `lib/fraud-detection/`
  - Cleanup feature flags

**Coexistence Strategy** :
```typescript
// app/api/webhooks/stripe/[accountId]/route.ts
import { detectFraudV1 } from '@/lib/fraud-detection/engine';
import { detectFraudV2 } from '@/lib/fraud-detection-v2/engine';

const fraudResult = process.env.ENABLE_V2_FRAUD_DETECTION === 'true'
  ? await detectFraudV2(context)
  : await detectFraudV1(context);
```

**Code Organization** :
- **Modules nouveaux** : Tous dans `lib/fraud-detection-v2/`, `lib/webhook-handlers-v2/`
- **Shared utilities** : Factoriser dans `lib/fraud-detection/shared/` (utilisé par V1 et V2)
- **Tests** : Miroir de la structure code (`__tests__/` à côté de chaque module)

#### Database Integration

**Schema Compatibility Strategy : Backward Compatible Extensions**

**Principe** : Schémas DB restent **100% backward compatible** pendant toute la migration.

**Approche** :
1. **Pas de modification destructive** : Aucune suppression/renommage de colonnes existantes
2. **Additive changes only** : Nouveaux champs optionnels (nullable) uniquement
3. **V1 et V2 partagent les mêmes tables** : Pas de duplication de données

**Changements DB Nécessaires** :

**Table `fraud_detections`** (Ajouts uniquement) :
```sql
-- Nouveaux champs pour V2 (tous nullable pour compatibilité V1)
ALTER TABLE fraud_detections 
  ADD COLUMN detection_version VARCHAR(10),  -- 'v1' ou 'v2'
  ADD COLUMN pipeline_metrics JSONB,         -- Métriques pipeline V2
  ADD COLUMN rule_execution_details JSONB;   -- Détails exécution règles V2
```

**Nouvelle Table `fraud_detection_cache`** (Pour cache V2) :
```sql
CREATE TABLE fraud_detection_cache (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_cache_key_expires ON fraud_detection_cache(cache_key, expires_at);
```

**Migration Strategy** :
- **Drizzle migrations** : Générer avec `bun run db:generate`, appliquer avec `bun run db:migrate`
- **Zero downtime** : Migrations additives appliquées en production sans interruption
- **Rollback** : Colonnes ajoutées peuvent être ignorées si rollback vers V1

#### API Integration

**Internal API Strategy : Transparent Compatibility**

**Principe** : Les Server Actions et API Routes **ne changent PAS** leur signature externe pendant la migration.

**Server Actions (`lib/actions/`)** :
- `fraud-analyses.ts` : Signature inchangée, implémentation interne switch V1/V2
- `rules.ts` : Extension pour nouvelles règles V2, backward compatible avec règles V1
- `stripe-webhook-handlers.ts` : Refactoré en modules, mais exports publics identiques

**Exemple de compatibilité** :
```typescript
// lib/actions/fraud-analyses.ts - API INCHANGÉE
export async function analyzeFraudDetection(organizationId: string, detectionId: string) {
  // Implémentation interne détecte V1 ou V2 et s'adapte
  const detection = await db.query.fraudDetections.findFirst({
    where: eq(fraudDetections.id, detectionId)
  });
  
  if (detection.detection_version === 'v2') {
    return formatV2Detection(detection);
  }
  return formatV1Detection(detection); // Backward compat
}
```

**External APIs** :
- **Stripe Webhooks** : Signature inchangée (`POST /api/webhooks/stripe/[accountId]`)
- **Response format** : Identique pour compatibilité Stripe
- **Internal processing** : V2 engine transparent pour Stripe

#### UI Integration

**Frontend Strategy : Zero UI Changes Required**

**Principe** : La refonte est **backend-only**, aucun changement UI nécessaire pendant la migration.

**Dashboard Pages (`components/dashboard/pages/`)** :
- **fraud-analyses-page.tsx** : Aucune modification requise
- **rules-page.tsx** : Extension pour afficher nouvelles règles V2, mais compatible V1
- **analytics-page.tsx** : Affiche métriques V1 et V2 de manière unifiée

**Affichage V2-specific** (Post-migration complète) :
- Nouveaux champs `pipeline_metrics` et `rule_execution_details` affichés dans UI
- Section "Detection Version" affiche V1 vs V2 pour audit
- Métriques de performance comparatives V1 vs V2

**No Breaking Changes** :
- Tous les composants existants fonctionnent avec V1 et V2
- Pas de refactoring UI requis pour la migration
- Améliorations UI optionnelles après stabilisation V2

### Compatibility Requirements

#### Existing API Compatibility

**Garanties** :
- ✅ **100% backward compatible** : Toutes les Server Actions gardent leur signature
- ✅ **Response format stable** : Schémas de retour identiques (sauf extensions optionnelles)
- ✅ **Error handling consistent** : Codes d'erreur et messages inchangés
- ✅ **Webhook responses** : Stripe webhook responses identiques (HTTP 200 + logs)

**Validation** :
- Tests d'intégration comparent V1 vs V2 pour mêmes inputs
- Contract testing pour garantir stabilité des contrats API
- Monitoring des error rates pour détecter régressions

#### Database Schema Compatibility

**Garanties** :
- ✅ **Additive only** : Aucune suppression/modification de colonnes existantes
- ✅ **Nullable new fields** : Tous nouveaux champs sont nullable
- ✅ **V1 continue to work** : V1 ignore nouveaux champs, fonctionne normalement
- ✅ **Shared tables** : V1 et V2 écrivent dans mêmes tables

**Migration Safety** :
- Migrations Drizzle testées en staging avant production
- Rollback plan : Nouveaux champs ignorés si rollback
- Backup DB avant chaque migration majeure

#### UI/UX Consistency

**Garanties** :
- ✅ **No UI changes** : Interface utilisateur inchangée pendant migration
- ✅ **Design system respect** : Nouveaux composants (post-migration) suivent Shadcn/ui + Tailwind patterns
- ✅ **User experience** : Aucun impact sur workflows utilisateurs pendant migration
- ✅ **Performance perceptible** : Utilisateurs voient amélioration latence (webhook plus rapide)

#### Performance Impact

**Targets** :
- ✅ **Latence webhook** : < 1s (vs 1-2s actuel) = **Amélioration 30-50%**
- ✅ **DB queries** : Réduction 40-60% via parallélisation et cache
- ✅ **AI processing** : Non-bloquant avec Trigger.dev, 0ms impact webhook
- ✅ **Memory footprint** : Cache in-memory léger (<50MB), Redis optionnel si nécessaire

**Performance Monitoring** :
- Métriques Vercel Analytics : Latence P50, P95, P99
- Structured logging : Temps par étape du pipeline
- Alerting : Si latence > 2s ou error rate > 1%

---
