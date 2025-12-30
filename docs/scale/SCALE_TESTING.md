# Scale Testing Plan

## Overview

This document outlines the scale testing strategy for Depo-Pro, including expected load patterns, bottleneck hypotheses, and testing approaches.

## Expected User Counts

### Phase 1: Beta (Current)
| Metric | Count |
|--------|-------|
| Total firms | 5-10 |
| Users per firm | 5-15 |
| Total users | 25-150 |
| Daily active users | 10-50 |

### Phase 2: Early Adoption
| Metric | Count |
|--------|-------|
| Total firms | 50-100 |
| Users per firm | 10-25 |
| Total users | 500-2,500 |
| Daily active users | 100-500 |

### Phase 3: Growth
| Metric | Count |
|--------|-------|
| Total firms | 500-1,000 |
| Users per firm | 15-50 |
| Total users | 7,500-50,000 |
| Daily active users | 1,500-10,000 |

---

## Concurrent Load Assumptions

### Job Volume

| Scenario | Jobs/Day | Concurrent |
|----------|----------|------------|
| Beta | 10-50 | 2-5 |
| Early Adoption | 100-500 | 10-25 |
| Growth | 1,000-5,000 | 50-100 |

### Transcription Volume

| Scenario | Hours/Day | Concurrent |
|----------|-----------|------------|
| Beta | 2-10 | 1-2 |
| Early Adoption | 20-100 | 5-10 |
| Growth | 200-1,000 | 20-50 |

### API Request Patterns

| Endpoint Category | % of Traffic | Avg Response Time Target |
|-------------------|--------------|--------------------------|
| Dashboard/Lists | 40% | < 200ms |
| Transcript Views | 25% | < 500ms |
| Job Operations | 15% | < 300ms |
| Search | 10% | < 1s |
| Exports | 5% | < 5s |
| Auth | 5% | < 200ms |

---

## Query Load Assumptions

### Read Patterns

| Query Type | Frequency | Complexity |
|------------|-----------|------------|
| Dashboard stats | High | Medium (aggregates) |
| Job list | High | Low (paginated) |
| Transcript content | Medium | High (large JSON) |
| User lookup | High | Low |
| Search | Medium | High (full-text) |
| Audit logs | Low | Medium |

### Write Patterns

| Operation | Frequency | Complexity |
|-----------|-----------|------------|
| Job creation | Medium | Low |
| Transcript save | Low | High (large payload) |
| Word corrections | Medium | Low |
| Share creation | Low | Low |
| Audit logging | High | Low |

---

## Bottleneck Hypotheses

### 1. Database Bottlenecks

**Hypothesis:** Dashboard aggregate queries will become slow at scale.

**Evidence:**
- `COUNT(*)` on jobs table
- `GROUP BY` for status counts
- Multiple aggregates per dashboard load

**Mitigation:**
- ✅ Added indexes (Phase 5)
- ✅ Added caching layer (Phase 6)
- 🔲 Consider materialized views at 1,000+ firms

**Test Approach:**
```sql
-- Simulate 10,000 jobs
EXPLAIN ANALYZE 
SELECT status, COUNT(*) 
FROM "Job" 
WHERE "firmId" = 'test-firm' 
GROUP BY status;
```

### 2. Transcript Content Retrieval

**Hypothesis:** Large transcript JSON fields will slow queries.

**Evidence:**
- `words` field can be 1MB+ for long depositions
- Full transcript can be 500KB+
- Multiple users viewing same transcript

**Mitigation:**
- ✅ Separate content from metadata queries
- ✅ Select patterns in place
- 🔲 Consider streaming for very large transcripts
- 🔲 Consider CDN for static content

**Test Approach:**
- Measure response time for 1MB vs 10MB transcripts
- Load test with 10 concurrent viewers

### 3. AI Transcription Queue

**Hypothesis:** Deepgram API will be the slowest operation.

**Evidence:**
- Transcription takes 0.5-2x real-time
- 1 hour audio = 30-120 min processing
- API rate limits may apply

**Mitigation:**
- ✅ Background job queue (Phase 6)
- ✅ Status polling for progress
- 🔲 Priority queue for paid tiers
- 🔲 Multiple Deepgram API keys at scale

