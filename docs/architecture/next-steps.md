# Next Steps

### Story Manager Handoff

**Pour Sarah (PO)** :

Créez stories détaillées basées sur :
- **PRD** : `docs/prd.md` (15 FR + 10 NFR)
- **Architecture** : Ce document
- **Pattern** : Strangler Fig, migration progressive
- **First Story** : Story 1.1 - Setup Testing Infrastructure

**Séquence** :
- Phase 1 (Week 1-2) : Foundation (Testing + Interfaces)
- Phase 2 (Week 3-6) : Core (Context Builder + Engine)
- Phase 3 (Week 7-9) : Handlers (Webhook Decomposition)
- Phase 4 (Week 10-12) : Migration (Shadow Mode + Rollout)

### Developer Handoff

**Pour James & Dev Team** :

**Start Here** :
1. Story 1.1 : Setup Vitest + mocks
2. Story 1.2 : Create core interfaces
3. Follow architecture patterns définis ci-dessus

**Critical Rules** :
- ✅ V2 code dans `lib/fraud-detection-v2/`
- ✅ Ne PAS toucher V1 code pendant Phase 1-3
- ✅ Tests obligatoires (80%+ coverage)
- ✅ Feature flags pour routing V1/V2

**References** :
- Architecture : Ce document (source of truth)
- Coding Standards : `.cursor/rules/` + section ci-dessus
- PRD : `docs/prd.md`

---
