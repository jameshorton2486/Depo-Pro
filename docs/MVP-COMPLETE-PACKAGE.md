# 🚀 DEPO-PRO MVP: Complete Build Package
Generated: November 21, 2024
Timeline: 16 weeks to launch
Target Launch: March/April 2025
Budget Year 1: ~$6,000

📋 TABLE OF CONTENTS

1. Executive Summary & Frozen Scope
2. Complete Database Schema (Prisma)
3. Complete Next.js File Structure
4. Architecture Diagrams
5. Low-Confidence Review Feature Specification
6. API Route Specifications
7. 16-Week Sprint Roadmap
8. AI Coding Agent Instructions
9. Archive Strategy
10. Cost Projections & Deployment


## 1. EXECUTIVE SUMMARY & FROZEN SCOPE {#1-executive-summary}
### What We're Building
Depo-Pro MVP: An AI-powered legal transcription platform for court reporters and scopists that dramatically reduces editing time through intelligent audio enhancement, AI pre-formatting, and a revolutionary low-confidence word review system.

### Core Value Proposition
*   Hybrid audio enhancement (Dolby + Auphonic fallback) ensures maximum transcription accuracy
*   Deepgram Nova-2 with word-level confidence scores enables targeted review
*   Low-confidence review mode lets scopists/reporters jump directly to problem words with synchronized audio
*   AI pre-formatting applies legal Q/A structure, capitalization, and punctuation automatically
*   Native web editor with audio-sync eliminates the need for desktop software

### Frozen MVP Scope
#### ✅ IN SCOPE (MVP)
**User Management:**
*   Reporter accounts (email/password, profile)
*   Scopist accounts (email/password, profile, availability)
*   Role-based access control
*   Session management

**Job Workflow:**
*   Create job (case info, date, location)
*   Upload audio/video files
*   Upload Notice of Deposition & Court Order
*   Optional: rough transcript, exhibits
*   Assign to scopist or self-edit
*   Job dashboard (reporter & scopist views)
*   Status tracking (uploaded → transcribing → ready → editing → review → complete)

**Audio Processing:**
*   Extract audio from video if needed
*   Dolby.io enhancement (all files)
*   Quality assessment
*   Auphonic fallback (if quality < threshold)
*   Track enhancement costs per job

**Transcription:**
*   Deepgram Nova-2 API integration
*   Speaker diarization
*   Word-level timestamps
*   Confidence scores per word
*   Store raw JSON + formatted text
*   Webhook handling for async completion

**AI Review Engine:**
*   Extract case info from Notice/Court Order (with confirmation)
*   Apply Q/A formatting
*   Capitalization rules (Mr., Ms., Dr.)
*   Punctuation fixes
*   Conservative approach (only high-confidence changes)
*   Keep raw + AI-reviewed versions

**Transcript Editor:**
*   TipTap-based web editor
*   Custom nodes (Q-line, A-line, page breaks)
*   Line numbering (calculated at export)
*   Edit lock system (prevent simultaneous editing)
*   Autosave every 30 seconds
*   Version history (raw, AI-reviewed, scopist, final)

**Low-Confidence Review (KEY DIFFERENTIATOR):**
*   Flag words with confidence < 0.80
*   Right sidebar review panel
*   "Next"/"Previous" navigation (F7 / Shift+F7)
*   Click word → jump audio to timestamp
*   Auto-play 1s before, 2s after word
*   Manual "mark as reviewed" per word
*   Track review progress

**Audio Player:**
*   Simple HTML5 audio player with custom controls
*   Play/pause, seek bar, volume
*   Speed control (0.5x - 2x)
*   Click word in transcript → jump to timestamp
*   Replay current segment button

**Scopist Workflow:**
*   Receive job assignment (email notification)
*   Accept/decline within 24 hours
*   Edit transcript in web editor
*   Submit for reporter review
*   Internal messaging with reporter

**Export:**
*   DOCX format (Courier 12pt, legal margins)
*   PDF format (with line numbers, page numbers)
*   TXT format (plain text)
*   Single US deposition template
*   Certificate page (auto-populated, editable)

**Notifications:**
*   Email only (no SMS)
*   Job assigned
*   Transcription complete
*   Scopist submitted review
*   System errors

