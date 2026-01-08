# Stories - Refonte Architecture Fraud Detection

---

## Vue d'Ensemble

Ce dossier contient les **9 stories détaillées** pour la refonte complète de l'architecture de détection de fraude d'Orylo V2.

**Epic** : Refonte Architecture Fraud Detection  
**Timeline** : 10-12 semaines (4 phases)  
**Objectif** : Transformer l'architecture monolithique en architecture modulaire, testable, et performante

---

## 📋 Liste des Stories

### Phase 1 : Foundation & Setup (Week 1-2)

| Story | Titre | Status | Priorité |
|-------|-------|--------|----------|
| **1.1** | [Setup Testing Infrastructure](./1.1.setup-testing-infrastructure.md) | Draft | 🔴 Critical |
| **1.2** | [Create Core Interfaces and Types](./1.2.create-core-interfaces.md) | Draft | 🔴 Critical |

**Objectif Phase 1** : Établir les fondations (tests + interfaces) pour le développement V2

---

### Phase 2 : Context Builder & Detectors (Week 3-6)

| Story | Titre | Status | Priorité |
|-------|-------|--------|----------|
| **2.1** | [Refactor Context Builder with Parallelization](./2.1.refactor-context-builder.md) | Draft | 🟠 High |
| **2.2** | [Implement Pluggable Detection Engine](./2.2.implement-pluggable-engine.md) | Draft | 🟠 High |
| **2.3** | [Migrate Card Testing & Trust Score Detectors](./2.3.migrate-detectors.md) | Draft | 🟠 High |

**Objectif Phase 2** : Refactorer le cœur du système (context builder + detection engine)

---

### Phase 3 : Handlers & Performance (Week 7-9)

| Story | Titre | Status | Priorité |
|-------|-------|--------|----------|
| **3.1** | [Decompose Webhook Handler Monolith](./3.1.decompose-webhook-handlers.md) | Draft | 🟡 Medium |
| **3.2** | [Implement AI Async Processing with Trigger.dev](./3.2.implement-ai-async.md) | Draft | 🟡 Medium |
| **3.3** | [Add In-Memory Cache for Stable Data](./3.3.add-in-memory-cache.md) | Draft | 🟡 Medium |

**Objectif Phase 3** : Optimiser performance et décomposer handlers

---

### Phase 4 : Migration Complete & Cleanup (Week 10-12)

| Story | Titre | Status | Priorité |
|-------|-------|--------|----------|
| **4.1** | [Shadow Mode Validation & Enable New Code](./4.1.shadow-mode-validation.md) | Draft | 🔴 Critical |
| **4.2** | [Gradual Rollout & V1 Cleanup](./4.2.gradual-rollout-cleanup.md) | Draft | 🔴 Critical |

**Objectif Phase 4** : Valider, déployer progressivement, et nettoyer le code legacy

---

## 🎯 Ordre de Développement Recommandé

```
Week 1-2:  Story 1.1 (Tests) + 1.2 (Interfaces)
           ↓ [Foundation établie]
Week 3-4:  Story 2.1 (Context Builder) - PARALLEL QUERIES
           ↓ [Quick Win: -20% latency]
Week 5-6:  Story 2.2 (Engine) + 2.3 (Detectors) - SHADOW MODE
           ↓ [Core refactoré]
Week 7-8:  Story 3.1 (Handlers) + 3.2 (AI Async) - MAJOR GAINS
           ↓ [Quick Win: -50% latency totale]
Week 9:    Story 3.3 (Cache) - OPTIMIZATION
           ↓ [Performance optimisée]
Week 10-12: Story 4.1 (Validation) + 4.2 (Cleanup) - FINALIZATION
           ↓ [Migration complète]
```

---

## 🔗 Dépendances Critiques

**Dépendances Bloquantes** :
- **Story 2.2** DÉPEND de **Story 1.2** (interfaces requis)
- **Story 2.3** DÉPEND de **Story 2.2** (pipeline doit exister)
- **Story 4.1** DÉPEND de **toutes les stories précédentes** (validation complète)
- **Story 4.2** DÉPEND de **Story 4.1** (validation GO required)

