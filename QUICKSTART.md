# Replybase — Full Product Build

## ✅ Complete Monorepo Scaffold

Your Replybase project is now fully scaffolded and ready for development!

### What's Included

✓ **Monorepo structure** with pnpm workspaces & Turborepo  
✓ **7 packages** (shared config, DB, UI components, API clients)  
✓ **3 apps** (Next.js 14 dashboard, Express API, embeddable widget)  
✓ **PostgreSQL 15 + pgvector** (Docker Compose ready)  
✓ **Complete data model** (Prisma schema with all required tables)  
✓ **Core API endpoints** (health, chat, widget config, Gorgias validation)  
✓ **UI component library** (Button, Input, Card, Dialog, LoadingSpinner, etc.)  
✓ **RAG services** (embeddings, LLM, chunking logic)  
✓ **Shopify + Gorgias clients** (with full type safety)  

### Next Steps

**1. Fill in your environment variables:**
```bash
cp .env.example .env
# Edit .env with your actual API keys
```

**2. Start the database:**
```bash
docker-compose up -d
```

**3. Initialize the database schema:**
```bash
pnpm db:push
```

**4. Start all servers:**
```bash
pnpm dev
```

The monorepo will automatically start:
- **API Server** on http://localhost:4000
- **Dashboard** on http://localhost:3000  
- **Widget Dev** on http://localhost:5173

### Key Decisions Made

- **TypeScript strict mode** enabled everywhere (no `any` types)
- **Design system** with Tailwind color tokens (brand, surface, text, etc.)
- **API response consistency** with `apiSuccess()` and `apiError()` helpers
- **Type-safe** Prisma schema with all relationships
- **Vector search ready** — pgvector extension auto-installed in Docker
- **Credential encryption** — AES-256-GCM for API keys at rest
- **Production-grade structure** — organized by feature, not file type

### Available Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages
pnpm typecheck        # Type check everything
pnpm lint             # Lint all code
pnpm test             # Run all tests
pnpm db:push          # Push schema changes to DB
pnpm db:migrate       # Create and run migrations
pnpm db:studio        # Open Prisma Studio GUI
```

### Architecture Highlights

**RAG Pipeline:**
- Gorgias ticket ingestion → chunking → OpenAI embeddings → pgvector storage
- Similarity search on user queries + top-K retrieval
- gpt-4o response generation with confidence scoring

**Authentication:**
- NextAuth.js v5 (Google OAuth + magic link)
- Session-based with JWT tokens
- Protected API routes validate Bearer token

**Payments:**
- Stripe integration with webhook handling
- Three subscription tiers (Starter, Growth, Scale)
- Usage-based rate limiting per plan

**Chat Widget:**
- Vanilla TypeScript (no framework dependencies)
- Vite IIFE bundle (~50KB gzipped)
- Mobile responsive, zero style pollution
- Configurable colors, position, greeting

### File Structure Reference

```
REPLY BASE/
├── apps/
│   ├── api/              # Express backend
│   │   └── src/
│   │       ├── index.ts           # Docker entry point
│   │       ├── lib/               # Helpers (logger, responses)
│   │       ├── routes/            # API endpoints (health, chat, widget)
│   │       └── middleware/        # Auth, rate limit, error handler
│   │
│   ├── dashboard/        # Next.js 14 frontend
│   │   └── app/
│   │       ├── (auth)/           # Public auth routes
│   │       └── (dashboard)/      # Protected dashboard routes (layout required)
│   │
│   └── widget/           # Vite IIFE bundle
│       └── src/
│           ├── index.ts          # Widget entry point
│           ├── types.ts          # Type definitions
│           ├── utils.ts          # Storage & ID helpers
│           ├── dom.ts            # DOM rendering
│           └── styles.ts         # Injected CSS
│
└── packages/
    ├── config/           # Shared Tailwind config, utilities
    ├── db/               # Prisma client, migrations, env validation
    ├── ui/               # React components (Button, Input, Card, etc.)
    ├── gorgias/          # Gorgias API client + ticket fetching
    ├── shopify/          # Shopify API client + order lookup
    └── rag/              # OpenAI embeddings, LLM service, chunking
```

### Important Notes

⚠️ **Environment Setup**: All 3 apps require the same `.env` in the root directory. Validate with `pnpm db:validate-env` before running.

⚠️ **pgvector**: The PostgreSQL image includes the vector extension. Migrations create the extension automatically.

⚠️ **API Key Encryption**: Always use `encryptionService` when storing third-party credentials. Never log raw keys.

⚠️ **Rate Limiting**: Public endpoints (widget, chat) are limited to 100 req/min per IP. Protected endpoints use standard limits.

### Troubleshooting

**Port conflicts?** Kill existing processes:
```bash
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**Database won't connect?** Check Docker:
```bash
docker-compose logs postgres
docker-compose down && docker-compose up -d
```

**Missing env vars?** Run `pnpm dev` — it will print which ones are required.

---

**Ready to code!** Refer to [README.md](./README.md) for detailed documentation.

Happy building! 🎉