**Test Approach:**
- Queue 20 concurrent transcription jobs
- Measure completion times and failures

### 4. Export Generation

**Hypothesis:** DOCX/PDF generation will spike CPU.

**Evidence:**
- Document generation is CPU-intensive
- Large transcripts = large documents
- Bulk exports could overwhelm

**Mitigation:**
- ✅ Rate limiting on exports
- ✅ Usage quotas (Phase 8)
- 🔲 Move to background jobs for large exports
- 🔲 Consider serverless function for isolation

**Test Approach:**
- Generate 50 concurrent exports
- Measure memory and CPU usage

### 5. Webhook Delivery

**Hypothesis:** Webhook delivery will back up with unreliable endpoints.

**Evidence:**
- External endpoints may timeout
- Retry logic can multiply load
- Network issues compound

**Mitigation:**
- ✅ Async delivery via job queue
- ✅ Exponential backoff
- ✅ Max retry limits
- 🔲 Dead letter queue for failed webhooks

**Test Approach:**
- Simulate 1,000 webhook dispatches
- Include 10% failing endpoints

---

## Hot Endpoints Identified

### Critical Path (Must Optimize)

| Endpoint | Current Load | Risk Level |
|----------|--------------|------------|
| `GET /api/dashboard` | Every page load | 🔴 High |
| `GET /api/jobs` | Frequent polling | 🔴 High |
| `GET /api/transcripts/[id]` | Per transcript view | 🟡 Medium |
| `POST /api/auth/session` | Every request | 🔴 High |

### Secondary Priority

| Endpoint | Current Load | Risk Level |
|----------|--------------|------------|
| `GET /api/jobs/[id]` | Job detail views | 🟡 Medium |
| `POST /api/jobs/[id]/transcribe` | Job submission | 🟢 Low |
| `POST /api/transcripts/[id]/export` | Exports | 🟡 Medium |
| `GET /api/audit` | Admin queries | 🟢 Low |

---

## N+1 Query Risks

### Identified Patterns

| Location | Pattern | Fix |
|----------|---------|-----|
| Job list with creators | Loop over jobs, fetch user each | Use `include` |
| Transcript with shares | Loop over shares, fetch users | Use `include` |
| Dashboard counts | Multiple COUNT queries | Single aggregate query |
| Audit log display | Loop over logs, fetch actors | Use `include` |

### Prevention Measures

- ✅ Select patterns defined (`lib/query-optimization.ts`)
- ✅ Batch loading utilities added
- ✅ N+1 warning logger in place
- 🔲 Add ESLint rule for Prisma includes

---

## Load Testing Plan (When Ready)

### Tools

| Tool | Purpose |
|------|---------|
| k6 | HTTP load testing |
| Artillery | API scenario testing |
| Prisma Query Analyzer | Database profiling |
| Vercel Analytics | Production monitoring |

### Test Scenarios

**Scenario 1: Normal Load**
```
Duration: 5 minutes
Virtual Users: 50
Ramp: 10 users every 30 seconds
```

**Scenario 2: Peak Load**
```
Duration: 10 minutes
Virtual Users: 200
Ramp: 50 users every minute
```

**Scenario 3: Stress Test**
```
Duration: 15 minutes
Virtual Users: 500
Ramp: 100 users every minute
Target: Find breaking point
```

### Success Criteria

| Metric | Target |
|--------|--------|
| P95 Response Time | < 500ms |
| Error Rate | < 0.1% |
| Database CPU | < 70% |
| Memory Usage | < 80% |

---

## Monitoring Checklist

When running load tests:

- [ ] Vercel function duration metrics
- [ ] Supabase database metrics
- [ ] Deepgram API usage dashboard
- [ ] Error rates in logs
- [ ] Memory usage patterns
- [ ] Cold start frequency

---

## Pre-Scale Checklist

Before scaling to 100+ firms:

- [ ] All indexes verified in production
- [ ] Caching tested under load
- [ ] Rate limits configured and tested
- [ ] Cost alerts set up
- [ ] Backup/restore tested
- [ ] Monitoring dashboards ready
- [ ] On-call rotation established