**Opportunités de Parallélisation** :
- ✅ **Story 1.1 + 1.2** peuvent être parallèles (2 devs)
- ✅ **Story 3.1 + 3.2** peuvent être parallèles (2 devs)
- ✅ **Story 3.3** peut être parallèle à **Story 3.1/3.2**

---

## 📊 Métriques de Succès

### Coverage Targets

| Module | Target Coverage |
|--------|----------------|
| Core Engine | 90%+ |
| Detectors | 85%+ each |
| Services | 80%+ |
| Handlers | 75%+ |

### Performance Targets

| Métrique | Baseline | Target | Amélioration |
|----------|----------|--------|--------------|
| Webhook Latency | 1,500ms | < 1,000ms | -33% |
| Context Building | 200ms | < 140ms | -30% |
| AI Processing | 500-1000ms | 0ms (async) | -100% (non-bloquant) |
| DB Queries | N/A | -20-30% | Cache |

### Quality Targets

- ✅ **Agreement V1 vs V2** : > 99%
- ✅ **Test Coverage** : 60%+ (V1), 70%+ (V2), 80%+ (V3)
- ✅ **Error Rate** : Unchanged ou réduit
- ✅ **Zero Downtime** : 100% uptime pendant migration

---

## 🚀 Getting Started

### Pour les Développeurs

1. **Lire** : PRD (`docs/prd.md`) + Architecture (`docs/architecture.md`)
2. **Commencer** : Story 1.1 (Setup Testing Infrastructure)
3. **Suivre** : Ordre recommandé ci-dessus
4. **Tester** : Écrire tests avant/pendant implementation (TDD)

### Pour le Product Owner

1. **Valider** : Stories avec `*validate-story-draft {story}`
2. **Prioriser** : Ajuster priorités si nécessaire
3. **Suivre** : Progress via status (Draft → Approved → InProgress → Done)

### Pour le QA

1. **Attendre** : Story status = "Review"
2. **Tester** : Acceptance criteria + edge cases
3. **Documenter** : Résultats dans section "QA Results"

---

## 🔍 Code Review Process

### Workflow pour chaque Story

**1. Pré-Review (Developer)** :
- ✅ Tous les Acceptance Criteria validés
- ✅ Tests passent (coverage >= target)
- ✅ Linter sans erreurs (`bun run lint`)
- ✅ Build réussi (`bun run build`)
- ✅ Integration Verification (IV) items vérifiés

**2. Review Checklist** :
- **Code Quality** :
  - Respect des Coding Standards (`.cursor/rules/`)
  - Pas de code dupliqué
  - Nommage clair et cohérent
  - Commentaires JSDoc complets
- **Testing** :
  - Coverage >= target (Story 1.1: 70%, Stories 2.x: 80%, Stories 3.x: 85%)
  - Edge cases couverts
  - Mocks appropriés
- **Architecture** :
  - Respect des interfaces définies (Story 1.2)
  - Dependency Injection correcte
  - Pas de couplage fort
- **Performance** :
  - Pas de régression vs baseline
  - Targets atteints (si applicable)
- **Security** :
  - Input validation correcte
  - Pas de credentials hardcodés
  - Authorization checks présents

**3. Review Approval** :
- **1 approval minimum** requis avant merge
- **2 approvals** pour stories critiques (2.2, 3.1, 4.1)

**4. Post-Merge** :
- ✅ CI/CD passe en production
- ✅ Monitoring vérifié (logs, metrics)
- ✅ Rollback plan prêt

---

## 📚 Références

- **PRD** : `docs/prd.md` - Requirements complets (15 FR + 10 NFR)
- **Architecture** : `docs/architecture.md` - Architecture brownfield complète
- **Coding Standards** : `.cursor/rules/` - Patterns et conventions
- **Tech Stack** : `package.json` - Dépendances et versions

---

## 📝 Notes

- Toutes les stories sont en status **Draft** initialement
- Chaque story doit être validée par le PO avant développement
- Les Dev Notes contiennent toutes les informations nécessaires pour le développement
- Les Integration Verification (IV) doivent être vérifiées pour chaque story

---

**Dernière mise à jour** : 2026-01-08  
**Créé par** : Sarah (Product Owner)

---
