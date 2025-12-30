# Scaling Roadmap

## Overview

This document provides guidance on when and how to scale Depo-Pro infrastructure as the platform grows.

---

## Current Architecture (Phase 8)

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Edge                          │
│                    (Serverless Functions)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Supabase   │   │  Deepgram   │   │  In-Memory  │
│ (PostgreSQL)│   │   (AI API)  │   │  (Cache/    │
│ + Storage   │   │             │   │   Queue)    │
└─────────────┘   └─────────────┘   └─────────────┘
```

**Current Limits:**
- Single Supabase instance
- In-memory caching (per-instance)
- In-memory job queue
- No read replicas
- No dedicated compute

---

## Scaling Triggers & Actions

### Trigger 1: When to Add Redis

**Add Redis When:**
- [ ] Multiple Vercel instances need shared state
- [ ] Cache hit rate drops below 70%
- [ ] Rate limiting needs cross-instance coordination
- [ ] Job queue needs persistence across deploys
- [ ] Session storage outgrows JWT

**Metrics to Watch:**
- Dashboard response time > 500ms
- Cache miss rate > 30%
- Rate limit bypasses detected
- Job queue losing state on redeploy

**Implementation:**
```bash
# 1. Sign up for Upstash Redis
# 2. Add environment variables
REDIS_ENABLED=true
REDIS_URL=redis://...

# 3. Update lib/cache/index.ts
# 4. Update lib/jobs/queue.ts
# 5. Update lib/rate-limit-service.ts
```

**Estimated Cost:**
- Upstash Free: 10,000 commands/day
- Upstash Pay-as-you-go: ~$0.20/100K commands
- Upstash Pro: $10/month for 100K commands/day

---

### Trigger 2: When to Add Read Replicas

**Add Read Replicas When:**
- [ ] Database CPU consistently > 70%
- [ ] Read query latency > 100ms P95
- [ ] Write contention causing locks
- [ ] Reporting queries impacting production

**Metrics to Watch:**
- Supabase database CPU
- Query execution times
- Connection pool exhaustion
- Lock wait times

**Implementation:**
```
1. Enable read replicas in Supabase (Pro plan required)
2. Configure connection strings:
   - DATABASE_URL (write)
   - DATABASE_URL_REPLICA (read)
3. Update Prisma client configuration
4. Route read-heavy queries to replica
```

**Estimated Cost:**
- Supabase Pro with replica: $25/month base + usage
- Additional compute: ~$25-100/month

---

### Trigger 3: When to Externalize Job Queue

**Externalize Queue When:**
- [ ] Job processing delays > 5 minutes
- [ ] Jobs lost during deploys
- [ ] Need job prioritization
- [ ] Need job scheduling (cron)
- [ ] Need guaranteed delivery

**Metrics to Watch:**
- Job queue depth
- Job processing time
- Failed job rate
- Job retry frequency

**Options:**

**Option A: Vercel Queue (Recommended)**
```bash
# Built-in, no additional infra
# Good for simple queues
vercel.json:
{
  "crons": [...]
}
```

**Option B: Inngest**
```bash
# Event-driven, great DX
npm install inngest
# $25/month for 25K function runs
```

**Option C: Trigger.dev**
```bash
# Long-running jobs
npm install @trigger.dev/sdk
# $20/month for 10K runs
```

**Option D: BullMQ + Redis**
```bash
# Maximum control
npm install bullmq
# Requires Redis ($10-50/month)
```

---

### Trigger 4: When to Shard by Firm

**Consider Sharding When:**
- [ ] Single firm uses > 30% of resources
- [ ] Firm isolation is legally required
- [ ] Database size > 100GB
- [ ] Compliance requires geographic isolation

**Metrics to Watch:**
- Per-firm resource usage
- Data volume by firm
- Query performance degradation
- Compliance requirements

**Implementation Options:**

**Option A: Logical Sharding (Recommended First)**
```
- Keep single database
- Add firm_id indexes everywhere (done)
- Route queries efficiently
- Monitor per-firm usage
```

**Option B: Schema-per-Firm**
```
- PostgreSQL schemas
- Firm ID in schema name
- Connection routing layer
- Higher complexity
```

**Option C: Database-per-Firm**
```
- Separate Supabase projects
- Complete isolation
- Highest complexity
- Reserved for enterprise
```

---

### Trigger 5: When to Add CDN for Assets

**Add CDN When:**
- [ ] Audio file downloads > 100/day
- [ ] Global user distribution
- [ ] Bandwidth costs significant
- [ ] Export downloads slow

**Implementation:**
```
1. Enable Supabase CDN (included in Pro)
2. Add CloudFlare for custom domain
3. Configure caching headers
4. Update file URL generation
```

**Estimated Cost:**
- CloudFlare Free: Unlimited bandwidth
- CloudFlare Pro: $20/month (advanced features)

---

## Scaling Decision Tree

```
Is response time > 500ms?
├── Yes → Check database metrics
│   ├── CPU > 70%? → Add read replica
│   ├── Cache miss > 30%? → Add Redis
│   └── Large queries? → Optimize queries
└── No → Continue monitoring