**Security:**
*   HTTPS enforced
*   Encryption at rest (Supabase)
*   Role-based access control
*   Audit logs (who viewed what)
*   Session timeouts
*   HIPAA-ready architecture (not certified)

#### ❌ OUT OF SCOPE (Phase 2+)
*   Full waveform visualization
*   SMS notifications
*   Invoice/billing system
*   Full HIPAA certification & BAAs
*   Attorney dashboards
*   Advanced analytics
*   Multi-tenant agency management
*   Real-time collaborative editing
*   Mobile apps
*   E-filing integrations
*   Exhibit management beyond basic upload
*   Calendar/scheduling features
*   Marketplace features


## 2. COMPLETE DATABASE SCHEMA {#2-complete-database-schema}
### Prisma Schema (schema.prisma)
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER MODELS
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  role          UserRole
  
  // Profile
  firstName     String
  lastName      String
  phone         String?
  photo         String?   // URL to Supabase Storage
  timezone      String    @default("America/New_York")
  
  // Reporter-specific
  agencyName    String?
  csrNumber     String?   // Certified Shorthand Reporter number
  
  // Scopist-specific
  specialties   String[]  // ["medical", "technical", "legal"]
  experienceLevel String? // "beginner", "intermediate", "expert"
  availability  Boolean   @default(true)
  
  // Settings
  defaultTranscriptSettings Json?
  notificationPreferences   Json?
  
  // Relationships
  jobsCreated       Job[]           @relation("CreatedBy")
  assignments       JobAssignment[]
  messages          Message[]
  notifications     Notification[]
  auditLogs         AuditLog[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  
  @@index([email])
  @@index([role])
}

enum UserRole {
  REPORTER
  SCOPIST
  ADMIN
}

// ============================================
// JOB MODELS
// ============================================

model Job {
  id              String      @id @default(cuid())
  
  // Basic Info
  title           String
  caseName        String
  caseNumber      String?
  depositionDate  DateTime
  location        String?     // Physical address or "Zoom"
  zoomLink        String?
  
  // Status
  status          JobStatus   @default(CREATED)
  
  // Assignment
  createdById     String
  createdBy       User        @relation("CreatedBy", fields: [createdById], references: [id])
  assignedToId    String?     // If self-edit, same as createdById
  
  // Files
  files           JobFile[]
  
  // Transcription
  transcriptionJobs TranscriptionJob[]
  transcripts       Transcript[]
  
  // Communication
  messages        Message[]
  assignments     JobAssignment[]
  
  // Metadata
  notes           String?     @db.Text
  internalNotes   String?     @db.Text // Private notes not visible to scopist
  
  // Lock system
  lockedBy        String?
  lockedAt        DateTime?
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  completedAt     DateTime?
  
  @@index([createdById])
  @@index([status])
  @@index([depositionDate])
}

enum JobStatus {
  CREATED
  FILES_UPLOADED
  ENHANCING_AUDIO
  TRANSCRIBING
  AI_REVIEWING
  READY_FOR_EDIT
  ASSIGNED
  IN_EDIT
  SUBMITTED_FOR_REVIEW
  IN_REVIEW
  COMPLETED
  CANCELLED
}

model JobFile {
  id          String      @id @default(cuid())
  jobId       String
  job         Job         @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  type        FileType
  fileName    String
  fileSize    Int         // bytes
  mimeType    String
  
  // Storage
  storageUrl  String      // Supabase Storage URL
  storagePath String      // Path in bucket
  
  // For extracted data (Notice, Court Order)
  extractedData Json?
  
  createdAt   DateTime    @default(now())
  
  @@index([jobId, type])
}

enum FileType {
  AUDIO
  VIDEO
  NOTICE
  COURT_ORDER
  ROUGH_TRANSCRIPT
  EXHIBIT
  FINAL_TRANSCRIPT
}

// ============================================
// AUDIO ENHANCEMENT
// ============================================

