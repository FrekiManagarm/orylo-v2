# Existing Project Overview

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