Are jobs delayed > 5 min?
├── Yes → External job queue
└── No → Monitor queue depth

Is one firm using > 30%?
├── Yes → Consider sharding
└── No → Continue monitoring

Are costs > budget?
├── Yes → Review usage, add limits
└── No → Continue monitoring
```

---

## Cost Scaling Table

| Stage | Users | Monthly Cost | Key Components |
|-------|-------|--------------|----------------|
| Beta | 100 | $0-50 | Vercel Hobby, Supabase Free |
| Early | 1,000 | $100-300 | Vercel Pro, Supabase Pro |
| Growth | 10,000 | $500-1,500 | + Redis, + Replicas |
| Scale | 50,000+ | $2,000-5,000 | + External Queue, + CDN |

---

## Scaling Checklist

### Before Scaling

- [ ] Current bottleneck identified with data
- [ ] Cost impact calculated
- [ ] Rollback plan documented
- [ ] Monitoring in place
- [ ] Team trained on new component

### During Scaling

- [ ] Deploy to staging first
- [ ] Load test new configuration
- [ ] Monitor closely during rollout
- [ ] Have rollback ready

### After Scaling

- [ ] Verify performance improvement
- [ ] Update documentation
- [ ] Update runbooks
- [ ] Review costs after 30 days

---

## Architecture Evolution

### Current (0-1,000 users)
```
Vercel → Supabase → Deepgram
         (single)
```

### Phase 2 (1,000-10,000 users)
```
Vercel → Supabase → Deepgram
    ↓     (+ replica)
  Redis
```

### Phase 3 (10,000-50,000 users)
```
Vercel → Load Balancer → Supabase Cluster
    ↓         ↓              ↓
  Redis   CDN/Cache    Read Replicas
    ↓
  Inngest/
  External
  Queue
```

### Phase 4 (50,000+ users)
```
Edge Network → Regional Deployments
      ↓              ↓
   CDN Layer    Sharded Databases
      ↓              ↓
  Event Bus    Dedicated Compute
```

---

## Key Decisions Log

| Decision | Trigger | Date | Result |
|----------|---------|------|--------|
| In-memory cache | Initial build | - | ✅ Working |
| DB-backed job queue | Avoid Redis cost | - | ✅ Working |
| Defer Redis | No multi-instance need | - | ✅ Correct |
| Defer sharding | < 100 firms | - | ✅ Correct |

---

## Resources

- [Supabase Scaling Guide](https://supabase.com/docs/guides/platform/performance)
- [Vercel Limits](https://vercel.com/docs/limits/overview)
- [Upstash Redis](https://upstash.com/)
- [Inngest Docs](https://www.inngest.com/docs)
- [Trigger.dev Docs](https://trigger.dev/docs)
