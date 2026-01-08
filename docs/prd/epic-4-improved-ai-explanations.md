# Epic 4: Amélioration des Explications IA - Brownfield Enhancement

---

## Epic Goal

Améliorer la qualité et la précision des explications IA générées pour chaque décision de blocage, en incluant plus de détails sur les facteurs de risque identifiés, leur poids, et le raisonnement derrière la décision, renforçant la transparence et la compréhension pour les marchands.

---

## Epic Description

### Existing System Context

- **Current relevant functionality:** 
  - Le système génère déjà des explications IA via Mastra (`lib/mastra/index.ts`)
  - L'agent `fraudExplanationAgent` utilise `gpt-4o-mini` avec prompts détaillés
  - Les prompts sont dans `lib/mastra/prompts.ts` avec focus sur card testing
  - Les explications sont sauvegardées dans `fraudDetections.aiExplanation`
  - Les explications sont affichées dans le dashboard

- **Technology stack:** 
  - Mastra AI SDK 0.24.9
  - OpenAI gpt-4o-mini via `@ai-sdk/openai`
  - React pour affichage dans dashboard

- **Integration points:** 
  - `lib/mastra/prompts.ts` - Prompts actuels avec structure Markdown
  - `lib/mastra/index.ts` - Fonction `generateFraudExplanation()`
  - `lib/actions/stripe-webhook-handlers.ts` - Génération ligne ~204-235
  - `components/dashboard/pages/transactions-page.tsx` - Affichage explications

### Enhancement Details

- **What's being added/changed:** 
  - Amélioration des prompts dans `lib/mastra/prompts.ts` :
    - Ajouter plus de détails sur les facteurs de risque et leur poids
    - Améliorer la section "Analyse Card Testing" avec plus de contexte
    - Ajouter des exemples concrets de raisonnement
    - Améliorer la structure Markdown pour meilleure lisibilité
  - Enrichissement du contexte passé à l'IA :
    - Plus de métriques de velocity
    - Historique customer plus détaillé
    - Comparaisons avec patterns normaux
  - Amélioration de l'affichage dans le dashboard :
    - Meilleur rendu Markdown
    - Highlighting des sections importantes
    - Tooltips pour expliquer les métriques

- **How it integrates:** 
  - Modification des prompts existants (pas de nouveau module)
  - Enrichissement du contexte dans `buildFraudExplanationPrompt()`
  - Amélioration du rendu dans les composants dashboard existants

- **Success criteria:** 
  - ✅ Les explications IA sont plus détaillées et précises
  - ✅ Les facteurs de risque sont mieux expliqués avec leur poids
  - ✅ Le raisonnement card testing est plus clair et actionnable
  - ✅ Les explications sont mieux formatées dans le dashboard
  - ✅ La latence reste < 2 secondes (NFR1)
  - ✅ Les coûts tokens restent raisonnables

---

## Stories

1. **Story 1:** Améliorer les prompts IA dans `lib/mastra/prompts.ts`
   - Enrichir `FRAUD_EXPLANATION_PROMPT` avec plus de détails sur facteurs de risque
   - Améliorer la section "Analyse Card Testing" avec exemples concrets
   - Ajouter section "Comparaison avec Comportement Normal" pour contexte
   - Améliorer `buildFraudExplanationPrompt()` pour inclure plus de métriques
   - Tests : générer explications pour différents scénarios et vérifier qualité

2. **Story 2:** Améliorer l'affichage des explications dans le dashboard
   - Améliorer rendu Markdown dans `components/dashboard/pages/transactions-page.tsx`
   - Ajouter highlighting des sections importantes (Card Testing, Facteurs de Risque)
   - Ajouter tooltips pour expliquer les métriques techniques
   - Améliorer la lisibilité avec meilleur typography
   - Tests : vérifier rendu pour différents types d'explications

---

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged** - Pas de changement d'API, amélioration prompts uniquement
- ✅ **Database schema changes are backward compatible** - Pas de changement de schéma
- ✅ **UI changes follow existing patterns** - Amélioration rendu Markdown dans composants existants
- ✅ **Performance impact is minimal** - Prompts plus longs peuvent augmenter tokens mais latence reste acceptable

---

## Risk Mitigation

- **Primary Risk:** Prompts trop longs augmentent coûts tokens ou latence au-delà de NFR1 (< 2s)
  - **Mitigation:** 
    - Tester prompts avec différents scénarios pour optimiser longueur
    - Monitorer `aiTokensUsed` et `aiLatencyMs` dans `fraudDetections`
    - Ajuster prompts si latence dépasse seuil
    - Fallback vers prompts courts si service IA lent

- **Rollback Plan:** 
  - Revenir aux prompts précédents dans `lib/mastra/prompts.ts`
  - Versioning des prompts possible (champ `promptVersion` dans DB)

---

## Definition of Done

- ✅ Toutes les stories complétées avec critères d'acceptation respectés
- ✅ Fonctionnalité existante vérifiée : génération explications fonctionne toujours
- ✅ Points d'intégration fonctionnels : explications améliorées affichées dans dashboard
- ✅ Documentation mise à jour : architecture.md enrichi avec détails prompts améliorés
- ✅ Pas de régression : tous les tests existants passent
- ✅ Tests manuels : vérifier qualité explications pour différents scénarios de fraude

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running Mastra AI SDK, OpenAI gpt-4o-mini
- Integration points: 
  - `lib/mastra/prompts.ts` (prompts à améliorer)
  - `lib/mastra/index.ts` (fonction `generateFraudExplanation()`)
  - `components/dashboard/pages/transactions-page.tsx` (affichage à améliorer)
- Existing patterns to follow: 
  - Structure Markdown des prompts existants
  - Format des explications avec sections : Résumé, Analyse Card Testing, Facteurs, Recommandation
  - Rendu Markdown dans composants React
- Critical compatibility requirements: 
  - Latence doit rester < 2 secondes (NFR1)
  - Coûts tokens doivent rester raisonnables
  - Format des explications doit rester compatible avec affichage existant
- Each story must include verification that existing functionality remains intact (génération explications, webhooks, dashboard)

The epic should maintain system integrity while delivering more detailed and actionable AI explanations that help merchants understand fraud decisions."

---

**Epic Created:** 2026-01-08  
**Author:** Sarah (Product Owner)  
**Status:** Ready for Story Creation
