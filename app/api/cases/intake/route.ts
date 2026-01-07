// ═══════════════════════════════════════════════════════════════
// CASE INTAKE API ROUTE (V2 - Comprehensive)
// app/api/cases/intake/route.ts
//
// Handles document upload and comprehensive extraction
// Tolerates partial extraction - never fails on missing fields
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { extractTextFromPDFBuffer, detectDocumentType, cleanExtractedText } from '@/lib/extraction/pdf-extractor';
import { extractFromDocuments, getDeepgramKeywords } from '@/lib/extraction/document-extractor';
import { createCaseWithInitialJob } from '@/lib/supabase/queries/cases';
import { logger } from '@/lib/logger';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 120; // Allow up to 2 minutes for complex documents

export async function POST(request: NextRequest) {
  try {
    // Check authentication using Supabase (RLS-enforced)
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[cases] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const autoCreateJob = formData.get('autoCreateJob') === 'true';
    const autoCreateCase = formData.get('autoCreateCase') === 'true';

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Extract text from all documents
    // ═══════════════════════════════════════════════════════════════

    const documents: Array<{ text: string; fileName: string; type: string }> = [];
    const audioFiles: File[] = [];
    const warnings: string[] = [];

    for (const file of files) {
      const fileName = file.name;
      const mimeType = file.type;

      // Handle PDFs
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await extractTextFromPDFBuffer(buffer);

        if (result.success && result.text.trim()) {
          const cleanedText = cleanExtractedText(result.text);
          const docType = detectDocumentType(fileName, cleanedText);

          documents.push({
            text: cleanedText,
            fileName,
            type: docType,
          });
        } else {
          warnings.push(`Could not extract text from ${fileName} - may be scanned/image PDF`);
        }
      }
      // Handle text files
      else if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) {
        const text = await file.text();
        const docType = detectDocumentType(fileName, text);

        documents.push({
          text,
          fileName,
          type: docType,
        });
      }
      // Track audio files for later
      else if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
        audioFiles.push(file);
      }
      else {
        warnings.push(`Skipped unsupported file type: ${fileName} (${mimeType})`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Extract data using Claude AI
    // ═══════════════════════════════════════════════════════════════

    if (!documents.length) {
      return NextResponse.json({
        success: false,
        error: 'No extractable documents found (PDFs must contain text, not scanned images)',
        warnings,
        audioFilesDetected: audioFiles.length,
      }, { status: 400 });
    }

    const extraction = await extractFromDocuments(documents);

    if (!extraction.success || !extraction.data) {
      return NextResponse.json({
        success: false,
        error: extraction.error || 'Extraction failed',
        warnings,
      }, { status: 500 });
    }

    const extractedData = extraction.data;

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Optionally create Case and Job records
    // ═══════════════════════════════════════════════════════════════

    let savedIds: { caseId?: string; jobId?: string } | null = null;

    if (autoCreateCase || autoCreateJob) {
      // Get firmId from user metadata (RLS will enforce access)
      const firmId = (user.user_metadata?.firmId as string) || null;
      
      if (autoCreateCase && !firmId) {
        return NextResponse.json(
          { error: 'firmId is required to create a case' },
          { status: 400 }
        );
      }

      // Prepare job data in snake_case for Supabase
      const jobData: Record<string, unknown> = {};
      
      if (autoCreateJob) {
        // Case info (duplicated for jobs without cases)
        if (extractedData.caseStyle) jobData.case_name = extractedData.caseStyle;
        if (extractedData.caseNumber) jobData.case_number = extractedData.caseNumber;
        if (extractedData.court?.name) jobData.court_name = extractedData.court.name;

        // Deponent
        if (extractedData.deponent?.name) jobData.deponent_name = extractedData.deponent.name;
        if (extractedData.deponent?.role) jobData.deponent_role = extractedData.deponent.role;
        if (extractedData.deponent?.company) jobData.deponent_company = extractedData.deponent.company;
        if (extractedData.deponent?.capacity) jobData.deponent_capacity = extractedData.deponent.capacity;

        // Scheduling
        if (extractedData.scheduling?.date) {
          jobData.deposition_date = new Date(extractedData.scheduling.date).toISOString();
        }
        if (extractedData.scheduling?.scheduledTime) jobData.scheduled_start_time = extractedData.scheduling.scheduledTime;
        if (extractedData.scheduling?.timeZone) jobData.time_zone = extractedData.scheduling.timeZone;

        // Location
        if (extractedData.location?.name) jobData.location_name = extractedData.location.name;
        if (extractedData.location?.address) jobData.location_address = extractedData.location.address;
        if (extractedData.location?.address2) jobData.location_address2 = extractedData.location.address2;
        if (extractedData.location?.city) jobData.location_city = extractedData.location.city;
        if (extractedData.location?.state) jobData.location_state = extractedData.location.state;
        if (extractedData.location?.zip) jobData.location_zip = extractedData.location.zip;
        if (extractedData.location?.zoomLink) jobData.zoom_link = extractedData.location.zoomLink;
        if (extractedData.location?.conferenceRoom !== undefined) jobData.conference_room = extractedData.location.conferenceRoom;

        // Court reporting
        if (extractedData.courtReporting?.firmName) jobData.court_reporting_firm = extractedData.courtReporting.firmName;
        if (extractedData.courtReporting?.isCertifiedShorthand !== undefined) {
          jobData.certified_shorthand = extractedData.courtReporting.isCertifiedShorthand;
        }

        // Recording
        jobData.is_videotaped = extractedData.recording?.isVideotaped || false;
        jobData.is_stenographic = extractedData.recording?.isStenographic ?? true;
        if (extractedData.recording?.videographerName) jobData.videographer_name = extractedData.recording.videographerName;
        if (extractedData.recording?.videographerCompany) jobData.videographer_company = extractedData.recording.videographerCompany;

        // Interpreter
        jobData.has_interpreter = extractedData.interpreter?.hasInterpreter || false;
        if (extractedData.interpreter?.name) jobData.interpreter_name = extractedData.interpreter.name;
        if (extractedData.interpreter?.language) jobData.interpreter_language = extractedData.interpreter.language;

        // Transcript options
        if (extractedData.transcriptOptions?.readAndSign !== undefined) {
          jobData.read_and_sign = extractedData.transcriptOptions.readAndSign;
        }
        if (extractedData.transcriptOptions?.signatureWaived !== undefined) {
          jobData.signature_waived = extractedData.transcriptOptions.signatureWaived;
        }

        // Exhibits (stored as JSON)
        if (extractedData.exhibits) jobData.exhibits = extractedData.exhibits;
        if (extractedData.exhibitStats?.totalCount !== undefined) {
          jobData.exhibit_count = extractedData.exhibitStats.totalCount;
        }
        if (extractedData.exhibitStats?.blackAndWhite !== undefined) {
          jobData.exhibits_bw = extractedData.exhibitStats.blackAndWhite;
        }
        if (extractedData.exhibitStats?.color !== undefined) {
          jobData.exhibits_color = extractedData.exhibitStats.color;
        }

        // Insurance/EUO
        jobData.is_euo = extractedData.insurance?.isEUO || false;
        if (extractedData.insurance?.insuredName) jobData.insured_name = extractedData.insurance.insuredName;
        if (extractedData.insurance?.insurerName) jobData.insurer_name = extractedData.insurance.insurerName;
        if (extractedData.insurance?.claimNumber) jobData.claim_number = extractedData.insurance.claimNumber;
        if (extractedData.insurance?.policyNumber) jobData.policy_number = extractedData.insurance.policyNumber;
        if (extractedData.insurance?.dateOfLoss) {
          jobData.date_of_loss = new Date(extractedData.insurance.dateOfLoss).toISOString();
        }

        // Billing
        if (extractedData.billing?.orderedByName) jobData.ordered_by_name = extractedData.billing.orderedByName;
        if (extractedData.billing?.orderedByFirm) jobData.ordered_by_firm = extractedData.billing.orderedByFirm;
        if (extractedData.billing?.travelMiles !== undefined) jobData.travel_miles = extractedData.billing.travelMiles;
        if (extractedData.billing?.parkingFee !== undefined) jobData.parking_fee = extractedData.billing.parkingFee;
        jobData.rush_order = extractedData.billing?.isRush || false;

        // Special instructions
        if (extractedData.specialInstructions) jobData.special_instructions = extractedData.specialInstructions;
        if (extractedData.notes) jobData.notes = extractedData.notes;

        // Status
        jobData.status = 'CREATED';
        if (extractedData.needsReview !== undefined) jobData.needs_review = extractedData.needsReview;
      }

      const result = await createCaseWithInitialJob({
        firmId: firmId || '',
        createdById: user.id,
        caseNumber: extractedData.caseNumber || undefined,
        caseStyle: extractedData.caseStyle || undefined,
        shortTitle: extractedData.shortTitle || undefined,
        courtName: extractedData.court?.name || undefined,
        courtType: extractedData.court?.type || undefined,
        county: extractedData.court?.county || undefined,
        state: extractedData.court?.state || undefined,
        judgeAssigned: extractedData.court?.judge || undefined,
        plaintiffs: extractedData.plaintiffs,
        defendants: extractedData.defendants,
        otherParties: extractedData.otherParties,
        attorneys: extractedData.attorneys,
        extractedTerms: extractedData.extractedTerms,
        createJob: autoCreateJob,
        jobData: autoCreateJob ? jobData : undefined,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to save extracted data' },
          { status: 500 }
        );
      }

      savedIds = result.data || null;

      // Audit log case/job creation
      if (savedIds?.caseId) {
        await audit.caseCreated(savedIds.caseId, {
          caseNumber: extractedData.caseNumber,
          autoCreateJob,
          jobId: savedIds.jobId,
        });
      }
      if (savedIds?.jobId && !autoCreateCase) {
        // If job created without case
        await audit.jobCreated(savedIds.jobId, {
          caseNumber: extractedData.caseNumber,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Return comprehensive response
    // ═══════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      extractedData,

      // Confidence info
      confidenceByField: extractedData.confidenceByField,
      overallConfidence: extractedData.overallConfidence,
      needsReview: extractedData.needsReview,
      reviewReasons: extractedData.reviewReasons,

      // Keywords ready for Deepgram
      deepgramKeywords: getDeepgramKeywords(extractedData),
      keywordCount: extractedData.extractedTerms?.length || 0,

      // Document tracking
      documentsProcessed: documents.map(d => ({
        fileName: d.fileName,
        type: d.type,
      })),

      // Saved records (if created)
      savedIds,

      // Warnings
      warnings: warnings.length > 0 ? warnings : undefined,
      audioFilesDetected: audioFiles.length,
    });

  } catch (error) {
    logger.error('Case intake error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      error: 'Failed to process documents',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}


