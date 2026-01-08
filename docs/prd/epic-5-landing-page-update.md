# Epic 5: Mise à Jour Landing Page - Features Cachées - Brownfield Enhancement

---

## Epic Goal

Mettre à jour la landing page pour mettre en avant les fonctionnalités "cachées" identifiées lors du brainstorming marketing : Trust Score persistant par customer et Auto-whitelist des VIPs, renforçant la différenciation concurrentielle et améliorant la conversion.

---

## Epic Description

### Existing System Context

- **Current relevant functionality:** 
  - Landing page existante avec sections : Hero, Features, Pricing, ROI Calculator, CTA
  - Composant `components/landing/features.tsx` avec 5 features affichées
  - Les features mentionnent déjà "Auto-refund" et "Custom Rules" mais pas Trust Score ni Auto-whitelist
  - Design system Shadcn/ui avec thème dark/cyber/fintech

- **Technology stack:** 
  - Next.js 16 App Router
  - React 19.2.3
  - Tailwind CSS v4
  - Framer Motion pour animations
  - Shadcn/ui components

- **Integration points:** 
  - `components/landing/features.tsx` - Section features à enrichir
  - `components/landing/hero.tsx` - Hero section (possiblement à mettre à jour)
  - `app/(marketing)/page.tsx` - Page landing principale

### Enhancement Details

- **What's being added/changed:** 
  - Ajouter nouvelle feature card "Smart Customer Memory" (Trust Score) dans `features.tsx`
  - Ajouter nouvelle feature card "Auto-Whitelist VIPs" dans `features.tsx`
  - Mettre à jour la description de la feature "Card Testing" pour mentionner Trust Score
  - Possiblement ajouter une section dédiée "How It Works" avec flow Trust Score
  - Améliorer les visuels avec mockups/screenshots du dashboard Trust Score (si disponibles)
  - Mettre à jour le Hero pour mentionner "mémoire intelligente" comme différenciateur

- **How it integrates:** 
  - Extension du composant `features.tsx` existant (ajout de nouvelles cards)
  - Utilisation des mêmes patterns de design (gradients, animations, layout)
  - Pas de changement de structure, seulement ajout de contenu

- **Success criteria:** 
  - ✅ Les features Trust Score et Auto-whitelist sont visibles sur la landing page
  - ✅ Le message de différenciation "mémoire intelligente" est clair
  - ✅ Le design reste cohérent avec le reste de la landing page
  - ✅ Les animations et interactions fonctionnent correctement
  - ✅ La landing page reste performante (< 3s FCP sur 4G - NFR6)

---

## Stories

1. **Story 1:** Ajouter feature cards "Smart Customer Memory" et "Auto-Whitelist VIPs" dans `features.tsx`
   - Créer nouvelle feature card "Smart Customer Memory" :
     - Titre : "Smart Customer Memory"
     - Description : "Persistent Trust Score per Stripe customer. Auto-whitelist VIPs, auto-blacklist fraudsters. Reduce false positives."
     - Icon : Brain ou ShieldCheck
     - Stat : "Persistent" / "Intelligent"
     - Tags : ["Trust Score", "Auto-whitelist", "Memory"]
   - Créer nouvelle feature card "Auto-Whitelist VIPs" :
     - Titre : "Auto-Whitelist VIPs"
     - Description : "Automatically whitelist trusted customers based on purchase history, total spent, and account age. Zero false positives."
     - Icon : Crown ou Star
     - Stat : "Zero" / "false positives"
     - Tags : ["VIP", "Whitelist", "Smart"]
   - Intégrer dans le grid layout existant (maintenir responsive)
   - Tests : vérifier affichage sur desktop, tablette, mobile

2. **Story 2:** Mettre à jour Hero et descriptions pour mettre en avant "mémoire intelligente"
   - Mettre à jour `components/landing/hero.tsx` :
     - Ajouter mention "mémoire intelligente" dans le tagline ou description
     - Possiblement ajouter sous-titre mentionnant Trust Score
   - Mettre à jour description feature "Card Testing" pour mentionner Trust Score
   - Améliorer copywriting pour différenciation vs Stripe Radar
   - Tests : vérifier cohérence du message et impact visuel

---

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged** - Pas d'API, seulement UI
- ✅ **Database schema changes are backward compatible** - Pas de changement de schéma
- ✅ **UI changes follow existing patterns** - Utilisation des mêmes composants et patterns Shadcn/ui
- ✅ **Performance impact is minimal** - Ajout de contenu statique, pas d'impact performance

---

## Risk Mitigation

- **Primary Risk:** Landing page trop chargée ou message confus avec trop de features
  - **Mitigation:** 
    - Garder le même layout grid existant (max 6 features)
    - Hiérarchiser les features : Trust Score et Auto-whitelist en avant
    - Tester avec utilisateurs pour feedback sur clarté du message
    - A/B testing possible pour optimiser conversion

- **Rollback Plan:** 
  - Revenir à la version précédente de `features.tsx` et `hero.tsx`
  - Git revert simple si problème

---

## Definition of Done

- ✅ Toutes les stories complétées avec critères d'acceptation respectés
- ✅ Fonctionnalité existante vérifiée : landing page fonctionne toujours, toutes les sections accessibles
- ✅ Points d'intégration fonctionnels : nouvelles features affichées correctement
- ✅ Documentation mise à jour : front-end-spec.md mis à jour si nécessaire
- ✅ Pas de régression : performance landing page maintenue (< 3s FCP)
- ✅ Tests manuels : vérifier affichage sur différents devices, vérifier animations, vérifier message marketing

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing landing page running Next.js 16, React 19, Tailwind CSS v4, Framer Motion
- Integration points: 
  - `components/landing/features.tsx` (ajout nouvelles feature cards)
  - `components/landing/hero.tsx` (mise à jour copywriting)
  - `app/(marketing)/page.tsx` (page principale, vérifier intégration)
- Existing patterns to follow: 
  - Design system Shadcn/ui avec thème dark/cyber/fintech
  - Animations Framer Motion avec `motion.div` et `whileInView`
  - Layout grid responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
  - Gradients et effets visuels cohérents avec design existant
- Critical compatibility requirements: 
  - Performance doit rester < 3s FCP sur 4G (NFR6)
  - Design doit rester cohérent avec le reste de la landing page
  - Responsive design doit fonctionner sur tous les devices
- Each story must include verification that existing functionality remains intact (toutes les sections landing page, navigation, animations)

The epic should maintain design consistency while highlighting the hidden killer features (Trust Score, Auto-whitelist) that differentiate Orylo from competitors like Stripe Radar."

---

**Epic Created:** 2026-01-08  
**Author:** Sarah (Product Owner)  
**Status:** Ready for Story Creation
