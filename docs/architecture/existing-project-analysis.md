# Existing Project Analysis

### Current Project State

**Orylo V2** est une **plateforme SaaS de détection de fraude** pour marchands Stripe, spécialisée dans la détection des attaques de **card testing**. Le système analyse les transactions Stripe en temps réel via webhooks, applique un moteur de règles basé sur des scores, génère des explications IA, et prend des actions automatiques (blocage, alertes).

**Current Architecture Pattern** : **Event-Driven Monolithic**
- Webhooks Stripe déclenchent un handler monolithique
- Traitement séquentiel avec dépendances implicites
- Logique métier couplée avec IO et side-effects

**Primary Purpose** : Détecter et prévenir les attaques de card testing sur Stripe Connect merchants en temps réel

**Current Tech Stack Summary** :
- **Runtime** : Node.js 18+ (Vercel Serverless)
- **Framework** : Next.js 16.1.1 (App Router)
- **Language** : TypeScript 5.x (strict mode)
- **Package Manager** : **Bun 1.2.3** (**CRITIQUE**)
- **Database** : PostgreSQL (Neon Serverless) + Drizzle ORM 0.45.1
- **Auth** : Better Auth 1.4.9 (NOT NextAuth)
- **AI** : Mastra AI SDK 0.24.9 + OpenAI gpt-4o-mini
- **Payments** : Stripe 20.1.0 (Connect API)
- **UI** : Tailwind CSS v4 + Shadcn/ui

**Architecture Style** : 
- **Pattern** : Serverless Event-Driven
- **Code Organization** : Monolithic handlers avec fonctions utilitaires
- **Data Flow** : Séquentiel, bloquant
- **State Management** : Database-centric (PostgreSQL via Drizzle)

**Deployment Method** : 
- **Platform** : Vercel (Edge Runtime)
- **Environments** : Production + Preview
- **CI/CD** : Git push → Vercel auto-deploy
- **Monitoring** : Vercel Analytics + tslog structured logging

### Available Documentation

**Documentation Existante (Excellente Qualité)** :

- ✅ **Architecture Document** : `docs/architecture.md` v1.1 (1,312 lignes) - Analyse brownfield complète avec tech stack, patterns, workarounds documentés
- ✅ **PRD Complet** : `docs/prd.md` v1.0 (1,302 lignes) - Requirements détaillés pour cette refonte
- ✅ **Coding Standards** : `.cursor/rules/` (8 fichiers) - Patterns Next.js, DB conventions, auth patterns, routing
- ✅ **Database Schemas** : `lib/db/schemas/` (25 fichiers) - Tous les modèles Drizzle avec relations
- ✅ **API Patterns** : `docs/architecture.md` - Section "API Specifications" + Server Actions patterns
- ✅ **Technical Debt** : `docs/architecture.md` - 5 workarounds documentés dans le système actuel
- ❌ **Test Documentation** : Aucun test existant (0% coverage) - À créer dans cette refonte

**Qualité de la Documentation** : Excellente - Documentation récente (8 janvier 2026), détaillée, avec diagrammes Mermaid et debt tracking.

### Identified Constraints

**Contraintes Techniques Non-Négociables** :

1. **Runtime Serverless** : Vercel Edge Runtime - Pas de long-running processes, timeouts stricts (10s pour Edge, 60s pour Serverless Functions)
2. **Package Manager Bun** : **CRITIQUE** - Toujours utiliser `bun` (jamais npm/yarn/pnpm) pour compatibilité avec les lockfiles existants
3. **Database Neon Serverless** : Connection pooling géré par Neon, pas de connexions persistantes
4. **Multi-Tenancy via Organizations** : Better Auth Organizations - Toutes les queries doivent filtrer par `organizationId`
5. **Stripe Connect Architecture** : Chaque organization a son propre Stripe Connected Account avec webhooks séparés
6. **0% Downtime Requirement** : Migration progressive obligatoire avec feature flags et rollback capability
7. **Performance Targets** : Webhook processing < 2s (actuel : 1-2s, objectif post-refonte : < 1s)
8. **Backwards Compatibility** : APIs internes et schémas DB doivent rester compatibles pendant la migration

**Contraintes Business** :

1. **Production Critical System** : Système déjà en production avec vrais clients et transactions financières
2. **Security First** : Système manipule des données financières (PCI-DSS awareness), authentification multi-tenant stricte
3. **Cost Consciousness** : Optimiser coûts Vercel (function invocations), OpenAI (tokens AI), et Neon (queries DB)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-08 | 2.0 | Architecture brownfield pour refonte complète fraud detection | Winston (Architect) |

---
