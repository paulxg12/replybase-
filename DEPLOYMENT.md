# 🚀 Replybase Deployment Guide

**Phase 4 Complete** - Free-tier MVP ready for production deployment

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Docker Deployment](#local-docker-deployment)
3. [Cloud Platform Options](#cloud-platform-options)
4. [Environment Configuration](#environment-configuration)
5. [Database Migrations](#database-migrations)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### ✅ Code Readiness
- [x] Phase 4 features complete (Settings, Error Boundary, Toasts, Notifications, API Keys)
- [x] Stripe removed - free tier only
- [x] All TypeScript types defined
- [x] Error handling implemented throughout
- [x] Zero payment processing

### ✅ Dependencies
- [x] Node.js 20+ required
- [x] PostgreSQL 15 with pgvector extension
- [x] Redis 7+ for caching
- [x] npm/pnpm for package management
- [x] Docker & Docker Compose (for containerized deployment)

### ✅ Secrets & API Keys Needed
Before deploying, gather:

1. **Authentication**
   - `NEXTAUTH_SECRET` - Random 32+ character string (generate: `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

2. **AI/Processing**
   - `OPENAI_API_KEY` - From OpenAI

3. **Storage**
   - `AWS_ACCESS_KEY_ID` - From AWS IAM
   - `AWS_SECRET_ACCESS_KEY` - From AWS IAM
   - `AWS_REGION` - e.g., `us-east-1`
   - `AWS_S3_BUCKET` - S3 bucket name

4. **Email**
   - `RESEND_API_KEY` - From Resend (or use alternative email service)

5. **Monitoring (Optional)**
   - `DD_API_KEY` - Datadog API key (monitoring)

6. **Encryption**
   - `ENCRYPTION_KEY` - Random 32+ character string for data encryption

---

## Local Docker Deployment

### Option 1: Docker Compose (Recommended for Quick Start)

**Requirements**: Docker & Docker Compose installed

```bash
# 1. Copy environment file
cp .env.example .env.prod

# 2. Edit .env.prod with production values
nano .env.prod

# 3. Build Docker images
docker-compose -f docker-compose.prod.yml build

# 4. Start all services
docker-compose -f docker-compose.prod.yml up -d

# 5. Run database migrations
docker-compose -f docker-compose.prod.yml exec api npm run db:push

# 6. Verify services
docker-compose -f docker-compose.prod.yml ps

# 7. View logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f dashboard
```

**Access Points**:
- Dashboard: http://localhost:3000
- API: http://localhost:4000
- Widget: http://localhost:5173

**Stopping Services**:
```bash
docker-compose -f docker-compose.prod.yml down
```

**Cleanup** (remove volumes):
```bash
docker-compose -f docker-compose.prod.yml down -v
```

### Option 2: Individual Docker Containers

```bash
# Build images
docker build -f Dockerfile.api -t replybase-api:latest .
docker build -f Dockerfile.dashboard -t replybase-dashboard:latest .
docker build -f Dockerfile.widget -t replybase-widget:latest .

# Run with custom networking
docker network create replybase

# Start PostgreSQL
docker run -d \
  --name replybase-postgres \
  --network replybase \
  -e POSTGRES_DB=replybase \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -v pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg15-latest

# Start Redis
docker run -d \
  --name replybase-redis \
  --network replybase \
  redis:7-alpine

# Start API
docker run -d \
  --name replybase-api \
  --network replybase \
  -p 4000:4000 \
  -e DATABASE_URL=postgresql://user:password@replybase-postgres:5432/replybase \
  -e REDIS_URL=redis://replybase-redis:6379 \
  # ... more env vars
  replybase-api:latest

# Start Dashboard
docker run -d \
  --name replybase-dashboard \
  --network replybase \
  -p 3000:3000 \
  -e NEXTAUTH_SECRET=your-secret \
  # ... more env vars
  replybase-dashboard:latest

# Start Widget
docker run -d \
  --name replybase-widget \
  --network replybase \
  -p 5173:5173 \
  replybase-widget:latest
```

---

## Cloud Platform Options

### Option A: Railway (Recommended - Easiest)

Railway handles scaling, networking, and environment management automatically.

**Steps**:
1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL plugin
4. Add Redis plugin
5. Add GitHub repo (or upload code)
6. Configure build & deploy settings
7. Set environment variables
8. Deploy

**Cost**: ~$5-20/month for small production

**Benefits**:
- Easy scaling
- Built-in database management
- GitHub integration
- Auto-deploys on push

### Option B: Vercel (Dashboard Only)

Vercel is optimized for Next.js frontend.

**Steps**:
1. Create account at [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Set build settings: Root Directory = `apps/dashboard`
4. Add environment variables
5. Deploy

**For API**: Need separate deployment (see Option A or C)

**Cost**: Free tier available, $20+/month for production

### Option C: AWS (Most Control)

**Components**:
- ECS/Fargate for containerized apps
- RDS for PostgreSQL
- ElastiCache for Redis
- ALB for load balancing
- Route53 for DNS

**Tools**: Use CloudFormation or Terraform for infrastructure

**Cost**: $50-200+/month depending on load

### Option D: Heroku (Legacy - Not Recommended)

Heroku's free tier is retired. Not cost-effective for this project anymore.

### Option E: Self-Hosted Server

Using DigitalOcean Droplet, Linode, or equivalent:

```bash
# 1. SSH into server
ssh root@your-server

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Clone project
git clone your-repo
cd replybase

# 4. Set up environment
cp .env.example .env.prod
sudo nano .env.prod  # Edit with production values

# 5. Deploy with docker-compose
sudo docker-compose -f docker-compose.prod.yml up -d

# 6. Set up SSL with Let's Encrypt
# Use Nginx as reverse proxy
```

**Cost**: $5-12/month for small server

---

## Environment Configuration

### Create Production .env File

```bash
cp .env.example .env.prod
```

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/replybase

# Redis
REDIS_URL=redis://host:6379

# Auth
NEXTAUTH_SECRET=<random-32-chars>
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>

# AI
OPENAI_API_KEY=<from-openai>

# Storage
AWS_ACCESS_KEY_ID=<from-aws>
AWS_SECRET_ACCESS_KEY=<from-aws>
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Email
RESEND_API_KEY=<from-resend>

# Encryption
ENCRYPTION_KEY=<random-32-chars>

# URLs
APP_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
WIDGET_URL=https://widget.yourdomain.com

# Monitoring (Optional)
DD_API_KEY=<from-datadog>
```

### Generate Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32

# Generate random database password
openssl rand -hex 32
```

---

## Database Migrations

### First-Time Setup

```bash
# Run Prisma migrations to create schema
npm run db:push
```

This will:
- Create Notification model
- Create ApiKey model
- Create all indexes
- Set up foreign keys

### Verify Schema

```bash
# Open Prisma Studio (if running locally)
npm run db:studio

# Or query to verify
psql -U user -d replybase -h localhost -c "\dt"
```

### Production Backup Strategy

```bash
# Backup database
pg_dump -U user -d replybase > replybase-backup-$(date +%Y%m%d).sql

# Schedule daily backups with cron
0 2 * * * pg_dump -U user -d replybase > /backups/replybase-$(date +\%Y\%m\%d).sql
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check API health
curl https://api.yourdomain.com/health

# Check Dashboard loads
curl https://yourdomain.com

# Check Widget loads
curl https://widget.yourdomain.com
```

### 2. Authentication Flow

1. Visit dashboard: https://yourdomain.com
2. Click "Sign in with Google"
3. Authorize application
4. Verify redirects to dashboard
5. Check user profile loads

### 3. Feature Testing

**Settings Page**:
- [ ] Navigate to Settings
- [ ] Verify account info displays
- [ ] Check API key is visible
- [ ] Test account deletion warning shows

**Notifications**:
- [ ] Bell icon appears in header
- [ ] Notifications load without errors
- [ ] Can mark as read

**API Keys**:
- [ ] Can generate new key
- [ ] Can copy key (one-time display)
- [ ] Can view usage metrics
- [ ] Can revoke key

**Error Handling**:
- [ ] Error boundary catches errors gracefully
- [ ] Toast notifications show on actions
- [ ] No console errors

### 4. Performance Checks

```bash
# Check response times
time curl https://api.yourdomain.com/health
time curl https://yourdomain.com

# Check database connections
# From inside container:
docker-compose exec postgres psql -U user -d replybase -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### 5. Integration Tests

If you've set up Shopify/Gorgias integrations:
- [ ] Test sync trigger
- [ ] Verify webhooks receive events
- [ ] Check data syncs correctly

---

## Monitoring & Maintenance

### Logging

**View Container Logs**:
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 api

# Export logs
docker-compose -f docker-compose.prod.yml logs > logs.txt
```

**Log Files** (if running without Docker):
- API: `apps/api/logs/`
- Dashboard: Depends on hosting platform
- System: `/var/log/`

### Database Monitoring

```bash
# Check active connections
psql -U user -d replybase -c "SELECT pid, usename, application_name, state FROM pg_stat_activity;"

# Check table sizes
psql -U user -d replybase -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size DESC;"

# Check slow queries (if configured)
psql -U user -d replybase -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Redis Monitoring

```bash
# Check Redis info
redis-cli INFO

# Monitor commands in real-time
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory
```

### Uptime Monitoring

**Set up external monitoring**:
- UptimeRobot (Free to $10/month)
- Datadog (Premium)
- CloudFlare

**Basic health checks**:
```bash
# Cron job to check status
0 */6 * * * curl -f https://yourdomain.com || send-alert

# Or use a monitoring service with webhook alerts
```

### Backups

**Automated Daily Backups**:
```bash
#!/bin/bash
# /usr/local/bin/backup-replybase.sh

BACKUP_DIR="/backups/replybase"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U user replybase > $BACKUP_DIR/db_$DATE.sql

# Backup S3 bucket (if large, use AWS CLI)
aws s3 sync s3://your-bucket $BACKUP_DIR/s3_$DATE/ --region us-east-1

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

# Compress old backups
gzip $BACKUP_DIR/*_*.sql 2>/dev/null || true

echo "Backup completed: $DATE" >> /var/log/replybase-backup.log
```

**Cron Schedule**:
```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-replybase.sh
```

### Updates & Patching

**Update Docker Images**:
```bash
# Pull latest base images
docker pull node:20-alpine
docker pull pgvector/pgvector:pg15-latest
docker pull redis:7-alpine

# Rebuild application images
docker-compose -f docker-compose.prod.yml build --no-cache

# Restart with new images
docker-compose -f docker-compose.prod.yml up -d
```

**Update Application Code**:
```bash
# Pull latest from git
git pull origin main

# Rebuild and redeploy
docker-compose -f docker-compose.prod.yml up -d --build

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### Scaling

**Horizontal Scaling** (Railway/AWS):
- Increase container replicas
- Add load balancer (ALB/NLB)
- Set up auto-scaling based on CPU/memory

**Vertical Scaling** (Self-hosted):
- Increase server resources (CPU, RAM, storage)
- Upgrade database instance
- Increase Redis cache pool

**Database Optimization**:
```bash
# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM conversations WHERE merchantId = '...';

# Create indexes on frequently queried columns
CREATE INDEX idx_conversations_merchantid ON conversations(merchantId);

# Vacuum to optimize storage
VACUUM ANALYZE;
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Common issues:
# 1. Environment variables missing - check .env file
# 2. Database not ready - wait for postgres healthcheck
# 3. Port in use - change port mapping
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U user -d replybase -c "SELECT 1"

# Check DATABASE_URL format
# Should be: postgresql://user:password@host:5432/db
```

### High Memory Usage

```bash
# Check process memory
docker stats replybase-api

# Analyze Node.js memory
# Add to container: node --inspect=0.0.0.0 app.js
# Use Chrome DevTools: chrome://inspect

# Reduce cache sizes
redis-cli CONFIG GET "maxmemory"
redis-cli CONFIG SET "maxmemory" "2gb"
```

### Slow Initial Load

```bash
# Check API response
time curl https://api.yourdomain.com

# Check database queries
# Enable Datadog APM for detailed tracing

# Potential fixes:
# 1. Add database indexes
# 2. Optimize Prisma queries
# 3. Enable Redis caching
# 4. Increase server resources
```

---

## Next Steps

After deployment:

1. **Invite Beta Testers**
   - Share dashboard link
   - Collect feedback
   - Monitor for errors

2. **Set Up Monitoring**
   - Configure Datadog/similar
   - Set up alert rules
   - Track key metrics

3. **Plan Phase 5**
   - Stripe payment processing
   - Premium plan features
   - Analytics dashboard

4. **Gather Metrics**
   - User signup rate
   - Feature usage
   - Performance metrics
   - Error rates

---

## Support

For issues:
1. Check logs: `docker-compose logs service-name`
2. Review this guide's troubleshooting section
3. Check GitHub issues
4. Contact: support@replybase.com

**Happy Deploying! 🚀**
