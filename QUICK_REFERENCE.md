# Depo-Pro Quick Reference Card

**Version:** 1.0 MVP Complete  
**Date:** November 28, 2025

---

## 🚀 Quick Start (3 Steps)

### 1. Environment Setup
```bash
# Check .env.local has these:
DEEPGRAM_API_KEY=your_key
DATABASE_URL=postgresql://...
UPLOADS_DIR=./uploads
```

### 2. Database Migration
```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Start Server
```bash
npm run dev
```

**Open:** http://localhost:3000

---

## 🎯 Core Workflows

### Reporter Workflow (5 Steps)
```
1. /jobs/new → Create job + Upload audio
2. Select model → MEDICAL (recommended)
3. Click "Start Transcription" → Wait 54 min for 60-min audio
4. Review speaker analysis → Assign names
5. /jobs/{id} → Click "Export" → Download DOCX
```

### Scopist Workflow (4 Steps)
```
1. /scopist → View job queue
2. Click "Start Review" → Opens review page
3. Review flagged words → Edit + mark reviewed
4. Click "Submit" → Job complete
```

---

## 📍 Important Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Auto-redirect to role dashboard |
| `/reporter` | Reporter dashboard + stats |
| `/scopist` | Scopist job queue + progress |
| `/admin` | System overview |
| `/jobs` | All jobs list |
| `/jobs/new` | Create new job |
| `/jobs/{id}` | Job details |
| `/jobs/{id}/review` | Review interface |

---

## 🔑 Keyboard Shortcuts

### Review Page:
- `↑` / `↓` - Navigate flagged words
- `Space` - Play audio for selected word
- `Enter` - Start editing word
- `Escape` - Cancel edit
- `Tab` - Next word

---

## 📦 Export Formats

| Format | Use Case | Size | Editable |
|--------|----------|------|----------|
| **DOCX** | Legal standard | Medium | ✅ |
| **PDF** | Final delivery | Large | ❌ |
| **TXT** | Email/preview | Small | ✅ |

---

## 🎨 Model Selection Guide

| Model | Use For | Best When |
|-------|---------|-----------|
| **STANDARD** | General legal | Contract, family law, civil |
| **MEDICAL** ⭐ | Personal injury | Medical malpractice, injury, workers' comp |
| **BILINGUAL** | Spanish interpreter | Multilingual testimony |

**Default:** MEDICAL (recommended)

---

## 📊 Dashboard Stats

### Reporter:
- Total Jobs
- Pending Transcription
- With Scopist
- Completed This Month

### Scopist:
- Active Jobs
- Pending Review
- Completed This Month
- Total Completed

### Admin:
- Total Users
- Total Jobs
- Firms
- Active Jobs

---

## 🔧 Common Commands

```bash
# Development
npm run dev

# TypeScript check
npm run typecheck

# Lint
npm run lint

# Database
npx prisma studio          # View database
npx prisma migrate dev     # Create migration
npx prisma generate        # Update client

# Build
npm run build
npm run start
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio playback | Check file URL, verify CORS |
| Export fails | Check transcript exists, verify permissions |
| Dashboard shows 0 | Create test job, check role |
| Transcription fails | Verify Deepgram key, check audio format |
| TypeScript errors | Run `npx prisma generate` |

---

## 📞 Support

- **Docs:** `./PROMPT_*_IMPLEMENTATION_SUMMARY.md`
- **MVP Overview:** `./MVP_COMPLETE.md`
- **This Guide:** `./QUICK_REFERENCE.md`

---

## ✅ Feature Status

| Feature | Status |
|---------|--------|
| Transcription (3 models) | ✅ Complete |
| Speaker Identification | ✅ Complete |
| Low-Confidence Review | ✅ Complete |
| Audio Player | ✅ Complete |
| Export (DOCX/PDF/TXT) | ✅ Complete |
| Reporter Dashboard | ✅ Complete |
| Scopist Dashboard | ✅ Complete |
| Admin Dashboard | ✅ Complete |
| Job Management | ✅ Complete |
| User Roles | ✅ Complete |

**MVP:** ✅ **100% COMPLETE**

---

## 🎯 Next Actions

1. ✅ Test with real deposition audio
2. ✅ Verify exports look correct
3. ✅ Test all user workflows
4. ⏭️ Deploy to production
5. ⏭️ Launch beta

---

**Ready to launch! 🚀**
