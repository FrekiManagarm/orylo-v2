# Tech Stack

### Existing Technology Stack

Le projet utilise un stack moderne Next.js/Vercel avec les technologies suivantes **qui doivent être préservées** :

| Category | Current Technology | Version | Usage in Enhancement | Notes |
|----------|-------------------|---------|---------------------|-------|
| **Runtime** | Node.js (Vercel) | 18+ | Inchangé | Serverless, timeouts 10s Edge / 60s Functions |
| **Framework** | Next.js | 16.1.1 | Inchangé | App Router (NOT Pages Router) |
| **Language** | TypeScript | 5.x | Inchangé | Strict mode obligatoire |
| **Package Manager** | **Bun** | 1.2.3 | **CRITIQUE** | **TOUJOURS utiliser bun** (jamais npm/yarn/pnpm) |
| **Database** | PostgreSQL (Neon) | Serverless | Inchangé | Connection pooling géré par Neon |
| **ORM** | Drizzle ORM | 0.45.1 | Inchangé | Avec drizzle-zod pour validation |
| **Auth** | Better Auth | 1.4.9 | Inchangé | Organizations plugin (NOT NextAuth) |
| **Billing** | Autumn.js | 0.1.63 | Inchangé | Usage-based billing |
| **Payments** | Stripe SDK | 20.1.0 | Inchangé | Connect API multi-tenant |
| **AI/ML** | Mastra AI SDK | 0.24.9 | Inchangé | Agents pour explications |
| **AI Provider** | OpenAI | gpt-4o-mini | Inchangé | Via @ai-sdk/openai |
| **State Management** | TanStack Query | 5.90.16 | Inchangé | Server state |
| **Forms** | TanStack Form | 1.27.7 | Inchangé | Form handling |
| **UI Framework** | Tailwind CSS | v4 | Inchangé | Avec CVA |
| **UI Components** | Shadcn/ui | Custom | Inchangé | Dans /components/ui |
| **Icons** | Phosphor + Lucide | 2.1.10 | Inchangé | Icon libraries |
| **Logging** | tslog | 4.10.2 | Inchangé | Structured logging |

### New Technology Additions

Les technologies suivantes seront ajoutées pour supporter la refonte :

| Technology | Version | Purpose | Rationale | Integration Method |
|-----------|---------|---------|-----------|-------------------|
| **Vitest** | ^2.1.0 | Test framework | Best-in-class pour TypeScript/Next.js, fast, excellent DX | `bun add -D vitest @vitest/ui` |
| **@testing-library/react** | ^16.0.0 | React component testing | Standard industry, bon support Vitest | `bun add -D @testing-library/react` |
| **@testing-library/jest-dom** | ^6.6.0 | DOM matchers | Matchers pratiques pour tests | `bun add -D @testing-library/jest-dom` |
| **Trigger.dev** | ^3.0.0 | Background jobs async | Serverless-native, excellent DX, built-in retry, monitoring | `bun add @trigger.dev/sdk` |
| **Upstash Redis** (optionnel V2) | Latest | Distributed cache | Serverless Redis, pricing par request, Vercel integration | `bun add @upstash/redis` (optionnel) |

---
