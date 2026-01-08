# Introduction

Ce document définit l'approche architecturale pour **refondre complètement** le système de détection de fraude d'Orylo V2, en transformant l'architecture monolithique actuelle en une architecture modulaire, testable, et performante. Il sert de blueprint architectural pour le développement piloté par IA tout en garantissant une intégration transparente avec le système existant.

### Scope Assessment - Justification d'une Architecture Complète

✅ **Architecture Brownfield Complète Justifiée** - Cette refonte nécessite une planification architecturale approfondie :

**Complexité du Changement** :
- **Volume de Code Impacté** : ~5,500 lignes de code critique (1,251 lignes webhook handlers + 4,200 lignes fraud detection modules)
- **Composants Critiques Affectés** : 11 modules de détection + webhook orchestration + système de scoring
- **Impact Architectural** : Transformation complète du pattern de détection, du flow de données, et de l'orchestration
- **Risque Business** : 🔴 **CRITIQUE** - Système de production gérant transactions financières réelles, 0% de downtime acceptable

**Inputs Disponibles** :
- ✅ **PRD Complet** : `docs/prd.md` (1,302 lignes) - 15 FR + 10 NFR détaillés
- ✅ **Architecture Existante** : `docs/architecture.md` v1.1 - Analyse brownfield complète
- ✅ **Codebase Accessible** : Projet complet analysable via IDE
- ✅ **Documentation Technique** : Rules files (`.cursor/rules/`), schemas DB, API docs

**Relationship to Existing Architecture** :
Ce document **remplace** l'architecture actuelle du système de détection de fraude tout en **préservant** les patterns établis pour l'authentification, le billing, et l'UI. Il définit une nouvelle architecture modulaire qui s'intègre dans l'écosystème Next.js/Vercel existant.

---
