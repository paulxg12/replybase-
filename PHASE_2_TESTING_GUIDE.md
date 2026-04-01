# Getting Started with Phase 2 Implementation

This guide walks you through setting up and testing the newly implemented critical path features.

## Prerequisites

- Node.js 20+
- pnpm (or npm)
- PostgreSQL 15 with pgvector extension
- Redis 7+
- OpenAI API key
- Stripe test keys
- Google OAuth credentials (optional for development)
- Resend API key (optional for email)

## Environment Setup

### 1. Backend API Environment (`.env`)

Create or update `apps/api/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/replybase

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe (get from https://dashboard.stripe.com/test/keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PLAN_STARTER_ID=price_...
STRIPE_PLAN_PROFESSIONAL_ID=price_...
STRIPE_PLAN_ENTERPRISE_ID=price_...

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=4000
NODE_ENV=development
```

### 2. Dashboard Environment (`.env.local`)

Create or update `apps/dashboard/.env.local`:

```env
# NextAuth
NEXTAUTH_SECRET=your-random-secret-key-here-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional, get from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Resend Email (optional, get from https://resend.com)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@example.com

# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Database Setup

```bash
# Navigate to packages/db
cd packages/db

# Push Prisma schema to database
pnpm db:push

# Generate Prisma client
pnpm generate
```

## Running the Application

### Terminal 1: Start PostgreSQL + Redis

```bash
# Using Docker Compose (recommended)
docker-compose up -d
```

### Terminal 2: Start API Server

```bash
cd apps/api
pnpm dev
# Should see: ✓ API server running on http://localhost:4000
```

### Terminal 3: Start Dashboard

```bash
cd apps/dashboard
pnpm dev
# Should see: ▲ Next.js running on http://localhost:3000
```

## Testing the Chat Endpoint

### 1. Create a Test Merchant

```bash
# Connect to PostgreSQL
psql postgresql://user:password@localhost:5432/replybase

# Insert test merchant
INSERT INTO public.merchant (
  id,
  "userId",
  "widgetPublicKey",
  "syncStatus",
  "shopifyDomain",
  "shopifyAccessToken",
  "gorgiasDomain",
  "gorgiiasApiToken"
) VALUES (
  'merchant-test-123',
  'user-test-123',
  'pk_test_abc123',
  'READY',
  'mystore.myshopify.com',
  'shpat_...',
  'mystore.gorgias.com',
  'gorgias_api_token_...'
);

-- Or run the migration that creates a seeded merchant
```

### 2. Test Public Chat Endpoint

```bash
curl -X POST http://localhost:4000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "merchantPublicKey": "pk_test_abc123",
    "visitorId": "visitor-123",
    "message": "What is your return policy?"
  }'

# Expected response:
# {
#   "ok": true,
#   "data": {
#     "reply": "Based on our knowledge base...",
#     "confidence": 0.87,
#     "escalated": false,
#     "sessionId": "session-...",
#     "sources": [...]
#   }
# }
```

### 3. Test WISMO Query

```bash
curl -X POST http://localhost:4000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "merchantPublicKey": "pk_test_abc123",
    "visitorId": "visitor-123",
    "message": "Where is my order?"
  }'

# Expected: Will attempt Shopify order lookup
```

## Testing tRPC Routes

### With Browser DevTools (Recommended)

1. Visit http://localhost:3000
2. Sign in with test credentials
3. Open browser console and run:

```javascript
// These work in dashboard because session is authenticated
const merchantStats = await fetch('/trpc/merchants.getStats?input={}').then(r => r.json());
console.log(merchantStats);
```

### With curl (Requires Session Token)

```bash
# 1. Create test user session (from NextAuth)
# This is complex - use browser method instead

# 2. Call tRPC with Bearer token
curl -X GET 'http://localhost:4000/trpc/merchants.getCurrent?input={}' \
  -H "Authorization: Bearer <JWT_TOKEN_HERE>"
```

## Testing BullMQ Sync Job

### 1. Create Test Tickets in Gorgias

```bash
# Use Gorgias API or dashboard to create test tickets
# They should appear when you trigger a sync
```

### 2. Trigger Sync from Dashboard

1. Navigate to http://localhost:3000/dashboard/sync (after sign-in)
2. Click "Trigger Sync" button
3. Watch sync status update in real-time

### 3. Monitor Sync Job in Redis

```bash
# Connect to Redis
redis-cli

# List active jobs
> KEYS bull:sync:*
> HGETALL bull:sync:1  # Job details
```

### 4. Verify Knowledge Chunks Created

```bash
# In PostgreSQL
SELECT COUNT(*) FROM knowledge_chunks WHERE "merchantId" = 'merchant-...';

