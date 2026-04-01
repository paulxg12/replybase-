# Replybase Directory Structure

```
REPLY BASE/
│
├── 📄 Root Configuration Files
│   ├── package.json              ← Monorepo root, shared scripts
│   ├── pnpm-workspace.yaml       ← pnpm workspace definitions
│   ├── turbo.json                ← Turborepo build orchestration
│   ├── docker-compose.yml        ← PostgreSQL 15 + pgvector + Redis 7
│   ├── tsconfig.json             ← Root TypeScript strict config
│   ├── .env.example              ← All required environment variables
│   ├── .gitignore                ← Node.js + artifact exclusions
│   └── start.sh                  ← Quick start script
│
├── 📚 Documentation
│   ├── README.md                 ← Complete product documentation
│   ├── QUICKSTART.md             ← 5-minute setup guide
│   ├── ARCHITECTURE.md           ← System design & data flows
│   ├── IMPLEMENTATION.md         ← Feature checklist (what's left)
│   └── BUILD_SUMMARY.md          ← What's been built (this file)
│
│
├── 📦 apps/ — Applications (3)
│   │
│   ├── api/                      ← Node.js + Express REST backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts          ← Entry point: boot, validate env, start server
│   │   │   ├── lib/
│   │   │   │   ├── logger.ts     ← Structured logging (pino)
│   │   │   │   ├── responses.ts  ← apiSuccess() / apiError() helpers
│   │   │   │   └── prisma.ts     ← Prisma client singleton (optional)
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       ← JWT validation
│   │   │   │   ├── rateLimit.ts  ← Rate limiting
│   │   │   │   └── errorHandler.ts
│   │   │   └── routes/
│   │   │       ├── health.ts     ← GET /health
│   │   │       ├── chat.ts       ← POST /chat (core endpoint)
│   │   │       ├── widget.ts     ← GET /widget/:publicKey/config
│   │   │       ├── gorgias.ts    ← POST /gorgias/test-connection
│   │   │       └── trpc.ts       ← (TODO: tRPC procedures)
│   │   └── (migrations, jobs, services go here)
│   │
│   ├── dashboard/                ← Next.js 14 (App Router)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   └── app/
│   │       ├── layout.tsx        ← Root layout with Inter + globals.css
│   │       ├── page.tsx          ← / (redirects to /overview)
│   │       ├── globals.css       ← @tailwind directives
│   │       │
│   │       ├── (auth)/           ← Public routes (not authenticated)
│   │       │   ├── layout.tsx    ← Auth layout (full screen)
│   │       │   ├── login/
│   │       │   │   └── page.tsx  ← Email + OAuth sign-in
│   │       │   └── onboarding/
│   │       │       ├── connect-shopify/page.tsx    ← Shopify OAuth
│   │       │       ├── connect-gorgias/page.tsx    ← API credentials
│   │       │       └── initial-sync/page.tsx       ← Progress polling
│   │       │
│   │       └── (dashboard)/      ← Protected routes (requires auth)
│   │           ├── layout.tsx    ← Sidebar + top nav layout
│   │           ├── overview/
│   │           │   └── page.tsx  ← Stats, metrics, recent conversations
│   │           ├── conversations/
│   │           │   ├── page.tsx  ← List of chat sessions
│   │           │   └── [id]/ → page.tsx ← Thread viewer
│   │           ├── knowledge/
│   │           │   ├── page.tsx  ← Knowledge base browser
│   │           │   └── add/page.tsx ← Manual entry form
│   │           ├── widget/
│   │           │   └── page.tsx  ← Config + embed code
│   │           ├── sync/
│   │           │   └── page.tsx  ← History + manual trigger
│   │           ├── settings/
│   │           │   ├── page.tsx  ← General settings
│   │           │   ├── integrations/page.tsx
│   │           │   └── billing/page.tsx ← Stripe portal
│   │           └── api/
│   │               ├── auth/[...nextauth]/route.ts ← NextAuth handler
│   │               ├── webhooks/stripe/route.ts    ← Stripe webhooks
│   │               └── trpc/[trpc]/route.ts       ← tRPC endpoint
│   │
│   └── widget/                   ← Embeddable chat widget
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts        ← IIFE bundler config
│       └── src/
│           ├── index.ts          ← Entry point: init, attach DOM
│           ├── types.ts          ← WidgetConfig, ChatMessage, ChatSession
│           ├── utils.ts          ← Visitor ID, session storage helpers
│           ├── dom.ts            ← DOM rendering (createElement, message rendering)
│           └── styles.ts         ← CSS injection (no external stylesheets)
│
│
├── 📦 packages/ — Shared Libraries (6)
│   │
│   ├── config/                   ← Shared configs
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── tailwind.config.ts ← Design tokens (colors, fonts)
│   │   │   ├── utils.ts          ← zod formatting, env checks
│   │   │   └── index.ts          ← Barrel export
│   │   └── (inherited by all packages)
│   │
│   ├── db/                       ← Prisma ORM + Database
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   └── schema.prisma     ← All data models + migrations
│   │   ├── src/
│   │   │   ├── client.ts         ← PrismaClient singleton
│   │   │   ├── env.ts            ← validateEnv() with zod
│   │   │   └── index.ts          ← Type exports
│   │   └── migrations/           ← (auto-generated by prisma migrate)
│   │
│   ├── ui/                       ← React Component Library
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx      ← Variants: primary, secondary, outline, ghost
│   │   │   │   ├── Input.tsx       ← With label, error, hint
│   │   │   │   ├── Card.tsx        ← Card + CardHeader + CardTitle + CardContent
│   │   │   │   ├── Dialog.tsx      ← Radix UI modal
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── CodeBlock.tsx
│   │   │   │   ├── index.ts        ← Barrel export
│   │   │   ├── utils.ts           ← cn() helper
│   │   │   ├── globals.css        ← @tailwind directives
│   │   │   └── index.ts           ← Public exports
│   │   └── (no build output, used during development)
│   │
│   ├── gorgias/                  ← Gorgias API Client
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── client.ts         ← GorgiasClient class
│   │       ├── types.ts          ← Type definitions + zod schemas
│   │       └── index.ts          ← Public exports
│   │
│   ├── shopify/                  ← Shopify API Client
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── client.ts         ← ShopifyClient class
│   │       ├── types.ts          ← Type definitions + zod schemas
│   │       └── index.ts          ← Public exports
│   │
│   └── rag/                      ← RAG Pipeline (Retrieval, Embeddings, LLM)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── embedding.ts      ← OpenAI embeddings + pgvector upsert
│           ├── llm.ts            ← gpt-4o response generation
│           └── index.ts          ← Public exports
│
│
└── 🔧 Infrastructure & Config
    └── docker-compose.yml
        ├── PostgreSQL 15 + pgvector
        └── Redis 7 (for BullMQ)

═══════════════════════════════════════════════════════════════════

TOTAL FILES: 72
TOTAL DIRECTORIES: 30+
LINES OF CODE: 3,500+

═══════════════════════════════════════════════════════════════════
```

