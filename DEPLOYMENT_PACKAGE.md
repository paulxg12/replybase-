# 📦 Phase 4 Deployment Package

**Status**: Ready for Production ✅

This package contains everything needed to deploy Replybase Phase 4 to production.

---

## What's Included

### 🐳 Docker Configuration
- **Dockerfile.api** - Express API production image
- **Dockerfile.dashboard** - Next.js dashboard production image  
- **Dockerfile.widget** - Vite widget production image
- **docker-compose.prod.yml** - Production orchestration (PostgreSQL, Redis, all services)
- **.dockerignore** - Optimizes Docker build context

### 🚀 Deployment Automation
- **deploy.sh** - One-command deployment script (Linux/Mac)
- **DEPLOYMENT.md** - Complete deployment guide (200+ steps)
- **vercel.json** - Deploy dashboard to Vercel
- **railway.json** - Deploy entire stack to Railway

### 📋 Configuration
- **.env.example** - Environment variables template (already exists)
- **.env.prod** - Production environment (create from template)

---

## Quick Start (5 minutes)

### Requirements
- Docker & Docker Compose installed
- 30+ required environment variables (see below)

### Deploy to Local Docker

```bash
# Step 1: Create production environment file
cp .env.example .env.prod
nano .env.prod  # Fill in all variables

# Step 2: Run deployment script
chmod +x deploy.sh
./deploy.sh

# Step 3: Access services
# Dashboard: http://localhost:3000
# API:       http://localhost:4000
# Widget:    http://localhost:5173
```

---

## Environment Variables Needed

### Critical (Required for Deployment)
```
DATABASE_URL             PostgreSQL connection string
REDIS_URL               Redis connection string
NEXTAUTH_SECRET         Random 32+ char string: openssl rand -base64 32
ENCRYPTION_KEY          Random 32+ char string: openssl rand -base64 32
```

### Authentication (Google OAuth)
```
GOOGLE_CLIENT_ID        From Google Cloud Console
GOOGLE_CLIENT_SECRET    From Google Cloud Console
NEXTAUTH_URL            https://yourdomain.com
```

### AI/Processing
```
OPENAI_API_KEY          From OpenAI dashboard
```

### File Storage (AWS S3)
```
AWS_ACCESS_KEY_ID       From AWS IAM
AWS_SECRET_ACCESS_KEY   From AWS IAM
AWS_REGION              e.g., us-east-1
AWS_S3_BUCKET           Your S3 bucket name
```

### Email Service
```
RESEND_API_KEY          From Resend (or alternative)
```

### Monitoring (Optional)
```
DD_API_KEY              From Datadog (optional monitoring)
```

### URLs
```
APP_URL                 https://yourdomain.com
API_URL                 https://api.yourdomain.com
WIDGET_URL              https://widget.yourdomain.com
```

---

## Deployment Options

### Option 1: Docker Compose (Local Server)
**Best for**: Small deployments, full control, self-hosted

```bash
./deploy.sh
```

**Requirements**: Server with Docker
**Cost**: $5-50/month of hosting
**Pros**: Full control, simple, reliable
**Cons**: Manual monitoring, backups, updates

### Option 2: Railway (Recommended)
**Best for**: Quick deployment, professional hosting, scaling

