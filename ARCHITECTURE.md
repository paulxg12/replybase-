# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHOPIFY MERCHANT STORE                      │
│  Widget Loader: <script src="cdn.replybase.ai/widget.js"></script>
└────────────────────────────┬────────────────────────────────────┘
                             │
                   Chat Widget (50KB)
                  ┌──────────────────┐
                  │ Floating Button   │
                  │ Chat Panel        │
                  │ Message History   │
                  │ (LocalStorage)    │
                  └────────┬──────────┘
                           │ POST /chat
                           │ (public, rate-limited)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REPLYBASE INFRASTRUCTURE                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               API SERVER (Node.js + Express)              │ │
│  │                                                            │ │
│  │  Routes:                                                 │ │
│  │  ├─ POST /chat             (RAG inference)             │ │
│  │  ├─ GET  /widget/:pk/config (widget config)            │ │
│  │  ├─ GET  /health           (status check)              │ │
│  │  └─ POST /gorgias/test-conn (credential validation)    │ │
│  │                                                            │ │
│  │  Services:                                               │ │
│  │  ├─ RAG Pipeline (embed, search, generate)             │ │
│  │  ├─ Gorgias Integration (ticket ingestion)             │ │
│  │  ├─ Shopify Integration (WISMO detection)              │ │
│  │  └─ BullMQ Job Queue (weekly sync)                     │ │
│  └────────┬─────────────────────────────────┬──────────────┘ │
│           │                                 │                 │
│           │ SQL                             │ Job Queue       │
│           ▼                                 ▼                 │
│  ┌──────────────────────┐      ┌──────────────────────┐     │
│  │  PostgreSQL 15       │      │    Redis 7           │     │
│  │  + pgvector          │      │ (BullMQ Queue)       │     │
│  │                      │      │                      │     │
│  │ Tables:              │      │ Weekly Sync Job:    │     │
│  │ ├─ users             │      │ ├─ Fetch Gorgias    │     │
│  │ ├─ merchants         │      │ ├─ Fetch Website    │     │
│  │ ├─ tickets           │      │ └─ Embed & Upsert   │     │
│  │ ├─ knowledge_chunks  │      │                      │     │
│  │ ├─ chat_sessions     │      │ Rate Limited:       │     │
│  │ ├─ sync_jobs         │      │ 40 req/min (Gorgias)│     │
│  │ └─ subscriptions     │      │                      │     │
│  │                      │      │                      │     │
│  │ Indexes:             │      │                      │     │
│  │ ├─ embedding search  │      │                      │     │
│  │ ├─ merchant_id       │      │                      │     │
│  │ └─ created_at        │      │                      │     │
│  └──────────────────────┘      └──────────────────────┘     │
│           ▲                                                   │
│           │ Queries & Upserts                                │
│  ┌────────┴─────────────────────────────────────────────┐    │
│  │        OpenAI API (Async Calls)                      │    │
│  │                                                       │    │
│  │  ├─ text-embedding-3-small (1536D, 1000 TPM)      │    │
│  │  │  └─ Called during: sync, chat queries          │    │
│  │  │                                                  │    │
│  │  └─ gpt-4o (200 RPM, auto-retry)                  │    │
│  │     └─ Called during: chat inference              │    │
│  └───────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
                           ▲
                           │
           ┌───────────────┼────────────────┐
           │               │                │
           │ OAuth         │ API Sync       │ Webhook
           │ (Shopify)     │ (Gorgias)      │ (Stripe)
           ▼               ▼                ▼
    Shopify Store     Gorgias Account   Stripe
```

## Data Flow: Chat Inference

```
User Message
    │
    ▼
┌─────────────────────┐
│ 1. Lookup Merchant  │  (by widgetPublicKey)
│    & Validate       │  Check syncStatus = READY
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 2. WISMO Detection                      │
│    ├─ Regex: "order", "where", "when"  │
│    └─ If matched → Query Shopify API    │
│       Return order status directly      │
└──────────┬──────────────────────────────┘
           │ (if not WISMO)
           ▼
┌─────────────────────────────────────────┐
│ 3. Embed User Query                     │
│    └─ OpenAI text-embedding-3-small    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ 4. Vector Search (pgvector)                          │
│    SELECT * FROM knowledge_chunks                    │
│    WHERE merchant_id = $1                            │
│    ORDER BY embedding <=> $2 (cosine sim)            │
│    LIMIT 6                                           │
│                                                      │
│    Filter by similarity ≥ 0.45                       │
│    └─ If < 0.45: escalated = true                   │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ 5. Build Prompt                                      │
│    ├─ System: Brand voice + RAG instructions        │
│    ├─ Context: Top-5 chunks (formatted)             │
│    ├─ History: Last 6 messages from session         │
│    └─ User: Current message                         │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ 6. LLM Generation                                    │
│    └─ OpenAI gpt-4o                                 │
│       temperature: 0.3, max_tokens: 500             │
│       timeout: 30s, retry on 429                    │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ 7. Post-Processing                                  │
│    ├─ Calculate confidence (avg of similarities)    │
│    ├─ If escalated: append escalation message       │
│    ├─ Save to chat_sessions                         │
│    └─ Persist in localStorage (client)              │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
    Response to Widget
    └─ { reply, confidence, escalated, sessionId, sources }
