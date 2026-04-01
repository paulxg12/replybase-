# Replybase

The chatbot that learns from your support history and updates itself — forever.

An AI-powered customer support chatbot for Shopify merchants that:
- Reads your last 12 months of resolved Gorgias support tickets
- Builds a RAG pipeline from ticket history to learn brand voice and real answers
- Deploys a chat widget on your Shopify store
- Auto-updates its knowledge base weekly by re-crawling your site and ingesting new tickets
- Automatically answers WISMO ("Where Is My Order?") questions via Shopify Orders API
- Gracefully escalates low-confidence queries to human agents

## 🚀 Phase 4 - Ready for Deployment

**Status**: Phase 4 Complete ✅
- 6 Core Features Implemented
- Stripe Removed (Free Tier MVP)
- Production Docker Setup Ready

**Deployment Options**:
- 🐳 [Docker Compose](./DEPLOYMENT.md#local-docker-deployment) - Self-hosted
- 🚂 [Railway](./DEPLOYMENT.md#option-a-railway-recommended---easiest) - Managed platform (recommended)
- ▲ [Vercel](./DEPLOYMENT.md#option-b-vercel-dashboard-only) - Frontend only
- ☁️ [AWS](./DEPLOYMENT.md#option-c-aws-most-control) - Full control

**Quick Deploy**:
```bash
cp .env.example .env.prod
nano .env.prod  # Fill in environment variables
./deploy.sh     # One-command deployment
```

📖 **See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide** | [Quick Package Info](./DEPLOYMENT_PACKAGE.md)

---

## Project Structure

```
replybase/
├── apps/
│   ├── api/              # Node.js + Express REST backend
│   ├── dashboard/        # Next.js 14 merchant dashboard
│   └── widget/           # Embeddable vanilla TypeScript chat widget
├── packages/
│   ├── config/           # Shared TypeScript, ESLint, Tailwind configs
│   ├── db/               # Prisma schema + generated client
│   ├── ui/               # React component library (shadcn/ui base)
│   ├── gorgias/          # Gorgias API client + sync logic
│   ├── shopify/          # Shopify API client (orders, products, etc.)
│   └── rag/              # RAG pipeline (embeddings, vector search, LLM)
├── docker-compose.yml    # PostgreSQL 15 with pgvector + Redis
├── pnpm-workspace.yaml   # Monorepo configuration
├── turbo.json            # Build orchestration config
└── README.md             # This file
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| **Components** | shadcn/ui base + custom design tokens |
| **Backend** | Node.js 20 + Express 5 |
| **Database** | PostgreSQL 15 with pgvector extension |
| **Vector Search** | pgvector (same PostgreSQL instance) |
| **Auth** | NextAuth.js v5 (Google OAuth + magic link) |
| **AI / LLM** | OpenAI (`text-embedding-3-small` + `gpt-4o`) |
| **Job Queue** | BullMQ + Redis |
| **Payments** | Phase 5 (Stripe integration planned) |
| **Email** | Resend (transactional) |
| **Storage** | AWS S3 (file attachments, crawl snapshots) |
| **Chat Widget** | Vanilla TypeScript (Vite IIFE bundle) |
| **Build Tool** | Turborepo (monorepo build orchestration) |

## Getting Started

### Prerequisites

- Node.js 20+ (use `nvm` to manage versions)
- pnpm 8.15+ (`npm install -g pnpm`)
- Docker & Docker Compose (for PostgreSQL + Redis)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd "REPLY BASE"
   pnpm install
   ```

2. **Start the database and cache layer:**
   ```bash
   docker-compose up -d
   ```

   This starts:
   - PostgreSQL 15 with pgvector on `localhost:5432`
   - Redis on `localhost:6379`

3. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then fill in all required values:
   - `DATABASE_URL` (already set to local PostgreSQL)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `OPENAI_API_KEY` (from OpenAI dashboard)
   - `STRIPE_*` keys (from Stripe dashboard)
   - etc.

4. **Initialize the database:**
   ```bash
   pnpm db:push
   ```

5. **Start development servers:**
   ```bash
   pnpm dev
   ```

   This starts all apps in parallel:
   - **API**: http://localhost:4000
   - **Dashboard**: http://localhost:3000
   - **Widget dev**: http://localhost:5173 (Vite)

## Environment Variables

See `.env.example` for the complete list. Critical variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - JWT secret (min 32 chars)
- `OPENAI_API_KEY` - OpenAI API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `ENCRYPTION_KEY` - 32-byte hex string for credential encryption (`openssl rand -hex 32`)

## Database

### Migrations

Create and apply migrations:
```bash
pnpm db:migrate
```

Reset database (development only):
```bash
rm prisma/dev.db
pnpm db:push
```

### Studio (GUI)

Browse database in the Prisma Studio GUI:
```bash
pnpm db:studio
```

Opens at http://localhost:5555

## API

### Core Endpoints

- `GET /health` - Health check
- `POST /chat` - Chat inference endpoint (public, rate-limited)
- `GET /widget/:publicKey/config` - Widget configuration (public)
- `POST /gorgias/test-connection` - Validate Gorgias credentials

### Request/Response Format

All responses follow a consistent shape:

**Success:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

## Dashboard

### Routes

**Auth:**
- `/login` - Email sign-in
- `/(auth)/onboarding/connect-shopify` - OAuth setup
- `/(auth)/onboarding/connect-gorgias` - API credentials setup
- `/(auth)/onboarding/initial-sync` - Sync progress polling

**Dashboard (protected):**
- `/overview` - Key metrics & recent conversations
- `/conversations` - Chat session history with filtering
- `/conversations/[id]` - Individual conversation thread viewer
- `/knowledge` - Knowledge base browser & management
- `/widget` - Widget config & embed code snippet
- `/sync` - Sync history & manual trigger
- `/settings/...` - Account, integrations, billing

## Widget

### Installation

Embed in any Shopify store with 2 lines:

```html
<script>
  window.ReplybaseConfig = { publicKey: "YOUR_PUBLIC_KEY" };
</script>
<script src="https://cdn.replybase.ai/widget.js" async></script>
```

### Configuration

```js
window.ReplybaseConfig = {
  publicKey: "...",
  position: "bottom-right",        // or "bottom-left"
  primaryColor: "#4F6EF7",          // brand color
  greeting: "Hi! How can we help?", // greeting message
  avatarUrl: "https://..."          // optional avatar image
};
```

## Code Quality

### Rules Enforced

- **TypeScript strict mode** - no implicit `any` types
- **No `console.log`** - use the structured logger
- **Input validation** - every API input validated with zod
- **Error handling** - try/catch on all async operations
- **No magic strings** - use enums and `as const`
- **Component structure** - one component per file
- **Response consistency** - all APIs use `apiSuccess()` and `apiError()` helpers

### Linting & Type Checking

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Build all packages
pnpm build
```

## Deployment

### Docker

Build and run production image:

```bash
docker build -t replybase .
docker run -p 3000:3000 -p 4000:4000 --env-file .env replybase
```

### Environment-Specific Configuration

- **Development**: `NODE_ENV=development` (verbose logging, hot reload)
- **Production**: `NODE_ENV=production` (minimal logs, optimized builds)

Use appropriate environment files (`.env.production`, etc.).

## Third-Party Integrations

### Gorgias (required)

Fetch resolved support tickets for RAG training:
- Subdomain (e.g., `mystore.gorgias.com`)
- API credentials (email + API key)

Synced weekly by default.

### Shopify (required)

- OAuth app installed on merchant's store
- Read access to Orders API (for WISMO detection)
- Product metadata indexing (optional, improves knowledge quality)

### Stripe (payments)

Three plans (prices configured in `.env`):
- **Starter**: $99/mo, 500 chats
- **Growth**: $249/mo, 2,000 chats
- **Scale**: $499/mo, unlimited

Webhook handler validates checksums before processing subscription events.

### AWS S3 (optional)

Store large attachments and crawl snapshots. Requires:
- Access key ID
- Secret access key
- Bucket name
- Region

### Resend (transactional email)

Send password reset, subscription notifications, etc.

## Architecture

### RAG Pipeline

1. **Ingestion**: Fetch resolved tickets from Gorgias
2. **Chunking**: Split by sentence boundaries, max 800 tokens per chunk
3. **Embedding**: Use OpenAI `text-embedding-3-small` (1536 dimensions)
4. **Vector Storage**: pgvector (PostgreSQL similarity search)
5. **Retrieval**: Cosine similarity search on user query embedding
6. **Generation**: Feed top-K chunks + conversation history to `gpt-4o`
7. **Confidence Scoring**: Based on retrieval similarity scores

### WISMO Detection

On incoming chat:
1. Regex check for keywords: "order", "where", "when", "status", etc.
2. If matched, query Shopify Orders API by customer email
3. Return order status directly (skip RAG pipeline)

### Weekly Sync Job

BullMQ repeatable job (every Sunday 2am UTC):

```
For each merchant with syncStatus = READY:
  1. Fetch tickets created since `lastSyncedAt`
  2. Chunk & embed new tickets
  3. Crawl merchant's site (homepage, FAQ, returns policy)
  4. Diff against previous crawl — only re-embed changed content
  5. Update `lastSyncedAt` timestamp
```

## Troubleshooting

### Database Connection Fails

1. Check Docker is running: `docker ps`
2. Verify PostgreSQL is healthy: `docker logs replybase-postgres`
3. Check `DATABASE_URL` in `.env` matches your setup
4. Reset: `docker-compose down && docker-compose up -d`

### Port Already in Use

- API (4000): `lsof -i :4000 | grep LISTEN` to find process
- Dashboard (3000): `lsof -i :3000 | grep LISTEN`
- Kill: `kill -9 <PID>`

### Missing Environment Variables

Run `pnpm dev` — the app will print which vars are missing and exit.

### OpenAI API Errors

- Check API key is valid and has quota
- Rate limits: 3,500 RPM (text-embedding-3-small), 200 RPM (gpt-4o)
- Retry with exponential backoff (implemented in LLMService)

## Contributing

1. Follow the rules in **Code Quality** section
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit with descriptive messages
4. Push and open a PR
5. All tests must pass before merge

## License

MIT

## Support

For issues, email support@replybase.ai or check the docs at https://docs.replybase.ai