model AudioEnhancement {
  id                  String    @id @default(cuid())
  jobId               String
  
  // Input
  originalAudioUrl    String
  originalDuration    Float     // seconds
  originalFileSize    Int       // bytes
  
  // Enhancement
  enhancementMode     EnhancementMode
  dolbyProcessed      Boolean   @default(false)
  dolbyAudioUrl       String?
  dolbyQualityScore   Float?    // 0-100
  
  auphonicProcessed   Boolean   @default(false)
  auphonicAudioUrl    String?
  auphonicQualityScore Float?
  
  finalAudioUrl       String    // The one sent to Deepgram
  engineUsed          String    // "dolby", "auphonic", or "none"
  
  // Cost tracking
  dolbyCostCents      Int?
  auphonicCostCents   Int?
  totalCostCents      Int
  
  // Metadata
  qualityFlags        Json?     // {"noise": "high", "clipping": "low"}
  decisionReason      String?   // Why Auphonic was/wasn't used
  
  status              EnhancementStatus @default(PENDING)
  errorMessage        String?
  
  createdAt           DateTime  @default(now())
  completedAt         DateTime?
  
  @@index([jobId])
}

enum EnhancementMode {
  OFF
  DOLBY_ONLY
  HYBRID
  AUPHONIC_ONLY
}

enum EnhancementStatus {
  PENDING
  PROCESSING_DOLBY
  PROCESSING_AUPHONIC
  COMPLETED
  ERROR
}

// ============================================
// TRANSCRIPTION
// ============================================

model TranscriptionJob {
  id                  String      @id @default(cuid())
  jobId               String
  job                 Job         @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  // Deepgram
  deepgramRequestId   String      @unique
  audioUrl            String      // Enhanced audio URL
  
  // Configuration
  config              Json        // Deepgram options used
  
  // Status
  status              TranscriptionStatus @default(PENDING)
  
  // Results
  rawJson             Json?       // Full Deepgram response
  duration            Float?      // Audio duration
  wordCount           Int?
  averageConfidence   Float?
  speakerCount        Int?
  
  // Error handling
  errorMessage        String?
  retryCount          Int         @default(0)
  maxRetries          Int         @default(3)
  
  createdAt           DateTime    @default(now())
  completedAt         DateTime?
  
  @@index([jobId])
  @@index([status])
}

enum TranscriptionStatus {
  PENDING
  PROCESSING
  COMPLETED
  ERROR
  CANCELLED
}

model Transcript {
  id                String      @id @default(cuid())
  jobId             String
  job               Job         @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  // Version
  version           String      // "1.0-raw", "2.0-ai-reviewed", "3.0-scopist", "4.0-final"
  versionNumber     Int         // 1, 2, 3, 4
  
  // Content
  content           String      @db.Text  // Plain text
  contentJson       Json        // TipTap JSON document
  
  // Tokens (for audio sync)
  tokens            TranscriptToken[]
  
  // Metadata
  wordCount         Int?
  pageCount         Int?
  averageConfidence Float?
  speakerCount      Int?
  
  // AI Review (for version 2.0)
  aiChanges         Json?       // List of changes made
  aiFlags           Json?       // Low-confidence sections
  
  // Creator
  createdBy         String      // "system", userId
  
  createdAt         DateTime    @default(now())
  
  @@unique([jobId, version])
  @@index([jobId, versionNumber])
}

model TranscriptToken {
  id            String      @id @default(cuid())
  transcriptId  String
  transcript    Transcript  @relation(fields: [transcriptId], references: [id], onDelete: Cascade)
  
  // Position in transcript
  index         Int         // Word index in document
  
  // Content
  word          String
  punctuatedWord String?    // With punctuation
  
  // Timing
  start         Float       // seconds
  end           Float       // seconds
  
  // Quality
  confidence    Float       // 0.0 - 1.0
  isFlagged     Boolean     @default(false)  // confidence < 0.80
  isReviewed    Boolean     @default(false)  // User marked as reviewed
  
  // Speaker
  speaker       Int?        // Speaker ID from diarization
  
  createdAt     DateTime    @default(now())
  
  @@index([transcriptId, index])
  @@index([transcriptId, isFlagged])
}

// ============================================
// AI REVIEW
// ============================================

