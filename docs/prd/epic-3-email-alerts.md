# Epic 3: Alertes par Email - Brownfield Enhancement

---

## Epic Goal

Envoyer automatiquement des emails d'alerte aux utilisateurs lorsque des attaques majeures sont détectées ou lorsque des seuils critiques sont dépassés, améliorant la réactivité des marchands face aux menaces de fraude.

---

## Epic Description

### Existing System Context

- **Current relevant functionality:** 
  - Le système crée déjà des alertes dans la table `alerts` lors de détections critiques
  - Les alertes sont créées dans `stripe-webhook-handlers.ts` après détection de fraude
  - Les alertes sont affichées dans le dashboard (`components/dashboard/pages/alerts-page.tsx`)
  - Pas de service email configuré actuellement

- **Technology stack:** 
  - Next.js 16 App Router avec Server Actions
  - Drizzle ORM pour accès database
  - TypeScript strict mode
  - Pas de service email actuellement (à intégrer)

- **Integration points:** 
  - `lib/actions/stripe-webhook-handlers.ts` - Création d'alertes ligne ~355 (BLOCK) et ~534 (card testing)
  - `lib/db/schemas/alerts.ts` - Table existante avec champs : `type`, `severity`, `title`, `message`, `data`
  - `lib/db/schemas/organization.ts` - Pour récupérer email utilisateur (via Better Auth)

### Enhancement Details

- **What's being added/changed:** 
  - Nouveau module `lib/actions/send-alert-email.ts` pour envoi d'emails
  - Intégration service email externe (Resend recommandé pour simplicité)
  - Templates email avec React Email pour emails HTML structurés
  - Intégration dans `stripe-webhook-handlers.ts` après création d'alertes critiques (`severity === "critical"`)
  - Rate limiting pour éviter spam d'emails
  - Tracking des emails envoyés dans table `alerts` (nouveau champ `emailSentAt`)

- **How it integrates:** 
  - Hook dans le flow existant : création alerte → vérification `severity === "critical"` → envoi email
  - Utilise l'email de l'organization (via Better Auth) ou email configuré dans settings
  - Templates email avec données de l'alerte (type, montant, détails)
  - Rate limiting : max 1 email par type d'alerte par heure par organization

- **Success criteria:** 
  - ✅ Les alertes critiques déclenchent l'envoi d'emails automatiquement
  - ✅ Les emails sont bien formatés avec templates React Email
  - ✅ Le rate limiting évite le spam (max 1 email/heure/type/org)
  - ✅ Les emails sont trackés dans la DB (`emailSentAt`)
  - ✅ Les erreurs d'envoi sont loggées mais n'empêchent pas la création d'alertes
  - ✅ Configuration email possible dans settings (future enhancement)

---

## Stories

1. **Story 1:** Intégrer service email Resend et créer module `lib/actions/send-alert-email.ts`
   - Installer Resend SDK : `bun add resend`
   - Créer fonction `sendAlertEmail()` avec validation et error handling
   - Configurer Resend avec API key depuis env vars
   - Implémenter rate limiting (1 email/heure/type/org)
   - Tests unitaires pour logique d'envoi et rate limiting

2. **Story 2:** Créer templates email avec React Email pour alertes critiques
   - Installer React Email : `bun add @react-email/components react-email`
   - Créer templates dans `lib/emails/` :
     - `fraud-alert-email.tsx` - Alerte fraude détectée
     - `card-testing-alert-email.tsx` - Alerte card testing
     - `high-risk-alert-email.tsx` - Alerte transaction à haut risque
   - Templates avec données : type alerte, montant, détails, lien dashboard
   - Tests de rendu des templates

3. **Story 3:** Intégrer envoi emails dans webhook handlers après création alertes critiques
   - Modifier `stripe-webhook-handlers.ts` :
     - Après création alerte ligne ~355 (BLOCK) → appeler `sendAlertEmail()` si `severity === "critical"`
     - Après création alerte ligne ~534 (card testing) → appeler `sendAlertEmail()` si `severity === "critical"`
   - Ajouter champ `emailSentAt` dans table `alerts` (migration)
   - Mettre à jour `alerts.emailSentAt` après envoi réussi
   - Logging des erreurs d'envoi sans bloquer le flow
   - Tests d'intégration : webhook → alerte → email envoyé

---

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged** - Pas de nouveaux endpoints REST, utilisation Server Actions
- ✅ **Database schema changes are backward compatible** - Ajout champ optionnel `emailSentAt` dans `alerts`
- ✅ **UI changes follow existing patterns** - Pas de changement UI requis (emails en arrière-plan)
- ✅ **Performance impact is minimal** - Envoi email asynchrone, ne bloque pas le webhook handler

---

## Risk Mitigation

- **Primary Risk:** Spam d'emails ou emails non envoyés en cas d'erreur service email
  - **Mitigation:** 
    - Rate limiting strict : max 1 email/heure/type/org
    - Retry logic avec exponential backoff en cas d'erreur temporaire
    - Fallback gracieux : alerte reste dans DB même si email échoue
    - Logging détaillé de tous les envois et erreurs
    - Monitoring des erreurs Resend API

- **Rollback Plan:** 
  - Désactiver l'appel à `sendAlertEmail()` dans `stripe-webhook-handlers.ts`
  - OU feature flag pour activer/désactiver emails
  - Les alertes continuent d'être créées dans le dashboard

---

## Definition of Done

- ✅ Toutes les stories complétées avec critères d'acceptation respectés
- ✅ Fonctionnalité existante vérifiée : création d'alertes fonctionne toujours
- ✅ Points d'intégration fonctionnels : emails envoyés pour alertes critiques
- ✅ Documentation mise à jour : architecture.md enrichi avec détails email alerts
- ✅ Pas de régression : tous les tests existants passent, nouveaux tests ajoutés
- ✅ Tests manuels : déclencher alerte critique → vérifier réception email → vérifier rate limiting

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running Next.js 16, TypeScript, Drizzle ORM
- Integration points: 
  - `lib/actions/stripe-webhook-handlers.ts` ligne ~355 (BLOCK) et ~534 (card testing)
  - `lib/db/schemas/alerts.ts` (table existante, ajout champ `emailSentAt`)
  - `lib/db/schemas/organization.ts` (pour email utilisateur)
- Existing patterns to follow: 
  - Server Actions pattern avec `"use server"`
  - Isolation multi-tenant via `organizationId`
  - Error handling gracieux (ne pas bloquer le flow principal)
  - Logging détaillé pour debugging
- Critical compatibility requirements: 
  - Les emails ne doivent PAS bloquer le traitement des webhooks (async)
  - Rate limiting strict pour éviter spam
  - Fallback gracieux si service email indisponible
- Each story must include verification that existing functionality remains intact (création alertes, webhooks, dashboard)

The epic should maintain system integrity while delivering timely email notifications for critical fraud events."

---

**Epic Created:** 2026-01-08  
**Author:** Sarah (Product Owner)  
**Status:** Ready for Story Creation