# Should show chunks from synced tickets
```

## Testing Authentication

### NextAuth Sign-In

1. Visit http://localhost:3000/login
2. **Google OAuth**: Click "Sign In with Google"
3. **Email**: Enter email and click "Sign In" (email sent to console/Resend)

### Magic Link Email Testing

In development, Resend emails are logged to console. Check terminal output for email content.

## Debugging

### API Logs

The API logs all operations to stdout with structured format:

```
[2024-01-15T10:30:45.123Z] INFO: Authentication successful { userId: 'user-123', merchantId: 'merchant-123' }
[2024-01-15T10:30:46.456Z] INFO: Processing sync job { merchantId: 'merchant-123', syncJobId: 'sync-456' }
```

### Database Inspection

```bash
# View chat sessions
SELECT * FROM chat_session LIMIT 10;

# View knowledge chunks
SELECT id, "merchantId", content, "sourceType" FROM knowledge_chunks LIMIT 10;

# View sync jobs
SELECT * FROM sync_job ORDER BY "createdAt" DESC LIMIT 10;

# View sessions (NextAuth)
SELECT * FROM session;
```

### Redis Keys

```bash
redis-cli
> KEYS *              # All keys
> MONITOR             # Watch all commands
> HGETALL bull:sync:1 # Inspect job
```

## Performance Testing

### Load Test Chat Endpoint

```bash
# Using Apache Bench
ab -n 100 -c 10 \
  -T "application/json" \
  -p chat-payload.json \
  http://localhost:4000/chat

# payload: {
#   "merchantPublicKey": "pk_test_...",
#   "visitorId": "visitor-123",
#   "message": "Test query"
# }
```

## Troubleshooting

### Chat Endpoint Returns "Not Ready"

**Problem**: `{ "ok": false, "error": { "code": "MERCHANT_NOT_READY", "message": "..." } }`

**Solution**: 
- Ensure merchant `syncStatus` = "READY" in database
- Run sync job to populate knowledge base

### tRPC Returning 401 Unauthorized

**Problem**: tRPC calls fail with 401

**Solutions**:
- Ensure logged in (check session in browser: `localStorage.getItem('next-auth.session-token')`)
- Verify JWT token is valid
- Check `NEXTAUTH_SECRET` is set correctly

### BullMQ Jobs Not Processing

**Problem**: Sync jobs stuck in "pending"

**Solutions**:
- Verify Redis is running: `redis-cli ping` (should return `PONG`)
- Check API logs for worker initialization
- Restart API server: `pnpm dev`

### pgvector Search Returns Empty

**Problem**: `queryChunks()` returns no results

**Solutions**:
- Verify knowledge chunks exist: `SELECT COUNT(*) FROM knowledge_chunks;`
- Check chunk embeddings are valid: `SELECT id, embedding IS NOT NULL FROM knowledge_chunks LIMIT 1;`
- Lower similarity threshold temporarily to debug
- Ensure query embedding is generated correctly

### Stripe Integration Issues

**Problem**: Billing router returns errors

**Solutions**:
- Verify `STRIPE_SECRET_KEY` is set and valid
- Test with Stripe test mode keys (starts with `sk_test_`)
- Check plan IDs match your Stripe dashboard

## Next Steps After Testing

1. **Onboarding Pages**: Implement Shopify/Gorgias connection forms
2. **Knowledge Management**: Build knowledge chunk UI
3. **Widget Embed Code**: Generate embed code for customer stores
4. **Webhooks**: Implement Gorgias and Stripe webhooks
5. **Monitoring**: Set up Datadog APM and error tracking

## File Locations Reference

- **API Routes**: `apps/api/src/routes/`
- **tRPC Routers**: `apps/api/src/trpc/routers/`
- **NextAuth Config**: `apps/dashboard/app/api/auth/[...nextauth]/`
- **Dashboard Pages**: `apps/dashboard/app/(dashboard)/`
- **Database Schema**: `packages/db/prisma/schema.prisma`
- **RAG Service**: `packages/rag/src/`

## Git Workflow

```bash
# Stage changes
git add .

# Commit with phase marker
git commit -m "feat: Phase 2 implementation - RAG, Auth, tRPC, BullMQ"

# Push
git push origin main
```

---

For detailed architecture and implementation notes, see [PHASE_2_IMPLEMENTATION_SUMMARY.md](./PHASE_2_IMPLEMENTATION_SUMMARY.md).