model AIRule {
  id          String      @id @default(cuid())
  name        String
  category    RuleCategory
  description String
  enabled     Boolean     @default(true)
  priority    Int         @default(0)  // Higher runs first
  
  // Rule definition
  ruleType    String      // "regex", "llm", "dictionary"
  pattern     String?     // For regex
  replacement String?     // For simple replacements
  prompt      String?     @db.Text  // For LLM rules
  
  // Examples
  examples    Json?       // Before/after pairs
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([enabled, priority])
}

enum RuleCategory {
  CAPITALIZATION
  PUNCTUATION
  FORMATTING
  LEGAL_TERMS
  SPEAKER_ID
  NUMBERS
  DATES
  CUSTOM
}

// ============================================
// SCOPIST WORKFLOW
// ============================================

model JobAssignment {
  id            String      @id @default(cuid())
  jobId         String
  job           Job         @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  scopistId     String
  scopist       User        @relation(fields: [scopistId], references: [id])
  
  status        AssignmentStatus @default(INVITED)
  
  // Timing
  invitedAt     DateTime    @default(now())
  respondedAt   DateTime?
  startedAt     DateTime?
  submittedAt   DateTime?
  
  // Notes
  scopistNotes  String?     @db.Text
  
  @@index([jobId])
  @@index([scopistId, status])
}

enum AssignmentStatus {
  INVITED
  ACCEPTED
  DECLINED
  IN_PROGRESS
  SUBMITTED
  EXPIRED
  RELEASED
}

// ============================================
// COMMUNICATION
// ============================================

model Message {
  id          String      @id @default(cuid())
  jobId       String
  job         Job         @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  senderId    String
  sender      User        @relation(fields: [senderId], references: [id])
  
  content     String      @db.Text
  
  // Metadata
  isRead      Boolean     @default(false)
  readAt      DateTime?
  
  createdAt   DateTime    @default(now())
  
  @@index([jobId, createdAt])
}

model Notification {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type        NotificationType
  title       String
  message     String
  
  // Link
  linkUrl     String?
  linkText    String?
  
  // Status
  isRead      Boolean     @default(false)
  readAt      DateTime?
  emailSent   Boolean     @default(false)
  emailSentAt DateTime?
  
  // Related job
  jobId       String?
  
  createdAt   DateTime    @default(now())
  
  @@index([userId, isRead])
  @@index([createdAt])
}

enum NotificationType {
  JOB_ASSIGNED
  TRANSCRIPTION_COMPLETE
  AI_REVIEW_COMPLETE
  SCOPIST_ACCEPTED
  SCOPIST_DECLINED
  SCOPIST_SUBMITTED
  REPORTER_REVIEWED
  JOB_COMPLETE
  SYSTEM_ERROR
  MESSAGE_RECEIVED
}

// ============================================
// AUDIT & SECURITY
// ============================================

model AuditLog {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  
  action      String      // "view_job", "edit_transcript", "export_file"
  resource    String      // "Job", "Transcript"
  resourceId  String
  
  // Details
  details     Json?
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime    @default(now())
  
  @@index([userId, createdAt])
  @@index([resourceId])
}

// ============================================
// SYSTEM CONFIGURATION
// ============================================

model SystemConfig {
  id          String      @id @default(cuid())
  key         String      @unique
  value       Json
  description String?
  
  updatedAt   DateTime    @updatedAt
}
```

## 3. COMPLETE NEXT.JS FILE STRUCTURE {#3-complete-nextjs-file-structure}
(See document for full tree)

## 4. ARCHITECTURE DIAGRAMS {#4-architecture-diagrams}
(See document for diagrams)

## 5. LOW-CONFIDENCE REVIEW FEATURE SPECIFICATION {#5-low-confidence-review-feature}
(See document for details)

## 6. API ROUTE SPECIFICATIONS {#6-api-route-specifications}
(See document for details)

## 7. 16-WEEK SPRINT ROADMAP {#7-sprint-roadmap}
(See document for details)

## 8. AI CODING AGENT INSTRUCTIONS {#8-ai-coding-agent-instructions}
(See document for prompts)

## 9. ARCHIVE STRATEGY {#9-archive-strategy}
(See document for strategy)

## 10. COST PROJECTIONS & DEPLOYMENT {#10-cost-projections}
(See document for details)