Go to [Railway.app](https://railway.app):
1. Create account
2. Create project
3. Add PostgreSQL plugin
4. Add Redis plugin
5. Connect GitHub repo
6. Deploy

**Cost**: Pay-as-you-go (~$20-50/month typical)
**Setup time**: 10 minutes
**Pros**: Auto-scaling, managed DB, GitHub integration, built-in monitoring
**Cons**: Vendor lock-in

### Option 3: Vercel + Separate API
**Best for**: Next.js optimization, minimum cost

```bash
# Dashboard to Vercel
npm install -g vercel
cd apps/dashboard
vercel --prod

# API & services to Railway/Docker
# Follow "Option 2" for API + database
```

**Cost**: $0-20/month (Vercel free tier available)
**Setup time**: 15 minutes
**Pros**: Vercel's Next.js optimization, free tier
**Cons**: Split deployment, complex setup

### Option 4: AWS (Enterprise)
**Best for**: Enterprise requirements, maximum control, compliance

Use CloudFormation to deploy:
- ECS Fargate for containers
- RDS for PostgreSQL
- ElastiCache for Redis
- ALB for load balancing

**Cost**: $100-500+/month
**Setup time**: 1-2 hours
**Pros**: Highly scalable, deep integration, compliance-ready
**Cons**: Complex, expensive initial setup

---

## Deployment Checklist

### Pre-Deployment
- [ ] All 6 Phase 4 features built and tested
- [ ] All Stripe code removed
- [ ] Environment variables gathered
- [ ] SSL/TLS certificates ready (for domain)
- [ ] Domain DNS configured
- [ ] Database backups strategy planned

### Deployment
- [ ] Build passes without errors
- [ ] All containers start successfully
- [ ] Database migrations run
- [ ] Health checks pass
- [ ] Services communicate correctly

### Post-Deployment
- [ ] Dashboard accessible (http://domain:3000)
- [ ] API responds to requests (http://domain:4000)
- [ ] Authentication works (Google OAuth)
- [ ] Features verified (settings, notifications, API keys)
- [ ] Monitoring enabled
- [ ] Backup scheduled
- [ ] Error tracking configured

---

## Service Architecture

```
┌─────────────────────────────────────────┐
│       End Users / Browsers              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Nginx/Reverse Proxy                   │
│   (ssl, routing, rate limiting)         │
└─────────────────────────────────────────┘
        ↙                   ↘
┌──────────────────┐    ┌──────────────────┐
│   Dashboard      │    │   Widget         │
│   (Next.js:3000) │    │   (Vite:5173)   │
│   • Settings     │    │ • Chat UI       │
│   • Billing      │    │ • Merchant only │
│   • Management   │    │                  │
└──────────────────┘    └──────────────────┘
        ↓                       ↓
┌─────────────────────────────────────────┐
│   API Server (Express:4000)             │
│   • tRPC procedures                     │
│   • Database queries                    │
│   • Authentication                      │
│   • File uploads                        │
└─────────────────────────────────────────┘
        ↙                   ↘
┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL     │    │   Redis          │
│   (Port 5432)    │    │   (Port 6379)   │
│   • Merchants    │    │ • Sessions      │
│   • Data models  │    │ • Caching       │
│   • Vectors      │    │ • Jobs          │
└──────────────────┘    └──────────────────┘
```

---

## Performance Expectations

### Baseline (Free Tier)
- Concurrent users: 100
- Sync frequency: Weekly
- API rate limit: 1,000 req/hr per key
- Storage: Unlimited (S3-limited)
- Conversations: Unlimited

### Resource Usage
- API container: 512MB RAM
- Dashboard container: 256MB RAM
- PostgreSQL: 1GB RAM recommended
- Redis: 256MB RAM recommended
- **Total**: ~2GB RAM minimum

---

## Monitoring & Alerts

### Health Checks Built-In
- API: `/health` endpoint every 30s
- Dashboard: Root path every 30s  
- Widget: Root path every 30s
- PostgreSQL: Database connectivity
- Redis: Connection test

### Recommended Monitoring Services
1. **Datadog** (Premium) - Full APM
2. **Sentry** (Free tier) - Error tracking
3. **UptimeRobot** (Free) - Uptime monitoring
4. **Cloudflare** (Free tier) - Analytics & DDoS

---

## Files Created for Deployment

```
replybase/
├── Dockerfile.api              ← API container
├── Dockerfile.dashboard        ← Dashboard container
├── Dockerfile.widget           ← Widget container
├── docker-compose.prod.yml     ← Production orchestration
├── .dockerignore               ← Docker build optimization
├── deploy.sh                   ← Deployment automation
├── DEPLOYMENT.md               ← Full guide (200+ lines)
├── vercel.json                 ← Vercel config
├── railway.json                ← Railway config
└── DEPLOYMENT_PACKAGE.md       ← This file
```

---

## Troubleshooting

### "Connection refused" errors
**Cause**: Services haven't started yet
**Fix**: Wait 30 seconds and check `docker-compose ps`

### "Database migration failed"  
**Cause**: PostgreSQL not ready
**Fix**: Check postgres service health, ensure DATABASE_URL is correct

### "Out of memory" errors
**Cause**: Container limits too low
**Fix**: Increase Docker memory limits (Dashboard settings)

### "Port already in use"
**Cause**: Service running on same port
**Fix**: Change port in docker-compose.prod.yml or stop other services

### High CPU/Memory after deployment
**Cause**: Unoptimized queries or memory leak
**Fix**: 
1. Check application logs
2. Run database query analysis
3. Add database indexes
4. Increase container limits

See **DEPLOYMENT.md** for detailed troubleshooting.

---

## Next Steps

1. **Gather Environment Variables** (30 min)
   - Google OAuth credentials
   - OpenAI API key
   - AWS S3 credentials
   - Etc.

2. **Deploy** (10 min)
   - Run `./deploy.sh`
   - Verify all services running

3. **Configure Domain** (15 min)
   - Point domain DNS to server
   - Set up SSL certificate
   - Configure firewall

4. **Test Features** (30 min)
   - Sign in with Google
   - Test all dashboard pages
   - Verify notifications work
   - Test API keys

5. **Set Up Monitoring** (20 min)
   - Enable Datadog
   - Configure backups
   - Set up alerts

6. **Beta Testing** (ongoing)
   - Invite early users
   - Collect feedback
   - Monitor errors

---

## Support

**Questions about deployment?**
- Check `DEPLOYMENT.md` (comprehensive guide)
- Review logs: `docker-compose logs service-name`
- Check this checklist

**Issues?**
1. Read troubleshooting section above
2. Review DEPLOYMENT.md
3. Check Docker/Docker Compose docs
4. Contact support@replybase.com

---

## Summary

✅ **Phase 4 Complete**
- 6 features fully implemented
- Stripe completely removed
- Free-tier MVP ready
- Production deployment packaged

✅ **Ready to Deploy**
- Multiple deployment options (Docker, Railway, AWS, Vercel)
- Environment templates configured
- Health checks built-in
- Monitoring guides included

**Total deployment time**: 15-30 minutes
**Total setup time**: 1-2 hours (including environment variable gathering)

**Go live today! 🚀**
