# Orylo V2 UI/UX Specification

---

## Introduction

Ce document définit les objectifs d'expérience utilisateur, l'architecture de l'information, les flux utilisateur et les spécifications de design visuel pour l'interface utilisateur d'**Orylo V2**. Il sert de fondation pour le design visuel et le développement frontend, garantissant une expérience cohérente et centrée sur l'utilisateur.

### Contexte du Projet

**Orylo V2** est une plateforme SaaS de détection et prévention de fraude spécialisée dans les attaques de **card testing** pour les marchands Stripe. Le produit analyse les transactions en temps réel via un moteur basé sur règles et génère des explications visuelles en français grâce à l'IA.

**Documents de référence :**
- **Project Brief** : `docs/brief.md` - Vue d'ensemble du projet, problème résolu, marché cible
- **Design System** : `.cursor/rules/design-system.mdc` - Identité visuelle Dark Mode / Cyber / Fintech existante
- **Architecture** : Stack Next.js 16, React 19, Tailwind CSS v4, Framer Motion

**Approche Design System :**
- ✅ **Shadcn/ui** : Utilisation maximale des composants Shadcn comme base du design system
- ✅ **Customisation** : Adaptation des composants Shadcn au thème Dark Mode / Cyber / Fintech d'Orylo
- ✅ **CVA (Class Variance Authority)** : Utilisation de CVA pour les variants de composants
- ✅ **Composants dans `/components/ui`** : Tous les composants Shadcn sont disponibles et customisés

### Portée de ce Document

Cette spécification couvre :
- ✅ **Landing Page** : Acquisition et conversion (hero, features, pricing, ROI calculator)
- ✅ **Dashboard Principal** : Vue d'ensemble des transactions, analyses de fraude, règles personnalisées
- ✅ **Onboarding** : Connexion Stripe OAuth, création d'organisation, sélection d'organisation
- ✅ **Pages Marketing** : About, Blog, Contact, CGU, Privacy

**Hors portée (pour versions futures) :**
- ❌ Application mobile native
- ❌ Intégrations tierces (Shopify, WooCommerce plugins)
- ❌ API publique pour développeurs

---

## Overall UX Goals & Principles

### Target User Personas

#### **1. Le Marchand Stressé (Primary Persona)**
**Profil :** Propriétaire d'e-commerce ou SaaS, 30-45 ans, niveau technique moyen, sous pression constante

**Contexte :**
- Subit actuellement une attaque de card testing (dizaines de failed payments)
- Perd de l'argent (frais Stripe + chargebacks)
- Ne comprend pas pourquoi ça arrive
- A besoin d'une solution IMMÉDIATE (pas le temps d'apprendre un outil complexe)

**Besoins :**
- Comprendre rapidement ce qui se passe ("Pourquoi ces transactions sont bloquées ?")
- Setup en moins de 5 minutes (pas de code, pas de documentation technique)
- Voir des résultats concrets (économies, attaques bloquées)
- Réassurance que ça fonctionne (preuves visuelles)

