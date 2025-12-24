# Product Separation & Terms

## 🔹 PRODUCT 1 — Depo-Pro (Court Reporter / Agency)

### Purpose
Accurate creation and delivery of deposition transcripts and exhibits.

### Users
- Court reporters
- Agencies
- Scopists

### Core Functions
- Audio transcription
- Transcript review & correction
- Deposition-level exhibit upload
- Delivery of finalized transcripts

### Explicit Exclusions
- ❌ Trial preparation
- ❌ Legal analysis
- ❌ Issue coding
- ❌ Attorney annotations
- ❌ Case strategy

### Positioning Statement
**Depo-Pro is a professional transcription and deposition-production platform. It does not provide legal advice or trial preparation tools.**

---

## 🔹 PRODUCT 2 — Attorney Review Platform (Working Name)

### Purpose
Trial preparation, testimony analysis, and issue-based transcript review.

### Users
- Attorneys
- Paralegals
- Legal teams

### Core Functions
- Transcript ingestion (from any source)
- Issue coding (perjury, contradiction, admissions, etc.)
- Exhibit merging across depositions
- Trial-ready report generation

### Explicit Exclusions (MVP)
- ❌ Transcription
- ❌ Audio sync
- ❌ Courtroom presentation
- ❌ Legal advice automation
- ❌ AI issue detection

### Positioning Statement
**This product is a legal review and analysis tool designed to assist attorneys in organizing testimony. It does not replace legal judgment and does not provide legal advice.**

---

## 🔹 WHY THIS SEPARATION MATTERS

### Different Customers
- **Depo-Pro:** Court reporters, agencies (B2B professional services)
- **Attorney Review:** Law firms, attorneys (B2B legal services)

### Different Pricing
- **Depo-Pro:** Per-reporter pricing ($49-$99/month)
- **Attorney Review:** Per-user pricing ($149-$299/month)

### Different Insurance Exposure
- **Depo-Pro:** Professional liability (transcription accuracy)
- **Attorney Review:** Legal malpractice (trial preparation tools)

### Different Regulatory Risk
- **Depo-Pro:** Professional certification requirements
- **Attorney Review:** Legal ethics, client confidentiality

### Clean Sales Motion
- Clear value proposition per customer type
- No feature confusion
- Targeted marketing messages
- Simplified onboarding

**You can bundle later, but separation now saves you.**

---

## 📋 TERMS OF SERVICE LANGUAGE

### Depo-Pro Terms

**Service Description:**
Depo-Pro provides professional transcription and deposition management services for court reporters and agencies. The platform facilitates accurate transcript creation, review, and delivery.

**Limitations:**
- Depo-Pro does not provide legal advice
- Depo-Pro does not perform legal analysis
- Depo-Pro is not a trial preparation tool
- Users are responsible for transcript accuracy

**Liability:**
Depo-Pro's liability is limited to transcription service delivery. Depo-Pro is not liable for legal outcomes or trial preparation decisions.

### Attorney Review Platform Terms

**Service Description:**
The Attorney Review Platform provides tools for organizing, analyzing, and preparing deposition transcripts for trial. The platform assists attorneys in identifying issues and generating reports.

**Limitations:**
- The platform does not provide legal advice
- The platform does not replace legal judgment
- The platform does not guarantee trial outcomes
- Users are responsible for all legal decisions

**Liability:**
The Attorney Review Platform's liability is limited to software functionality. The platform is not liable for legal outcomes, trial strategy, or attorney decisions.

---

## 🔒 DATA ISOLATION

### Technical Separation
- Separate route groups: `/app/(dashboard)/*` vs `/app/(attorney)/*`
- Separate API routes: `/api/jobs/*` vs `/api/attorney/*`
- Shared infrastructure (database, auth) but isolated access

### Business Separation
- Different user roles
- Different permission models
- Different data access patterns

### Compliance
- Clear data boundaries
- Audit-ready access logs
- Role-based access control

---

## 📝 RECOMMENDATIONS

1. **Separate Terms of Service** for each product
2. **Separate Privacy Policies** if required by jurisdiction
3. **Clear product naming** to avoid confusion
4. **Separate support channels** (if needed)
5. **Separate billing** (can be same account, different line items)

**This separation protects you legally and commercially.**