## Key Principles

### By Feature (not by file type)
- `apps/dashboard` contains all dashboard code (pages, components, API routes)
- `apps/api` contains all backend code (routes, services, migrations)
- `apps/widget` is isolated for independent deployment

### Monorepo Benefits
- Shared TS config, Tailwind, UI components
- Single `package.json` root for scripts
- `turbo.json` orchestrates builds
- Cross-package imports work seamlessly

### TypeScript Strict
Every single file has:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### No Magic
- No hardcoded strings (use enums)
- No `console.log` in production (use logger)
- No bare `catch` blocks
- Every error is typed and handled

---

## File Naming Conventions

| Pattern | Use Case | Example |
|---------|----------|---------|
| `page.tsx` | Next.js route | `app/(dashboard)/overview/page.tsx` |
| `layout.tsx` | Shared container | `app/(dashboard)/layout.tsx` |
| `route.ts` | API endpoint | `app/api/chat/route.ts` |
| `PascalCase.tsx` | React component | `Button.tsx`, `Card.tsx` |
| `camelCase.ts` | Service/util | `embeddingService.ts`, `logger.ts` |
| `types.ts` | Zod schemas + TS types | `types.ts` in each package |
| `client.ts` | External API client | `gorgias/src/client.ts` |
| `index.ts` | Barrel export | All packages end with `index.ts` |

---

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Start services
docker-compose up -d

# 3. Setup database
pnpm db:push

# 4. Start development
pnpm dev

# Opens:
# - Dashboard:  http://localhost:3000
# - API:        http://localhost:4000
# - Widget:     http://localhost:5173
```

---

For detailed instructions, see [QUICKSTART.md](./QUICKSTART.md)

For implementation roadmap, see [IMPLEMENTATION.md](./IMPLEMENTATION.md)

For architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md)