```

## Database Schema Relationships

```
user (1) ──────> (many) merchant
         accounts
         sessions

merchant (1) ──────> (many) ticket
         (1) ──────> (many) knowledge_chunk
         (1) ──────> (many) sync_job
         (1) ──────> (1)    subscription
         (1) ──────> (many) chat_session

ticket (many) --> (1) merchant

knowledge_chunk (many) --> (1) merchant
                  Fields: content, embedding, sourceType, sourceId

chat_session (many) --> (1) merchant
                  Fields: messages (JSON array), escalated bool

sync_job (many) --> (1) merchant
          enum SyncType: INITIAL_TICKETS, WEEKLY_TICKETS, WEBSITE_CRAWL
          enum JobStatus: PENDING, RUNNING, COMPLETED, FAILED

subscription (1) --> (1) merchant
         Fields: stripeCustomerId, status, planId, currentPeriodEnd
```

## Weekly Sync Workflow

```
BullMQ Repeating Job (Sunday 2am UTC)
│
├─ Get all merchants where syncStatus = READY
│
└─ For each merchant (max concurrency: 5):
   │
   ├─ 1. TICKET SYNC
   │    ├─ Gorgias API: fetch tickets since lastSyncedAt
   │    ├─ For each ticket:
   │    │  ├─ Extract main agent reply
   │    │  ├─ Chunk by sentence boundaries (max 800 tokens)
   │    │  └─ Upsert to knowledge_chunks with TICKET source
   │    ├─ Rate limit: 40 req/min (Gorgias free tier)
   │    └─ Update merchant.lastSyncedAt = now()
   │
   ├─ 2. WEBSITE CRAWL
   │    ├─ Crawl: homepage, /faq, /returns, /shipping
   │    ├─ Diff against prev snapshot (stored in S3)
   │    ├─ Only re-embed changed content
   │    ├─ Upsert chunks with WEBSITE_CRAWL source
   │    └─ Save new snapshot to S3
   │
   └─ 3. LOG & NOTIFY
        ├─ Update sync_job status = COMPLETED
        ├─ Log to Datadog
        └─ Send email if failed (via Resend)
```

## Authentication Flow

```
User lands on dashboard
│
├──► Not logged in?
│    └─► Redirect to /login
│        ├─ Google OAuth: redirects to Google, then /api/auth/callback/google
│        └─ Magic Link: email sent via Resend, click link
│
└──► Logged in?
     └─► Pull session from NextAuth
         ├─ Get user + merchant data (if onboarded)
         ├─ JWT token generated for API requests
         └─ All protected API routes validate "Authorization: Bearer <token>"

Session Storage:
├─ Frontend: NextAuth session store (httpOnly cookie)
├─ Backend: Redis (BullMQ job context)
└─ Database: No session table (stateless JWT)
```

## Error Handling Strategy

```
API Error Response:
{
  "ok": false,
  "error": {
    "code": "MERCHANT_NOT_FOUND",
    "message": "Merchant not found",
    "details": { ... }  // Optional, for validation errors
  }
}

Error Codes:
├─ INVALID_INPUT         (400)
├─ UNAUTHORIZED          (401)
├─ MERCHANT_NOT_FOUND    (404)
├─ MERCHANT_NOT_READY    (503)
├─ INVALID_CREDENTIALS   (401)
├─ SERVICE_UNAVAILABLE   (503)
└─ ERROR                 (500, generic)

Frontend handling:
├─ Display toast.error(message) for user-facing errors
├─ Validation errors shown inline on form fields
├─ 5xx errors: show generic "something went wrong" + retry button
└─ Never expose stack traces or internal error details
```

## Deployment Architecture

```
Production Environment:
│
├─ Web: Vercel (Next.js Dashboard)
│   ├─ Auto-deploy from main branch
│   ├─ Environment variables: secret in Vercel dashboard
│   └─ Database: managed PostgreSQL (Supabase / AWS RDS / Neon)
│
├─ API: Cloud Run (Docker) or EC2
│   ├─ Containerized Node.js app
│   ├─ Load balanced, auto-scaling
│   └─ Database: shared RDS instance
│
├─ Database: managed PostgreSQL with pgvector
│   ├─ Regular backups (daily)
│   ├─ WAL archiving to S3
│   └─ Replicas for failover
│
├─ Redis: Elasticache (AWS) or Upstash
│   ├─2 nodes (primary + replica)
│   ├─ Automatic failover
│   └─ For BullMQ job queue
│
├─ Storage: AWS S3
│   ├─ Ticket attachments
│   ├─ Website crawl snapshots
│   └─ Versioning enabled
│
├─ Monitoring: Datadog
│   ├─ APM tracing
│   ├─ Error tracking
│   ├─ Custom metrics (deflection rate, confidence, etc.)
│   └─ Alerts on P95 latency, error rate
│
└─ CDN: CloudFront (for widget.js)
    ├─ Cached at edge
    └─ Gzipped (< 50KB)
```

---

For more detail, see individual app READMEs:
- [API](/apps/api/README.md)
- [Dashboard](/apps/dashboard/README.md)
- [Widget](/apps/widget/README.md)