**Frustrations actuelles :**
- Stripe Radar = boîte noire (pas d'explications)
- Outils complexes (Riskify, Sift) = trop de configuration
- Pas de temps pour apprendre un nouveau système

#### **2. Le CTO Technique (Secondary Persona)**
**Profil :** CTO ou Lead Dev, 28-40 ans, très technique, responsable de la stack

**Contexte :**
- Évalue des solutions anti-fraude pour l'équipe
- Besoin de comprendre l'architecture technique
- Veut des métriques et des contrôles granulaires
- Gère plusieurs comptes Stripe (organisations)

**Besoins :**
- API et webhooks pour intégration
- Dashboard avec métriques détaillées
- Règles personnalisables (whitelist, blacklist, seuils)
- Multi-organisation (gérer plusieurs comptes)

**Frustrations actuelles :**
- Solutions trop "no-code" = pas assez de contrôle
- Solutions trop complexes = maintenance lourde
- Manque de transparence sur les décisions

#### **3. Le Responsable Financier (Tertiary Persona)**
**Profil :** CFO ou comptable, 35-55 ans, focus sur ROI et coûts

**Contexte :**
- Doit justifier les dépenses SaaS
- Mesure l'impact financier de la fraude
- Compare les solutions (pricing, ROI)

**Besoins :**
- Calculateur ROI clair et transparent
- Reporting financier (économies, frais évités)
- Pricing simple et prévisible
- Preuve de valeur (chiffres concrets)

**Frustrations actuelles :**
- Pricing opaque (% de revenue, frais cachés)
- Difficile de mesurer le ROI réel
- Pas de visibilité sur les économies réelles

---

### Usability Goals

#### **1. Ease of Learning (Facilité d'apprentissage)**
**Objectif :** Un nouveau marchand peut comprendre et utiliser Orylo en moins de 5 minutes

**Métriques :**
- ✅ Setup Stripe OAuth complété en < 5 minutes
- ✅ Première transaction analysée visible en < 2 minutes après setup
- ✅ Compréhension d'une explication de fraude en < 30 secondes

**Stratégies UX :**
- Onboarding progressif avec tooltips contextuels
- Explications visuelles claires (pas de jargon technique)
- Feedback immédiat à chaque étape

#### **2. Efficiency of Use (Efficacité d'utilisation)**
**Objectif :** Les utilisateurs réguliers peuvent accomplir les tâches fréquentes avec un minimum de clics

**Métriques :**
- ✅ Voir les transactions suspectes en 1 clic depuis le dashboard
- ✅ Créer une règle personnalisée en < 3 clics
- ✅ Comprendre pourquoi une transaction a été bloquée en < 10 secondes

**Stratégies UX :**
- Navigation claire et prévisible
- Actions fréquentes accessibles rapidement (shortcuts, favoris)
- Recherche et filtres puissants

#### **3. Error Prevention (Prévention des erreurs)**
**Objectif :** Éviter les faux positifs (bloquer des clients légitimes) grâce à une compréhension claire

**Métriques :**
- ✅ Taux de faux positifs < 1% (mesuré via feedback utilisateur)
- ✅ Confirmation avant actions destructives (blacklist, refund)
- ✅ Possibilité d'annuler une action dans les 30 secondes

**Stratégies UX :**
- Explications détaillées avant chaque blocage
- Trust Score visible pour chaque customer
- Auto-whitelist des VIPs (réduction automatique des faux positifs)
- Confirmations claires pour actions irréversibles

#### **4. Memorability (Mémorabilité)**
**Objectif :** Un utilisateur qui revient après 1 mois peut retrouver ses repères rapidement

**Métriques :**
- ✅ Navigation intuitive (pas besoin de relire la doc)
- ✅ Patterns visuels cohérents dans tout le dashboard
- ✅ Historique accessible facilement

**Stratégies UX :**
- Design system cohérent (même patterns partout)
- Navigation persistante et prévisible
- Historique et logs accessibles facilement

---

### Design Principles

1. **Clarté avant tout** - Chaque explication doit être compréhensible par un non-technique. Éviter le jargon, privilégier le langage naturel en français.

2. **Transparence totale** - Jamais de "boîte noire". Chaque décision (blocage, autorisation) doit être expliquée visuellement avec des preuves concrètes.

3. **Feedback immédiat** - Chaque action utilisateur doit avoir une réponse visuelle immédiate (animations, états de chargement, confirmations).

4. **Progressive Disclosure** - Montrer d'abord l'essentiel (dashboard simple), permettre d'approfondir si besoin (détails, règles avancées).

5. **Confiance par la preuve** - Utiliser des chiffres concrets, des visualisations claires, des preuves tangibles plutôt que des promesses vagues.

6. **Accessibilité par défaut** - Contraste suffisant (dark mode), navigation clavier, textes alternatifs, respect WCAG 2.1 AA minimum.

7. **Performance perçue** - Même si le traitement backend prend du temps, l'UI doit réagir instantanément (optimistic updates, skeletons).

---

## Information Architecture (IA)

### Site Map / Screen Inventory

```mermaid
graph TD
    A[Homepage /] --> B[Landing Sections]
    B --> B1[Hero]
    B --> B2[Features]
    B --> B3[ROI Calculator]
    B --> B4[Pricing]
    B --> B5[CTA]
    
    A --> C[Auth Routes /auth]
    C --> C1[/sign-in]
    C --> C2[/sign-up]
    C --> C3[/forgot-password]
    C --> C4[/reset-password]
    
    A --> D[Marketing Routes /marketing]
    D --> D1[/about]
    D --> D2[/blog]
    D --> D3[/blog/[slug]]
    D --> D4[/contact]
    D --> D5[/privacy]
    D --> D6[/cgu]
    
    A --> E[Dashboard /main]
    E --> E1[/dashboard - Home]
    E --> E2[/dashboard/fraud-analyses]
    E --> E3[/dashboard/rules]
    E --> E4[/dashboard/connect]
    E --> E5[/dashboard/settings]
    
    E --> F[Onboarding]
    F --> F1[/onboarding]
    F --> F2[/create-organization]
    F --> F3[/select-organization]
```

### Navigation Structure

#### **Primary Navigation (Landing Page)**
**Composant Shadcn utilisé :** Navigation personnalisée avec `Button` et `Link`

**Structure :**
- **Logo** : Lien vers homepage (`/`)
- **Menu principal** : Features, Pricing, About, Blog (liens ancres `#features`, `#pricing` ou pages)
- **Actions** : "Log in" (lien) + "Get Started" (Button Shadcn primary)

**Comportement :**
- Navbar sticky avec backdrop blur au scroll
- Underline animé au hover (Framer Motion)
- Responsive : Menu hamburger sur mobile (Sheet Shadcn)

#### **Primary Navigation (Dashboard)**
**Composant Shadcn utilisé :** `Sidebar` (composant Shadcn complet)

**Structure :**
- **Sidebar gauche** : Navigation principale avec groupes
  - **Groupe "Overview"** : Dashboard Home, Fraud Analyses
  - **Groupe "Configuration"** : Rules, Stripe Connect, Settings
- **Header** : Breadcrumbs (`Breadcrumb` Shadcn) + User menu (`DropdownMenu` Shadcn)
- **Footer Sidebar** : Switch organisation (`DropdownMenu` Shadcn) + User profile (`Avatar` Shadcn)

**Comportement :**
- Sidebar collapsible (mobile/desktop)
- Menu actif highlighté avec `SidebarMenuButton`
- Submenus avec `Collapsible` Shadcn pour les sections expandables
- Organisation switcher avec `DropdownMenu` Shadcn

#### **Secondary Navigation**
**Composants Shadcn utilisés :** `Breadcrumb`, `Tabs`

**Breadcrumbs :**
- Utilisation de `Breadcrumb` Shadcn pour la navigation hiérarchique
- Format : `Dashboard > Fraud Analyses > [Transaction ID]`
- Liens cliquables pour navigation rapide

**Tabs (dans les pages) :**
- Utilisation de `Tabs` Shadcn pour organiser le contenu dans une page
- Exemple : Dashboard avec tabs "Overview", "Recent", "Analytics"

#### **Breadcrumb Strategy**
**Approche :** Navigation hiérarchique claire pour les pages profondes

**Règles :**
- Toujours afficher le chemin depuis la homepage
- Maximum 4 niveaux de profondeur (au-delà, utiliser "...")
- Dernier élément = page actuelle (non cliquable, style différent)
- Utiliser `Breadcrumb` Shadcn avec `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`

**Exemples :**
- `/dashboard` → `Dashboard`
- `/dashboard/fraud-analyses` → `Dashboard > Fraud Analyses`
- `/dashboard/fraud-analyses/[id]` → `Dashboard > Fraud Analyses > Transaction #12345`

---
