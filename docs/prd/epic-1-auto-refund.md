# Epic 1: Auto-Refund des Paiements Frauduleux - Brownfield Enhancement

---

## Epic Goal

Implémenter le refund automatique des paiements frauduleux qui ont réussi à passer avant la détection, réduisant les pertes financières des marchands et améliorant la valeur perçue d'Orylo.

---

## Epic Description

### Existing System Context

- **Current relevant functionality:** 
  - Le système détecte déjà la fraude en temps réel via webhooks Stripe (`payment_intent.created`)
  - Les paiements frauduleux sont bloqués automatiquement via `paymentIntents.cancel()`
  - Les fraud detections sont sauvegardées dans `fraudDetections` table avec `blocked: true`
  - Le webhook handler `handlePaymentIntentSucceeded()` met à jour les scores clients après succès

- **Technology stack:** 
  - Next.js 16 App Router avec Server Actions
  - Stripe SDK 20.1.0 pour interactions API
  - Drizzle ORM pour accès database
  - TypeScript strict mode

- **Integration points:** 
  - `lib/actions/stripe-webhook-handlers.ts` - Handler `handlePaymentIntentSucceeded()` ligne ~399
  - `lib/stripe/client.ts` - Client Stripe connecté pour chaque organization
  - `lib/db/schemas/fraudDetections.ts` - Table avec champ `refundId` déjà présent

### Enhancement Details

- **What's being added/changed:** 
  - Nouveau module `lib/actions/auto-refund.ts` pour logique de refund automatique
  - Intégration dans `handlePaymentIntentSucceeded()` pour vérifier si un paiement réussi doit être refundé
  - Vérification rétroactive : si `actualOutcome === "fraud_confirmed"` ou si fraude détectée après succès, créer refund Stripe
  - Mise à jour `fraudDetections.refundId` et `actionTaken: "refunded"`

- **How it integrates:** 
  - Hook dans le flow existant `payment_intent.succeeded` → vérification fraude → refund si nécessaire
  - Utilise le client Stripe connecté existant (`getConnectedStripeClient()`)
  - Sauvegarde dans la table `fraudDetections` existante (pas de nouveau schéma)

- **Success criteria:** 
  - ✅ Les paiements frauduleux réussis sont automatiquement refundés
  - ✅ Le `refundId` est correctement sauvegardé dans `fraudDetections`
  - ✅ Les alertes sont créées pour notifier les refunds
  - ✅ Aucun impact sur les paiements légitimes
  - ✅ Les refunds sont visibles dans le dashboard Stripe du marchand

---

## Stories

1. **Story 1:** Implémenter la logique auto-refund dans `lib/actions/auto-refund.ts`
   - Créer fonction `autoRefundFraudulentPayment()` avec vérification fraude
   - Utiliser Stripe API `refunds.create()` avec `reason: "fraudulent"`
   - Gérer les erreurs et retry logic
   - Tests unitaires pour la logique de refund

2. **Story 2:** Intégrer auto-refund dans le webhook handler `handlePaymentIntentSucceeded()`
   - Appeler `autoRefundFraudulentPayment()` après `updateCustomerScore()`
   - Vérifier `actualOutcome === "fraud_confirmed"` ou détection rétroactive
   - Mettre à jour `fraudDetections.refundId` et `actionTaken`
   - Créer alerte pour notifier le refund
   - Tests d'intégration webhook → refund

---

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged** - Pas de nouveaux endpoints, utilisation Server Actions existants
- ✅ **Database schema changes are backward compatible** - Utilisation de champs existants (`refundId` déjà dans schema)
- ✅ **UI changes follow existing patterns** - Pas de changement UI requis pour cette epic
- ✅ **Performance impact is minimal** - Un appel API Stripe supplémentaire uniquement pour paiements frauduleux confirmés

---

## Risk Mitigation

- **Primary Risk:** Refund de paiements légitimes par erreur (faux positifs)
  - **Mitigation:** 
    - Vérifier uniquement si `actualOutcome === "fraud_confirmed"` (fraude confirmée par chargeback/dispute)
    - OU si fraude détectée avec `riskScore >= 80` ET `decision === "BLOCK"` dans la détection initiale
    - Logging détaillé de tous les refunds pour audit
    - Option manuelle de cancel refund si erreur (future enhancement)

- **Rollback Plan:** 
  - Désactiver l'appel à `autoRefundFraudulentPayment()` dans `handlePaymentIntentSucceeded()`
  - Les refunds déjà créés restent dans Stripe (pas de rollback possible côté Stripe)
  - Feature flag possible pour activer/désactiver facilement

---

## Definition of Done

- ✅ Toutes les stories complétées avec critères d'acceptation respectés
- ✅ Fonctionnalité existante vérifiée : webhooks fonctionnent toujours, détection fraude inchangée
- ✅ Points d'intégration fonctionnels : refund créé dans Stripe, `refundId` sauvegardé en DB
- ✅ Documentation mise à jour : architecture.md enrichi avec détails auto-refund
- ✅ Pas de régression : tous les tests existants passent, nouveaux tests ajoutés
- ✅ Tests manuels : vérifier refund dans Stripe Dashboard après test avec paiement frauduleux

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running Next.js 16, TypeScript, Stripe SDK, Drizzle ORM
- Integration points: `handlePaymentIntentSucceeded()` dans `lib/actions/stripe-webhook-handlers.ts` ligne ~399
- Existing patterns to follow: 
  - Server Actions pattern avec `"use server"`
  - Utilisation de `getConnectedStripeClient()` pour client Stripe
  - Isolation multi-tenant via `organizationId`
  - Error handling avec logging détaillé
- Critical compatibility requirements: 
  - Ne pas affecter le flow existant de détection de fraude
  - Ne pas créer de refunds pour paiements légitimes
  - Respecter les limites de rate Stripe API
- Each story must include verification that existing functionality remains intact (webhooks, fraud detection, customer scoring)

The epic should maintain system integrity while delivering automatic refunds for fraudulent payments that succeeded before detection."

---

**Epic Created:** 2026-01-08  
**Author:** Sarah (Product Owner)  
**Status:** Ready for Story Creation
