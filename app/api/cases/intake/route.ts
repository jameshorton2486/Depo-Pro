// ═══════════════════════════════════════════════════════════════
// CASE INTAKE API ROUTE (V2 - Comprehensive)
// app/api/cases/intake/route.ts
//
// Handles document upload and comprehensive extraction
// Tolerates partial extraction - never fails on missing fields
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractTextFromPDFBuffer, detectDocumentType, cleanExtractedText } from '@/lib/extraction/pdf-extractor';
import { extractFromDocuments, getDeepgramKeywords, ComprehensiveExtractedData } from '@/lib/extraction/document-extractor';
import { db } from '@/lib/db';

export const maxDuration = 120; // Allow up to 2 minutes for complex documents

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
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
      savedIds = await saveExtractedData(
        extractedData,
        session.user.id,
        (session.user as any).firmId || undefined,
        autoCreateCase,
        autoCreateJob,
      );
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
    console.error('Case intake error:', error);
    return NextResponse.json({
      error: 'Failed to process documents',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// SAVE EXTRACTED DATA TO DATABASE
// Tolerates partial data - never fails on missing fields
// ═══════════════════════════════════════════════════════════════

async function saveExtractedData(
  data: ComprehensiveExtractedData,
  userId: string,
  firmId: string | undefined,
  createCase: boolean,
  createJob: boolean,
): Promise<{ caseId?: string; jobId?: string }> {
  const result: { caseId?: string; jobId?: string } = {};

  // Create Case if requested
  if (createCase) {
    const newCase = await db.case.create({
      data: {
        firmId: firmId || null,
        createdById: userId,

        // Use defaults for missing required fields
        caseNumber: data.caseNumber || `TEMP-${Date.now()}`,
        caseStyle: data.caseStyle || 'Unknown Case',
        shortTitle: data.shortTitle,

        // Court info (all optional)
        courtName: data.court?.name,
        courtType: data.court?.type,
        county: data.court?.county,
        state: data.court?.state || 'Texas',
        judgeAssigned: data.court?.judge,

        // Parties
        plaintiffs: data.plaintiffs || [],
        defendants: data.defendants || [],
        otherParties: data.otherParties || [],

        // Status
        status: 'ACTIVE',
      },
    });
    result.caseId = newCase.id;

    // Create attorney records
    if (data.attorneys?.length) {
      for (const att of data.attorneys) {
        await db.caseAttorney.create({
          data: {
            caseId: newCase.id,
            name: att.name,
            barNumber: att.barNumber,
            firm: att.firm,
            role: mapAttorneyRole(att.role),
            representing: att.representing,
            email: att.email,
            phone: att.phone,
            fax: att.fax,
            address: att.address,
            city: att.city,
            state: att.state,
            zipCode: att.zip,
            deliveryFormat: att.deliveryFormat,
            deliveryPriority: att.deliveryPriority,
          },
        });
      }
    }

    // Create extracted terms for Deepgram
    if (data.extractedTerms?.length) {
      const termData = data.extractedTerms.map(term => ({
        caseId: newCase.id,
        term: term.term,
        normalizedTerm: term.normalizedTerm,
        category: mapTermCategory(term.category),
        source: term.source,
        useInTranscription: true,
      }));

      // Use createMany with skipDuplicates
      await db.caseExtractedTerm.createMany({
        data: termData,
        skipDuplicates: true,
      });
    }
  }

  // Create Job if requested
  if (createJob) {
    const jobData: any = {
      firmId: firmId || null,
      createdById: userId,

      // Link to case if created
      caseId: result.caseId || null,

      // Case info (duplicated for jobs without cases)
      caseName: data.caseStyle,
      caseNumber: data.caseNumber,
      courtName: data.court?.name,

      // Deponent
      deponentName: data.deponent?.name,
      deponentRole: data.deponent?.role,
      deponentCompany: data.deponent?.company,
      deponentCapacity: data.deponent?.capacity,

      // Scheduling
      depositionDate: data.scheduling?.date ? new Date(data.scheduling.date) : null,
      scheduledStartTime: data.scheduling?.scheduledTime,
      timeZone: data.scheduling?.timeZone,

      // Location
      locationName: data.location?.name,
      locationAddress: data.location?.address,
      locationAddress2: data.location?.address2,
      locationCity: data.location?.city,
      locationState: data.location?.state,
      locationZip: data.location?.zip,
      zoomLink: data.location?.zoomLink,
      conferenceRoom: data.location?.conferenceRoom,

      // Court reporting
      courtReportingFirm: data.courtReporting?.firmName,
      certifiedShorthand: data.courtReporting?.isCertifiedShorthand,

      // Recording
      isVideotaped: data.recording?.isVideotaped || false,
      isStenographic: data.recording?.isStenographic ?? true,
      videographerName: data.recording?.videographerName,
      videographerCompany: data.recording?.videographerCompany,

      // Interpreter
      hasInterpreter: data.interpreter?.hasInterpreter || false,
      interpreterName: data.interpreter?.name,
      interpreterLanguage: data.interpreter?.language,

      // Transcript options
      readAndSign: data.transcriptOptions?.readAndSign,
      signatureWaived: data.transcriptOptions?.signatureWaived,

      // Exhibits
      exhibits: data.exhibits || [],
      exhibitCount: data.exhibitStats?.totalCount,
      exhibitsBW: data.exhibitStats?.blackAndWhite,
      exhibitsColor: data.exhibitStats?.color,

      // Insurance/EUO
      isEUO: data.insurance?.isEUO || false,
      insuredName: data.insurance?.insuredName,
      insurerName: data.insurance?.insurerName,
      claimNumber: data.insurance?.claimNumber,
      policyNumber: data.insurance?.policyNumber,
      dateOfLoss: data.insurance?.dateOfLoss ? new Date(data.insurance.dateOfLoss) : null,

      // Billing
      orderedByName: data.billing?.orderedByName,
      orderedByFirm: data.billing?.orderedByFirm,
      travelMiles: data.billing?.travelMiles,
      parkingFee: data.billing?.parkingFee,
      rushOrder: data.billing?.isRush || false,

      // Special instructions
      specialInstructions: data.specialInstructions,
      notes: data.notes,

      // Status
      status: 'PENDING',
      needsReview: data.needsReview,
    };

    const newJob = await db.job.create({ data: jobData });
    result.jobId = newJob.id;

    // Note: Deposition topics and job dictionary terms would be stored in Job.notes or Job.internalNotes as JSON
    // These models don't exist in the current schema
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function mapAttorneyRole(role: string): 'PLAINTIFF_COUNSEL' | 'DEFENSE_COUNSEL' | 'ORDERING_ATTORNEY' | 'COPY_ATTORNEY' | 'OTHER' {
  const roleMap: Record<string, 'PLAINTIFF_COUNSEL' | 'DEFENSE_COUNSEL' | 'ORDERING_ATTORNEY' | 'COPY_ATTORNEY' | 'OTHER'> = {
    'ordering': 'ORDERING_ATTORNEY',
    'copy': 'COPY_ATTORNEY',
    'plaintiff': 'PLAINTIFF_COUNSEL',
    'defense': 'DEFENSE_COUNSEL',
    'other': 'OTHER',
  };
  return roleMap[role] || 'OTHER';
}

function mapTermCategory(category: string): 'PERSON_NAME' | 'COMPANY_NAME' | 'PLACE_NAME' | 'LEGAL_TERM' | 'MEDICAL_TERM' | 'TECHNICAL_TERM' | 'CASE_SPECIFIC' {
  const categoryMap: Record<string, 'PERSON_NAME' | 'COMPANY_NAME' | 'PLACE_NAME' | 'LEGAL_TERM' | 'MEDICAL_TERM' | 'TECHNICAL_TERM' | 'CASE_SPECIFIC'> = {
    'person_name': 'PERSON_NAME',
    'company_name': 'COMPANY_NAME',
    'place_name': 'PLACE_NAME',
    'legal_term': 'LEGAL_TERM',
    'medical_term': 'MEDICAL_TERM',
    'technical_term': 'TECHNICAL_TERM',
    'case_specific': 'CASE_SPECIFIC',
    'attorney_name': 'PERSON_NAME',
    'witness_name': 'PERSON_NAME',
    'product_name': 'CASE_SPECIFIC',
    'vehicle_info': 'CASE_SPECIFIC',
  };
  return categoryMap[category] || 'CASE_SPECIFIC';
}
