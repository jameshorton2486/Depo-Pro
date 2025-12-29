# Cost Drivers Analysis

## Overview

This document identifies and analyzes the primary cost drivers for Depo-Pro to enable predictable scaling and cost control.

---

## Primary Cost Drivers

### 1. AI Transcription (Deepgram)

**Pricing Model:** Per audio minute transcribed

| Model | Cost/Minute | Notes |
|-------|-------------|-------|
| Nova-2 (current) | $0.0043 | Best price/performance |
| Nova-3 | $0.0059 | Higher accuracy |
| Whisper | $0.0048 | Open-source alternative |

**Cost Projections:**

| Scenario | Hours/Month | Monthly Cost |
|----------|-------------|--------------|
| Beta (10 firms) | 50 | $13 |
| Early (100 firms) | 500 | $130 |
| Growth (1,000 firms) | 5,000 | $1,300 |

**Cost Controls Implemented:**
- ✅ Usage quotas per firm tier
- ✅ Rate limiting on transcription requests
- ✅ Warning before large transcriptions
- 🔲 Automatic quality/cost tier selection

**Monitoring:**
- Deepgram dashboard usage
- Per-firm transcription minutes
- Average audio file duration

---

### 2. Database (Supabase)

**Pricing Model:** Base + storage + bandwidth + compute

| Tier | Base Cost | Included | Overage |
|------|-----------|----------|---------|
| Free | $0 | 500MB, 2GB bandwidth | N/A |
| Pro | $25/month | 8GB, 50GB bandwidth | $0.125/GB |
| Team | $599/month | 100GB, 200GB bandwidth | Included |

**Cost Projections:**

| Scenario | Storage | Bandwidth | Monthly Cost |
|----------|---------|-----------|--------------|
| Beta | 1GB | 5GB | $0 (Free tier) |
| Early | 10GB | 50GB | $25 |
| Growth | 100GB | 500GB | ~$100 |

**Cost Controls Implemented:**
- ✅ Storage quotas per firm
- ✅ Query optimization (indexes)
- ✅ Pagination limits
- 🔲 Old data archival policy

**Monitoring:**
- Supabase dashboard
- Database size trends
- Query performance

---

### 3. File Storage (Supabase Storage)

**Pricing Model:** Storage + bandwidth

| Metric | Free Tier | Pro Tier |
|--------|-----------|----------|
| Storage | 1GB | 100GB |
| Bandwidth | 2GB/month | 200GB/month |
| Overage | N/A | $0.021/GB storage, $0.09/GB bandwidth |

**Audio File Estimates:**

| Quality | Size/Hour | 100 Hours/Month |
|---------|-----------|-----------------|
| High (WAV) | 600MB | 60GB |
| Standard (MP3) | 100MB | 10GB |
| Compressed | 50MB | 5GB |

**Cost Controls Implemented:**
- ✅ Storage quotas per firm
- ✅ File size warnings on upload
- 🔲 Audio compression pipeline
- 🔲 Old file archival/deletion

**Monitoring:**
- Storage usage by firm
- Bandwidth consumption
- File upload patterns

---

### 4. Serverless Compute (Vercel)

**Pricing Model:** Function invocations + duration

| Tier | Invocations | Duration | Monthly Cost |
|------|-------------|----------|--------------|
| Hobby | 100K | 100 GB-hrs | $0 |
| Pro | 1M | 1000 GB-hrs | $20 |
| Enterprise | Unlimited | Unlimited | Custom |

**Cost Projections:**

| Scenario | Invocations/Month | Est. Cost |
|----------|-------------------|-----------|
| Beta | 50K | $0 |
| Early | 500K | $20 |
| Growth | 5M | ~$100 |

**Cost Controls Implemented:**
- ✅ API rate limiting
- ✅ Efficient function design
- ✅ Edge caching where possible
- 🔲 Function cold start optimization

**Monitoring:**
- Vercel Analytics
- Function duration metrics
- Error rates

---

### 5. Background Jobs

**Current:** Database-backed (no additional cost)

**Future (if Redis added):**

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Upstash | 10K/day | $0.20/100K commands |
| Redis Cloud | 30MB | $7/month for 250MB |

**Cost Controls Implemented:**
- ✅ Job queue is optional (dormant)
- ✅ Database-backed queue works at current scale
- ✅ Documented trigger for adding Redis

---

### 6. Webhook Traffic

**Current Cost:** Included in Vercel (minimal)

**Potential Costs:**
- Failed webhook retries (compute)
- Large payload delivery (bandwidth)
- External service fees (if using third-party)

**Cost Controls Implemented:**
- ✅ Rate limiting on webhook dispatch
- ✅ Retry limits (max 3)
- ✅ Payload size limits
- ✅ Dead letter handling

---

## Cost Summary by Scenario

### Beta (10 Firms, 50 Users)

| Component | Monthly Cost |
|-----------|--------------|
| Deepgram (50 hrs) | $13 |
| Supabase Free | $0 |
| Vercel Hobby | $0 |
| **Total** | **~$15** |

### Early Adoption (100 Firms, 500 Users)

| Component | Monthly Cost |
|-----------|--------------|
| Deepgram (500 hrs) | $130 |
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| **Total** | **~$175** |

### Growth (1,000 Firms, 5,000 Users)

| Component | Monthly Cost |
|-----------|--------------|
| Deepgram (5,000 hrs) | $1,300 |
| Supabase Pro + storage | $100 |
| Vercel Pro | $50 |
| Redis (Upstash) | $25 |
| **Total** | **~$1,475** |

---

## Cost Alerts Configuration

### Recommended Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| Deepgram daily | > $50/day | Review usage |
| Supabase storage | > 80% quota | Upgrade or cleanup |
| Vercel functions | > 80% limit | Review hot endpoints |
| Per-firm usage | > 50% of tier | Upsell notification |

### Alert Implementation

```typescript
// Add to monitoring
if (monthlyTranscriptionCost > 100) {
  await sendAlert('High transcription cost', { cost, firmId });
}

if (storageUsage > quota * 0.8) {
  await sendAlert('Storage approaching limit', { usage, quota, firmId });
}
```

---

## Cost Optimization Opportunities

### Quick Wins (Implement Now)

1. **Audio Compression**
   - Compress uploads to MP3
   - Estimated savings: 50-80% on storage

2. **Aggressive Caching**
   - Cache dashboard for 5 min
   - Estimated savings: 40% on database load

3. **Lazy Loading**
   - Don't fetch transcript content until viewed
   - Estimated savings: 30% on bandwidth

### Future Optimizations

1. **Tiered Transcription Quality**
   - Offer Nova-2 vs Nova-3 choice
   - Price difference: ~30%

2. **Archive Cold Data**
   - Move old transcripts to cold storage
   - Price difference: 60-80%

3. **Regional Optimization**
   - Use closest Deepgram region
   - Reduce latency and potential timeout costs

---

## Cost Governance

### Monthly Review Checklist

- [ ] Review Deepgram usage dashboard
- [ ] Check Supabase billing metrics
- [ ] Review Vercel usage
- [ ] Identify top 10 firms by usage
- [ ] Check for anomalies
- [ ] Update projections

### Quarterly Review

- [ ] Compare actual vs projected costs
- [ ] Review pricing tier appropriateness
- [ ] Evaluate optimization opportunities
- [ ] Update cost model
