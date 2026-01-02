-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REPORTER', 'SCOPIST', 'ADMIN', 'ATTORNEY', 'PARALEGAL', 'AGENCY', 'AGENCY_ADMIN', 'FIRM_ADMIN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('CREATED', 'FILES_UPLOADED', 'ENHANCING_AUDIO', 'TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'ASSIGNED', 'IN_EDIT', 'SUBMITTED_FOR_REVIEW', 'IN_REVIEW', 'SCOPIST_COMPLETE', 'REVIEW_COMPLETE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('AUDIO', 'VIDEO', 'NOTICE', 'COURT_ORDER', 'ROUGH_TRANSCRIPT', 'EXHIBIT', 'FINAL_TRANSCRIPT');

-- CreateEnum
CREATE TYPE "EnhancementMode" AS ENUM ('OFF', 'DOLBY_ONLY', 'HYBRID', 'AUPHONIC_ONLY');

-- CreateEnum
CREATE TYPE "EnhancementStatus" AS ENUM ('PENDING', 'PROCESSING_DOLBY', 'PROCESSING_AUPHONIC', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EditType" AS ENUM ('WORD_CORRECTION', 'SPEAKER_ASSIGNMENT', 'PUNCTUATION', 'INAUDIBLE_MARK', 'FORMATTING');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('CAPITALIZATION', 'PUNCTUATION', 'FORMATTING', 'LEGAL_TERMS', 'SPEAKER_ID', 'NUMBERS', 'DATES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'RELEASED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('JOB_ASSIGNED', 'TRANSCRIPTION_COMPLETE', 'AI_REVIEW_COMPLETE', 'SCOPIST_ACCEPTED', 'SCOPIST_DECLINED', 'SCOPIST_SUBMITTED', 'REPORTER_REVIEWED', 'JOB_COMPLETE', 'SYSTEM_ERROR', 'MESSAGE_RECEIVED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ACTIVE', 'CLOSED', 'SETTLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseRole" AS ENUM ('ATTORNEY', 'PARALEGAL', 'REPORTER');

-- CreateEnum
CREATE TYPE "AttorneyRole" AS ENUM ('PLAINTIFF_COUNSEL', 'DEFENSE_COUNSEL', 'ORDERING_ATTORNEY', 'COPY_ATTORNEY', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseDocumentType" AS ENUM ('NOTICE_OF_DEPOSITION', 'CSR_PAPERWORK', 'DEPO_NOTES', 'COURT_ORDER', 'SUBPOENA', 'EXHIBIT_LIST', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TermCategory" AS ENUM ('PERSON_NAME', 'COMPANY_NAME', 'PLACE_NAME', 'LEGAL_TERM', 'MEDICAL_TERM', 'TECHNICAL_TERM', 'CASE_SPECIFIC');

-- CreateEnum
CREATE TYPE "AttorneyTranscriptStatus" AS ENUM ('NOT_REVIEWED', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CONVERTED', 'CANCELLED', 'RESCHEDULED', 'EXTERNAL_BLOCK');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('REPORTER_DOUBLE_BOOKED', 'LOCATION_CONFLICT', 'TRAVEL_TIME_INSUFFICIENT', 'RESOURCE_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('PENDING', 'OVERRIDDEN', 'RESOLVED', 'AUTO_FIXED');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('KEPT_ORIGINAL', 'MOVED_ORIGINAL', 'REASSIGNED_REPORTER', 'OVERRIDE_ACCEPTED', 'TIME_ADJUSTED');

-- CreateEnum
CREATE TYPE "ExternalCalendarSyncMode" AS ENUM ('READ_ONLY', 'PUSH_INTERNAL', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "ExternalCalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK', 'APPLE');

-- CreateEnum
CREATE TYPE "ExternalEventSyncStatus" AS ENUM ('SYNCED', 'PENDING', 'CONFLICT', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "CalendarAuditAction" AS ENUM ('EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_CANCELLED', 'EVENT_RESCHEDULED', 'REPORTER_ASSIGNED', 'REPORTER_UNASSIGNED', 'SCOPIST_ASSIGNED', 'SCOPIST_UNASSIGNED', 'VIDEOGRAPHER_ASSIGNED', 'VIDEOGRAPHER_UNASSIGNED', 'INTERPRETER_ASSIGNED', 'INTERPRETER_UNASSIGNED', 'CONVERTED_TO_JOB', 'NOTE_ADDED', 'STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO', 'STATEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('ATTORNEY_PLAINTIFF', 'ATTORNEY_DEFENSE', 'WITNESS', 'DEPONENT', 'INTERPRETER', 'VIDEOGRAPHER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "TranscriptAccessLevel" AS ENUM ('VIEW', 'COMMENT', 'EDIT');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('USER', 'LINK', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "HighlightColor" AS ENUM ('YELLOW', 'GREEN', 'BLUE', 'PINK', 'ORANGE', 'PURPLE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('IN_PERSON', 'ZOOM', 'TEAMS', 'WEBEX', 'PHONE', 'HYBRID', 'OTHER');

-- CreateEnum
CREATE TYPE "AgencyPlanType" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "VideoRecordType" AS ENUM ('CR_ONLY', 'CR_VIDEO', 'CR_PIP', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "DeliveryPriority" AS ENUM ('STANDARD', 'EXPEDITE', 'RUSH', 'DAILY', 'HOURLY', 'REALTIME');

-- CreateEnum
CREATE TYPE "TranscriptDeliveryType" AS ENUM ('E_TRANS', 'HARD_COPY', 'ORIGINAL', 'BOTH', 'FTP', 'PORTAL');

-- CreateEnum
CREATE TYPE "TranscriptFileFormat" AS ENUM ('WORD', 'PDF', 'ASCII', 'WORD_PERFECT', 'RTF', 'PTX');

-- CreateEnum
CREATE TYPE "OrderFulfillmentStatus" AS ENUM ('PENDING', 'READY', 'SENT', 'DELIVERED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeponentRole" AS ENUM ('PLAINTIFF', 'DEFENDANT', 'CORPORATE_REP', 'EXPERT_WITNESS', 'FACT_WITNESS', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "AppearanceType" AS ENUM ('IN_PERSON', 'REMOTE', 'PHONE');

-- CreateEnum
CREATE TYPE "CSRAttorneyRole" AS ENUM ('ORDERING_ATTORNEY', 'COPY_ATTORNEY', 'PLAINTIFF_COUNSEL', 'DEFENSE_COUNSEL', 'CROSS_NOTICING', 'OTHER');

-- CreateEnum
CREATE TYPE "RushType" AS ENUM ('STANDARD', 'EXPEDITE', 'DAILY', 'HOURLY', 'REALTIME');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('PLAINTIFF', 'DEFENDANT', 'CROSS_PLAINTIFF', 'CROSS_DEFENDANT', 'THIRD_PARTY', 'INTERVENOR');

-- CreateEnum
CREATE TYPE "ProperNounCategory" AS ENUM ('PERSON_NAME', 'COMPANY_NAME', 'PLACE_NAME', 'PRODUCT_NAME', 'LEGAL_TERM', 'MEDICAL_TERM', 'TECHNICAL_TERM', 'ACRONYM', 'OTHER');

-- CreateEnum
CREATE TYPE "TranscriptFormat" AS ENUM ('WORD', 'PDF', 'ASCII', 'WORD_PERFECT', 'RTF');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('E_TRANS', 'HARD_COPY', 'BOTH', 'FTP', 'PORTAL');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('PER_PAGE', 'PER_AUDIO_MINUTE', 'FLAT_RATE', 'HOURLY');

-- CreateEnum
CREATE TYPE "BillingServiceType" AS ENUM ('TRANSCRIPTION_AUTOMATED', 'MODEL_UPGRADE', 'HUMAN_REVIEW_CONFIDENCE', 'HUMAN_REVIEW_FULL', 'FORENSIC_AUDIO_RX');

-- CreateEnum
CREATE TYPE "BillingUnit" AS ENUM ('PER_MINUTE', 'PER_WORD', 'PER_FILE', 'PER_HOUR');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "AudioEnhancementType" AS ENUM ('AUTOMATED_DOLBY', 'MANUAL_RX');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firmId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "photo" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "agencyName" TEXT,
    "csrNumber" TEXT,
    "specialties" TEXT[],
    "experienceLevel" TEXT,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "defaultTranscriptSettings" JSONB,
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "agencyId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseName" TEXT NOT NULL,
    "caseNumber" TEXT,
    "depositionDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "zoomLink" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'CREATED',
    "firmId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "caseId" TEXT,
    "transcriptionModelType" TEXT DEFAULT 'MEDICAL',
    "transcriptionCompletedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "scopistId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "agencyId" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFile" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exhibit" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "jobId" TEXT,
    "exhibitLabel" TEXT NOT NULL,
    "exhibitNumber" INTEGER,
    "description" TEXT NOT NULL,
    "originalFileUrl" TEXT NOT NULL,
    "stampedFileUrl" TEXT,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "stamped" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByRole" "UserRole" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exhibit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioEnhancement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "originalAudioUrl" TEXT NOT NULL,
    "originalDuration" DOUBLE PRECISION NOT NULL,
    "originalFileSize" INTEGER NOT NULL,
    "enhancementMode" "EnhancementMode" NOT NULL,
    "dolbyProcessed" BOOLEAN NOT NULL DEFAULT false,
    "dolbyAudioUrl" TEXT,
    "dolbyQualityScore" DOUBLE PRECISION,
    "auphonicProcessed" BOOLEAN NOT NULL DEFAULT false,
    "auphonicAudioUrl" TEXT,
    "auphonicQualityScore" DOUBLE PRECISION,
    "finalAudioUrl" TEXT NOT NULL,
    "engineUsed" TEXT NOT NULL,
    "dolbyCostCents" INTEGER,
    "auphonicCostCents" INTEGER,
    "totalCostCents" INTEGER NOT NULL,
    "qualityFlags" JSONB,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AudioEnhancement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptionJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "deepgramRequestId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" "TranscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "rawJson" JSONB,
    "duration" DOUBLE PRECISION,
    "wordCount" INTEGER,
    "averageConfidence" DOUBLE PRECISION,
    "speakerCount" INTEGER,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TranscriptionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "wordCount" INTEGER,
    "pageCount" INTEGER,
    "averageConfidence" DOUBLE PRECISION,
    "speakerCount" INTEGER,
    "aiChanges" JSONB,
    "aiFlags" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptToken" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "punctuatedWord" TEXT,
    "start" DOUBLE PRECISION NOT NULL,
    "end" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "speaker" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcription" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fullTranscript" TEXT NOT NULL,
    "deepgramRawJson" TEXT,
    "words" JSONB NOT NULL,
    "utterances" JSONB,
    "flaggedSegments" JSONB,
    "speakerAnalysis" JSONB,
    "speakerAssignments" JSONB,
    "duration" DOUBLE PRECISION,
    "wordCount" INTEGER,
    "flaggedWordCount" INTEGER,
    "averageConfidence" DOUBLE PRECISION,
    "speakerCount" INTEGER NOT NULL DEFAULT 0,
    "modelUsed" TEXT,
    "status" "TranscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockReason" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,

    CONSTRAINT "Transcription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptionEdit" (
    "id" TEXT NOT NULL,
    "transcriptionId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "editorEmail" TEXT,
    "editorRole" "UserRole",
    "editType" "EditType" NOT NULL DEFAULT 'WORD_CORRECTION',
    "originalText" TEXT,
    "editedText" TEXT,
    "position" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptionEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "ruleType" TEXT NOT NULL,
    "pattern" TEXT,
    "replacement" TEXT,
    "prompt" TEXT,
    "examples" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "scopistId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "scopistNotes" TEXT,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkText" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "firmId" TEXT,
    "metadata" JSONB,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusCode" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "caseStyle" TEXT NOT NULL,
    "shortTitle" TEXT,
    "courtName" TEXT,
    "courtType" TEXT,
    "county" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Texas',
    "judgeAssigned" TEXT,
    "plaintiffs" JSONB,
    "defendants" JSONB,
    "otherParties" JSONB,
    "status" "CaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "roleInCase" "CaseRole" NOT NULL,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAttorney" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barNumber" TEXT,
    "firm" TEXT,
    "role" "AttorneyRole" NOT NULL,
    "representing" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "deliveryFormat" TEXT,
    "deliveryPriority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseAttorney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentType" "CaseDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractedData" JSONB,
    "extractedAt" TIMESTAMP(3),
    "extractionError" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseExtractedTerm" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "category" "TermCategory" NOT NULL,
    "phonetic" TEXT,
    "source" TEXT,
    "confidence" DOUBLE PRECISION,
    "useInTranscription" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseExtractedTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyTranscript" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deponent" TEXT NOT NULL,
    "caseName" TEXT,
    "depositionDate" TIMESTAMP(3),
    "status" "AttorneyTranscriptStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "transcriptData" JSONB NOT NULL,
    "totalPages" INTEGER NOT NULL,
    "totalLines" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttorneyTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptAnnotation" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "issueCode" TEXT NOT NULL,
    "issueLabel" TEXT NOT NULL,
    "issueColor" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "lineStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "lineEnd" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptAnnotationExhibit" (
    "id" TEXT NOT NULL,
    "annotationId" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptAnnotationExhibit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL DEFAULT 'DEPOSITION',
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'REQUESTED',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceEndDate" TIMESTAMP(3),
    "parentEventId" TEXT,
    "location" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "meetingLink" TEXT,
    "jobId" TEXT,
    "assignedReporterId" TEXT,
    "requestedById" TEXT,
    "scheduledById" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "cancellationReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "agencyId" TEXT,
    "orderingAttorneyId" TEXT,
    "lastRescheduledAt" TIMESTAMP(3),
    "lastRescheduledById" TEXT,
    "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "originalStartTime" TIMESTAMP(3),

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "externalName" TEXT,
    "externalEmail" TEXT,
    "externalPhone" TEXT,
    "role" "ParticipantRole" NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_availability" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "type" "AvailabilityType" NOT NULL DEFAULT 'AVAILABLE',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceEnd" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_notes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_conflicts" (
    "id" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "conflictEventId" TEXT NOT NULL,
    "conflictType" "ConflictType" NOT NULL,
    "proposedStart" TIMESTAMP(3) NOT NULL,
    "proposedEnd" TIMESTAMP(3) NOT NULL,
    "overlapMinutes" INTEGER NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" "ConflictResolution",
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firmId" TEXT NOT NULL,

    CONSTRAINT "schedule_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_calendar_connections" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ExternalCalendarProvider" NOT NULL,
    "syncMode" "ExternalCalendarSyncMode" NOT NULL DEFAULT 'READ_ONLY',
    "providerCalendarId" TEXT NOT NULL,
    "calendarName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncToken" TEXT,
    "syncErrorCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncError" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalMins" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_calendar_events" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "providerCalendarId" TEXT NOT NULL,
    "providerEtag" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "meetingLink" TEXT,
    "syncStatus" "ExternalEventSyncStatus" NOT NULL DEFAULT 'SYNCED',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncError" TEXT,
    "hasConflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictingEventIds" TEXT[],
    "linkedEventId" TEXT,
    "isBlockingTime" BOOLEAN NOT NULL DEFAULT true,
    "showInCalendar" BOOLEAN NOT NULL DEFAULT true,
    "providerMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "external_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_calendar_sync_logs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "eventsCreated" INTEGER NOT NULL DEFAULT 0,
    "eventsUpdated" INTEGER NOT NULL DEFAULT 0,
    "eventsDeleted" INTEGER NOT NULL DEFAULT 0,
    "conflictsFound" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "errorDetails" JSONB,

    CONSTRAINT "external_calendar_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_audit_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" "CalendarAuditAction" NOT NULL,
    "performedById" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_requests" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "caseName" TEXT NOT NULL,
    "caseNumber" TEXT,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "alternateDate1" TIMESTAMP(3),
    "alternateDate2" TIMESTAMP(3),
    "estimatedDuration" INTEGER NOT NULL DEFAULT 240,
    "eventType" "EventType" NOT NULL DEFAULT 'DEPOSITION',
    "location" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "deponentName" TEXT NOT NULL,
    "deponentContact" TEXT,
    "needsInterpreter" BOOLEAN NOT NULL DEFAULT false,
    "interpreterLanguage" TEXT,
    "needsVideographer" BOOLEAN NOT NULL DEFAULT false,
    "needsRealtime" BOOLEAN NOT NULL DEFAULT false,
    "specialNotes" TEXT,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "calendarEventId" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "barNumber" TEXT,
    "barState" TEXT,
    "firmName" TEXT,
    "firmAddress" TEXT,
    "firmPhone" TEXT,
    "practiceAreas" TEXT[],
    "defaultExportFormat" TEXT DEFAULT 'PDF',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "billingEmail" TEXT,
    "billingAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttorneyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptAccess" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" "TranscriptAccessLevel" NOT NULL DEFAULT 'VIEW',
    "grantedById" TEXT NOT NULL,
    "caseId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "downloadLimit" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptShare" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "shareType" "ShareType" NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "shareToken" TEXT,
    "accessLevel" "TranscriptAccessLevel" NOT NULL DEFAULT 'VIEW',
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "status" "ShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TranscriptShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptHighlight" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startIndex" INTEGER NOT NULL,
    "endIndex" INTEGER NOT NULL,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "highlightedText" TEXT NOT NULL,
    "color" "HighlightColor" NOT NULL DEFAULT 'YELLOW',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firmId" TEXT,
    "caseId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptHighlightTag" (
    "id" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptHighlightTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptNote" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "pageNumber" INTEGER,
    "timestamp" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptBookmark" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "timestamp" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "snippetText" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "planType" "AgencyPlanType" NOT NULL DEFAULT 'BASIC',
    "maxReporters" INTEGER NOT NULL DEFAULT 10,
    "maxFirms" INTEGER NOT NULL DEFAULT 5,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReporterUnavailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReporterUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attorney" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "firmName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "barNumber" TEXT,
    "barState" TEXT,
    "licensureStates" TEXT[],
    "preferredFormat" TEXT,
    "preferredDelivery" TEXT,
    "defaultRushPreference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attorney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CSRRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "depositionDate" TIMESTAMP(3) NOT NULL,
    "scheduledStartTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "locationType" "LocationType" NOT NULL DEFAULT 'IN_PERSON',
    "locationAddress" TEXT,
    "locationCity" TEXT,
    "locationState" TEXT,
    "locationZip" TEXT,
    "conferenceRoom" TEXT,
    "interpreterRequired" BOOLEAN NOT NULL DEFAULT false,
    "interpreterLanguage" TEXT,
    "videographerRequired" BOOLEAN NOT NULL DEFAULT false,
    "videographerName" TEXT,
    "realtimeRequired" BOOLEAN NOT NULL DEFAULT false,
    "videoType" "VideoRecordType" NOT NULL DEFAULT 'CR_ONLY',
    "isCROnly" BOOLEAN NOT NULL DEFAULT true,
    "isVideoRecord" BOOLEAN NOT NULL DEFAULT false,
    "isPIP" BOOLEAN NOT NULL DEFAULT false,
    "caseCaption" TEXT NOT NULL,
    "causeNumber" TEXT,
    "courtName" TEXT,
    "courtType" TEXT,
    "county" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Texas',
    "judge" TEXT,
    "dateOfLoss" TIMESTAMP(3),
    "claimNumber" TEXT,
    "policyNumber" TEXT,
    "insurerName" TEXT,
    "insuredName" TEXT,
    "isEUO" BOOLEAN NOT NULL DEFAULT false,
    "adjustorName" TEXT,
    "adjustorEmail" TEXT,
    "adjustorPhone" TEXT,
    "readAndSignRequired" BOOLEAN NOT NULL DEFAULT true,
    "signatureWaived" BOOLEAN NOT NULL DEFAULT false,
    "waivedReason" TEXT,
    "readAndSignSentAt" TIMESTAMP(3),
    "readAndSignReceivedAt" TIMESTAMP(3),
    "readAndSignExpiresAt" TIMESTAMP(3),
    "changesReceived" BOOLEAN NOT NULL DEFAULT false,
    "changeCount" INTEGER NOT NULL DEFAULT 0,
    "travelMiles" DOUBLE PRECISION,
    "parkingRequired" BOOLEAN NOT NULL DEFAULT false,
    "parkingFees" DECIMAL(10,2),
    "parkingNotes" TEXT,
    "accessInstructions" TEXT,
    "securityNotes" TEXT,
    "deliveryPriority" "DeliveryPriority" NOT NULL DEFAULT 'STANDARD',
    "rushDueDate" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedReason" TEXT,
    "originalDocumentUrl" TEXT,
    "originalDocumentType" TEXT,
    "aiExtractedFields" JSONB,
    "aiExtractionConfidence" DOUBLE PRECISION,
    "aiExtractedAt" TIMESTAMP(3),
    "manualOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CSRRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptOrder" (
    "id" TEXT NOT NULL,
    "csrRecordId" TEXT NOT NULL,
    "attorneyName" TEXT NOT NULL,
    "firmName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "fax" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "deliveryType" "TranscriptDeliveryType" NOT NULL DEFAULT 'E_TRANS',
    "fileFormat" "TranscriptFileFormat" NOT NULL DEFAULT 'WORD',
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "copyCount" INTEGER NOT NULL DEFAULT 1,
    "status" "OrderFulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "pageCount" INTEGER,
    "pricePerPage" DECIMAL(10,2),
    "totalPrice" DECIMAL(10,2),
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoicedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CSRWitness" (
    "id" TEXT NOT NULL,
    "csrRecordId" TEXT NOT NULL,
    "fullLegalName" TEXT NOT NULL,
    "preferredName" TEXT,
    "role" "DeponentRole" NOT NULL DEFAULT 'FACT_WITNESS',
    "entityRepresented" TEXT,
    "city" TEXT,
    "state" TEXT,
    "appearanceType" "AppearanceType" NOT NULL DEFAULT 'IN_PERSON',
    "readAndSignRequired" BOOLEAN NOT NULL DEFAULT true,
    "signatureWaived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSRWitness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CSRAttorney" (
    "id" TEXT NOT NULL,
    "csrRecordId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "role" "CSRAttorneyRole" NOT NULL,
    "representing" TEXT,
    "deliveryFormat" TEXT,
    "deliveryMethod" TEXT,
    "rushRequested" BOOLEAN NOT NULL DEFAULT false,
    "rushType" "RushType",
    "needsOriginal" BOOLEAN NOT NULL DEFAULT false,
    "needsCopy" BOOLEAN NOT NULL DEFAULT true,
    "copyCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSRAttorney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CSRParty" (
    "id" TEXT NOT NULL,
    "csrRecordId" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "isEntity" BOOLEAN NOT NULL DEFAULT false,
    "entityType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSRParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CSRProperNoun" (
    "id" TEXT NOT NULL,
    "csrRecordId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" "ProperNounCategory" NOT NULL,
    "phoneticHint" TEXT,
    "source" TEXT,
    "useInTranscription" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSRProperNoun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CSRTranscriptOptions" (
    "id" TEXT NOT NULL,
    "csrRecordId" TEXT NOT NULL,
    "format" "TranscriptFormat" NOT NULL DEFAULT 'WORD',
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'E_TRANS',
    "rushType" "RushType" NOT NULL DEFAULT 'STANDARD',
    "rushDeadline" TIMESTAMP(3),
    "includeWordIndex" BOOLEAN NOT NULL DEFAULT false,
    "includeExhibitList" BOOLEAN NOT NULL DEFAULT true,
    "includeAppearances" BOOLEAN NOT NULL DEFAULT true,
    "colorExhibits" BOOLEAN NOT NULL DEFAULT false,
    "pageCount" INTEGER,
    "lineCount" INTEGER,
    "exhibitCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CSRTranscriptOptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobExhibit" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "exhibitNumber" TEXT NOT NULL,
    "exhibitLabel" TEXT,
    "description" TEXT,
    "fileId" TEXT,
    "externalUrl" TEXT,
    "introducedAtTimestamp" DOUBLE PRECISION,
    "discussionStartTimestamp" DOUBLE PRECISION,
    "discussionEndTimestamp" DOUBLE PRECISION,
    "introducedAtLine" INTEGER,
    "introducedAtPage" INTEGER,
    "pageCount" INTEGER,
    "isMarkedForRecord" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobExhibit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobClaim" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "scopistId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "proposedRate" DECIMAL(65,30),
    "agreedRate" DECIMAL(65,30),
    "rateType" "RateType" NOT NULL DEFAULT 'PER_PAGE',
    "scopistNote" TEXT,
    "reporterNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAvailableForWork" BOOLEAN NOT NULL DEFAULT true,
    "minPagesAccepted" INTEGER,
    "maxPagesAccepted" INTEGER,
    "preferredRatePerPage" DECIMAL(65,30),
    "preferredRatePerMinute" DECIMAL(65,30),
    "acceptsRushJobs" BOOLEAN NOT NULL DEFAULT true,
    "acceptsMedicalDepos" BOOLEAN NOT NULL DEFAULT true,
    "acceptsTechnicalDepos" BOOLEAN NOT NULL DEFAULT true,
    "preferredStates" TEXT[],
    "autoAcceptClaims" BOOLEAN NOT NULL DEFAULT false,
    "preferredScopists" TEXT[],
    "blockedScopists" TEXT[],
    "defaultRatePerPage" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccount" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "billingEmail" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRate" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "serviceType" "BillingServiceType" NOT NULL,
    "unit" "BillingUnit" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPeriod" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "jobId" TEXT,
    "serviceType" "BillingServiceType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit" "BillingUnit" NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "rateVersion" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingUsageRecord" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "serviceType" "BillingServiceType" NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit" "BillingUnit" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceLineItemId" TEXT,

    CONSTRAINT "BillingUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanReviewSession" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "minutesSpent" INTEGER NOT NULL,
    "wordsReviewed" INTEGER NOT NULL,
    "confidenceThreshold" INTEGER NOT NULL DEFAULT 85,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HumanReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioProcessingSession" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "enhancementType" "AudioEnhancementType" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioProcessingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_firmId_idx" ON "User"("firmId");

-- CreateIndex
CREATE INDEX "User_firmId_role_idx" ON "User"("firmId", "role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_updatedAt_idx" ON "User"("updatedAt");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE INDEX "Job_createdById_idx" ON "Job"("createdById");

-- CreateIndex
CREATE INDEX "Job_firmId_idx" ON "Job"("firmId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_scopistId_idx" ON "Job"("scopistId");

-- CreateIndex
CREATE INDEX "Job_firmId_status_idx" ON "Job"("firmId", "status");

-- CreateIndex
CREATE INDEX "Job_firmId_createdById_idx" ON "Job"("firmId", "createdById");

-- CreateIndex
CREATE INDEX "Job_firmId_scopistId_idx" ON "Job"("firmId", "scopistId");

-- CreateIndex
CREATE INDEX "Job_status_dueDate_idx" ON "Job"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Job_caseId_idx" ON "Job"("caseId");

-- CreateIndex
CREATE INDEX "Job_depositionDate_idx" ON "Job"("depositionDate");

-- CreateIndex
CREATE INDEX "Job_dueDate_idx" ON "Job"("dueDate");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_updatedAt_idx" ON "Job"("updatedAt");

-- CreateIndex
CREATE INDEX "Job_completedAt_idx" ON "Job"("completedAt");

-- CreateIndex
CREATE INDEX "JobFile_jobId_type_idx" ON "JobFile"("jobId", "type");

-- CreateIndex
CREATE INDEX "Exhibit_caseId_idx" ON "Exhibit"("caseId");

-- CreateIndex
CREATE INDEX "Exhibit_jobId_idx" ON "Exhibit"("jobId");

-- CreateIndex
CREATE INDEX "Exhibit_createdById_idx" ON "Exhibit"("createdById");

-- CreateIndex
CREATE INDEX "Exhibit_uploadedByRole_idx" ON "Exhibit"("uploadedByRole");

-- CreateIndex
CREATE INDEX "Exhibit_stamped_idx" ON "Exhibit"("stamped");

-- CreateIndex
CREATE INDEX "Exhibit_createdAt_idx" ON "Exhibit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibit_caseId_jobId_exhibitLabel_key" ON "Exhibit"("caseId", "jobId", "exhibitLabel");

-- CreateIndex
CREATE INDEX "AudioEnhancement_jobId_idx" ON "AudioEnhancement"("jobId");

-- CreateIndex
CREATE INDEX "AudioEnhancement_createdAt_idx" ON "AudioEnhancement"("createdAt");

-- CreateIndex
CREATE INDEX "AudioEnhancement_completedAt_idx" ON "AudioEnhancement"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptionJob_deepgramRequestId_key" ON "TranscriptionJob"("deepgramRequestId");

-- CreateIndex
CREATE INDEX "TranscriptionJob_jobId_idx" ON "TranscriptionJob"("jobId");

-- CreateIndex
CREATE INDEX "TranscriptionJob_status_idx" ON "TranscriptionJob"("status");

-- CreateIndex
CREATE INDEX "TranscriptionJob_createdAt_idx" ON "TranscriptionJob"("createdAt");

-- CreateIndex
CREATE INDEX "TranscriptionJob_completedAt_idx" ON "TranscriptionJob"("completedAt");

-- CreateIndex
CREATE INDEX "Transcript_jobId_versionNumber_idx" ON "Transcript"("jobId", "versionNumber");

-- CreateIndex
CREATE INDEX "Transcript_createdAt_idx" ON "Transcript"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_jobId_version_key" ON "Transcript"("jobId", "version");

-- CreateIndex
CREATE INDEX "TranscriptToken_transcriptId_index_idx" ON "TranscriptToken"("transcriptId", "index");

-- CreateIndex
CREATE INDEX "TranscriptToken_transcriptId_isFlagged_idx" ON "TranscriptToken"("transcriptId", "isFlagged");

-- CreateIndex
CREATE INDEX "TranscriptToken_createdAt_idx" ON "TranscriptToken"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transcription_jobId_key" ON "Transcription"("jobId");

-- CreateIndex
CREATE INDEX "Transcription_jobId_idx" ON "Transcription"("jobId");

-- CreateIndex
CREATE INDEX "Transcription_createdAt_idx" ON "Transcription"("createdAt");

-- CreateIndex
CREATE INDEX "Transcription_updatedAt_idx" ON "Transcription"("updatedAt");

-- CreateIndex
CREATE INDEX "Transcription_lockedAt_idx" ON "Transcription"("lockedAt");

-- CreateIndex
CREATE INDEX "TranscriptionEdit_transcriptionId_idx" ON "TranscriptionEdit"("transcriptionId");

-- CreateIndex
CREATE INDEX "TranscriptionEdit_createdAt_idx" ON "TranscriptionEdit"("createdAt");

-- CreateIndex
CREATE INDEX "AIRule_enabled_priority_idx" ON "AIRule"("enabled", "priority");

-- CreateIndex
CREATE INDEX "AIRule_createdAt_idx" ON "AIRule"("createdAt");

-- CreateIndex
CREATE INDEX "AIRule_updatedAt_idx" ON "AIRule"("updatedAt");

-- CreateIndex
CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");

-- CreateIndex
CREATE INDEX "JobAssignment_scopistId_status_idx" ON "JobAssignment"("scopistId", "status");

-- CreateIndex
CREATE INDEX "JobAssignment_invitedAt_idx" ON "JobAssignment"("invitedAt");

-- CreateIndex
CREATE INDEX "JobAssignment_respondedAt_idx" ON "JobAssignment"("respondedAt");

-- CreateIndex
CREATE INDEX "JobAssignment_startedAt_idx" ON "JobAssignment"("startedAt");

-- CreateIndex
CREATE INDEX "JobAssignment_submittedAt_idx" ON "JobAssignment"("submittedAt");

-- CreateIndex
CREATE INDEX "Message_jobId_createdAt_idx" ON "Message"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_firmId_idx" ON "AuditLog"("firmId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_idx" ON "AuditLog"("targetType");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_firmId_createdAt_idx" ON "AuditLog"("firmId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_firmId_action_idx" ON "AuditLog"("firmId", "action");

-- CreateIndex
CREATE INDEX "UsageRecord_firmId_idx" ON "UsageRecord"("firmId");

-- CreateIndex
CREATE INDEX "UsageRecord_type_idx" ON "UsageRecord"("type");

-- CreateIndex
CREATE INDEX "UsageRecord_createdAt_idx" ON "UsageRecord"("createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_firmId_type_idx" ON "UsageRecord"("firmId", "type");

-- CreateIndex
CREATE INDEX "UsageRecord_firmId_createdAt_idx" ON "UsageRecord"("firmId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_firmId_type_createdAt_idx" ON "UsageRecord"("firmId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "Firm_name_idx" ON "Firm"("name");

-- CreateIndex
CREATE INDEX "Firm_createdAt_idx" ON "Firm"("createdAt");

-- CreateIndex
CREATE INDEX "Firm_updatedAt_idx" ON "Firm"("updatedAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");

-- CreateIndex
CREATE INDEX "BackgroundJob_type_idx" ON "BackgroundJob"("type");

-- CreateIndex
CREATE INDEX "BackgroundJob_priority_idx" ON "BackgroundJob"("priority");

-- CreateIndex
CREATE INDEX "BackgroundJob_scheduledFor_idx" ON "BackgroundJob"("scheduledFor");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_scheduledFor_idx" ON "BackgroundJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_priority_idx" ON "BackgroundJob"("status", "priority");

-- CreateIndex
CREATE INDEX "BackgroundJob_idempotencyKey_idx" ON "BackgroundJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BackgroundJob_createdAt_idx" ON "BackgroundJob"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookConfig_firmId_idx" ON "WebhookConfig"("firmId");

-- CreateIndex
CREATE INDEX "WebhookConfig_isActive_idx" ON "WebhookConfig"("isActive");

-- CreateIndex
CREATE INDEX "WebhookConfig_firmId_isActive_idx" ON "WebhookConfig"("firmId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_event_idx" ON "WebhookDelivery"("event");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "Case_firmId_idx" ON "Case"("firmId");

-- CreateIndex
CREATE INDEX "Case_caseNumber_idx" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_createdById_idx" ON "Case"("createdById");

-- CreateIndex
CREATE INDEX "Case_createdAt_idx" ON "Case"("createdAt");

-- CreateIndex
CREATE INDEX "Case_updatedAt_idx" ON "Case"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Case_firmId_caseNumber_key" ON "Case"("firmId", "caseNumber");

-- CreateIndex
CREATE INDEX "CaseMembership_userId_idx" ON "CaseMembership"("userId");

-- CreateIndex
CREATE INDEX "CaseMembership_caseId_idx" ON "CaseMembership"("caseId");

-- CreateIndex
CREATE INDEX "CaseMembership_roleInCase_idx" ON "CaseMembership"("roleInCase");

-- CreateIndex
CREATE INDEX "CaseMembership_createdAt_idx" ON "CaseMembership"("createdAt");

-- CreateIndex
CREATE INDEX "CaseMembership_updatedAt_idx" ON "CaseMembership"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMembership_userId_caseId_key" ON "CaseMembership"("userId", "caseId");

-- CreateIndex
CREATE INDEX "CaseAttorney_caseId_idx" ON "CaseAttorney"("caseId");

-- CreateIndex
CREATE INDEX "CaseAttorney_email_idx" ON "CaseAttorney"("email");

-- CreateIndex
CREATE INDEX "CaseAttorney_createdAt_idx" ON "CaseAttorney"("createdAt");

-- CreateIndex
CREATE INDEX "CaseAttorney_updatedAt_idx" ON "CaseAttorney"("updatedAt");

-- CreateIndex
CREATE INDEX "CaseDocument_caseId_idx" ON "CaseDocument"("caseId");

-- CreateIndex
CREATE INDEX "CaseDocument_documentType_idx" ON "CaseDocument"("documentType");

-- CreateIndex
CREATE INDEX "CaseDocument_uploadedAt_idx" ON "CaseDocument"("uploadedAt");

-- CreateIndex
CREATE INDEX "CaseExtractedTerm_caseId_idx" ON "CaseExtractedTerm"("caseId");

-- CreateIndex
CREATE INDEX "CaseExtractedTerm_category_idx" ON "CaseExtractedTerm"("category");

-- CreateIndex
CREATE INDEX "CaseExtractedTerm_createdAt_idx" ON "CaseExtractedTerm"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseExtractedTerm_caseId_term_key" ON "CaseExtractedTerm"("caseId", "term");

-- CreateIndex
CREATE INDEX "AttorneyTranscript_uploadedById_idx" ON "AttorneyTranscript"("uploadedById");

-- CreateIndex
CREATE INDEX "AttorneyTranscript_status_idx" ON "AttorneyTranscript"("status");

-- CreateIndex
CREATE INDEX "AttorneyTranscript_deponent_idx" ON "AttorneyTranscript"("deponent");

-- CreateIndex
CREATE INDEX "AttorneyTranscript_uploadedAt_idx" ON "AttorneyTranscript"("uploadedAt");

-- CreateIndex
CREATE INDEX "TranscriptAnnotation_transcriptId_idx" ON "TranscriptAnnotation"("transcriptId");

-- CreateIndex
CREATE INDEX "TranscriptAnnotation_createdById_idx" ON "TranscriptAnnotation"("createdById");

-- CreateIndex
CREATE INDEX "TranscriptAnnotation_issueCode_idx" ON "TranscriptAnnotation"("issueCode");

-- CreateIndex
CREATE INDEX "TranscriptAnnotation_createdAt_idx" ON "TranscriptAnnotation"("createdAt");

-- CreateIndex
CREATE INDEX "TranscriptAnnotationExhibit_annotationId_idx" ON "TranscriptAnnotationExhibit"("annotationId");

-- CreateIndex
CREATE INDEX "TranscriptAnnotationExhibit_exhibitId_idx" ON "TranscriptAnnotationExhibit"("exhibitId");

-- CreateIndex
CREATE INDEX "TranscriptAnnotationExhibit_createdById_idx" ON "TranscriptAnnotationExhibit"("createdById");

-- CreateIndex
CREATE INDEX "TranscriptAnnotationExhibit_createdAt_idx" ON "TranscriptAnnotationExhibit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptAnnotationExhibit_annotationId_exhibitId_key" ON "TranscriptAnnotationExhibit"("annotationId", "exhibitId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_createdAt_idx" ON "PasswordResetToken"("createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expires_idx" ON "PasswordResetToken"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_jobId_key" ON "calendar_events"("jobId");

-- CreateIndex
CREATE INDEX "calendar_events_firmId_idx" ON "calendar_events"("firmId");

-- CreateIndex
CREATE INDEX "calendar_events_jobId_idx" ON "calendar_events"("jobId");

-- CreateIndex
CREATE INDEX "calendar_events_createdById_idx" ON "calendar_events"("createdById");

-- CreateIndex
CREATE INDEX "calendar_events_assignedReporterId_idx" ON "calendar_events"("assignedReporterId");

-- CreateIndex
CREATE INDEX "calendar_events_startTime_idx" ON "calendar_events"("startTime");

-- CreateIndex
CREATE INDEX "calendar_events_endTime_idx" ON "calendar_events"("endTime");

-- CreateIndex
CREATE INDEX "calendar_events_status_idx" ON "calendar_events"("status");

-- CreateIndex
CREATE INDEX "calendar_events_firmId_startTime_endTime_idx" ON "calendar_events"("firmId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "calendar_events_assignedReporterId_startTime_idx" ON "calendar_events"("assignedReporterId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_createdById_startTime_idx" ON "calendar_events"("createdById", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_firmId_startTime_idx" ON "calendar_events"("firmId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_createdAt_idx" ON "calendar_events"("createdAt");

-- CreateIndex
CREATE INDEX "calendar_events_updatedAt_idx" ON "calendar_events"("updatedAt");

-- CreateIndex
CREATE INDEX "calendar_events_confirmedAt_idx" ON "calendar_events"("confirmedAt");

-- CreateIndex
CREATE INDEX "calendar_events_cancelledAt_idx" ON "calendar_events"("cancelledAt");

-- CreateIndex
CREATE INDEX "event_participants_eventId_idx" ON "event_participants"("eventId");

-- CreateIndex
CREATE INDEX "event_participants_createdAt_idx" ON "event_participants"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_eventId_userId_key" ON "event_participants"("eventId", "userId");

-- CreateIndex
CREATE INDEX "reporter_availability_reporterId_startTime_endTime_idx" ON "reporter_availability"("reporterId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "reporter_availability_firmId_type_idx" ON "reporter_availability"("firmId", "type");

-- CreateIndex
CREATE INDEX "reporter_availability_createdAt_idx" ON "reporter_availability"("createdAt");

-- CreateIndex
CREATE INDEX "reporter_availability_updatedAt_idx" ON "reporter_availability"("updatedAt");

-- CreateIndex
CREATE INDEX "calendar_event_notes_eventId_idx" ON "calendar_event_notes"("eventId");

-- CreateIndex
CREATE INDEX "calendar_event_notes_createdById_idx" ON "calendar_event_notes"("createdById");

-- CreateIndex
CREATE INDEX "schedule_conflicts_sourceEventId_idx" ON "schedule_conflicts"("sourceEventId");

-- CreateIndex
CREATE INDEX "schedule_conflicts_conflictEventId_idx" ON "schedule_conflicts"("conflictEventId");

-- CreateIndex
CREATE INDEX "schedule_conflicts_firmId_idx" ON "schedule_conflicts"("firmId");

-- CreateIndex
CREATE INDEX "schedule_conflicts_status_idx" ON "schedule_conflicts"("status");

-- CreateIndex
CREATE INDEX "external_calendar_connections_firmId_idx" ON "external_calendar_connections"("firmId");

-- CreateIndex
CREATE INDEX "external_calendar_connections_userId_idx" ON "external_calendar_connections"("userId");

-- CreateIndex
CREATE INDEX "external_calendar_connections_isEnabled_idx" ON "external_calendar_connections"("isEnabled");

-- CreateIndex
CREATE INDEX "external_calendar_connections_lastSyncedAt_idx" ON "external_calendar_connections"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "external_calendar_connections_userId_provider_providerCalen_key" ON "external_calendar_connections"("userId", "provider", "providerCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "external_calendar_events_linkedEventId_key" ON "external_calendar_events"("linkedEventId");

-- CreateIndex
CREATE INDEX "external_calendar_events_firmId_idx" ON "external_calendar_events"("firmId");

-- CreateIndex
CREATE INDEX "external_calendar_events_connectionId_idx" ON "external_calendar_events"("connectionId");

-- CreateIndex
CREATE INDEX "external_calendar_events_startTime_endTime_idx" ON "external_calendar_events"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "external_calendar_events_hasConflict_idx" ON "external_calendar_events"("hasConflict");

-- CreateIndex
CREATE INDEX "external_calendar_events_linkedEventId_idx" ON "external_calendar_events"("linkedEventId");

-- CreateIndex
CREATE INDEX "external_calendar_events_deletedAt_idx" ON "external_calendar_events"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "external_calendar_events_connectionId_providerEventId_key" ON "external_calendar_events"("connectionId", "providerEventId");

-- CreateIndex
CREATE INDEX "external_calendar_sync_logs_connectionId_idx" ON "external_calendar_sync_logs"("connectionId");

-- CreateIndex
CREATE INDEX "external_calendar_sync_logs_startedAt_idx" ON "external_calendar_sync_logs"("startedAt");

-- CreateIndex
CREATE INDEX "external_calendar_sync_logs_status_idx" ON "external_calendar_sync_logs"("status");

-- CreateIndex
CREATE INDEX "calendar_audit_logs_eventId_idx" ON "calendar_audit_logs"("eventId");

-- CreateIndex
CREATE INDEX "calendar_audit_logs_performedById_idx" ON "calendar_audit_logs"("performedById");

-- CreateIndex
CREATE INDEX "calendar_audit_logs_action_idx" ON "calendar_audit_logs"("action");

-- CreateIndex
CREATE INDEX "calendar_audit_logs_createdAt_idx" ON "calendar_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "booking_requests_calendarEventId_key" ON "booking_requests"("calendarEventId");

-- CreateIndex
CREATE INDEX "booking_requests_firmId_status_idx" ON "booking_requests"("firmId", "status");

-- CreateIndex
CREATE INDEX "booking_requests_requestedById_idx" ON "booking_requests"("requestedById");

-- CreateIndex
CREATE INDEX "booking_requests_createdAt_idx" ON "booking_requests"("createdAt");

-- CreateIndex
CREATE INDEX "booking_requests_updatedAt_idx" ON "booking_requests"("updatedAt");

-- CreateIndex
CREATE INDEX "booking_requests_respondedAt_idx" ON "booking_requests"("respondedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttorneyProfile_userId_key" ON "AttorneyProfile"("userId");

-- CreateIndex
CREATE INDEX "AttorneyProfile_barNumber_idx" ON "AttorneyProfile"("barNumber");

-- CreateIndex
CREATE INDEX "AttorneyProfile_barState_idx" ON "AttorneyProfile"("barState");

-- CreateIndex
CREATE INDEX "AttorneyProfile_createdAt_idx" ON "AttorneyProfile"("createdAt");

-- CreateIndex
CREATE INDEX "AttorneyProfile_updatedAt_idx" ON "AttorneyProfile"("updatedAt");

-- CreateIndex
CREATE INDEX "TranscriptAccess_userId_idx" ON "TranscriptAccess"("userId");

-- CreateIndex
CREATE INDEX "TranscriptAccess_transcriptId_idx" ON "TranscriptAccess"("transcriptId");

-- CreateIndex
CREATE INDEX "TranscriptAccess_caseId_idx" ON "TranscriptAccess"("caseId");

-- CreateIndex
CREATE INDEX "TranscriptAccess_createdAt_idx" ON "TranscriptAccess"("createdAt");

-- CreateIndex
CREATE INDEX "TranscriptAccess_updatedAt_idx" ON "TranscriptAccess"("updatedAt");

-- CreateIndex
CREATE INDEX "TranscriptAccess_lastAccessedAt_idx" ON "TranscriptAccess"("lastAccessedAt");

-- CreateIndex
CREATE INDEX "TranscriptAccess_expiresAt_idx" ON "TranscriptAccess"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptAccess_transcriptId_userId_key" ON "TranscriptAccess"("transcriptId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptShare_shareToken_key" ON "TranscriptShare"("shareToken");

-- CreateIndex
CREATE INDEX "TranscriptShare_transcriptId_idx" ON "TranscriptShare"("transcriptId");

-- CreateIndex
CREATE INDEX "TranscriptShare_recipientEmail_idx" ON "TranscriptShare"("recipientEmail");

-- CreateIndex
CREATE INDEX "TranscriptShare_sharedById_idx" ON "TranscriptShare"("sharedById");

-- CreateIndex
CREATE INDEX "TranscriptShare_accessLevel_idx" ON "TranscriptShare"("accessLevel");

-- CreateIndex
CREATE INDEX "TranscriptShare_status_idx" ON "TranscriptShare"("status");

-- CreateIndex
CREATE INDEX "TranscriptShare_expiresAt_idx" ON "TranscriptShare"("expiresAt");

-- CreateIndex
CREATE INDEX "TranscriptShare_recipientEmail_transcriptId_idx" ON "TranscriptShare"("recipientEmail", "transcriptId");

-- CreateIndex
CREATE INDEX "TranscriptShare_transcriptId_status_idx" ON "TranscriptShare"("transcriptId", "status");

-- CreateIndex
CREATE INDEX "TranscriptShare_shareToken_idx" ON "TranscriptShare"("shareToken");

-- CreateIndex
CREATE INDEX "TranscriptShare_lastAccessedAt_idx" ON "TranscriptShare"("lastAccessedAt");

-- CreateIndex
CREATE INDEX "TranscriptHighlight_transcriptId_idx" ON "TranscriptHighlight"("transcriptId");

-- CreateIndex
CREATE INDEX "TranscriptHighlight_userId_idx" ON "TranscriptHighlight"("userId");

-- CreateIndex
CREATE INDEX "TranscriptHighlight_transcriptId_userId_idx" ON "TranscriptHighlight"("transcriptId", "userId");

-- CreateIndex
CREATE INDEX "TranscriptHighlight_createdAt_idx" ON "TranscriptHighlight"("createdAt");

-- CreateIndex
CREATE INDEX "TranscriptHighlight_updatedAt_idx" ON "TranscriptHighlight"("updatedAt");

-- CreateIndex
CREATE INDEX "TranscriptTag_userId_idx" ON "TranscriptTag"("userId");

-- CreateIndex
CREATE INDEX "TranscriptTag_firmId_idx" ON "TranscriptTag"("firmId");

-- CreateIndex
CREATE INDEX "TranscriptTag_caseId_idx" ON "TranscriptTag"("caseId");

-- CreateIndex
CREATE INDEX "TranscriptTag_createdAt_idx" ON "TranscriptTag"("createdAt");

-- CreateIndex
CREATE INDEX "TranscriptTag_updatedAt_idx" ON "TranscriptTag"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptTag_userId_name_key" ON "TranscriptTag"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptTag_firmId_name_key" ON "TranscriptTag"("firmId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptTag_caseId_name_key" ON "TranscriptTag"("caseId", "name");

-- CreateIndex
CREATE INDEX "TranscriptHighlightTag_highlightId_idx" ON "TranscriptHighlightTag"("highlightId");

-- CreateIndex
CREATE INDEX "TranscriptHighlightTag_tagId_idx" ON "TranscriptHighlightTag"("tagId");

-- CreateIndex
CREATE INDEX "TranscriptHighlightTag_createdAt_idx" ON "TranscriptHighlightTag"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptHighlightTag_highlightId_tagId_key" ON "TranscriptHighlightTag"("highlightId", "tagId");

-- CreateIndex
CREATE INDEX "TranscriptNote_transcriptId_idx" ON "TranscriptNote"("transcriptId");

-- CreateIndex
CREATE INDEX "TranscriptNote_userId_idx" ON "TranscriptNote"("userId");

-- CreateIndex
CREATE INDEX "TranscriptNote_transcriptId_userId_idx" ON "TranscriptNote"("transcriptId", "userId");

-- CreateIndex
CREATE INDEX "TranscriptNote_createdAt_idx" ON "TranscriptNote"("createdAt");

-- CreateIndex
CREATE INDEX "TranscriptNote_updatedAt_idx" ON "TranscriptNote"("updatedAt");

-- CreateIndex
CREATE INDEX "TranscriptBookmark_transcriptId_idx" ON "TranscriptBookmark"("transcriptId");

-- CreateIndex
CREATE INDEX "TranscriptBookmark_userId_idx" ON "TranscriptBookmark"("userId");

-- CreateIndex
CREATE INDEX "TranscriptBookmark_transcriptId_userId_idx" ON "TranscriptBookmark"("transcriptId", "userId");

-- CreateIndex
CREATE INDEX "TranscriptBookmark_createdAt_idx" ON "TranscriptBookmark"("createdAt");

-- CreateIndex
CREATE INDEX "TranscriptBookmark_updatedAt_idx" ON "TranscriptBookmark"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE INDEX "Agency_slug_idx" ON "Agency"("slug");

-- CreateIndex
CREATE INDEX "ReporterUnavailability_userId_idx" ON "ReporterUnavailability"("userId");

-- CreateIndex
CREATE INDEX "ReporterUnavailability_startDate_endDate_idx" ON "ReporterUnavailability"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attorney_email_key" ON "Attorney"("email");

-- CreateIndex
CREATE INDEX "Attorney_normalizedName_idx" ON "Attorney"("normalizedName");

-- CreateIndex
CREATE INDEX "Attorney_lastName_idx" ON "Attorney"("lastName");

-- CreateIndex
CREATE INDEX "Attorney_firmName_idx" ON "Attorney"("firmName");

-- CreateIndex
CREATE INDEX "Attorney_barNumber_barState_idx" ON "Attorney"("barNumber", "barState");

-- CreateIndex
CREATE UNIQUE INDEX "CSRRecord_jobId_key" ON "CSRRecord"("jobId");

-- CreateIndex
CREATE INDEX "CSRRecord_jobId_idx" ON "CSRRecord"("jobId");

-- CreateIndex
CREATE INDEX "CSRRecord_depositionDate_idx" ON "CSRRecord"("depositionDate");

-- CreateIndex
CREATE INDEX "CSRRecord_causeNumber_idx" ON "CSRRecord"("causeNumber");

-- CreateIndex
CREATE INDEX "CSRRecord_claimNumber_idx" ON "CSRRecord"("claimNumber");

-- CreateIndex
CREATE INDEX "CSRRecord_policyNumber_idx" ON "CSRRecord"("policyNumber");

-- CreateIndex
CREATE INDEX "CSRRecord_deliveryPriority_idx" ON "CSRRecord"("deliveryPriority");

-- CreateIndex
CREATE INDEX "TranscriptOrder_csrRecordId_idx" ON "TranscriptOrder"("csrRecordId");

-- CreateIndex
CREATE INDEX "TranscriptOrder_email_idx" ON "TranscriptOrder"("email");

-- CreateIndex
CREATE INDEX "TranscriptOrder_status_idx" ON "TranscriptOrder"("status");

-- CreateIndex
CREATE INDEX "CSRWitness_csrRecordId_idx" ON "CSRWitness"("csrRecordId");

-- CreateIndex
CREATE INDEX "CSRAttorney_csrRecordId_idx" ON "CSRAttorney"("csrRecordId");

-- CreateIndex
CREATE INDEX "CSRAttorney_attorneyId_idx" ON "CSRAttorney"("attorneyId");

-- CreateIndex
CREATE UNIQUE INDEX "CSRAttorney_csrRecordId_attorneyId_role_key" ON "CSRAttorney"("csrRecordId", "attorneyId", "role");

-- CreateIndex
CREATE INDEX "CSRParty_csrRecordId_idx" ON "CSRParty"("csrRecordId");

-- CreateIndex
CREATE INDEX "CSRParty_partyType_idx" ON "CSRParty"("partyType");

-- CreateIndex
CREATE INDEX "CSRProperNoun_csrRecordId_idx" ON "CSRProperNoun"("csrRecordId");

-- CreateIndex
CREATE INDEX "CSRProperNoun_category_idx" ON "CSRProperNoun"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CSRProperNoun_csrRecordId_value_key" ON "CSRProperNoun"("csrRecordId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CSRTranscriptOptions_csrRecordId_key" ON "CSRTranscriptOptions"("csrRecordId");

-- CreateIndex
CREATE INDEX "CSRTranscriptOptions_csrRecordId_idx" ON "CSRTranscriptOptions"("csrRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "JobExhibit_fileId_key" ON "JobExhibit"("fileId");

-- CreateIndex
CREATE INDEX "JobExhibit_jobId_idx" ON "JobExhibit"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobExhibit_jobId_exhibitNumber_key" ON "JobExhibit"("jobId", "exhibitNumber");

-- CreateIndex
CREATE INDEX "JobClaim_scopistId_idx" ON "JobClaim"("scopistId");

-- CreateIndex
CREATE INDEX "JobClaim_status_idx" ON "JobClaim"("status");

-- CreateIndex
CREATE INDEX "JobClaim_claimedAt_idx" ON "JobClaim"("claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobClaim_jobId_scopistId_key" ON "JobClaim"("jobId", "scopistId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceSettings_userId_key" ON "MarketplaceSettings"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceSettings_userId_idx" ON "MarketplaceSettings"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceSettings_isAvailableForWork_idx" ON "MarketplaceSettings"("isAvailableForWork");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_firmId_key" ON "BillingAccount"("firmId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_stripeCustomerId_key" ON "BillingAccount"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "BillingAccount_stripeCustomerId_idx" ON "BillingAccount"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "BillingRate_firmId_serviceType_idx" ON "BillingRate"("firmId", "serviceType");

-- CreateIndex
CREATE INDEX "BillingRate_firmId_serviceType_isActive_idx" ON "BillingRate"("firmId", "serviceType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRate_firmId_serviceType_version_key" ON "BillingRate"("firmId", "serviceType", "version");

-- CreateIndex
CREATE INDEX "BillingPeriod_firmId_locked_idx" ON "BillingPeriod"("firmId", "locked");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPeriod_firmId_startAt_endAt_key" ON "BillingPeriod"("firmId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_billingAccountId_status_idx" ON "Invoice"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "Invoice_billingAccountId_periodStart_idx" ON "Invoice"("billingAccountId", "periodStart");

-- CreateIndex
CREATE INDEX "Invoice_stripeInvoiceId_idx" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_jobId_idx" ON "InvoiceLineItem"("jobId");

-- CreateIndex
CREATE INDEX "BillingUsageRecord_firmId_recordedAt_idx" ON "BillingUsageRecord"("firmId", "recordedAt");

-- CreateIndex
CREATE INDEX "BillingUsageRecord_firmId_serviceType_idx" ON "BillingUsageRecord"("firmId", "serviceType");

-- CreateIndex
CREATE INDEX "BillingUsageRecord_jobId_idx" ON "BillingUsageRecord"("jobId");

-- CreateIndex
CREATE INDEX "BillingUsageRecord_invoiceLineItemId_idx" ON "BillingUsageRecord"("invoiceLineItemId");

-- CreateIndex
CREATE INDEX "HumanReviewSession_jobId_idx" ON "HumanReviewSession"("jobId");

-- CreateIndex
CREATE INDEX "HumanReviewSession_reviewerId_idx" ON "HumanReviewSession"("reviewerId");

-- CreateIndex
CREATE INDEX "AudioProcessingSession_jobId_idx" ON "AudioProcessingSession"("jobId");

-- CreateIndex
CREATE INDEX "AudioProcessingSession_provider_idx" ON "AudioProcessingSession"("provider");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFile" ADD CONSTRAINT "JobFile_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptionJob" ADD CONSTRAINT "TranscriptionJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptToken" ADD CONSTRAINT "TranscriptToken_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptionEdit" ADD CONSTRAINT "TranscriptionEdit_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "Transcription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_scopistId_fkey" FOREIGN KEY ("scopistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Firm" ADD CONSTRAINT "Firm_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookConfig" ADD CONSTRAINT "WebhookConfig_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "WebhookConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMembership" ADD CONSTRAINT "CaseMembership_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMembership" ADD CONSTRAINT "CaseMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAttorney" ADD CONSTRAINT "CaseAttorney_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseExtractedTerm" ADD CONSTRAINT "CaseExtractedTerm_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyTranscript" ADD CONSTRAINT "AttorneyTranscript_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAnnotation" ADD CONSTRAINT "TranscriptAnnotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAnnotation" ADD CONSTRAINT "TranscriptAnnotation_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "AttorneyTranscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAnnotationExhibit" ADD CONSTRAINT "TranscriptAnnotationExhibit_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "TranscriptAnnotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAnnotationExhibit" ADD CONSTRAINT "TranscriptAnnotationExhibit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAnnotationExhibit" ADD CONSTRAINT "TranscriptAnnotationExhibit_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_assignedReporterId_fkey" FOREIGN KEY ("assignedReporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_orderingAttorneyId_fkey" FOREIGN KEY ("orderingAttorneyId") REFERENCES "Attorney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_lastRescheduledById_fkey" FOREIGN KEY ("lastRescheduledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_availability" ADD CONSTRAINT "reporter_availability_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_availability" ADD CONSTRAINT "reporter_availability_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_notes" ADD CONSTRAINT "calendar_event_notes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_notes" ADD CONSTRAINT "calendar_event_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_conflicts" ADD CONSTRAINT "schedule_conflicts_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_conflicts" ADD CONSTRAINT "schedule_conflicts_conflictEventId_fkey" FOREIGN KEY ("conflictEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_conflicts" ADD CONSTRAINT "schedule_conflicts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_conflicts" ADD CONSTRAINT "schedule_conflicts_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_connections" ADD CONSTRAINT "external_calendar_connections_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_connections" ADD CONSTRAINT "external_calendar_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "external_calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_sync_logs" ADD CONSTRAINT "external_calendar_sync_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "external_calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_audit_logs" ADD CONSTRAINT "calendar_audit_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_audit_logs" ADD CONSTRAINT "calendar_audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyProfile" ADD CONSTRAINT "AttorneyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAccess" ADD CONSTRAINT "TranscriptAccess_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAccess" ADD CONSTRAINT "TranscriptAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAccess" ADD CONSTRAINT "TranscriptAccess_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptAccess" ADD CONSTRAINT "TranscriptAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptShare" ADD CONSTRAINT "TranscriptShare_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptShare" ADD CONSTRAINT "TranscriptShare_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptHighlight" ADD CONSTRAINT "TranscriptHighlight_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptHighlight" ADD CONSTRAINT "TranscriptHighlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptTag" ADD CONSTRAINT "TranscriptTag_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptTag" ADD CONSTRAINT "TranscriptTag_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptTag" ADD CONSTRAINT "TranscriptTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptHighlightTag" ADD CONSTRAINT "TranscriptHighlightTag_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "TranscriptHighlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptHighlightTag" ADD CONSTRAINT "TranscriptHighlightTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "TranscriptTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptNote" ADD CONSTRAINT "TranscriptNote_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptNote" ADD CONSTRAINT "TranscriptNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptBookmark" ADD CONSTRAINT "TranscriptBookmark_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptBookmark" ADD CONSTRAINT "TranscriptBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporterUnavailability" ADD CONSTRAINT "ReporterUnavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSRRecord" ADD CONSTRAINT "CSRRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptOrder" ADD CONSTRAINT "TranscriptOrder_csrRecordId_fkey" FOREIGN KEY ("csrRecordId") REFERENCES "CSRRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSRWitness" ADD CONSTRAINT "CSRWitness_csrRecordId_fkey" FOREIGN KEY ("csrRecordId") REFERENCES "CSRRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSRAttorney" ADD CONSTRAINT "CSRAttorney_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "Attorney"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSRAttorney" ADD CONSTRAINT "CSRAttorney_csrRecordId_fkey" FOREIGN KEY ("csrRecordId") REFERENCES "CSRRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSRParty" ADD CONSTRAINT "CSRParty_csrRecordId_fkey" FOREIGN KEY ("csrRecordId") REFERENCES "CSRRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSRProperNoun" ADD CONSTRAINT "CSRProperNoun_csrRecordId_fkey" FOREIGN KEY ("csrRecordId") REFERENCES "CSRRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSRTranscriptOptions" ADD CONSTRAINT "CSRTranscriptOptions_csrRecordId_fkey" FOREIGN KEY ("csrRecordId") REFERENCES "CSRRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobExhibit" ADD CONSTRAINT "JobExhibit_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "JobFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobExhibit" ADD CONSTRAINT "JobExhibit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClaim" ADD CONSTRAINT "JobClaim_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClaim" ADD CONSTRAINT "JobClaim_scopistId_fkey" FOREIGN KEY ("scopistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceSettings" ADD CONSTRAINT "MarketplaceSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRate" ADD CONSTRAINT "BillingRate_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "BillingAccount"("firmId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPeriod" ADD CONSTRAINT "BillingPeriod_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "BillingAccount"("firmId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingUsageRecord" ADD CONSTRAINT "BillingUsageRecord_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "BillingAccount"("firmId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingUsageRecord" ADD CONSTRAINT "BillingUsageRecord_invoiceLineItemId_fkey" FOREIGN KEY ("invoiceLineItemId") REFERENCES "InvoiceLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
