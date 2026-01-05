# Cursor Rules - Orylo v2

Ce dossier contient l'ensemble des règles et conventions du projet Orylo v2, une plateforme SaaS de prévention de fraude pour Stripe.

## 📚 Documentation disponible

### 🏗️ Architecture & Stack
**[architecture.mdc](./architecture.mdc)**
- Vue d'ensemble du projet et de son architecture
- Stack technique complet (Frontend, Backend, Infrastructure)
- Structure des dossiers et organisation du code
- Principes d'architecture (App Router, Type Safety, etc.)
- Variables d'environnement requises
- Conventions de nommage

### 🎨 Design System
**[design-system.mdc](./design-system.mdc)**
- Identité visuelle (Dark Mode / Cyber / Fintech)
- Palette de couleurs et typographie
- Patterns de composants (Cards, Inputs, Forms)
- Animations avec Framer Motion
- Classes Tailwind recommandées
- Règles "Do Not" pour maintenir la cohérence

### 🗄️ Base de données
**[database.mdc](./database.mdc)**
- Configuration Drizzle ORM + PostgreSQL (Neon)
- Structure des schémas et conventions
- Patterns de colonnes (IDs, timestamps, relations)
- Querying patterns (Select, Insert, Update, Delete)
- Gestion des migrations
- Multi-tenancy avec Organizations
- Types et validation avec Zod

### 🔐 Authentification
**[authentication.mdc](./authentication.mdc)**
- Configuration Better Auth (⚠️ PAS NextAuth!)
- Plugins activés (Organization, 2FA, Autumn)
- Patterns d'utilisation (Server/Client)
- Gestion des Organizations (multi-tenancy)
- Hooks React disponibles
- Protection des routes
- Intégration avec Autumn pour le billing

### 💳 Billing & Usage
**[billing.mdc](./billing.mdc)**
- Configuration Autumn.js pour usage-based billing
- Définition des features et products (plans)
- Patterns de vérification des limites
- Tracking de l'usage
- Portail de billing client
- Intégration avec Better Auth
- Stratégie fail-safe

### 💰 Intégration Stripe
**[stripe.mdc](./stripe.mdc)**
- Architecture Stripe Connect
- Flow de connexion des comptes
- Gestion des webhooks par compte
- Événements surveillés (Payment Intents, Disputes, etc.)
- Analyse de fraude déclenchée par webhooks
- Sécurité et validation des signatures
- Limites par plan (nombre de comptes Stripe)

### 🤖 AI & Agents
**[ai-mastra.mdc](./ai-mastra.mdc)**
- Intégration Mastra.ai pour l'analyse de fraude
- Architecture des agents AI
- Types de signaux de fraude analysés
- Workflows d'analyse
- Tools disponibles pour les agents
- Évaluations (Evals) des performances
- Modèles OpenAI disponibles
- Gestion des coûts et optimisation

### 🛠️ Patterns & Conventions
**[patterns.mdc](./patterns.mdc)**
- Patterns de composants React (Server/Client)
- Gestion des états (TanStack Query, Zustand, nuqs)
- Server Actions Next.js
- Composants shadcn/ui
- Préférences utilisateur documentées
- Gestion des erreurs
- Animations Framer Motion
- API Routes patterns
- Bonnes pratiques générales

### 🧭 Routing & Navigation
**[routing.mdc](./routing.mdc)**
- Next.js App Router et nested routes
- Route Groups (auth, marketing, main)
- Layouts imbriqués
- Pages dynamiques et catch-all routes
- API Routes patterns
- Navigation (Link, useRouter, redirect)
- Metadata (static et dynamic)
- Loading, Error et Not Found states
- URL Search Params et Revalidation

## 🎯 Comment utiliser ces règles

### Pour les développeurs
1. **Nouveau sur le projet ?** Commencez par [architecture.mdc](./architecture.mdc)
2. **Besoin de créer une UI ?** Consultez [design-system.mdc](./design-system.mdc)
3. **Travail sur la DB ?** Référez-vous à [database.mdc](./database.mdc)
4. **Authentification ?** Lisez [authentication.mdc](./authentication.mdc)
5. **Routing/Navigation ?** Voir [routing.mdc](./routing.mdc)
6. **Intégration API ?** Consultez [stripe.mdc](./stripe.mdc) ou [ai-mastra.mdc](./ai-mastra.mdc)
7. **Patterns de code ?** Référez-vous à [patterns.mdc](./patterns.mdc)

### Pour Cursor AI
Ces fichiers `.mdc` sont automatiquement chargés par Cursor selon les globs définis dans chaque fichier. L'IA les utilisera pour:
- Respecter les conventions du projet
- Générer du code cohérent avec l'existant
- Suggérer les bonnes pratiques
- Éviter les erreurs courantes

## 🔄 Mise à jour des règles

Les règles doivent être mises à jour quand:
- Une nouvelle technologie est ajoutée au projet
- Les conventions changent (décision d'équipe)
- De nouveaux patterns émergent
- Des erreurs communes sont identifiées

## 📦 Technologies principales

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes, Drizzle ORM, PostgreSQL (Neon)
- **Auth**: Better Auth 1.4.9
- **Billing**: Autumn.js 0.1.63
- **Payments**: Stripe Connect
- **AI**: Mastra.ai + OpenAI
- **Package Manager**: Bun 1.2.3

## 🌍 Langue

**Règle importante**: Toujours répondre en **français** dans les conversations avec l'utilisateur du projet.

## 📝 Contribution

Pour ajouter ou modifier une règle:
1. Éditer le fichier `.mdc` concerné
2. Respecter le format existant (frontmatter + markdown)
3. Tester que les globs sont appropriés
4. Documenter avec des exemples concrets

---

**Dernière mise à jour**: 31 décembre 2025  
**Version du projet**: 0.1.0
