# Epic 2: Règles Personnalisées (Custom Rules) - Brownfield Enhancement

---

## Epic Goal

Permettre aux utilisateurs de créer, modifier et supprimer des règles personnalisées de détection de fraude (whitelist, blacklist, seuils de montant, pays bloqués) qui s'appliquent avant les règles système, offrant une flexibilité totale pour adapter la détection à leurs besoins business.

---

## Epic Description

### Existing System Context

- **Current relevant functionality:** 
  - Le moteur de détection (`lib/fraud-detection/engine.ts`) applique des règles système fixes
  - Le schéma `fraudDetectionRules` existe déjà dans `lib/db/schemas/fraudDetectionRules.ts`
  - Les Server Actions CRUD existent partiellement dans `lib/actions/rules.ts`
  - L'UI de gestion des règles existe dans `components/dashboard/pages/rules-page.tsx` mais l'application des règles n'est pas implémentée

- **Technology stack:** 
  - Next.js 16 App Router avec Server Actions
  - Drizzle ORM pour accès database
  - TypeScript strict mode
  - Zod pour validation des règles

- **Integration points:** 
  - `lib/fraud-detection/engine.ts` - Moteur principal ligne ~169 (avant `detectFraud()`)
  - `lib/db/schemas/fraudDetectionRules.ts` - Table existante avec champs : `type`, `conditions`, `action`, `priority`, `isActive`
  - `lib/actions/rules.ts` - CRUD actions (à compléter)
  - `components/dashboard/pages/rules-page.tsx` - UI existante (à améliorer)

### Enhancement Details

- **What's being added/changed:** 
  - Nouveau module `lib/fraud-detection/custom-rules.ts` pour application des règles personnalisées
  - Extension de `engine.ts` pour charger et appliquer règles custom avant règles système
  - Complétion des Server Actions dans `lib/actions/rules.ts` pour CRUD complet
  - Amélioration de l'UI `rules-page.tsx` pour création/modification/suppression de règles
  - Validation Zod stricte pour éviter injection et erreurs

- **How it integrates:** 
  - Hook dans le flow existant : `buildTransactionContext()` → `applyCustomRules()` → `detectFraud()` → actions
  - Les règles personnalisées sont appliquées AVANT les règles système (override possible)
  - Respect de l'ordre de priorité (`priority` field) pour application séquentielle
  - Isolation par `organizationId` (chaque organization a ses propres règles)

- **Success criteria:** 
  - ✅ Les utilisateurs peuvent créer des règles personnalisées via l'UI
  - ✅ Les règles sont appliquées dans le flow de détection avant règles système
  - ✅ Les règles respectent l'ordre de priorité défini
  - ✅ Les règles peuvent être activées/désactivées sans suppression
  - ✅ Les règles sont validées avant sauvegarde (Zod schemas)
  - ✅ L'UI permet la gestion complète (CRUD) des règles

---

## Stories

1. **Story 1:** Implémenter le module `lib/fraud-detection/custom-rules.ts` pour application des règles
   - Créer fonction `applyCustomRules()` qui charge règles actives depuis DB
   - Appliquer règles selon `priority` (ordre croissant)
   - Matcher conditions de règles avec `TransactionContext`
   - Retourner `FraudDecision` et `FraudFactor[]` si règle matchée
   - Tests unitaires pour chaque type de règle (whitelist, blacklist, seuils, pays)

2. **Story 2:** Intégrer custom rules dans `engine.ts` avant règles système
   - Appeler `applyCustomRules()` ligne ~169 avant `detectFraud()`
   - Si règle custom matchée avec `action: "BLOCK"`, retourner immédiatement
   - Si règle custom matchée avec `action: "ALLOW"`, ajuster `riskScore` négativement
   - Combiner `FraudFactor[]` des règles custom avec règles système
   - Tests d'intégration : flow complet avec règles custom

3. **Story 3:** Compléter CRUD Server Actions et améliorer UI de gestion des règles
   - Compléter `lib/actions/rules.ts` : `createRule()`, `updateRule()`, `deleteRule()`, `getRules()`
   - Validation Zod stricte pour chaque type de règle
   - Améliorer `components/dashboard/pages/rules-page.tsx` :
     - Formulaire de création avec validation
     - Liste des règles avec statut actif/inactif
     - Actions edit/delete/activate/deactivate
     - Preview de la règle avant sauvegarde
   - Tests E2E : création → application → vérification dans détection

---

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged** - Pas de nouveaux endpoints REST, utilisation Server Actions existants
- ✅ **Database schema changes are backward compatible** - Utilisation de schéma existant `fraudDetectionRules`
- ✅ **UI changes follow existing patterns** - Extension de composants existants avec Shadcn/ui
- ✅ **Performance impact is minimal** - Une query DB supplémentaire pour charger règles actives (peut être cachée)

---

## Risk Mitigation

- **Primary Risk:** Règles personnalisées mal configurées bloquent tous les paiements ou autorisent la fraude
  - **Mitigation:** 
    - Validation Zod stricte avec schémas pour chaque type de règle
    - Preview de la règle avant activation
    - Option "test mode" pour tester règle sur transactions passées
    - Limite de règles actives par plan (Free: 0, Pro: 3, Business: illimité)
    - Logging détaillé de toutes les règles appliquées pour audit
    - Alertes si règle bloque > X% des transactions

- **Rollback Plan:** 
  - Désactiver toutes les règles personnalisées via `isActive: false` en DB
  - OU désactiver l'appel à `applyCustomRules()` dans `engine.ts` (feature flag)
  - Les règles restent en DB mais ne sont plus appliquées

---

## Definition of Done

- ✅ Toutes les stories complétées avec critères d'acceptation respectés
- ✅ Fonctionnalité existante vérifiée : détection de fraude système fonctionne toujours
- ✅ Points d'intégration fonctionnels : règles appliquées dans flow, UI fonctionnelle
- ✅ Documentation mise à jour : architecture.md enrichi avec détails custom rules
- ✅ Pas de régression : tous les tests existants passent, nouveaux tests ajoutés
- ✅ Tests manuels : créer règle → vérifier application dans détection → vérifier UI

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running Next.js 16, TypeScript, Drizzle ORM
- Integration points: 
  - `lib/fraud-detection/engine.ts` ligne ~169 (avant `detectFraud()`)
  - `lib/db/schemas/fraudDetectionRules.ts` (schéma existant)
  - `lib/actions/rules.ts` (CRUD à compléter)
  - `components/dashboard/pages/rules-page.tsx` (UI à améliorer)
- Existing patterns to follow: 
  - Server Actions pattern avec `"use server"`
  - Isolation multi-tenant via `organizationId`
  - Validation Zod pour toutes les entrées utilisateur
  - Server Components pour pages, Client Components pour interactivité
- Critical compatibility requirements: 
  - Les règles personnalisées ne doivent PAS remplacer les règles système critiques (card testing)
  - Les règles doivent être validées avant sauvegarde (éviter injection)
  - Respecter les limites de plan (Free: 0 règles, Pro: 3, Business: illimité)
- Each story must include verification that existing functionality remains intact (fraud detection système, webhooks, customer scoring)

The epic should maintain system integrity while delivering flexible custom rules that allow merchants to adapt fraud detection to their specific business needs."

---

**Epic Created:** 2026-01-08  
**Author:** Sarah (Product Owner)  
**Status:** Ready for Story Creation
