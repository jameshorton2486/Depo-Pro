export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      AttorneyProfile: {
        Row: {
          barNumber: string | null
          barState: string | null
          billingAddress: string | null
          billingEmail: string | null
          createdAt: string
          defaultExportFormat: string | null
          emailNotifications: boolean
          firmAddress: string | null
          firmName: string | null
          firmPhone: string | null
          id: string
          practiceAreas: string[] | null
          smsNotifications: boolean
          updatedAt: string
          userId: string
        }
        Insert: {
          barNumber?: string | null
          barState?: string | null
          billingAddress?: string | null
          billingEmail?: string | null
          createdAt?: string
          defaultExportFormat?: string | null
          emailNotifications?: boolean
          firmAddress?: string | null
          firmName?: string | null
          firmPhone?: string | null
          id: string
          practiceAreas?: string[] | null
          smsNotifications?: boolean
          updatedAt: string
          userId: string
        }
        Update: {
          barNumber?: string | null
          barState?: string | null
          billingAddress?: string | null
          billingEmail?: string | null
          createdAt?: string
          defaultExportFormat?: string | null
          emailNotifications?: boolean
          firmAddress?: string | null
          firmName?: string | null
          firmPhone?: string | null
          id?: string
          practiceAreas?: string[] | null
          smsNotifications?: boolean
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      AttorneyTranscript: {
        Row: {
          caseName: string | null
          deponent: string
          depositionDate: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["AttorneyTranscriptStatus"]
          totalLines: number
          totalPages: number
          transcriptData: Json
          uploadedAt: string
          uploadedById: string
        }
        Insert: {
          caseName?: string | null
          deponent: string
          depositionDate?: string | null
          id: string
          name: string
          status?: Database["public"]["Enums"]["AttorneyTranscriptStatus"]
          totalLines: number
          totalPages: number
          transcriptData: Json
          uploadedAt?: string
          uploadedById: string
        }
        Update: {
          caseName?: string | null
          deponent?: string
          depositionDate?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["AttorneyTranscriptStatus"]
          totalLines?: number
          totalPages?: number
          transcriptData?: Json
          uploadedAt?: string
          uploadedById?: string
        }
        Relationships: []
      }
      AudioEnhancement: {
        Row: {
          auphonicAudioUrl: string | null
          auphonicCostCents: number | null
          auphonicProcessed: boolean
          auphonicQualityScore: number | null
          completedAt: string | null
          createdAt: string
          decisionReason: string | null
          dolbyAudioUrl: string | null
          dolbyCostCents: number | null
          dolbyProcessed: boolean
          dolbyQualityScore: number | null
          engineUsed: string
          enhancementMode: Database["public"]["Enums"]["EnhancementMode"]
          finalAudioUrl: string
          id: string
          jobId: string
          originalAudioUrl: string
          originalDuration: number
          originalFileSize: number
          qualityFlags: Json | null
          totalCostCents: number
        }
        Insert: {
          auphonicAudioUrl?: string | null
          auphonicCostCents?: number | null
          auphonicProcessed?: boolean
          auphonicQualityScore?: number | null
          completedAt?: string | null
          createdAt?: string
          decisionReason?: string | null
          dolbyAudioUrl?: string | null
          dolbyCostCents?: number | null
          dolbyProcessed?: boolean
          dolbyQualityScore?: number | null
          engineUsed: string
          enhancementMode: Database["public"]["Enums"]["EnhancementMode"]
          finalAudioUrl: string
          id: string
          jobId: string
          originalAudioUrl: string
          originalDuration: number
          originalFileSize: number
          qualityFlags?: Json | null
          totalCostCents: number
        }
        Update: {
          auphonicAudioUrl?: string | null
          auphonicCostCents?: number | null
          auphonicProcessed?: boolean
          auphonicQualityScore?: number | null
          completedAt?: string | null
          createdAt?: string
          decisionReason?: string | null
          dolbyAudioUrl?: string | null
          dolbyCostCents?: number | null
          dolbyProcessed?: boolean
          dolbyQualityScore?: number | null
          engineUsed?: string
          enhancementMode?: Database["public"]["Enums"]["EnhancementMode"]
          finalAudioUrl?: string
          id?: string
          jobId?: string
          originalAudioUrl?: string
          originalDuration?: number
          originalFileSize?: number
          qualityFlags?: Json | null
          totalCostCents?: number
        }
        Relationships: []
      }
      AudioProcessingSession: {
        Row: {
          cancellationReason: string | null
          cancelledAt: string | null
          cancelledByUserId: string | null
          completedAt: string | null
          createdAt: string
          durationMinutes: number | null
          enhancementType:
            | Database["public"]["Enums"]["AudioEnhancementType"]
            | null
          feeCents: number | null
          id: string
          jobId: string
          metadata: Json | null
          operatorNotes: string | null
          operatorUserId: string | null
          outputFileId: string | null
          processingStartedAt: string | null
          processingTimeMinutes: number | null
          processingType: string
          provider: string | null
          startedAt: string
          status: Database["public"]["Enums"]["AudioSessionStatus"]
          updatedAt: string
        }
        Insert: {
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelledByUserId?: string | null
          completedAt?: string | null
          createdAt?: string
          durationMinutes?: number | null
          enhancementType?:
            | Database["public"]["Enums"]["AudioEnhancementType"]
            | null
          feeCents?: number | null
          id: string
          jobId: string
          metadata?: Json | null
          operatorNotes?: string | null
          operatorUserId?: string | null
          outputFileId?: string | null
          processingStartedAt?: string | null
          processingTimeMinutes?: number | null
          processingType: string
          provider?: string | null
          startedAt?: string
          status?: Database["public"]["Enums"]["AudioSessionStatus"]
          updatedAt: string
        }
        Update: {
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelledByUserId?: string | null
          completedAt?: string | null
          createdAt?: string
          durationMinutes?: number | null
          enhancementType?:
            | Database["public"]["Enums"]["AudioEnhancementType"]
            | null
          feeCents?: number | null
          id?: string
          jobId?: string
          metadata?: Json | null
          operatorNotes?: string | null
          operatorUserId?: string | null
          outputFileId?: string | null
          processingStartedAt?: string | null
          processingTimeMinutes?: number | null
          processingType?: string
          provider?: string | null
          startedAt?: string
          status?: Database["public"]["Enums"]["AudioSessionStatus"]
          updatedAt?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          previous_state: Json | null
          target_id: string
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          previous_state?: Json | null
          target_id: string
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          previous_state?: Json | null
          target_id?: string
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditLog: {
        Row: {
          action: string
          actorUserId: string | null
          createdAt: string
          firmId: string | null
          id: string
          ipAddress: string | null
          metadata: Json | null
          targetId: string
          targetType: string
          userAgent: string | null
        }
        Insert: {
          action: string
          actorUserId?: string | null
          createdAt?: string
          firmId?: string | null
          id: string
          ipAddress?: string | null
          metadata?: Json | null
          targetId: string
          targetType: string
          userAgent?: string | null
        }
        Update: {
          action?: string
          actorUserId?: string | null
          createdAt?: string
          firmId?: string | null
          id?: string
          ipAddress?: string | null
          metadata?: Json | null
          targetId?: string
          targetType?: string
          userAgent?: string | null
        }
        Relationships: []
      }
      BackgroundJob: {
        Row: {
          attempts: number
          completedAt: string | null
          createdAt: string
          id: string
          idempotencyKey: string | null
          lastError: string | null
          maxAttempts: number
          payload: Json
          priority: number
          scheduledFor: string | null
          startedAt: string | null
          status: string
          type: string
          updatedAt: string
        }
        Insert: {
          attempts?: number
          completedAt?: string | null
          createdAt?: string
          id: string
          idempotencyKey?: string | null
          lastError?: string | null
          maxAttempts?: number
          payload: Json
          priority?: number
          scheduledFor?: string | null
          startedAt?: string | null
          status?: string
          type: string
          updatedAt: string
        }
        Update: {
          attempts?: number
          completedAt?: string | null
          createdAt?: string
          id?: string
          idempotencyKey?: string | null
          lastError?: string | null
          maxAttempts?: number
          payload?: Json
          priority?: number
          scheduledFor?: string | null
          startedAt?: string | null
          status?: string
          type?: string
          updatedAt?: string
        }
        Relationships: []
      }
      BillingAccount: {
        Row: {
          billingEmail: string
          createdAt: string
          currency: string
          firmId: string
          id: string
          stripeCustomerId: string | null
          updatedAt: string
        }
        Insert: {
          billingEmail: string
          createdAt?: string
          currency?: string
          firmId: string
          id: string
          stripeCustomerId?: string | null
          updatedAt: string
        }
        Update: {
          billingEmail?: string
          createdAt?: string
          currency?: string
          firmId?: string
          id?: string
          stripeCustomerId?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      BillingPeriod: {
        Row: {
          createdAt: string
          endAt: string
          firmId: string
          id: string
          locked: boolean
          startAt: string
        }
        Insert: {
          createdAt?: string
          endAt: string
          firmId: string
          id: string
          locked?: boolean
          startAt: string
        }
        Update: {
          createdAt?: string
          endAt?: string
          firmId?: string
          id?: string
          locked?: boolean
          startAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "BillingPeriod_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["firmId"]
          },
        ]
      }
      BillingRate: {
        Row: {
          amountCents: number
          createdAt: string
          firmId: string
          id: string
          isActive: boolean
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
          version: number
        }
        Insert: {
          amountCents: number
          createdAt?: string
          firmId: string
          id: string
          isActive?: boolean
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
          version: number
        }
        Update: {
          amountCents?: number
          createdAt?: string
          firmId?: string
          id?: string
          isActive?: boolean
          serviceType?: Database["public"]["Enums"]["BillingServiceType"]
          unit?: Database["public"]["Enums"]["BillingUnit"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "BillingRate_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["firmId"]
          },
        ]
      }
      BillingUsageRecord: {
        Row: {
          firmId: string
          id: string
          invoiceLineItemId: string | null
          jobId: string
          quantity: number
          recordedAt: string
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
        }
        Insert: {
          firmId: string
          id: string
          invoiceLineItemId?: string | null
          jobId: string
          quantity: number
          recordedAt?: string
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
        }
        Update: {
          firmId?: string
          id?: string
          invoiceLineItemId?: string | null
          jobId?: string
          quantity?: number
          recordedAt?: string
          serviceType?: Database["public"]["Enums"]["BillingServiceType"]
          unit?: Database["public"]["Enums"]["BillingUnit"]
        }
        Relationships: [
          {
            foreignKeyName: "BillingUsageRecord_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["firmId"]
          },
          {
            foreignKeyName: "BillingUsageRecord_invoiceLineItemId_fkey"
            columns: ["invoiceLineItemId"]
            isOneToOne: false
            referencedRelation: "InvoiceLineItem"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          alternateDate1: string | null
          alternateDate2: string | null
          calendarEventId: string | null
          caseName: string
          caseNumber: string | null
          createdAt: string
          deponentContact: string | null
          deponentName: string
          estimatedDuration: number
          eventType: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          interpreterLanguage: string | null
          isRemote: boolean
          location: string | null
          needsInterpreter: boolean
          needsRealtime: boolean
          needsVideographer: boolean
          preferredDate: string
          rejectionReason: string | null
          requestedById: string
          respondedAt: string | null
          respondedById: string | null
          specialNotes: string | null
          status: Database["public"]["Enums"]["BookingRequestStatus"]
          updatedAt: string
        }
        Insert: {
          alternateDate1?: string | null
          alternateDate2?: string | null
          calendarEventId?: string | null
          caseName: string
          caseNumber?: string | null
          createdAt?: string
          deponentContact?: string | null
          deponentName: string
          estimatedDuration?: number
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          interpreterLanguage?: string | null
          isRemote?: boolean
          location?: string | null
          needsInterpreter?: boolean
          needsRealtime?: boolean
          needsVideographer?: boolean
          preferredDate: string
          rejectionReason?: string | null
          requestedById: string
          respondedAt?: string | null
          respondedById?: string | null
          specialNotes?: string | null
          status?: Database["public"]["Enums"]["BookingRequestStatus"]
          updatedAt: string
        }
        Update: {
          alternateDate1?: string | null
          alternateDate2?: string | null
          calendarEventId?: string | null
          caseName?: string
          caseNumber?: string | null
          createdAt?: string
          deponentContact?: string | null
          deponentName?: string
          estimatedDuration?: number
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId?: string
          id?: string
          interpreterLanguage?: string | null
          isRemote?: boolean
          location?: string | null
          needsInterpreter?: boolean
          needsRealtime?: boolean
          needsVideographer?: boolean
          preferredDate?: string
          rejectionReason?: string | null
          requestedById?: string
          respondedAt?: string | null
          respondedById?: string | null
          specialNotes?: string | null
          status?: Database["public"]["Enums"]["BookingRequestStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_calendarEventId_fkey"
            columns: ["calendarEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["CalendarAuditAction"]
          createdAt: string
          eventId: string
          id: string
          ipAddress: string | null
          metadata: Json | null
          newValue: Json | null
          performedById: string
          previousValue: Json | null
          userAgent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["CalendarAuditAction"]
          createdAt?: string
          eventId: string
          id: string
          ipAddress?: string | null
          metadata?: Json | null
          newValue?: Json | null
          performedById: string
          previousValue?: Json | null
          userAgent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["CalendarAuditAction"]
          createdAt?: string
          eventId?: string
          id?: string
          ipAddress?: string | null
          metadata?: Json | null
          newValue?: Json | null
          performedById?: string
          previousValue?: Json | null
          userAgent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_audit_logs_eventId_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_notes: {
        Row: {
          content: string
          createdAt: string
          createdById: string
          eventId: string
          id: string
          isInternal: boolean
          updatedAt: string
        }
        Insert: {
          content: string
          createdAt?: string
          createdById: string
          eventId: string
          id: string
          isInternal?: boolean
          updatedAt: string
        }
        Update: {
          content?: string
          createdAt?: string
          createdById?: string
          eventId?: string
          id?: string
          isInternal?: boolean
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_notes_eventId_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          agencyId: string | null
          allDay: boolean
          assignedReporterId: string | null
          cancellationReason: string | null
          cancelledAt: string | null
          confirmedAt: string | null
          createdAt: string
          createdById: string
          endTime: string
          eventType: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          internalNotes: string | null
          isRecurring: boolean
          isRemote: boolean
          jobId: string | null
          lastRescheduledAt: string | null
          lastRescheduledById: string | null
          location: string | null
          meetingLink: string | null
          notes: string | null
          orderingAttorneyId: string | null
          originalStartTime: string | null
          parentEventId: string | null
          recurrenceEndDate: string | null
          recurrenceRule: string | null
          requestedById: string | null
          rescheduleCount: number
          scheduledById: string | null
          startTime: string
          status: Database["public"]["Enums"]["CalendarEventStatus"]
          timezone: string
          title: string
          updatedAt: string
        }
        Insert: {
          agencyId?: string | null
          allDay?: boolean
          assignedReporterId?: string | null
          cancellationReason?: string | null
          cancelledAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          createdById: string
          endTime: string
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          internalNotes?: string | null
          isRecurring?: boolean
          isRemote?: boolean
          jobId?: string | null
          lastRescheduledAt?: string | null
          lastRescheduledById?: string | null
          location?: string | null
          meetingLink?: string | null
          notes?: string | null
          orderingAttorneyId?: string | null
          originalStartTime?: string | null
          parentEventId?: string | null
          recurrenceEndDate?: string | null
          recurrenceRule?: string | null
          requestedById?: string | null
          rescheduleCount?: number
          scheduledById?: string | null
          startTime: string
          status?: Database["public"]["Enums"]["CalendarEventStatus"]
          timezone?: string
          title: string
          updatedAt: string
        }
        Update: {
          agencyId?: string | null
          allDay?: boolean
          assignedReporterId?: string | null
          cancellationReason?: string | null
          cancelledAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          createdById?: string
          endTime?: string
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId?: string
          id?: string
          internalNotes?: string | null
          isRecurring?: boolean
          isRemote?: boolean
          jobId?: string | null
          lastRescheduledAt?: string | null
          lastRescheduledById?: string | null
          location?: string | null
          meetingLink?: string | null
          notes?: string | null
          orderingAttorneyId?: string | null
          originalStartTime?: string | null
          parentEventId?: string | null
          recurrenceEndDate?: string | null
          recurrenceRule?: string | null
          requestedById?: string | null
          rescheduleCount?: number
          scheduledById?: string | null
          startTime?: string
          status?: Database["public"]["Enums"]["CalendarEventStatus"]
          timezone?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_parentEventId_fkey"
            columns: ["parentEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      Case: {
        Row: {
          caseNumber: string
          caseStyle: string
          county: string | null
          courtName: string | null
          courtType: string | null
          createdAt: string
          createdById: string
          defendants: Json | null
          firmId: string
          id: string
          judgeAssigned: string | null
          notes: string | null
          otherParties: Json | null
          plaintiffs: Json | null
          shortTitle: string | null
          state: string
          status: Database["public"]["Enums"]["CaseStatus"]
          updatedAt: string
        }
        Insert: {
          caseNumber: string
          caseStyle: string
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          createdById: string
          defendants?: Json | null
          firmId: string
          id: string
          judgeAssigned?: string | null
          notes?: string | null
          otherParties?: Json | null
          plaintiffs?: Json | null
          shortTitle?: string | null
          state?: string
          status?: Database["public"]["Enums"]["CaseStatus"]
          updatedAt: string
        }
        Update: {
          caseNumber?: string
          caseStyle?: string
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          createdById?: string
          defendants?: Json | null
          firmId?: string
          id?: string
          judgeAssigned?: string | null
          notes?: string | null
          otherParties?: Json | null
          plaintiffs?: Json | null
          shortTitle?: string | null
          state?: string
          status?: Database["public"]["Enums"]["CaseStatus"]
          updatedAt?: string
        }
        Relationships: []
      }
      CaseAttorney: {
        Row: {
          address: string | null
          barNumber: string | null
          caseId: string
          city: string | null
          createdAt: string
          deliveryFormat: string | null
          deliveryPriority: string | null
          email: string | null
          fax: string | null
          firm: string | null
          id: string
          name: string
          phone: string | null
          representing: string | null
          role: Database["public"]["Enums"]["AttorneyRole"]
          state: string | null
          updatedAt: string
          zipCode: string | null
        }
        Insert: {
          address?: string | null
          barNumber?: string | null
          caseId: string
          city?: string | null
          createdAt?: string
          deliveryFormat?: string | null
          deliveryPriority?: string | null
          email?: string | null
          fax?: string | null
          firm?: string | null
          id: string
          name: string
          phone?: string | null
          representing?: string | null
          role: Database["public"]["Enums"]["AttorneyRole"]
          state?: string | null
          updatedAt: string
          zipCode?: string | null
        }
        Update: {
          address?: string | null
          barNumber?: string | null
          caseId?: string
          city?: string | null
          createdAt?: string
          deliveryFormat?: string | null
          deliveryPriority?: string | null
          email?: string | null
          fax?: string | null
          firm?: string | null
          id?: string
          name?: string
          phone?: string | null
          representing?: string | null
          role?: Database["public"]["Enums"]["AttorneyRole"]
          state?: string | null
          updatedAt?: string
          zipCode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CaseAttorney_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      CaseDocument: {
        Row: {
          caseId: string
          documentType: Database["public"]["Enums"]["CaseDocumentType"]
          extractedAt: string | null
          extractedData: Json | null
          extractionError: string | null
          extractionStatus: Database["public"]["Enums"]["ExtractionStatus"]
          fileName: string
          fileSize: number
          fileUrl: string
          id: string
          mimeType: string
          uploadedAt: string
          uploadedById: string
        }
        Insert: {
          caseId: string
          documentType: Database["public"]["Enums"]["CaseDocumentType"]
          extractedAt?: string | null
          extractedData?: Json | null
          extractionError?: string | null
          extractionStatus?: Database["public"]["Enums"]["ExtractionStatus"]
          fileName: string
          fileSize: number
          fileUrl: string
          id: string
          mimeType: string
          uploadedAt?: string
          uploadedById: string
        }
        Update: {
          caseId?: string
          documentType?: Database["public"]["Enums"]["CaseDocumentType"]
          extractedAt?: string | null
          extractedData?: Json | null
          extractionError?: string | null
          extractionStatus?: Database["public"]["Enums"]["ExtractionStatus"]
          fileName?: string
          fileSize?: number
          fileUrl?: string
          id?: string
          mimeType?: string
          uploadedAt?: string
          uploadedById?: string
        }
        Relationships: [
          {
            foreignKeyName: "CaseDocument_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      CaseExtractedTerm: {
        Row: {
          caseId: string
          category: Database["public"]["Enums"]["TermCategory"]
          confidence: number | null
          createdAt: string
          id: string
          phonetic: string | null
          source: string | null
          term: string
          useInTranscription: boolean
        }
        Insert: {
          caseId: string
          category: Database["public"]["Enums"]["TermCategory"]
          confidence?: number | null
          createdAt?: string
          id: string
          phonetic?: string | null
          source?: string | null
          term: string
          useInTranscription?: boolean
        }
        Update: {
          caseId?: string
          category?: Database["public"]["Enums"]["TermCategory"]
          confidence?: number | null
          createdAt?: string
          id?: string
          phonetic?: string | null
          source?: string | null
          term?: string
          useInTranscription?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "CaseExtractedTerm_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      CaseMembership: {
        Row: {
          caseId: string
          createdAt: string
          id: string
          permissions: Json | null
          roleInCase: Database["public"]["Enums"]["CaseRole"]
          updatedAt: string
          userId: string
        }
        Insert: {
          caseId: string
          createdAt?: string
          id: string
          permissions?: Json | null
          roleInCase: Database["public"]["Enums"]["CaseRole"]
          updatedAt: string
          userId: string
        }
        Update: {
          caseId?: string
          createdAt?: string
          id?: string
          permissions?: Json | null
          roleInCase?: Database["public"]["Enums"]["CaseRole"]
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "CaseMembership_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      chronology_entries: {
        Row: {
          category: string
          confidence: number | null
          created_at: string
          created_by_id: string
          date_precision: string
          details: string | null
          event_date: string
          event_date_end: string | null
          id: string
          is_verified: boolean
          job_id: string
          medical_record_id: string | null
          page_reference: string | null
          provider: string | null
          source_document_name: string | null
          source_type: Database["public"]["Enums"]["chronology_source_type"]
          summary: string
          updated_at: string
          verified_at: string | null
          verified_by_id: string | null
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string
          created_by_id: string
          date_precision?: string
          details?: string | null
          event_date: string
          event_date_end?: string | null
          id?: string
          is_verified?: boolean
          job_id: string
          medical_record_id?: string | null
          page_reference?: string | null
          provider?: string | null
          source_document_name?: string | null
          source_type?: Database["public"]["Enums"]["chronology_source_type"]
          summary: string
          updated_at?: string
          verified_at?: string | null
          verified_by_id?: string | null
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string
          created_by_id?: string
          date_precision?: string
          details?: string | null
          event_date?: string
          event_date_end?: string | null
          id?: string
          is_verified?: boolean
          job_id?: string
          medical_record_id?: string | null
          page_reference?: string | null
          provider?: string | null
          source_document_name?: string | null
          source_type?: Database["public"]["Enums"]["chronology_source_type"]
          summary?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chronology_entries_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chronology_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "attorney_shared_transcripts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "chronology_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chronology_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "reporter_job_dashboard"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "chronology_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scopist_review_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "chronology_entries_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chronology_entries_verified_by_id_fkey"
            columns: ["verified_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRAttorney: {
        Row: {
          attorneyId: string
          copyCount: number
          createdAt: string
          csrRecordId: string
          deliveryFormat: string | null
          deliveryMethod: string | null
          id: string
          needsCopy: boolean
          needsOriginal: boolean
          representing: string | null
          role: Database["public"]["Enums"]["CSRAttorneyRole"]
          rushRequested: boolean
          rushType: Database["public"]["Enums"]["RushType"] | null
        }
        Insert: {
          attorneyId: string
          copyCount?: number
          createdAt?: string
          csrRecordId: string
          deliveryFormat?: string | null
          deliveryMethod?: string | null
          id: string
          needsCopy?: boolean
          needsOriginal?: boolean
          representing?: string | null
          role: Database["public"]["Enums"]["CSRAttorneyRole"]
          rushRequested?: boolean
          rushType?: Database["public"]["Enums"]["RushType"] | null
        }
        Update: {
          attorneyId?: string
          copyCount?: number
          createdAt?: string
          csrRecordId?: string
          deliveryFormat?: string | null
          deliveryMethod?: string | null
          id?: string
          needsCopy?: boolean
          needsOriginal?: boolean
          representing?: string | null
          role?: Database["public"]["Enums"]["CSRAttorneyRole"]
          rushRequested?: boolean
          rushType?: Database["public"]["Enums"]["RushType"] | null
        }
        Relationships: [
          {
            foreignKeyName: "CSRAttorney_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRParty: {
        Row: {
          createdAt: string
          csrRecordId: string
          entityType: string | null
          id: string
          isEntity: boolean
          partyName: string
          partyType: Database["public"]["Enums"]["PartyType"]
          sortOrder: number
        }
        Insert: {
          createdAt?: string
          csrRecordId: string
          entityType?: string | null
          id: string
          isEntity?: boolean
          partyName: string
          partyType: Database["public"]["Enums"]["PartyType"]
          sortOrder?: number
        }
        Update: {
          createdAt?: string
          csrRecordId?: string
          entityType?: string | null
          id?: string
          isEntity?: boolean
          partyName?: string
          partyType?: Database["public"]["Enums"]["PartyType"]
          sortOrder?: number
        }
        Relationships: [
          {
            foreignKeyName: "CSRParty_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRProperNoun: {
        Row: {
          category: Database["public"]["Enums"]["ProperNounCategory"]
          createdAt: string
          csrRecordId: string
          id: string
          phoneticHint: string | null
          priority: number
          source: string | null
          useInTranscription: boolean
          value: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ProperNounCategory"]
          createdAt?: string
          csrRecordId: string
          id: string
          phoneticHint?: string | null
          priority?: number
          source?: string | null
          useInTranscription?: boolean
          value: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ProperNounCategory"]
          createdAt?: string
          csrRecordId?: string
          id?: string
          phoneticHint?: string | null
          priority?: number
          source?: string | null
          useInTranscription?: boolean
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "CSRProperNoun_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRRecord: {
        Row: {
          accessInstructions: string | null
          actualStartTime: string | null
          adjustorEmail: string | null
          adjustorName: string | null
          adjustorPhone: string | null
          aiExtractedAt: string | null
          aiExtractedFields: Json | null
          aiExtractionConfidence: number | null
          caseCaption: string
          causeNumber: string | null
          changeCount: number
          changesReceived: boolean
          claimNumber: string | null
          conferenceRoom: string | null
          county: string | null
          courtName: string | null
          courtType: string | null
          createdAt: string
          dataSource: Database["public"]["Enums"]["DataSource"] | null
          dateOfLoss: string | null
          deliveryPriority: Database["public"]["Enums"]["DeliveryPriority"]
          depositionDate: string
          endTime: string | null
          id: string
          insuredName: string | null
          insurerName: string | null
          interpreterLanguage: string | null
          interpreterRequired: boolean
          isCROnly: boolean
          isEUO: boolean
          isLocked: boolean
          isPIP: boolean
          isVideoRecord: boolean
          jobId: string
          judge: string | null
          lastModifiedAt: string | null
          lastModifiedBy: string | null
          locationAddress: string | null
          locationCity: string | null
          locationState: string | null
          locationType: Database["public"]["Enums"]["LocationType"]
          locationZip: string | null
          lockedAt: string | null
          lockedReason: string | null
          manualOverrides: Json | null
          originalDocumentType: string | null
          originalDocumentUrl: string | null
          parkingFees: number | null
          parkingNotes: string | null
          parkingRequired: boolean
          policyNumber: string | null
          readAndSignExpiresAt: string | null
          readAndSignReceivedAt: string | null
          readAndSignRequired: boolean
          readAndSignSentAt: string | null
          realtimeRequired: boolean
          rushDueDate: string | null
          scheduledStartTime: string | null
          securityNotes: string | null
          signatureWaived: boolean
          state: string
          timezone: string
          travelMiles: number | null
          updatedAt: string
          videographerName: string | null
          videographerRequired: boolean
          videoType: Database["public"]["Enums"]["VideoRecordType"]
          waivedReason: string | null
        }
        Insert: {
          accessInstructions?: string | null
          actualStartTime?: string | null
          adjustorEmail?: string | null
          adjustorName?: string | null
          adjustorPhone?: string | null
          aiExtractedAt?: string | null
          aiExtractedFields?: Json | null
          aiExtractionConfidence?: number | null
          caseCaption: string
          causeNumber?: string | null
          changeCount?: number
          changesReceived?: boolean
          claimNumber?: string | null
          conferenceRoom?: string | null
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          dataSource?: Database["public"]["Enums"]["DataSource"] | null
          dateOfLoss?: string | null
          deliveryPriority?: Database["public"]["Enums"]["DeliveryPriority"]
          depositionDate: string
          endTime?: string | null
          id: string
          insuredName?: string | null
          insurerName?: string | null
          interpreterLanguage?: string | null
          interpreterRequired?: boolean
          isCROnly?: boolean
          isEUO?: boolean
          isLocked?: boolean
          isPIP?: boolean
          isVideoRecord?: boolean
          jobId: string
          judge?: string | null
          lastModifiedAt?: string | null
          lastModifiedBy?: string | null
          locationAddress?: string | null
          locationCity?: string | null
          locationState?: string | null
          locationType?: Database["public"]["Enums"]["LocationType"]
          locationZip?: string | null
          lockedAt?: string | null
          lockedReason?: string | null
          manualOverrides?: Json | null
          originalDocumentType?: string | null
          originalDocumentUrl?: string | null
          parkingFees?: number | null
          parkingNotes?: string | null
          parkingRequired?: boolean
          policyNumber?: string | null
          readAndSignExpiresAt?: string | null
          readAndSignReceivedAt?: string | null
          readAndSignRequired?: boolean
          readAndSignSentAt?: string | null
          realtimeRequired?: boolean
          rushDueDate?: string | null
          scheduledStartTime?: string | null
          securityNotes?: string | null
          signatureWaived?: boolean
          state?: string
          timezone?: string
          travelMiles?: number | null
          updatedAt: string
          videographerName?: string | null
          videographerRequired?: boolean
          videoType?: Database["public"]["Enums"]["VideoRecordType"]
          waivedReason?: string | null
        }
        Update: {
          accessInstructions?: string | null
          actualStartTime?: string | null
          adjustorEmail?: string | null
          adjustorName?: string | null
          adjustorPhone?: string | null
          aiExtractedAt?: string | null
          aiExtractedFields?: Json | null
          aiExtractionConfidence?: number | null
          caseCaption?: string
          causeNumber?: string | null
          changeCount?: number
          changesReceived?: boolean
          claimNumber?: string | null
          conferenceRoom?: string | null
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          dataSource?: Database["public"]["Enums"]["DataSource"] | null
          dateOfLoss?: string | null
          deliveryPriority?: Database["public"]["Enums"]["DeliveryPriority"]
          depositionDate?: string
          endTime?: string | null
          id?: string
          insuredName?: string | null
          insurerName?: string | null
          interpreterLanguage?: string | null
          interpreterRequired?: boolean
          isCROnly?: boolean
          isEUO?: boolean
          isLocked?: boolean
          isPIP?: boolean
          isVideoRecord?: boolean
          jobId?: string
          judge?: string | null
          lastModifiedAt?: string | null
          lastModifiedBy?: string | null
          locationAddress?: string | null
          locationCity?: string | null
          locationState?: string | null
          locationType?: Database["public"]["Enums"]["LocationType"]
          locationZip?: string | null
          lockedAt?: string | null
          lockedReason?: string | null
          manualOverrides?: Json | null
          originalDocumentType?: string | null
          originalDocumentUrl?: string | null
          parkingFees?: number | null
          parkingNotes?: string | null
          parkingRequired?: boolean
          policyNumber?: string | null
          readAndSignExpiresAt?: string | null
          readAndSignReceivedAt?: string | null
          readAndSignRequired?: boolean
          readAndSignSentAt?: string | null
          realtimeRequired?: boolean
          rushDueDate?: string | null
          scheduledStartTime?: string | null
          securityNotes?: string | null
          signatureWaived?: boolean
          state?: string
          timezone?: string
          travelMiles?: number | null
          updatedAt?: string
          videographerName?: string | null
          videographerRequired?: boolean
          videoType?: Database["public"]["Enums"]["VideoRecordType"]
          waivedReason?: string | null
        }
        Relationships: []
      }
      CSRTranscriptOptions: {
        Row: {
          colorExhibits: boolean
          createdAt: string
          csrRecordId: string
          deliveryMethod: Database["public"]["Enums"]["DeliveryMethod"]
          exhibitCount: number | null
          format: Database["public"]["Enums"]["TranscriptFormat"]
          id: string
          includeAppearances: boolean
          includeExhibitList: boolean
          includeWordIndex: boolean
          lineCount: number | null
          pageCount: number | null
          rushDeadline: string | null
          rushType: Database["public"]["Enums"]["RushType"]
          updatedAt: string
        }
        Insert: {
          colorExhibits?: boolean
          createdAt?: string
          csrRecordId: string
          deliveryMethod?: Database["public"]["Enums"]["DeliveryMethod"]
          exhibitCount?: number | null
          format?: Database["public"]["Enums"]["TranscriptFormat"]
          id: string
          includeAppearances?: boolean
          includeExhibitList?: boolean
          includeWordIndex?: boolean
          lineCount?: number | null
          pageCount?: number | null
          rushDeadline?: string | null
          rushType?: Database["public"]["Enums"]["RushType"]
          updatedAt: string
        }
        Update: {
          colorExhibits?: boolean
          createdAt?: string
          csrRecordId?: string
          deliveryMethod?: Database["public"]["Enums"]["DeliveryMethod"]
          exhibitCount?: number | null
          format?: Database["public"]["Enums"]["TranscriptFormat"]
          id?: string
          includeAppearances?: boolean
          includeExhibitList?: boolean
          includeWordIndex?: boolean
          lineCount?: number | null
          pageCount?: number | null
          rushDeadline?: string | null
          rushType?: Database["public"]["Enums"]["RushType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CSRTranscriptOptions_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRWitness: {
        Row: {
          appearanceType: Database["public"]["Enums"]["AppearanceType"]
          city: string | null
          createdAt: string
          csrRecordId: string
          entityRepresented: string | null
          fullLegalName: string
          id: string
          isPrimary: boolean
          preferredName: string | null
          readAndSignRequired: boolean
          role: Database["public"]["Enums"]["DeponentRole"]
          signatureWaived: boolean
          sortOrder: number
          state: string | null
        }
        Insert: {
          appearanceType?: Database["public"]["Enums"]["AppearanceType"]
          city?: string | null
          createdAt?: string
          csrRecordId: string
          entityRepresented?: string | null
          fullLegalName: string
          id: string
          isPrimary?: boolean
          preferredName?: string | null
          readAndSignRequired?: boolean
          role?: Database["public"]["Enums"]["DeponentRole"]
          signatureWaived?: boolean
          sortOrder?: number
          state?: string | null
        }
        Update: {
          appearanceType?: Database["public"]["Enums"]["AppearanceType"]
          city?: string | null
          createdAt?: string
          csrRecordId?: string
          entityRepresented?: string | null
          fullLegalName?: string
          id?: string
          isPrimary?: boolean
          preferredName?: string | null
          readAndSignRequired?: boolean
          role?: Database["public"]["Enums"]["DeponentRole"]
          signatureWaived?: boolean
          sortOrder?: number
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CSRWitness_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_vocabularies: {
        Row: {
          added_by: string
          boost: number
          category: string | null
          created_at: string
          id: string
          job_id: string
          term: string
        }
        Insert: {
          added_by: string
          boost?: number
          category?: string | null
          created_at?: string
          id?: string
          job_id: string
          term: string
        }
        Update: {
          added_by?: string
          boost?: number
          category?: string | null
          created_at?: string
          id?: string
          job_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_vocabularies_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_vocabularies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "attorney_shared_transcripts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "custom_vocabularies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_vocabularies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "reporter_job_dashboard"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "custom_vocabularies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scopist_review_queue"
            referencedColumns: ["job_id"]
          },
        ]
      }
      deposition_notes: {
        Row: {
          audioTimestamp: number | null
          content: string
          createdAt: string
          id: string
          isLocked: boolean
          jobId: string
          lockedAt: string | null
          lockedBy: string | null
          noteCategory: string | null
          reporterId: string
          type: Database["public"]["Enums"]["DepositionNoteType"]
          updatedAt: string
        }
        Insert: {
          audioTimestamp?: number | null
          content: string
          createdAt?: string
          id: string
          isLocked?: boolean
          jobId: string
          lockedAt?: string | null
          lockedBy?: string | null
          noteCategory?: string | null
          reporterId: string
          type?: Database["public"]["Enums"]["DepositionNoteType"]
          updatedAt: string
        }
        Update: {
          audioTimestamp?: number | null
          content?: string
          createdAt?: string
          id?: string
          isLocked?: boolean
          jobId?: string
          lockedAt?: string | null
          lockedBy?: string | null
          noteCategory?: string | null
          reporterId?: string
          type?: Database["public"]["Enums"]["DepositionNoteType"]
          updatedAt?: string
        }
        Relationships: []
      }
      document_template_snapshots: {
        Row: {
          content: string
          createdAt: string
          id: string
          jobId: string
          renderedHtml: string | null
          templateId: string
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          templateVersion: number
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          jobId: string
          renderedHtml?: string | null
          templateId: string
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          templateVersion: number
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          jobId?: string
          renderedHtml?: string | null
          templateId?: string
          templateType?: Database["public"]["Enums"]["DocumentTemplateType"]
          templateVersion?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_template_snapshots_templateId_fkey"
            columns: ["templateId"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          agencyId: string | null
          content: string
          createdAt: string
          createdById: string | null
          firmId: string | null
          id: string
          isActive: boolean
          isDefault: boolean
          isSystemTemplate: boolean
          name: string
          previewHtml: string | null
          state: string
          stateVariant: string | null
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          updatedAt: string
          variables: Json | null
          version: number
        }
        Insert: {
          agencyId?: string | null
          content: string
          createdAt?: string
          createdById?: string | null
          firmId?: string | null
          id: string
          isActive?: boolean
          isDefault?: boolean
          isSystemTemplate?: boolean
          name: string
          previewHtml?: string | null
          state: string
          stateVariant?: string | null
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          updatedAt: string
          variables?: Json | null
          version?: number
        }
        Update: {
          agencyId?: string | null
          content?: string
          createdAt?: string
          createdById?: string | null
          firmId?: string | null
          id?: string
          isActive?: boolean
          isDefault?: boolean
          isSystemTemplate?: boolean
          name?: string
          previewHtml?: string | null
          state?: string
          stateVariant?: string | null
          templateType?: Database["public"]["Enums"]["DocumentTemplateType"]
          updatedAt?: string
          variables?: Json | null
          version?: number
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          confirmed: boolean
          confirmedAt: string | null
          createdAt: string
          eventId: string
          externalEmail: string | null
          externalName: string | null
          externalPhone: string | null
          id: string
          notified: boolean
          notifiedAt: string | null
          role: Database["public"]["Enums"]["ParticipantRole"]
          userId: string | null
        }
        Insert: {
          confirmed?: boolean
          confirmedAt?: string | null
          createdAt?: string
          eventId: string
          externalEmail?: string | null
          externalName?: string | null
          externalPhone?: string | null
          id: string
          notified?: boolean
          notifiedAt?: string | null
          role: Database["public"]["Enums"]["ParticipantRole"]
          userId?: string | null
        }
        Update: {
          confirmed?: boolean
          confirmedAt?: string | null
          createdAt?: string
          eventId?: string
          externalEmail?: string | null
          externalName?: string | null
          externalPhone?: string | null
          id?: string
          notified?: boolean
          notifiedAt?: string | null
          role?: Database["public"]["Enums"]["ParticipantRole"]
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_eventId_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      Exhibit: {
        Row: {
          caseId: string
          createdAt: string
          createdById: string
          description: string
          exhibitLabel: string
          exhibitNumber: number | null
          fileName: string
          fileSize: number
          fileType: string
          id: string
          jobId: string | null
          mimeType: string
          originalFileUrl: string
          stamped: boolean
          stampedFileUrl: string | null
        }
        Insert: {
          caseId: string
          createdAt?: string
          createdById: string
          description: string
          exhibitLabel: string
          exhibitNumber?: number | null
          fileName: string
          fileSize: number
          fileType: string
          id: string
          jobId?: string | null
          mimeType: string
          originalFileUrl: string
          stamped?: boolean
          stampedFileUrl?: string | null
        }
        Update: {
          caseId?: string
          createdAt?: string
          createdById?: string
          description?: string
          exhibitLabel?: string
          exhibitNumber?: number | null
          fileName?: string
          fileSize?: number
          fileType?: string
          id?: string
          jobId?: string | null
          mimeType?: string
          originalFileUrl?: string
          stamped?: boolean
          stampedFileUrl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Exhibit_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendar_connections: {
        Row: {
          accessToken: string
          autoSync: boolean
          calendarName: string | null
          createdAt: string
          firmId: string
          id: string
          isEnabled: boolean
          lastSyncedAt: string | null
          lastSyncError: string | null
          lastSyncToken: string | null
          provider: Database["public"]["Enums"]["ExternalCalendarProvider"]
          providerCalendarId: string
          refreshToken: string | null
          scopes: string[] | null
          syncErrorCount: number
          syncIntervalMins: number
          syncMode: Database["public"]["Enums"]["ExternalCalendarSyncMode"]
          tokenExpiresAt: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          accessToken: string
          autoSync?: boolean
          calendarName?: string | null
          createdAt?: string
          firmId: string
          id: string
          isEnabled?: boolean
          lastSyncedAt?: string | null
          lastSyncError?: string | null
          lastSyncToken?: string | null
          provider: Database["public"]["Enums"]["ExternalCalendarProvider"]
          providerCalendarId: string
          refreshToken?: string | null
          scopes?: string[] | null
          syncErrorCount?: number
          syncIntervalMins?: number
          syncMode?: Database["public"]["Enums"]["ExternalCalendarSyncMode"]
          tokenExpiresAt?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          accessToken?: string
          autoSync?: boolean
          calendarName?: string | null
          createdAt?: string
          firmId?: string
          id?: string
          isEnabled?: boolean
          lastSyncedAt?: string | null
          lastSyncError?: string | null
          lastSyncToken?: string | null
          provider?: Database["public"]["Enums"]["ExternalCalendarProvider"]
          providerCalendarId?: string
          refreshToken?: string | null
          scopes?: string[] | null
          syncErrorCount?: number
          syncIntervalMins?: number
          syncMode?: Database["public"]["Enums"]["ExternalCalendarSyncMode"]
          tokenExpiresAt?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      external_calendar_events: {
        Row: {
          conflictingEventIds: string[] | null
          connectionId: string
          createdAt: string
          deletedAt: string | null
          description: string | null
          endTime: string
          firmId: string
          hasConflict: boolean
          id: string
          isAllDay: boolean
          isBlockingTime: boolean
          lastSyncedAt: string
          linkedEventId: string | null
          location: string | null
          meetingLink: string | null
          providerCalendarId: string
          providerEtag: string | null
          providerEventId: string
          providerMetadata: Json | null
          showInCalendar: boolean
          startTime: string
          syncError: string | null
          syncStatus: Database["public"]["Enums"]["ExternalEventSyncStatus"]
          timezone: string
          title: string
          updatedAt: string
        }
        Insert: {
          conflictingEventIds?: string[] | null
          connectionId: string
          createdAt?: string
          deletedAt?: string | null
          description?: string | null
          endTime: string
          firmId: string
          hasConflict?: boolean
          id: string
          isAllDay?: boolean
          isBlockingTime?: boolean
          lastSyncedAt?: string
          linkedEventId?: string | null
          location?: string | null
          meetingLink?: string | null
          providerCalendarId: string
          providerEtag?: string | null
          providerEventId: string
          providerMetadata?: Json | null
          showInCalendar?: boolean
          startTime: string
          syncError?: string | null
          syncStatus?: Database["public"]["Enums"]["ExternalEventSyncStatus"]
          timezone?: string
          title: string
          updatedAt: string
        }
        Update: {
          conflictingEventIds?: string[] | null
          connectionId?: string
          createdAt?: string
          deletedAt?: string | null
          description?: string | null
          endTime?: string
          firmId?: string
          hasConflict?: boolean
          id?: string
          isAllDay?: boolean
          isBlockingTime?: boolean
          lastSyncedAt?: string
          linkedEventId?: string | null
          location?: string | null
          meetingLink?: string | null
          providerCalendarId?: string
          providerEtag?: string | null
          providerEventId?: string
          providerMetadata?: Json | null
          showInCalendar?: boolean
          startTime?: string
          syncError?: string | null
          syncStatus?: Database["public"]["Enums"]["ExternalEventSyncStatus"]
          timezone?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_events_connectionId_fkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "external_calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_calendar_events_linkedEventId_fkey"
            columns: ["linkedEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendar_sync_logs: {
        Row: {
          completedAt: string | null
          conflictsFound: number
          connectionId: string
          durationMs: number | null
          errorDetails: Json | null
          errorMessage: string | null
          eventsCreated: number
          eventsDeleted: number
          eventsUpdated: number
          id: string
          startedAt: string
          status: string
          syncType: string
        }
        Insert: {
          completedAt?: string | null
          conflictsFound?: number
          connectionId: string
          durationMs?: number | null
          errorDetails?: Json | null
          errorMessage?: string | null
          eventsCreated?: number
          eventsDeleted?: number
          eventsUpdated?: number
          id: string
          startedAt?: string
          status: string
          syncType: string
        }
        Update: {
          completedAt?: string | null
          conflictsFound?: number
          connectionId?: string
          durationMs?: number | null
          errorDetails?: Json | null
          errorMessage?: string | null
          eventsCreated?: number
          eventsDeleted?: number
          eventsUpdated?: number
          id?: string
          startedAt?: string
          status?: string
          syncType?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_sync_logs_connectionId_fkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "external_calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_vocabularies: {
        Row: {
          added_by: string
          boost: number
          category: string | null
          created_at: string
          firm_id: string
          id: string
          term: string
        }
        Insert: {
          added_by: string
          boost?: number
          category?: string | null
          created_at?: string
          firm_id: string
          id?: string
          term: string
        }
        Update: {
          added_by?: string
          boost?: number
          category?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_vocabularies_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_vocabularies_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          settings: Json
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          settings?: Json
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          settings?: Json
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      flagged_words: {
        Row: {
          alternatives: Json | null
          confidence: number
          context_after: string | null
          context_before: string | null
          corrected_word: string | null
          created_at: string
          end_time: number
          id: string
          original_word: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          segment_index: number | null
          sort_order: number | null
          speaker: string | null
          start_time: number
          status: Database["public"]["Enums"]["flagged_word_status"]
          transcription_id: string
          word_index: number
        }
        Insert: {
          alternatives?: Json | null
          confidence: number
          context_after?: string | null
          context_before?: string | null
          corrected_word?: string | null
          created_at?: string
          end_time: number
          id?: string
          original_word: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          segment_index?: number | null
          sort_order?: number | null
          speaker?: string | null
          start_time: number
          status?: Database["public"]["Enums"]["flagged_word_status"]
          transcription_id: string
          word_index: number
        }
        Update: {
          alternatives?: Json | null
          confidence?: number
          context_after?: string | null
          context_before?: string | null
          corrected_word?: string | null
          created_at?: string
          end_time?: number
          id?: string
          original_word?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          segment_index?: number | null
          sort_order?: number | null
          speaker?: string | null
          start_time?: number
          status?: Database["public"]["Enums"]["flagged_word_status"]
          transcription_id?: string
          word_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "flagged_words_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_words_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      HumanReviewSession: {
        Row: {
          confidenceThreshold: number
          createdAt: string
          id: string
          jobId: string
          minutesSpent: number
          reviewerId: string
          wordsReviewed: number
        }
        Insert: {
          confidenceThreshold?: number
          createdAt?: string
          id: string
          jobId: string
          minutesSpent: number
          reviewerId: string
          wordsReviewed: number
        }
        Update: {
          confidenceThreshold?: number
          createdAt?: string
          id?: string
          jobId?: string
          minutesSpent?: number
          reviewerId?: string
          wordsReviewed?: number
        }
        Relationships: []
      }
      Invoice: {
        Row: {
          billingAccountId: string
          createdAt: string
          finalizedAt: string | null
          id: string
          invoiceNumber: string
          paidAt: string | null
          paymentMethod: string | null
          periodEnd: string
          periodStart: string
          status: Database["public"]["Enums"]["InvoiceStatus"]
          stripeInvoiceId: string | null
          stripeInvoiceUrl: string | null
          stripePaymentIntentId: string | null
          subtotalCents: number
          taxCents: number
          totalCents: number
          updatedAt: string
          voidedAt: string | null
          voidedByUserId: string | null
          voidReason: string | null
        }
        Insert: {
          billingAccountId: string
          createdAt?: string
          finalizedAt?: string | null
          id: string
          invoiceNumber: string
          paidAt?: string | null
          paymentMethod?: string | null
          periodEnd: string
          periodStart: string
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          stripeInvoiceId?: string | null
          stripeInvoiceUrl?: string | null
          stripePaymentIntentId?: string | null
          subtotalCents?: number
          taxCents?: number
          totalCents: number
          updatedAt: string
          voidedAt?: string | null
          voidedByUserId?: string | null
          voidReason?: string | null
        }
        Update: {
          billingAccountId?: string
          createdAt?: string
          finalizedAt?: string | null
          id?: string
          invoiceNumber?: string
          paidAt?: string | null
          paymentMethod?: string | null
          periodEnd?: string
          periodStart?: string
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          stripeInvoiceId?: string | null
          stripeInvoiceUrl?: string | null
          stripePaymentIntentId?: string | null
          subtotalCents?: number
          taxCents?: number
          totalCents?: number
          updatedAt?: string
          voidedAt?: string | null
          voidedByUserId?: string | null
          voidReason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Invoice_billingAccountId_fkey"
            columns: ["billingAccountId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["id"]
          },
        ]
      }
      InvoiceLineItem: {
        Row: {
          description: string
          id: string
          invoiceId: string
          jobId: string | null
          quantity: number
          rateVersion: number
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          totalCents: number
          unit: Database["public"]["Enums"]["BillingUnit"]
          unitPriceCents: number
        }
        Insert: {
          description: string
          id: string
          invoiceId: string
          jobId?: string | null
          quantity: number
          rateVersion: number
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          totalCents: number
          unit: Database["public"]["Enums"]["BillingUnit"]
          unitPriceCents: number
        }
        Update: {
          description?: string
          id?: string
          invoiceId?: string
          jobId?: string | null
          quantity?: number
          rateVersion?: number
          serviceType?: Database["public"]["Enums"]["BillingServiceType"]
          totalCents?: number
          unit?: Database["public"]["Enums"]["BillingUnit"]
          unitPriceCents?: number
        }
        Relationships: [
          {
            foreignKeyName: "InvoiceLineItem_invoiceId_fkey"
            columns: ["invoiceId"]
            isOneToOne: false
            referencedRelation: "Invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      job_locks: {
        Row: {
          expires_at: string
          id: string
          job_id: string
          lock_type: string
          locked_at: string
          locked_by: string
        }
        Insert: {
          expires_at?: string
          id?: string
          job_id: string
          lock_type?: string
          locked_at?: string
          locked_by: string
        }
        Update: {
          expires_at?: string
          id?: string
          job_id?: string
          lock_type?: string
          locked_at?: string
          locked_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_locks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "attorney_shared_transcripts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_locks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_locks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "reporter_job_dashboard"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_locks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "scopist_review_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_locks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      JobAssignment: {
        Row: {
          id: string
          invitedAt: string
          jobId: string
          respondedAt: string | null
          scopistId: string
          scopistNotes: string | null
          startedAt: string | null
          status: Database["public"]["Enums"]["AssignmentStatus"]
          submittedAt: string | null
        }
        Insert: {
          id: string
          invitedAt?: string
          jobId: string
          respondedAt?: string | null
          scopistId: string
          scopistNotes?: string | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["AssignmentStatus"]
          submittedAt?: string | null
        }
        Update: {
          id?: string
          invitedAt?: string
          jobId?: string
          respondedAt?: string | null
          scopistId?: string
          scopistNotes?: string | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["AssignmentStatus"]
          submittedAt?: string | null
        }
        Relationships: []
      }
      JobClaim: {
        Row: {
          acceptedAt: string | null
          agreedRate: number | null
          claimedAt: string
          completedAt: string | null
          createdAt: string
          id: string
          jobId: string
          proposedRate: number | null
          rateType: Database["public"]["Enums"]["RateType"]
          rejectionReason: string | null
          reporterNote: string | null
          respondedAt: string | null
          scopistId: string
          scopistNote: string | null
          status: Database["public"]["Enums"]["ClaimStatus"]
          updatedAt: string
        }
        Insert: {
          acceptedAt?: string | null
          agreedRate?: number | null
          claimedAt?: string
          completedAt?: string | null
          createdAt?: string
          id: string
          jobId: string
          proposedRate?: number | null
          rateType?: Database["public"]["Enums"]["RateType"]
          rejectionReason?: string | null
          reporterNote?: string | null
          respondedAt?: string | null
          scopistId: string
          scopistNote?: string | null
          status?: Database["public"]["Enums"]["ClaimStatus"]
          updatedAt: string
        }
        Update: {
          acceptedAt?: string | null
          agreedRate?: number | null
          claimedAt?: string
          completedAt?: string | null
          createdAt?: string
          id?: string
          jobId?: string
          proposedRate?: number | null
          rateType?: Database["public"]["Enums"]["RateType"]
          rejectionReason?: string | null
          reporterNote?: string | null
          respondedAt?: string | null
          scopistId?: string
          scopistNote?: string | null
          status?: Database["public"]["Enums"]["ClaimStatus"]
          updatedAt?: string
        }
        Relationships: []
      }
      JobExhibit: {
        Row: {
          createdAt: string
          description: string | null
          discussionEndTimestamp: number | null
          discussionStartTimestamp: number | null
          exhibitLabel: string | null
          exhibitNumber: string
          externalUrl: string | null
          fileId: string | null
          id: string
          introducedAtLine: number | null
          introducedAtPage: number | null
          introducedAtTimestamp: number | null
          isMarkedForRecord: boolean
          jobId: string
          pageCount: number | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          discussionEndTimestamp?: number | null
          discussionStartTimestamp?: number | null
          exhibitLabel?: string | null
          exhibitNumber: string
          externalUrl?: string | null
          fileId?: string | null
          id: string
          introducedAtLine?: number | null
          introducedAtPage?: number | null
          introducedAtTimestamp?: number | null
          isMarkedForRecord?: boolean
          jobId: string
          pageCount?: number | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          discussionEndTimestamp?: number | null
          discussionStartTimestamp?: number | null
          exhibitLabel?: string | null
          exhibitNumber?: string
          externalUrl?: string | null
          fileId?: string | null
          id?: string
          introducedAtLine?: number | null
          introducedAtPage?: number | null
          introducedAtTimestamp?: number | null
          isMarkedForRecord?: boolean
          jobId?: string
          pageCount?: number | null
          updatedAt?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          assigned_at: string | null
          audio_duration_seconds: number | null
          audio_file_name: string | null
          audio_file_size: number | null
          audio_file_url: string | null
          audio_format: Database["public"]["Enums"]["audio_format"] | null
          case_name: string
          case_number: string | null
          completed_at: string | null
          court_name: string | null
          created_at: string
          deponent_name: string | null
          deposition_date: string | null
          due_date: string | null
          firm_id: string
          id: string
          internal_notes: string | null
          judge_name: string | null
          location: string | null
          lock_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          priority: number
          reporter_id: string
          reporter_notes: string | null
          rush_requested: boolean
          scopist_id: string | null
          sealed_at: string | null
          sealed_by: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          audio_duration_seconds?: number | null
          audio_file_name?: string | null
          audio_file_size?: number | null
          audio_file_url?: string | null
          audio_format?: Database["public"]["Enums"]["audio_format"] | null
          case_name: string
          case_number?: string | null
          completed_at?: string | null
          court_name?: string | null
          created_at?: string
          deponent_name?: string | null
          deposition_date?: string | null
          due_date?: string | null
          firm_id: string
          id?: string
          internal_notes?: string | null
          judge_name?: string | null
          location?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          priority?: number
          reporter_id: string
          reporter_notes?: string | null
          rush_requested?: boolean
          scopist_id?: string | null
          sealed_at?: string | null
          sealed_by?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          audio_duration_seconds?: number | null
          audio_file_name?: string | null
          audio_file_size?: number | null
          audio_file_url?: string | null
          audio_format?: Database["public"]["Enums"]["audio_format"] | null
          case_name?: string
          case_number?: string | null
          completed_at?: string | null
          court_name?: string | null
          created_at?: string
          deponent_name?: string | null
          deposition_date?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          internal_notes?: string | null
          judge_name?: string | null
          location?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          priority?: number
          reporter_id?: string
          reporter_notes?: string | null
          rush_requested?: boolean
          scopist_id?: string | null
          sealed_at?: string | null
          sealed_by?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_scopist_id_fkey"
            columns: ["scopist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_sealed_by_fkey"
            columns: ["sealed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      MarketplaceSettings: {
        Row: {
          acceptsMedicalDepos: boolean
          acceptsRushJobs: boolean
          acceptsTechnicalDepos: boolean
          autoAcceptClaims: boolean
          blockedScopists: string[] | null
          createdAt: string
          defaultRatePerPage: number | null
          id: string
          isAvailableForWork: boolean
          maxPagesAccepted: number | null
          minPagesAccepted: number | null
          preferredRatePerMinute: number | null
          preferredRatePerPage: number | null
          preferredScopists: string[] | null
          preferredStates: string[] | null
          updatedAt: string
          userId: string
        }
        Insert: {
          acceptsMedicalDepos?: boolean
          acceptsRushJobs?: boolean
          acceptsTechnicalDepos?: boolean
          autoAcceptClaims?: boolean
          blockedScopists?: string[] | null
          createdAt?: string
          defaultRatePerPage?: number | null
          id: string
          isAvailableForWork?: boolean
          maxPagesAccepted?: number | null
          minPagesAccepted?: number | null
          preferredRatePerMinute?: number | null
          preferredRatePerPage?: number | null
          preferredScopists?: string[] | null
          preferredStates?: string[] | null
          updatedAt: string
          userId: string
        }
        Update: {
          acceptsMedicalDepos?: boolean
          acceptsRushJobs?: boolean
          acceptsTechnicalDepos?: boolean
          autoAcceptClaims?: boolean
          blockedScopists?: string[] | null
          createdAt?: string
          defaultRatePerPage?: number | null
          id?: string
          isAvailableForWork?: boolean
          maxPagesAccepted?: number | null
          minPagesAccepted?: number | null
          preferredRatePerMinute?: number | null
          preferredRatePerPage?: number | null
          preferredScopists?: string[] | null
          preferredStates?: string[] | null
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          document_type: string | null
          error_message: string | null
          extraction_raw_json: Json | null
          extraction_summary: string | null
          facility_name: string | null
          file_name: string
          file_size_bytes: number
          file_url: string
          id: string
          job_id: string
          mime_type: string
          page_count: number | null
          patient_name: string | null
          processed_at: string | null
          provider_name: string | null
          status: Database["public"]["Enums"]["medical_record_status"]
          updated_at: string
          uploaded_by_id: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          document_type?: string | null
          error_message?: string | null
          extraction_raw_json?: Json | null
          extraction_summary?: string | null
          facility_name?: string | null
          file_name: string
          file_size_bytes?: number
          file_url: string
          id?: string
          job_id: string
          mime_type?: string
          page_count?: number | null
          patient_name?: string | null
          processed_at?: string | null
          provider_name?: string | null
          status?: Database["public"]["Enums"]["medical_record_status"]
          updated_at?: string
          uploaded_by_id: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          document_type?: string | null
          error_message?: string | null
          extraction_raw_json?: Json | null
          extraction_summary?: string | null
          facility_name?: string | null
          file_name?: string
          file_size_bytes?: number
          file_url?: string
          id?: string
          job_id?: string
          mime_type?: string
          page_count?: number | null
          patient_name?: string | null
          processed_at?: string | null
          provider_name?: string | null
          status?: Database["public"]["Enums"]["medical_record_status"]
          updated_at?: string
          uploaded_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "attorney_shared_transcripts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "medical_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "reporter_job_dashboard"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "medical_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scopist_review_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "medical_records_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          content: string
          createdAt: string
          id: string
          isRead: boolean
          jobId: string
          readAt: string | null
          senderId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          isRead?: boolean
          jobId: string
          readAt?: string | null
          senderId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          isRead?: boolean
          jobId?: string
          readAt?: string | null
          senderId?: string
        }
        Relationships: []
      }
      Notification: {
        Row: {
          createdAt: string
          emailSent: boolean
          emailSentAt: string | null
          id: string
          isRead: boolean
          jobId: string | null
          linkText: string | null
          linkUrl: string | null
          message: string
          readAt: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Insert: {
          createdAt?: string
          emailSent?: boolean
          emailSentAt?: string | null
          id: string
          isRead?: boolean
          jobId?: string | null
          linkText?: string | null
          linkUrl?: string | null
          message: string
          readAt?: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Update: {
          createdAt?: string
          emailSent?: boolean
          emailSentAt?: string | null
          id?: string
          isRead?: boolean
          jobId?: string | null
          linkText?: string | null
          linkUrl?: string | null
          message?: string
          readAt?: string | null
          title?: string
          type?: Database["public"]["Enums"]["NotificationType"]
          userId?: string
        }
        Relationships: []
      }
      PasswordResetToken: {
        Row: {
          createdAt: string
          email: string
          expires: string
          id: string
          token: string
        }
        Insert: {
          createdAt?: string
          email: string
          expires: string
          id: string
          token: string
        }
        Update: {
          createdAt?: string
          email?: string
          expires?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      PricingSnapshot: {
        Row: {
          asrMultiplier: number
          confidenceReviewRateCents: number
          createdAt: string
          fullReviewRateCents: number
          id: string
          minTranscriptionMinutes: number
          rxFlatFeeCents: number
          transcriptionRateCents: number
        }
        Insert: {
          asrMultiplier?: number
          confidenceReviewRateCents: number
          createdAt?: string
          fullReviewRateCents: number
          id: string
          minTranscriptionMinutes?: number
          rxFlatFeeCents: number
          transcriptionRateCents: number
        }
        Update: {
          asrMultiplier?: number
          confidenceReviewRateCents?: number
          createdAt?: string
          fullReviewRateCents?: number
          id?: string
          minTranscriptionMinutes?: number
          rxFlatFeeCents?: number
          transcriptionRateCents?: number
        }
        Relationships: []
      }
      processing_errors: {
        Row: {
          chunk_id: string | null
          error_code: string | null
          error_details: Json | null
          error_message: string
          id: string
          job_id: string
          max_retries: number
          next_retry_at: string | null
          occurred_at: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number
          retryable: boolean
          stage: Database["public"]["Enums"]["pipeline_stage"]
          transcription_id: string | null
        }
        Insert: {
          chunk_id?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message: string
          id?: string
          job_id: string
          max_retries?: number
          next_retry_at?: string | null
          occurred_at?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          retryable?: boolean
          stage: Database["public"]["Enums"]["pipeline_stage"]
          transcription_id?: string | null
        }
        Update: {
          chunk_id?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string
          id?: string
          job_id?: string
          max_retries?: number
          next_retry_at?: string | null
          occurred_at?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          retryable?: boolean
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          transcription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_errors_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "transcription_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "attorney_shared_transcripts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "processing_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "reporter_job_dashboard"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "processing_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scopist_review_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "processing_errors_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_errors_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          firm_id: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          firm_id?: string | null
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          firm_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_firm"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_meeting_info: {
        Row: {
          cloudRecordingPassword: string | null
          cloudRecordingUrl: string | null
          coHostKey: string | null
          createdAt: string
          dialInNumbers: Json | null
          hostKey: string | null
          id: string
          jobId: string
          meetingId: string | null
          meetingUrl: string | null
          passcode: string | null
          platform: Database["public"]["Enums"]["MeetingPlatform"]
          recordingDownloadedAt: string | null
          updatedAt: string
        }
        Insert: {
          cloudRecordingPassword?: string | null
          cloudRecordingUrl?: string | null
          coHostKey?: string | null
          createdAt?: string
          dialInNumbers?: Json | null
          hostKey?: string | null
          id: string
          jobId: string
          meetingId?: string | null
          meetingUrl?: string | null
          passcode?: string | null
          platform?: Database["public"]["Enums"]["MeetingPlatform"]
          recordingDownloadedAt?: string | null
          updatedAt: string
        }
        Update: {
          cloudRecordingPassword?: string | null
          cloudRecordingUrl?: string | null
          coHostKey?: string | null
          createdAt?: string
          dialInNumbers?: Json | null
          hostKey?: string | null
          id?: string
          jobId?: string
          meetingId?: string | null
          meetingUrl?: string | null
          passcode?: string | null
          platform?: Database["public"]["Enums"]["MeetingPlatform"]
          recordingDownloadedAt?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      reporter_availability: {
        Row: {
          createdAt: string
          endTime: string
          firmId: string
          id: string
          isRecurring: boolean
          notes: string | null
          recurrenceEnd: string | null
          recurrenceRule: string | null
          reporterId: string
          startTime: string
          timezone: string
          type: Database["public"]["Enums"]["AvailabilityType"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          endTime: string
          firmId: string
          id: string
          isRecurring?: boolean
          notes?: string | null
          recurrenceEnd?: string | null
          recurrenceRule?: string | null
          reporterId: string
          startTime: string
          timezone?: string
          type?: Database["public"]["Enums"]["AvailabilityType"]
          updatedAt: string
        }
        Update: {
          createdAt?: string
          endTime?: string
          firmId?: string
          id?: string
          isRecurring?: boolean
          notes?: string | null
          recurrenceEnd?: string | null
          recurrenceRule?: string | null
          reporterId?: string
          startTime?: string
          timezone?: string
          type?: Database["public"]["Enums"]["AvailabilityType"]
          updatedAt?: string
        }
        Relationships: []
      }
      ReporterUnavailability: {
        Row: {
          createdAt: string
          endDate: string
          id: string
          reason: string | null
          startDate: string
          userId: string
        }
        Insert: {
          createdAt?: string
          endDate: string
          id: string
          reason?: string | null
          startDate: string
          userId: string
        }
        Update: {
          createdAt?: string
          endDate?: string
          id?: string
          reason?: string | null
          startDate?: string
          userId?: string
        }
        Relationships: []
      }
      schedule_conflicts: {
        Row: {
          conflictEventId: string
          conflictType: Database["public"]["Enums"]["ConflictType"]
          createdAt: string
          firmId: string
          id: string
          overlapMinutes: number
          proposedEnd: string
          proposedStart: string
          resolution: Database["public"]["Enums"]["ConflictResolution"] | null
          resolutionNotes: string | null
          resolvedAt: string | null
          resolvedById: string | null
          sourceEventId: string
          status: Database["public"]["Enums"]["ConflictStatus"]
        }
        Insert: {
          conflictEventId: string
          conflictType: Database["public"]["Enums"]["ConflictType"]
          createdAt?: string
          firmId: string
          id: string
          overlapMinutes: number
          proposedEnd: string
          proposedStart: string
          resolution?: Database["public"]["Enums"]["ConflictResolution"] | null
          resolutionNotes?: string | null
          resolvedAt?: string | null
          resolvedById?: string | null
          sourceEventId: string
          status?: Database["public"]["Enums"]["ConflictStatus"]
        }
        Update: {
          conflictEventId?: string
          conflictType?: Database["public"]["Enums"]["ConflictType"]
          createdAt?: string
          firmId?: string
          id?: string
          overlapMinutes?: number
          proposedEnd?: string
          proposedStart?: string
          resolution?: Database["public"]["Enums"]["ConflictResolution"] | null
          resolutionNotes?: string | null
          resolvedAt?: string | null
          resolvedById?: string | null
          sourceEventId?: string
          status?: Database["public"]["Enums"]["ConflictStatus"]
        }
        Relationships: [
          {
            foreignKeyName: "schedule_conflicts_conflictEventId_fkey"
            columns: ["conflictEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_conflicts_sourceEventId_fkey"
            columns: ["sourceEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      silent_segments: {
        Row: {
          created_at: string
          end_time: number
          id: string
          noted_by: string
          notes: string | null
          segment_type: Database["public"]["Enums"]["silent_segment_type"]
          speaker: string | null
          start_time: number
          transcription_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          end_time: number
          id?: string
          noted_by: string
          notes?: string | null
          segment_type: Database["public"]["Enums"]["silent_segment_type"]
          speaker?: string | null
          start_time: number
          transcription_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          end_time?: number
          id?: string
          noted_by?: string
          notes?: string | null
          segment_type?: Database["public"]["Enums"]["silent_segment_type"]
          speaker?: string | null
          start_time?: number
          transcription_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "silent_segments_noted_by_fkey"
            columns: ["noted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silent_segments_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silent_segments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      SystemConfig: {
        Row: {
          description: string | null
          id: string
          key: string
          updatedAt: string
          value: Json
        }
        Insert: {
          description?: string | null
          id: string
          key: string
          updatedAt: string
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updatedAt?: string
          value?: Json
        }
        Relationships: []
      }
      Transcript: {
        Row: {
          aiChanges: Json | null
          aiFlags: Json | null
          averageConfidence: number | null
          content: string
          contentJson: Json
          createdAt: string
          createdBy: string
          deletedAt: string | null
          id: string
          jobId: string
          pageCount: number | null
          speakerCount: number | null
          version: string
          versionNumber: number
          wordCount: number | null
        }
        Insert: {
          aiChanges?: Json | null
          aiFlags?: Json | null
          averageConfidence?: number | null
          content: string
          contentJson: Json
          createdAt?: string
          createdBy: string
          deletedAt?: string | null
          id: string
          jobId: string
          pageCount?: number | null
          speakerCount?: number | null
          version: string
          versionNumber: number
          wordCount?: number | null
        }
        Update: {
          aiChanges?: Json | null
          aiFlags?: Json | null
          averageConfidence?: number | null
          content?: string
          contentJson?: Json
          createdAt?: string
          createdBy?: string
          deletedAt?: string | null
          id?: string
          jobId?: string
          pageCount?: number | null
          speakerCount?: number | null
          version?: string
          versionNumber?: number
          wordCount?: number | null
        }
        Relationships: []
      }
      transcript_integrity_chain: {
        Row: {
          created_at: string
          created_by: string
          edit_id: string | null
          id: string
          previous_hash: string | null
          transcript_hash: string
          transcription_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          edit_id?: string | null
          id?: string
          previous_hash?: string | null
          transcript_hash: string
          transcription_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          edit_id?: string | null
          id?: string
          previous_hash?: string | null
          transcript_hash?: string
          transcription_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "transcript_integrity_chain_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_integrity_chain_edit_id_fkey"
            columns: ["edit_id"]
            isOneToOne: false
            referencedRelation: "transcription_edits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_integrity_chain_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_shares: {
        Row: {
          access_count: number
          access_level: Database["public"]["Enums"]["share_access_level"]
          created_at: string
          download_allowed: boolean
          expires_at: string | null
          id: string
          job_id: string
          last_accessed_at: string | null
          message: string | null
          revoked_at: string | null
          shared_by: string
          shared_with: string
        }
        Insert: {
          access_count?: number
          access_level?: Database["public"]["Enums"]["share_access_level"]
          created_at?: string
          download_allowed?: boolean
          expires_at?: string | null
          id?: string
          job_id: string
          last_accessed_at?: string | null
          message?: string | null
          revoked_at?: string | null
          shared_by: string
          shared_with: string
        }
        Update: {
          access_count?: number
          access_level?: Database["public"]["Enums"]["share_access_level"]
          created_at?: string
          download_allowed?: boolean
          expires_at?: string | null
          id?: string
          job_id?: string
          last_accessed_at?: string | null
          message?: string | null
          revoked_at?: string | null
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_shares_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "attorney_shared_transcripts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "transcript_shares_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_shares_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "reporter_job_dashboard"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "transcript_shares_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scopist_review_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "transcript_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptAccess: {
        Row: {
          accessCount: number
          accessLevel: Database["public"]["Enums"]["TranscriptAccessLevel"]
          caseId: string | null
          createdAt: string
          downloadCount: number
          downloadLimit: number | null
          expiresAt: string | null
          grantedById: string
          id: string
          lastAccessedAt: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          accessCount?: number
          accessLevel?: Database["public"]["Enums"]["TranscriptAccessLevel"]
          caseId?: string | null
          createdAt?: string
          downloadCount?: number
          downloadLimit?: number | null
          expiresAt?: string | null
          grantedById: string
          id: string
          lastAccessedAt?: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          accessCount?: number
          accessLevel?: Database["public"]["Enums"]["TranscriptAccessLevel"]
          caseId?: string | null
          createdAt?: string
          downloadCount?: number
          downloadLimit?: number | null
          expiresAt?: string | null
          grantedById?: string
          id?: string
          lastAccessedAt?: string | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptAccess_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAccess_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptAnnotation: {
        Row: {
          createdAt: string
          createdById: string
          id: string
          issueCode: string
          issueColor: string
          issueLabel: string
          lineEnd: number
          lineStart: number
          note: string | null
          pageEnd: number
          pageStart: number
          transcriptId: string
        }
        Insert: {
          createdAt?: string
          createdById: string
          id: string
          issueCode: string
          issueColor: string
          issueLabel: string
          lineEnd: number
          lineStart: number
          note?: string | null
          pageEnd: number
          pageStart: number
          transcriptId: string
        }
        Update: {
          createdAt?: string
          createdById?: string
          id?: string
          issueCode?: string
          issueColor?: string
          issueLabel?: string
          lineEnd?: number
          lineStart?: number
          note?: string | null
          pageEnd?: number
          pageStart?: number
          transcriptId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptAnnotation_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "AttorneyTranscript"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptAnnotationExhibit: {
        Row: {
          annotationId: string
          createdAt: string
          createdById: string
          exhibitId: string
          id: string
        }
        Insert: {
          annotationId: string
          createdAt?: string
          createdById: string
          exhibitId: string
          id: string
        }
        Update: {
          annotationId?: string
          createdAt?: string
          createdById?: string
          exhibitId?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptAnnotationExhibit_annotationId_fkey"
            columns: ["annotationId"]
            isOneToOne: false
            referencedRelation: "TranscriptAnnotation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAnnotationExhibit_exhibitId_fkey"
            columns: ["exhibitId"]
            isOneToOne: false
            referencedRelation: "Exhibit"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptBookmark: {
        Row: {
          createdAt: string
          description: string | null
          id: string
          label: string
          lineNumber: number
          pageNumber: number | null
          snippetText: string | null
          sortOrder: number
          timestamp: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id: string
          label: string
          lineNumber: number
          pageNumber?: number | null
          snippetText?: string | null
          sortOrder?: number
          timestamp?: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: string
          label?: string
          lineNumber?: number
          pageNumber?: number | null
          snippetText?: string | null
          sortOrder?: number
          timestamp?: string | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptBookmark_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptHighlight: {
        Row: {
          color: Database["public"]["Enums"]["HighlightColor"]
          createdAt: string
          endIndex: number
          endLine: number | null
          highlightedText: string
          id: string
          note: string | null
          startIndex: number
          startLine: number | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          color?: Database["public"]["Enums"]["HighlightColor"]
          createdAt?: string
          endIndex: number
          endLine?: number | null
          highlightedText: string
          id: string
          note?: string | null
          startIndex: number
          startLine?: number | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          color?: Database["public"]["Enums"]["HighlightColor"]
          createdAt?: string
          endIndex?: number
          endLine?: number | null
          highlightedText?: string
          id?: string
          note?: string | null
          startIndex?: number
          startLine?: number | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptHighlight_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptHighlightTag: {
        Row: {
          createdAt: string
          highlightId: string
          id: string
          tagId: string
        }
        Insert: {
          createdAt?: string
          highlightId: string
          id: string
          tagId: string
        }
        Update: {
          createdAt?: string
          highlightId?: string
          id?: string
          tagId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptHighlightTag_highlightId_fkey"
            columns: ["highlightId"]
            isOneToOne: false
            referencedRelation: "TranscriptHighlight"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptHighlightTag_tagId_fkey"
            columns: ["tagId"]
            isOneToOne: false
            referencedRelation: "TranscriptTag"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_chunks: {
        Row: {
          attempts: number
          audio_end_seconds: number
          audio_start_seconds: number
          chunk_index: number
          created_at: string
          deepgram_response: Json | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          overlap_seconds: number
          processing_time_ms: number | null
          status: Database["public"]["Enums"]["chunk_status"]
          transcription_id: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          attempts?: number
          audio_end_seconds: number
          audio_start_seconds: number
          chunk_index: number
          created_at?: string
          deepgram_response?: Json | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          overlap_seconds?: number
          processing_time_ms?: number | null
          status?: Database["public"]["Enums"]["chunk_status"]
          transcription_id: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          attempts?: number
          audio_end_seconds?: number
          audio_start_seconds?: number
          chunk_index?: number
          created_at?: string
          deepgram_response?: Json | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          overlap_seconds?: number
          processing_time_ms?: number | null
          status?: Database["public"]["Enums"]["chunk_status"]
          transcription_id?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcription_chunks_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_edits: {
        Row: {
          chain_version: number | null
          created_at: string
          edit_type: Database["public"]["Enums"]["edit_type"]
          editor_id: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: string
          original_value: string
          post_edit_hash: string | null
          pre_edit_hash: string | null
          segment_index: number | null
          transcription_id: string
          user_agent: string | null
          word_index: number | null
        }
        Insert: {
          chain_version?: number | null
          created_at?: string
          edit_type: Database["public"]["Enums"]["edit_type"]
          editor_id: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value: string
          original_value: string
          post_edit_hash?: string | null
          pre_edit_hash?: string | null
          segment_index?: number | null
          transcription_id: string
          user_agent?: string | null
          word_index?: number | null
        }
        Update: {
          chain_version?: number | null
          created_at?: string
          edit_type?: Database["public"]["Enums"]["edit_type"]
          editor_id?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string
          original_value?: string
          post_edit_hash?: string | null
          pre_edit_hash?: string | null
          segment_index?: number | null
          transcription_id?: string
          user_agent?: string | null
          word_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcription_edits_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcription_edits_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptionJob: {
        Row: {
          audioUrl: string
          averageConfidence: number | null
          completedAt: string | null
          config: Json
          createdAt: string
          deepgramRequestId: string
          duration: number | null
          errorMessage: string | null
          id: string
          jobId: string
          maxRetries: number
          rawJson: Json | null
          retryCount: number
          speakerCount: number | null
          wordCount: number | null
        }
        Insert: {
          audioUrl: string
          averageConfidence?: number | null
          completedAt?: string | null
          config: Json
          createdAt?: string
          deepgramRequestId: string
          duration?: number | null
          errorMessage?: string | null
          id: string
          jobId: string
          maxRetries?: number
          rawJson?: Json | null
          retryCount?: number
          speakerCount?: number | null
          wordCount?: number | null
        }
        Update: {
          audioUrl?: string
          averageConfidence?: number | null
          completedAt?: string | null
          config?: Json
          createdAt?: string
          deepgramRequestId?: string
          duration?: number | null
          errorMessage?: string | null
          id?: string
          jobId?: string
          maxRetries?: number
          rawJson?: Json | null
          retryCount?: number
          speakerCount?: number | null
          wordCount?: number | null
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          audio_duration_seconds: number | null
          chunk_count: number
          chunking_config: Json | null
          created_at: string
          current_integrity_hash: string | null
          deepgram_config: Json | null
          deepgram_model: string
          deepgram_raw_json: Json | null
          error_summary: string | null
          flagged_word_count: number
          full_transcript: string | null
          id: string
          job_id: string
          language: string | null
          original_integrity_hash: string | null
          original_transcript: string | null
          processing_time_ms: number | null
          reviewed_word_count: number
          segments: Json | null
          source: Database["public"]["Enums"]["transcription_source"]
          speakers: Json | null
          status: Database["public"]["Enums"]["transcription_status"]
          total_word_count: number
          updated_at: string
          words: Json | null
        }
        Insert: {
          audio_duration_seconds?: number | null
          chunk_count?: number
          chunking_config?: Json | null
          created_at?: string
          current_integrity_hash?: string | null
          deepgram_config?: Json | null
          deepgram_model?: string
          deepgram_raw_json?: Json | null
          error_summary?: string | null
          flagged_word_count?: number
          full_transcript?: string | null
          id?: string
          job_id: string
          language?: string | null
          original_integrity_hash?: string | null
          original_transcript?: string | null
          processing_time_ms?: number | null
          reviewed_word_count?: number
          segments?: Json | null
          source?: Database["public"]["Enums"]["transcription_source"]
          speakers?: Json | null
          status?: Database["public"]["Enums"]["transcription_status"]
          total_word_count?: number
          updated_at?: string
          words?: Json | null
        }
        Update: {
          audio_duration_seconds?: number | null
          chunk_count?: number
          chunking_config?: Json | null
          created_at?: string
          current_integrity_hash?: string | null
          deepgram_config?: Json | null
          deepgram_model?: string
          deepgram_raw_json?: Json | null
          error_summary?: string | null
          flagged_word_count?: number
          full_transcript?: string | null
          id?: string
          job_id?: string
          language?: string | null
          original_integrity_hash?: string | null
          original_transcript?: string | null
          processing_time_ms?: number | null
          reviewed_word_count?: number
          segments?: Json | null
          source?: Database["public"]["Enums"]["transcription_source"]
          speakers?: Json | null
          status?: Database["public"]["Enums"]["transcription_status"]
          total_word_count?: number
          updated_at?: string
          words?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "attorney_shared_transcripts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "transcriptions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcriptions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "reporter_job_dashboard"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "transcriptions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "scopist_review_queue"
            referencedColumns: ["job_id"]
          },
        ]
      }
      TranscriptNote: {
        Row: {
          content: string
          createdAt: string
          id: string
          isPrivate: boolean
          lineNumber: number | null
          pageNumber: number | null
          timestamp: string | null
          title: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          isPrivate?: boolean
          lineNumber?: number | null
          pageNumber?: number | null
          timestamp?: string | null
          title?: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          isPrivate?: boolean
          lineNumber?: number | null
          pageNumber?: number | null
          timestamp?: string | null
          title?: string | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptNote_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptOrder: {
        Row: {
          address: string | null
          attorneyName: string
          city: string | null
          copyCount: number
          createdAt: string
          csrRecordId: string
          deliveredAt: string | null
          deliveryType: Database["public"]["Enums"]["TranscriptDeliveryType"]
          email: string
          fax: string | null
          fileFormat: Database["public"]["Enums"]["TranscriptFileFormat"]
          firmName: string | null
          id: string
          invoiced: boolean
          invoicedAt: string | null
          isOriginal: boolean
          pageCount: number | null
          phone: string | null
          pricePerPage: number | null
          sentAt: string | null
          state: string | null
          status: Database["public"]["Enums"]["OrderFulfillmentStatus"]
          totalPrice: number | null
          trackingNumber: string | null
          updatedAt: string
          zipCode: string | null
        }
        Insert: {
          address?: string | null
          attorneyName: string
          city?: string | null
          copyCount?: number
          createdAt?: string
          csrRecordId: string
          deliveredAt?: string | null
          deliveryType?: Database["public"]["Enums"]["TranscriptDeliveryType"]
          email: string
          fax?: string | null
          fileFormat?: Database["public"]["Enums"]["TranscriptFileFormat"]
          firmName?: string | null
          id: string
          invoiced?: boolean
          invoicedAt?: string | null
          isOriginal?: boolean
          pageCount?: number | null
          phone?: string | null
          pricePerPage?: number | null
          sentAt?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["OrderFulfillmentStatus"]
          totalPrice?: number | null
          trackingNumber?: string | null
          updatedAt: string
          zipCode?: string | null
        }
        Update: {
          address?: string | null
          attorneyName?: string
          city?: string | null
          copyCount?: number
          createdAt?: string
          csrRecordId?: string
          deliveredAt?: string | null
          deliveryType?: Database["public"]["Enums"]["TranscriptDeliveryType"]
          email?: string
          fax?: string | null
          fileFormat?: Database["public"]["Enums"]["TranscriptFileFormat"]
          firmName?: string | null
          id?: string
          invoiced?: boolean
          invoicedAt?: string | null
          isOriginal?: boolean
          pageCount?: number | null
          phone?: string | null
          pricePerPage?: number | null
          sentAt?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["OrderFulfillmentStatus"]
          totalPrice?: number | null
          trackingNumber?: string | null
          updatedAt?: string
          zipCode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptOrder_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptReviewSession: {
        Row: {
          corrections: Json
          createdAt: string
          id: string
          reviewedIndices: number[] | null
          transcriptionId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          corrections: Json
          createdAt?: string
          id: string
          reviewedIndices?: number[] | null
          transcriptionId: string
          updatedAt: string
          userId: string
        }
        Update: {
          corrections?: Json
          createdAt?: string
          id?: string
          reviewedIndices?: number[] | null
          transcriptionId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      TranscriptTag: {
        Row: {
          caseId: string | null
          color: string | null
          createdAt: string
          description: string | null
          firmId: string | null
          id: string
          isSystem: boolean
          name: string
          updatedAt: string
          userId: string | null
        }
        Insert: {
          caseId?: string | null
          color?: string | null
          createdAt?: string
          description?: string | null
          firmId?: string | null
          id: string
          isSystem?: boolean
          name: string
          updatedAt: string
          userId?: string | null
        }
        Update: {
          caseId?: string | null
          color?: string | null
          createdAt?: string
          description?: string | null
          firmId?: string | null
          id?: string
          isSystem?: boolean
          name?: string
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptTag_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptToken: {
        Row: {
          confidence: number
          createdAt: string
          end: number
          id: string
          index: number
          isFlagged: boolean
          isReviewed: boolean
          punctuatedWord: string | null
          speaker: number | null
          start: number
          transcriptId: string
          word: string
        }
        Insert: {
          confidence: number
          createdAt?: string
          end: number
          id: string
          index: number
          isFlagged?: boolean
          isReviewed?: boolean
          punctuatedWord?: string | null
          speaker?: number | null
          start: number
          transcriptId: string
          word: string
        }
        Update: {
          confidence?: number
          createdAt?: string
          end?: number
          id?: string
          index?: number
          isFlagged?: boolean
          isReviewed?: boolean
          punctuatedWord?: string | null
          speaker?: number | null
          start?: number
          transcriptId?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptToken_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
        ]
      }
      UsageRecord: {
        Row: {
          amount: number
          createdAt: string
          firmId: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          createdAt?: string
          firmId: string
          id: string
          type: string
        }
        Update: {
          amount?: number
          createdAt?: string
          firmId?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      WebhookConfig: {
        Row: {
          createdAt: string
          events: string[] | null
          firmId: string
          id: string
          isActive: boolean
          secret: string
          updatedAt: string
          url: string
        }
        Insert: {
          createdAt?: string
          events?: string[] | null
          firmId: string
          id: string
          isActive?: boolean
          secret: string
          updatedAt: string
          url: string
        }
        Update: {
          createdAt?: string
          events?: string[] | null
          firmId?: string
          id?: string
          isActive?: boolean
          secret?: string
          updatedAt?: string
          url?: string
        }
        Relationships: []
      }
      WebhookDelivery: {
        Row: {
          attempts: number
          createdAt: string
          error: string | null
          event: string
          id: string
          lastAttemptAt: string | null
          payload: string
          status: string
          statusCode: number | null
          webhookId: string
        }
        Insert: {
          attempts?: number
          createdAt?: string
          error?: string | null
          event: string
          id: string
          lastAttemptAt?: string | null
          payload: string
          status?: string
          statusCode?: number | null
          webhookId: string
        }
        Update: {
          attempts?: number
          createdAt?: string
          error?: string | null
          event?: string
          id?: string
          lastAttemptAt?: string | null
          payload?: string
          status?: string
          statusCode?: number | null
          webhookId?: string
        }
        Relationships: [
          {
            foreignKeyName: "WebhookDelivery_webhookId_fkey"
            columns: ["webhookId"]
            isOneToOne: false
            referencedRelation: "WebhookConfig"
            referencedColumns: ["id"]
          },
        ]
      }
      wkt_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wkt_bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "wkt_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      wkt_mock_exams: {
        Row: {
          answers: Json | null
          category_scores: Json | null
          completed_at: string | null
          correct_answers: number | null
          id: string
          passed: boolean | null
          question_ids: string[] | null
          score_percentage: number | null
          started_at: string | null
          time_spent_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          passed?: boolean | null
          question_ids?: string[] | null
          score_percentage?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          passed?: boolean | null
          question_ids?: string[] | null
          score_percentage?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      wkt_questions: {
        Row: {
          ai_generated: boolean | null
          category: string
          correct_answer: string
          created_at: string | null
          difficulty: number | null
          explanation: string | null
          id: string
          options: Json | null
          question_text: string
          question_type: string
          source_reference: string | null
          subcategory: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          ai_generated?: boolean | null
          category: string
          correct_answer: string
          created_at?: string | null
          difficulty?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text: string
          question_type: string
          source_reference?: string | null
          subcategory?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          ai_generated?: boolean | null
          category?: string
          correct_answer?: string
          created_at?: string | null
          difficulty?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
          source_reference?: string | null
          subcategory?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      wkt_study_sessions: {
        Row: {
          category: string | null
          correct_answers: number | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          questions_answered: number | null
          session_type: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          correct_answers?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          questions_answered?: number | null
          session_type?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          correct_answers?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          questions_answered?: number | null
          session_type?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wkt_user_progress: {
        Row: {
          attempts: number | null
          correct_count: number | null
          created_at: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_attempt: string | null
          next_review: string | null
          question_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          correct_count?: number | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_attempt?: string | null
          next_review?: string | null
          question_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          correct_count?: number | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_attempt?: string | null
          next_review?: string | null
          question_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wkt_user_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "wkt_questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attorney_shared_transcripts: {
        Row: {
          audio_duration_seconds: number | null
          case_name: string | null
          case_number: string | null
          completed_at: string | null
          deponent_name: string | null
          deposition_date: string | null
          download_allowed: boolean | null
          expires_at: string | null
          full_transcript: string | null
          job_id: string | null
          last_accessed_at: string | null
          message: string | null
          segments: Json | null
          share_id: string | null
          shared_at: string | null
          shared_by: string | null
          shared_by_name: string | null
          speakers: Json | null
          transcription_source:
            | Database["public"]["Enums"]["transcription_source"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reporter_job_dashboard: {
        Row: {
          active_errors: number | null
          audio_duration_seconds: number | null
          audio_file_name: string | null
          case_name: string | null
          case_number: string | null
          completed_at: string | null
          created_at: string | null
          deponent_name: string | null
          deposition_date: string | null
          due_date: string | null
          flagged_word_count: number | null
          job_id: string | null
          pipeline_status:
            | Database["public"]["Enums"]["transcription_status"]
            | null
          reviewed_word_count: number | null
          rush_requested: boolean | null
          scopist_id: string | null
          scopist_name: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          transcription_source:
            | Database["public"]["Enums"]["transcription_source"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_scopist_id_fkey"
            columns: ["scopist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scopist_review_queue: {
        Row: {
          assigned_at: string | null
          case_name: string | null
          case_number: string | null
          created_at: string | null
          deponent_name: string | null
          due_date: string | null
          flagged_word_count: number | null
          job_id: string | null
          job_status: Database["public"]["Enums"]["job_status"] | null
          locked_at: string | null
          locked_by: string | null
          pipeline_status:
            | Database["public"]["Enums"]["transcription_status"]
            | null
          reporter_id: string | null
          reporter_name: string | null
          review_progress_pct: number | null
          reviewed_word_count: number | null
          rush_requested: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_chain_audit: {
        Row: {
          case_name: string | null
          case_number: string | null
          deponent_name: string | null
          edit_id: string | null
          edit_type: Database["public"]["Enums"]["edit_type"] | null
          edited_by: string | null
          new_value: string | null
          original_value: string | null
          previous_hash: string | null
          transcript_hash: string | null
          transcription_id: string | null
          version_created_at: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_integrity_chain_edit_id_fkey"
            columns: ["edit_id"]
            isOneToOne: false
            referencedRelation: "transcription_edits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_integrity_chain_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acquire_job_lock: {
        Args: {
          p_job_id: string
          p_timeout_minutes?: number
          p_user_id: string
        }
        Returns: boolean
      }
      append_integrity_chain: {
        Args: {
          p_edit_id: string
          p_transcript_text: string
          p_transcription_id: string
          p_user_id: string
        }
        Returns: number
      }
      cleanup_expired_locks: { Args: never; Returns: number }
      extract_flagged_words: {
        Args: { p_confidence_threshold?: number; p_transcription_id: string }
        Returns: number
      }
      generate_integrity_hash: { Args: { content: string }; Returns: string }
      is_not_attorney: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_actor_id: string
          p_details?: Json
          p_ip_address?: string
          p_previous_state?: Json
          p_target_id: string
          p_target_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_processing_error: {
        Args: {
          p_chunk_id?: string
          p_error_code: string
          p_error_details?: Json
          p_error_message: string
          p_job_id: string
          p_retryable?: boolean
          p_stage: Database["public"]["Enums"]["pipeline_stage"]
          p_transcription_id?: string
        }
        Returns: string
      }
      release_job_lock: {
        Args: { p_job_id: string; p_user_id: string }
        Returns: boolean
      }
      verify_integrity_chain: {
        Args: { p_transcription_id: string }
        Returns: {
          broken_at_version: number
          details: string
          is_valid: boolean
          total_versions: number
        }[]
      }
    }
    Enums: {
      AgencyPlanType: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"
      AppearanceType: "IN_PERSON" | "REMOTE" | "PHONE"
      ASRModelTier: "STANDARD" | "ENHANCED"
      AssignmentStatus:
        | "INVITED"
        | "ACCEPTED"
        | "DECLINED"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "EXPIRED"
        | "RELEASED"
      AttorneyRole:
        | "PLAINTIFF_COUNSEL"
        | "DEFENSE_COUNSEL"
        | "ORDERING_ATTORNEY"
        | "COPY_ATTORNEY"
        | "OTHER"
      AttorneyTranscriptStatus: "NOT_REVIEWED" | "IN_PROGRESS" | "COMPLETE"
      audio_format: "MP3" | "WAV" | "M4A" | "MP4" | "MOV"
      AudioEnhancementType: "AUTOMATED_DOLBY" | "MANUAL_RX"
      AudioProcessingMode: "AUTOMATED" | "MANUAL_RX"
      AudioSessionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED"
      audit_action:
        | "JOB_CREATED"
        | "JOB_STATUS_CHANGED"
        | "JOB_ASSIGNED"
        | "JOB_DELETED"
        | "JOB_SEALED"
        | "TRANSCRIPTION_STARTED"
        | "TRANSCRIPTION_COMPLETED"
        | "TRANSCRIPTION_FAILED"
        | "WORD_CORRECTED"
        | "SEGMENT_EDITED"
        | "SPEAKER_RELABELED"
        | "BULK_EDIT_APPLIED"
        | "SILENT_SEGMENT_ADDED"
        | "SILENT_SEGMENT_EDITED"
        | "REVIEW_STARTED"
        | "REVIEW_SUBMITTED"
        | "REVIEW_APPROVED"
        | "TRANSCRIPT_LOCKED"
        | "TRANSCRIPT_UNLOCKED"
        | "TRANSCRIPT_EXPORTED"
        | "TRANSCRIPT_SHARED"
        | "SHARE_REVOKED"
        | "USER_LOGIN"
        | "USER_ROLE_CHANGED"
      AvailabilityType: "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE"
      BillingServiceType:
        | "TRANSCRIPTION_AUTOMATED"
        | "MODEL_UPGRADE"
        | "HUMAN_REVIEW_CONFIDENCE"
        | "HUMAN_REVIEW_FULL"
        | "FORENSIC_AUDIO_RX"
      BillingUnit: "PER_MINUTE" | "PER_WORD" | "PER_FILE" | "PER_HOUR"
      BookingRequestStatus:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "CANCELLED"
        | "MODIFIED"
      CalendarAuditAction:
        | "EVENT_CREATED"
        | "EVENT_UPDATED"
        | "EVENT_CANCELLED"
        | "EVENT_RESCHEDULED"
        | "REPORTER_ASSIGNED"
        | "REPORTER_UNASSIGNED"
        | "SCOPIST_ASSIGNED"
        | "SCOPIST_UNASSIGNED"
        | "VIDEOGRAPHER_ASSIGNED"
        | "VIDEOGRAPHER_UNASSIGNED"
        | "INTERPRETER_ASSIGNED"
        | "INTERPRETER_UNASSIGNED"
        | "CONVERTED_TO_JOB"
        | "NOTE_ADDED"
        | "STATUS_CHANGED"
      CalendarEventStatus:
        | "REQUESTED"
        | "SCHEDULED"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CONVERTED"
        | "CANCELLED"
        | "RESCHEDULED"
        | "EXTERNAL_BLOCK"
      CaseDocumentType:
        | "NOTICE_OF_DEPOSITION"
        | "CSR_PAPERWORK"
        | "DEPO_NOTES"
        | "COURT_ORDER"
        | "SUBPOENA"
        | "EXHIBIT_LIST"
        | "OTHER"
      CaseRole: "ATTORNEY" | "PARALEGAL" | "REPORTER"
      CaseStatus: "ACTIVE" | "CLOSED" | "SETTLED" | "ARCHIVED"
      chronology_source_type: "AI_EXTRACTED" | "MANUAL" | "EDITED"
      chunk_status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED"
      ClaimStatus:
        | "PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "APPROVED"
        | "DISPUTED"
        | "CANCELLED"
      ConflictResolution:
        | "KEPT_ORIGINAL"
        | "MOVED_ORIGINAL"
        | "REASSIGNED_REPORTER"
        | "OVERRIDE_ACCEPTED"
        | "TIME_ADJUSTED"
      ConflictStatus: "PENDING" | "OVERRIDDEN" | "RESOLVED" | "AUTO_FIXED"
      ConflictType:
        | "REPORTER_DOUBLE_BOOKED"
        | "LOCATION_CONFLICT"
        | "TRAVEL_TIME_INSUFFICIENT"
        | "RESOURCE_UNAVAILABLE"
      CSRAttorneyRole:
        | "ORDERING_ATTORNEY"
        | "COPY_ATTORNEY"
        | "PLAINTIFF_COUNSEL"
        | "DEFENSE_COUNSEL"
        | "CROSS_NOTICING"
        | "OTHER"
      DataSource: "IMPORT" | "MANUAL" | "REPORTER_OVERRIDE"
      DeliveryMethod: "E_TRANS" | "HARD_COPY" | "BOTH" | "FTP" | "PORTAL"
      DeliveryPriority:
        | "STANDARD"
        | "EXPEDITE"
        | "RUSH"
        | "DAILY"
        | "HOURLY"
        | "REALTIME"
      DeponentRole:
        | "PLAINTIFF"
        | "DEFENDANT"
        | "CORPORATE_REP"
        | "EXPERT_WITNESS"
        | "FACT_WITNESS"
        | "THIRD_PARTY"
      DepositionNoteType: "PROPER_NOUN" | "GENERAL_NOTE"
      DocumentTemplateType:
        | "TITLE_PAGE"
        | "APPEARANCE_PAGE"
        | "CERTIFICATE_PAGE"
        | "INDEX_PAGE"
        | "ERRATA_SHEET"
        | "WORD_INDEX"
      edit_type:
        | "WORD_CORRECTION"
        | "SEGMENT_EDIT"
        | "SPEAKER_RELABEL"
        | "BULK_EDIT"
      EnhancementMode: "OFF" | "DOLBY_ONLY" | "HYBRID" | "AUPHONIC_ONLY"
      EnhancementStatus:
        | "PENDING"
        | "PROCESSING_DOLBY"
        | "PROCESSING_AUPHONIC"
        | "COMPLETED"
        | "ERROR"
      EventType:
        | "DEPOSITION"
        | "HEARING"
        | "ARBITRATION"
        | "MEDIATION"
        | "EUO"
        | "STATEMENT"
        | "OTHER"
      ExternalCalendarProvider: "GOOGLE" | "OUTLOOK" | "APPLE"
      ExternalCalendarSyncMode: "READ_ONLY" | "PUSH_INTERNAL" | "BIDIRECTIONAL"
      ExternalEventSyncStatus:
        | "SYNCED"
        | "PENDING"
        | "CONFLICT"
        | "FAILED"
        | "DELETED"
      ExtractionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      flagged_word_status: "PENDING" | "CORRECTED" | "CONFIRMED" | "SKIPPED"
      HighlightColor: "YELLOW" | "GREEN" | "BLUE" | "PINK" | "ORANGE" | "PURPLE"
      InvoiceStatus: "DRAFT" | "OPEN" | "PAID" | "VOID"
      job_status:
        | "DRAFT"
        | "PENDING"
        | "PROCESSING"
        | "AI_COMPLETE"
        | "IN_REVIEW"
        | "SCOPIST_COMPLETE"
        | "FINAL_REVIEW"
        | "COMPLETED"
        | "ARCHIVED"
        | "FAILED"
      LocationType:
        | "IN_PERSON"
        | "ZOOM"
        | "TEAMS"
        | "WEBEX"
        | "PHONE"
        | "HYBRID"
        | "OTHER"
      medical_record_status:
        | "UPLOADED"
        | "PROCESSING"
        | "EXTRACTED"
        | "FAILED"
        | "ARCHIVED"
      MeetingPlatform: "ZOOM" | "TEAMS" | "WEBEX" | "GOOGLE_MEET" | "OTHER"
      NotificationType:
        | "JOB_ASSIGNED"
        | "TRANSCRIPTION_COMPLETE"
        | "AI_REVIEW_COMPLETE"
        | "SCOPIST_ACCEPTED"
        | "SCOPIST_DECLINED"
        | "SCOPIST_SUBMITTED"
        | "REPORTER_REVIEWED"
        | "JOB_COMPLETE"
        | "SYSTEM_ERROR"
        | "MESSAGE_RECEIVED"
      OrderFulfillmentStatus:
        | "PENDING"
        | "READY"
        | "SENT"
        | "DELIVERED"
        | "RETURNED"
        | "CANCELLED"
      ParticipantRole:
        | "ATTORNEY_PLAINTIFF"
        | "ATTORNEY_DEFENSE"
        | "WITNESS"
        | "DEPONENT"
        | "INTERPRETER"
        | "VIDEOGRAPHER"
        | "OBSERVER"
      PartyType:
        | "PLAINTIFF"
        | "DEFENDANT"
        | "CROSS_PLAINTIFF"
        | "CROSS_DEFENDANT"
        | "THIRD_PARTY"
        | "INTERVENOR"
      pipeline_stage:
        | "VALIDATION"
        | "CHUNKING"
        | "TRANSCRIPTION"
        | "REASSEMBLY"
        | "FLAG_EXTRACTION"
        | "HASH_GENERATION"
        | "CLEANUP"
      ProperNounCategory:
        | "PERSON_NAME"
        | "COMPANY_NAME"
        | "PLACE_NAME"
        | "PRODUCT_NAME"
        | "LEGAL_TERM"
        | "MEDICAL_TERM"
        | "TECHNICAL_TERM"
        | "ACRONYM"
        | "OTHER"
      RateType: "PER_PAGE" | "PER_AUDIO_MINUTE" | "FLAT_RATE" | "HOURLY"
      RecurrenceFrequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY"
      RuleCategory:
        | "CAPITALIZATION"
        | "PUNCTUATION"
        | "FORMATTING"
        | "LEGAL_TERMS"
        | "SPEAKER_ID"
        | "NUMBERS"
        | "DATES"
        | "CUSTOM"
      RushType: "STANDARD" | "EXPEDITE" | "DAILY" | "HOURLY" | "REALTIME"
      share_access_level: "READ_ONLY"
      ShareStatus: "ACTIVE" | "EXPIRED" | "REVOKED"
      ShareType: "USER" | "LINK" | "ORGANIZATION"
      silent_segment_type:
        | "INAUDIBLE"
        | "CROSSTALK"
        | "SILENCE"
        | "OFF_RECORD"
        | "UNINTELLIGIBLE"
      TermCategory:
        | "PERSON_NAME"
        | "COMPANY_NAME"
        | "PLACE_NAME"
        | "LEGAL_TERM"
        | "MEDICAL_TERM"
        | "TECHNICAL_TERM"
        | "CASE_SPECIFIC"
      TranscriptAccessLevel: "VIEW" | "COMMENT" | "EDIT"
      TranscriptDeliveryType:
        | "E_TRANS"
        | "HARD_COPY"
        | "ORIGINAL"
        | "BOTH"
        | "FTP"
        | "PORTAL"
      TranscriptFileFormat:
        | "WORD"
        | "PDF"
        | "ASCII"
        | "WORD_PERFECT"
        | "RTF"
        | "PTX"
      TranscriptFormat: "WORD" | "PDF" | "ASCII" | "WORD_PERFECT" | "RTF"
      transcription_source:
        | "BATCH_UPLOAD"
        | "BATCH_MULTICHANNEL"
        | "LIVE_STREAM"
      transcription_status:
        | "AWAITING_AUDIO"
        | "VALIDATING"
        | "CHUNKING"
        | "TRANSCRIBING"
        | "REASSEMBLING"
        | "EXTRACTING_FLAGS"
        | "COMPLETE"
        | "PIPELINE_FAILED"
      user_role: "ADMIN" | "COURT_REPORTER" | "SCOPIST" | "ATTORNEY"
      VideoRecordType: "CR_ONLY" | "CR_VIDEO" | "CR_PIP" | "REMOTE" | "HYBRID"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      AgencyPlanType: ["BASIC", "PROFESSIONAL", "ENTERPRISE"],
      AppearanceType: ["IN_PERSON", "REMOTE", "PHONE"],
      ASRModelTier: ["STANDARD", "ENHANCED"],
      AssignmentStatus: [
        "INVITED",
        "ACCEPTED",
        "DECLINED",
        "IN_PROGRESS",
        "SUBMITTED",
        "EXPIRED",
        "RELEASED",
      ],
      AttorneyRole: [
        "PLAINTIFF_COUNSEL",
        "DEFENSE_COUNSEL",
        "ORDERING_ATTORNEY",
        "COPY_ATTORNEY",
        "OTHER",
      ],
      AttorneyTranscriptStatus: ["NOT_REVIEWED", "IN_PROGRESS", "COMPLETE"],
      audio_format: ["MP3", "WAV", "M4A", "MP4", "MOV"],
      AudioEnhancementType: ["AUTOMATED_DOLBY", "MANUAL_RX"],
      AudioProcessingMode: ["AUTOMATED", "MANUAL_RX"],
      AudioSessionStatus: ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"],
      audit_action: [
        "JOB_CREATED",
        "JOB_STATUS_CHANGED",
        "JOB_ASSIGNED",
        "JOB_DELETED",
        "JOB_SEALED",
        "TRANSCRIPTION_STARTED",
        "TRANSCRIPTION_COMPLETED",
        "TRANSCRIPTION_FAILED",
        "WORD_CORRECTED",
        "SEGMENT_EDITED",
        "SPEAKER_RELABELED",
        "BULK_EDIT_APPLIED",
        "SILENT_SEGMENT_ADDED",
        "SILENT_SEGMENT_EDITED",
        "REVIEW_STARTED",
        "REVIEW_SUBMITTED",
        "REVIEW_APPROVED",
        "TRANSCRIPT_LOCKED",
        "TRANSCRIPT_UNLOCKED",
        "TRANSCRIPT_EXPORTED",
        "TRANSCRIPT_SHARED",
        "SHARE_REVOKED",
        "USER_LOGIN",
        "USER_ROLE_CHANGED",
      ],
      AvailabilityType: ["AVAILABLE", "UNAVAILABLE", "TENTATIVE"],
      BillingServiceType: [
        "TRANSCRIPTION_AUTOMATED",
        "MODEL_UPGRADE",
        "HUMAN_REVIEW_CONFIDENCE",
        "HUMAN_REVIEW_FULL",
        "FORENSIC_AUDIO_RX",
      ],
      BillingUnit: ["PER_MINUTE", "PER_WORD", "PER_FILE", "PER_HOUR"],
      BookingRequestStatus: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "MODIFIED",
      ],
      CalendarAuditAction: [
        "EVENT_CREATED",
        "EVENT_UPDATED",
        "EVENT_CANCELLED",
        "EVENT_RESCHEDULED",
        "REPORTER_ASSIGNED",
        "REPORTER_UNASSIGNED",
        "SCOPIST_ASSIGNED",
        "SCOPIST_UNASSIGNED",
        "VIDEOGRAPHER_ASSIGNED",
        "VIDEOGRAPHER_UNASSIGNED",
        "INTERPRETER_ASSIGNED",
        "INTERPRETER_UNASSIGNED",
        "CONVERTED_TO_JOB",
        "NOTE_ADDED",
        "STATUS_CHANGED",
      ],
      CalendarEventStatus: [
        "REQUESTED",
        "SCHEDULED",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CONVERTED",
        "CANCELLED",
        "RESCHEDULED",
        "EXTERNAL_BLOCK",
      ],
      CaseDocumentType: [
        "NOTICE_OF_DEPOSITION",
        "CSR_PAPERWORK",
        "DEPO_NOTES",
        "COURT_ORDER",
        "SUBPOENA",
        "EXHIBIT_LIST",
        "OTHER",
      ],
      CaseRole: ["ATTORNEY", "PARALEGAL", "REPORTER"],
      CaseStatus: ["ACTIVE", "CLOSED", "SETTLED", "ARCHIVED"],
      chronology_source_type: ["AI_EXTRACTED", "MANUAL", "EDITED"],
      chunk_status: ["PENDING", "PROCESSING", "COMPLETE", "FAILED"],
      ClaimStatus: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "IN_PROGRESS",
        "SUBMITTED",
        "APPROVED",
        "DISPUTED",
        "CANCELLED",
      ],
      ConflictResolution: [
        "KEPT_ORIGINAL",
        "MOVED_ORIGINAL",
        "REASSIGNED_REPORTER",
        "OVERRIDE_ACCEPTED",
        "TIME_ADJUSTED",
      ],
      ConflictStatus: ["PENDING", "OVERRIDDEN", "RESOLVED", "AUTO_FIXED"],
      ConflictType: [
        "REPORTER_DOUBLE_BOOKED",
        "LOCATION_CONFLICT",
        "TRAVEL_TIME_INSUFFICIENT",
        "RESOURCE_UNAVAILABLE",
      ],
      CSRAttorneyRole: [
        "ORDERING_ATTORNEY",
        "COPY_ATTORNEY",
        "PLAINTIFF_COUNSEL",
        "DEFENSE_COUNSEL",
        "CROSS_NOTICING",
        "OTHER",
      ],
      DataSource: ["IMPORT", "MANUAL", "REPORTER_OVERRIDE"],
      DeliveryMethod: ["E_TRANS", "HARD_COPY", "BOTH", "FTP", "PORTAL"],
      DeliveryPriority: [
        "STANDARD",
        "EXPEDITE",
        "RUSH",
        "DAILY",
        "HOURLY",
        "REALTIME",
      ],
      DeponentRole: [
        "PLAINTIFF",
        "DEFENDANT",
        "CORPORATE_REP",
        "EXPERT_WITNESS",
        "FACT_WITNESS",
        "THIRD_PARTY",
      ],
      DepositionNoteType: ["PROPER_NOUN", "GENERAL_NOTE"],
      DocumentTemplateType: [
        "TITLE_PAGE",
        "APPEARANCE_PAGE",
        "CERTIFICATE_PAGE",
        "INDEX_PAGE",
        "ERRATA_SHEET",
        "WORD_INDEX",
      ],
      edit_type: [
        "WORD_CORRECTION",
        "SEGMENT_EDIT",
        "SPEAKER_RELABEL",
        "BULK_EDIT",
      ],
      EnhancementMode: ["OFF", "DOLBY_ONLY", "HYBRID", "AUPHONIC_ONLY"],
      EnhancementStatus: [
        "PENDING",
        "PROCESSING_DOLBY",
        "PROCESSING_AUPHONIC",
        "COMPLETED",
        "ERROR",
      ],
      EventType: [
        "DEPOSITION",
        "HEARING",
        "ARBITRATION",
        "MEDIATION",
        "EUO",
        "STATEMENT",
        "OTHER",
      ],
      ExternalCalendarProvider: ["GOOGLE", "OUTLOOK", "APPLE"],
      ExternalCalendarSyncMode: ["READ_ONLY", "PUSH_INTERNAL", "BIDIRECTIONAL"],
      ExternalEventSyncStatus: [
        "SYNCED",
        "PENDING",
        "CONFLICT",
        "FAILED",
        "DELETED",
      ],
      ExtractionStatus: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      flagged_word_status: ["PENDING", "CORRECTED", "CONFIRMED", "SKIPPED"],
      HighlightColor: ["YELLOW", "GREEN", "BLUE", "PINK", "ORANGE", "PURPLE"],
      InvoiceStatus: ["DRAFT", "OPEN", "PAID", "VOID"],
      job_status: [
        "DRAFT",
        "PENDING",
        "PROCESSING",
        "AI_COMPLETE",
        "IN_REVIEW",
        "SCOPIST_COMPLETE",
        "FINAL_REVIEW",
        "COMPLETED",
        "ARCHIVED",
        "FAILED",
      ],
      LocationType: [
        "IN_PERSON",
        "ZOOM",
        "TEAMS",
        "WEBEX",
        "PHONE",
        "HYBRID",
        "OTHER",
      ],
      medical_record_status: [
        "UPLOADED",
        "PROCESSING",
        "EXTRACTED",
        "FAILED",
        "ARCHIVED",
      ],
      MeetingPlatform: ["ZOOM", "TEAMS", "WEBEX", "GOOGLE_MEET", "OTHER"],
      NotificationType: [
        "JOB_ASSIGNED",
        "TRANSCRIPTION_COMPLETE",
        "AI_REVIEW_COMPLETE",
        "SCOPIST_ACCEPTED",
        "SCOPIST_DECLINED",
        "SCOPIST_SUBMITTED",
        "REPORTER_REVIEWED",
        "JOB_COMPLETE",
        "SYSTEM_ERROR",
        "MESSAGE_RECEIVED",
      ],
      OrderFulfillmentStatus: [
        "PENDING",
        "READY",
        "SENT",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ],
      ParticipantRole: [
        "ATTORNEY_PLAINTIFF",
        "ATTORNEY_DEFENSE",
        "WITNESS",
        "DEPONENT",
        "INTERPRETER",
        "VIDEOGRAPHER",
        "OBSERVER",
      ],
      PartyType: [
        "PLAINTIFF",
        "DEFENDANT",
        "CROSS_PLAINTIFF",
        "CROSS_DEFENDANT",
        "THIRD_PARTY",
        "INTERVENOR",
      ],
      pipeline_stage: [
        "VALIDATION",
        "CHUNKING",
        "TRANSCRIPTION",
        "REASSEMBLY",
        "FLAG_EXTRACTION",
        "HASH_GENERATION",
        "CLEANUP",
      ],
      ProperNounCategory: [
        "PERSON_NAME",
        "COMPANY_NAME",
        "PLACE_NAME",
        "PRODUCT_NAME",
        "LEGAL_TERM",
        "MEDICAL_TERM",
        "TECHNICAL_TERM",
        "ACRONYM",
        "OTHER",
      ],
      RateType: ["PER_PAGE", "PER_AUDIO_MINUTE", "FLAT_RATE", "HOURLY"],
      RecurrenceFrequency: ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"],
      RuleCategory: [
        "CAPITALIZATION",
        "PUNCTUATION",
        "FORMATTING",
        "LEGAL_TERMS",
        "SPEAKER_ID",
        "NUMBERS",
        "DATES",
        "CUSTOM",
      ],
      RushType: ["STANDARD", "EXPEDITE", "DAILY", "HOURLY", "REALTIME"],
      share_access_level: ["READ_ONLY"],
      ShareStatus: ["ACTIVE", "EXPIRED", "REVOKED"],
      ShareType: ["USER", "LINK", "ORGANIZATION"],
      silent_segment_type: [
        "INAUDIBLE",
        "CROSSTALK",
        "SILENCE",
        "OFF_RECORD",
        "UNINTELLIGIBLE",
      ],
      TermCategory: [
        "PERSON_NAME",
        "COMPANY_NAME",
        "PLACE_NAME",
        "LEGAL_TERM",
        "MEDICAL_TERM",
        "TECHNICAL_TERM",
        "CASE_SPECIFIC",
      ],
      TranscriptAccessLevel: ["VIEW", "COMMENT", "EDIT"],
      TranscriptDeliveryType: [
        "E_TRANS",
        "HARD_COPY",
        "ORIGINAL",
        "BOTH",
        "FTP",
        "PORTAL",
      ],
      TranscriptFileFormat: [
        "WORD",
        "PDF",
        "ASCII",
        "WORD_PERFECT",
        "RTF",
        "PTX",
      ],
      TranscriptFormat: ["WORD", "PDF", "ASCII", "WORD_PERFECT", "RTF"],
      transcription_source: [
        "BATCH_UPLOAD",
        "BATCH_MULTICHANNEL",
        "LIVE_STREAM",
      ],
      transcription_status: [
        "AWAITING_AUDIO",
        "VALIDATING",
        "CHUNKING",
        "TRANSCRIBING",
        "REASSEMBLING",
        "EXTRACTING_FLAGS",
        "COMPLETE",
        "PIPELINE_FAILED",
      ],
      user_role: ["ADMIN", "COURT_REPORTER", "SCOPIST", "ATTORNEY"],
      VideoRecordType: ["CR_ONLY", "CR_VIDEO", "CR_PIP", "REMOTE", "HYBRID"],
    },
  },
} as const
