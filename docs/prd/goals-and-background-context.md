# Goals and Background Context

### Goals

**Objectifs Principaux** :

1. **Modularité** : Décomposer le monolithe en modules à responsabilité unique, facilement testables et maintenables
2. **Performance** : Réduire la latence webhook de 30-50% via parallélisation, cache, et async processing
3. **Testabilité** : Atteindre 80%+ code coverage avec tests unitaires + intégration sur code critique
4. **Extensibilité** : Faciliter l'ajout de nouvelles règles de détection sans modifier le core engine
5. **Maintenabilité** : Améliorer la clarté du code avec separation of concerns et documentation
6. **Fiabilité** : Éliminer les 5 workarounds documentés et ajouter error handling robuste
7. **Observabilité** : Améliorer le logging et les métriques pour debugging et monitoring

### Background Context

**Pourquoi cette refonte est nécessaire maintenant ?**

**Problèmes Actuels Identifiés** :

#### 1. **Webhook Handler Monolithique Ingérable** 🔴

- **Fichier** : `lib/actions/stripe-webhook-handlers.ts` (1,251 lignes)
- **Problème** : Toute la logique métier dans un seul fichier avec 15+ handlers différents
- **Handler principal** : `handlePaymentIntentCreated()` = 350 lignes avec 8 STEPS imbriqués
- **Impact** : Impossible à tester, difficile à maintenir, risque élevé de régression

#### 2. **Moteur de Détection Simpliste et Rigide** 🔴

- **Fichier** : `lib/fraud-detection/engine.ts` (492 lignes)
- **Problème** : 
  - Score additif simpliste (`riskScore += weight`) avec seuils hardcodés arbitraires
  - 15 règles hardcodées (impossible d'ajuster sans redéploiement)
  - Pas de corrélation entre facteurs (chaque règle évalue indépendamment)
  - Difficile d'ajouter de nouvelles règles (modification directe du fichier)

**Exemple du problème** :
```typescript
// Seuils arbitraires hardcodés - d'où viennent ces valeurs ?
if (context.ipCountry !== context.cardCountry) {
  riskScore += 30;  // Pourquoi 30 et pas 25 ou 35 ?
}
if (context.velocity.attemptsLastHour >= 10) {
  riskScore += 25;  // Pourquoi >= 10 et pas 8 ou 12 ?
}
```

#### 3. **Performance Limitée** ⚠️

- **Queries DB séquentielles** : Aucune parallélisation, toutes les queries bloquantes
- **Pas de cache** : Custom rules, customer scores, velocity metrics refetchés à chaque webhook
- **AI bloquante** : OpenAI API call (500-1000ms) bloque le webhook handler
- **Latence actuelle** : 1,000-2,000ms (objectif < 2s, mais **très limite**)

**Impact** : Risque de dépassement du timeout Vercel (10s) lors de pics de charge

#### 4. **Aucune Testabilité** 🔴

- **0% code coverage** sur 5,500 lignes de code critique
- **Impossible à tester** : Dépendances externes (Stripe, DB, OpenAI) non mockables
- **Logique mélangée** : Business logic + IO + side effects dans les mêmes fonctions
- **Pas d'interfaces** : Aucune abstraction, pas de dependency injection

**Impact** : Développement lent (peur de casser), bugs en production, dette technique croissante

#### 5. **Fragmentation des Responsabilités** ⚠️

- **11 fichiers** avec responsabilités mélangées et dupliquées
- **3 systèmes de scoring** différents (`riskScore`, `trustScore`, `suspicionScore`) avec logiques redondantes
- **Types éparpillés** : `types.ts` de 503 lignes avec tous les types mélangés
- **Pas de cohérence** : Chaque module a son propre pattern de calcul de score

**Impact** : Code difficile à comprendre, duplication de logique, maintenance complexe

#### 6. **Dette Technique Documentée** ⚠️

**5 workarounds critiques documentés** dans `docs/architecture.md` :
1. AI Model Casting (`as unknown as MastraLanguageModel`) - risque de casse
2. Device Consistency Default (60 hardcodé) - scoring imprécis
3. Location Consistency Simplistic - pas de géolocalisation IP
4. Webhook Secret Fallback - confusion dev/prod
5. Card Testing Session ID fallback - détection moins précise

**Contexte Business** :

- **Croissance du produit** : Nouvelles features à ajouter (FR6, FR10, FR15, FR20)
- **Demandes clients** : Règles personnalisées configurables, performance améliorée
- **Compétitivité** : Besoin d'itérer rapidement sur les algorithmes de détection
- **Scalabilité** : Préparation pour augmentation du volume de transactions

**Pourquoi maintenant ?**

- **Moment idéal** : 3 stories techniques déjà complétées (auto-refund, custom-rules, email-alerts)
- **Base solide** : Documentation architecture excellente, patterns établis
- **Risque maîtrisé** : Possibilité de migration progressive sans interruption de service
- **ROI élevé** : Amélioration de la vélocité de développement pour futures features

---
