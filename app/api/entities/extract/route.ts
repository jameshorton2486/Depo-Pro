// app/api/entities/extract/route.ts
// API endpoint to extract entities from a transcription and build knowledge graph

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractEntities, deduplicateEntities } from '@/lib/services/entity-extraction';
import { buildKnowledgeGraph } from '@/lib/services/knowledge-graph';
import { logger } from '@/lib/logger';
import type { TranscriptionWord } from '@/types/transcription';
import { entityExtractionSchema } from '@/lib/api/schemas';
import { isAdminRole } from '@/lib/admin';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute

export async function POST(request: NextRequest) {
  try {
    // --- AUTH ---
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = currentUser as { id: string; role: string; firmId?: string };

    // --- PARSE REQUEST ---
    const body = await request.json();
    const parsed = entityExtractionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { jobId, transcriptionId, forceReextract } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const adminClient = createAdminClient();

    // --- VERIFY ACCESS ---
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, firm_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check firm access
    if (job.firm_id !== user.firmId && !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // --- CHECK IF ALREADY EXTRACTED ---
    if (!forceReextract) {
      const { count } = await adminClient
        .from('extracted_entities')
        .select('*', { count: 'exact', head: true })
        .eq('transcription_id', transcriptionId);

      if (count && count > 0) {
        return NextResponse.json({
          success: true,
          message: 'Entities already extracted. Use forceReextract=true to re-extract.',
          entityCount: count,
        });
      }
    }

    // --- GET TRANSCRIPTION DATA ---
    const { data: transcription, error: transcriptionError } = await adminClient
      .from('transcriptions')
      .select('id, words, status, job_id')
      .eq('id', transcriptionId)
      .single();

    if (transcriptionError || !transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    if (!transcription.words || transcription.words.length === 0) {
      return NextResponse.json(
        { error: 'Transcription has no words to extract from' },
        { status: 400 }
      );
    }

    // --- EXTRACT ENTITIES ---
    logger.info('Starting entity extraction', { jobId, transcriptionId });

    const words = transcription.words as TranscriptionWord[];
    const extractionResult = extractEntities(
      words,
      transcriptionId,
      jobId
    );

    // Deduplicate entities
    const uniqueEntities = deduplicateEntities(extractionResult.entities);

    logger.info('Entity extraction complete', {
      jobId,
      transcriptionId,
      totalEntities: uniqueEntities.length,
      byType: extractionResult.stats.byType,
    });

    // --- BUILD KNOWLEDGE GRAPH ---
    const knowledgeGraph = buildKnowledgeGraph(
      uniqueEntities,
      jobId,
      transcriptionId
    );

    logger.info('Knowledge graph built', {
      jobId,
      transcriptionId,
      entityCount: knowledgeGraph.entities.length,
      relationCount: knowledgeGraph.relations.length,
    });

    // --- SAVE TO DATABASE ---
    // Delete existing entities if re-extracting
    if (forceReextract) {
      await adminClient
        .from('extracted_entities')
        .delete()
        .eq('transcription_id', transcriptionId);
    }

    // Insert entities
    const entitiesToInsert = knowledgeGraph.entities.map((entity) => ({
      entity_type: entity.type,
      text: entity.text,
      normalized: entity.normalized,
      role: entity.role || null,
      confidence: entity.confidence,
      word_indices: entity.wordIndices,
      time_ranges: entity.timeRanges,
      context: entity.context,
      metadata: entity.metadata || {},
      transcription_id: transcriptionId,
      job_id: jobId,
      firm_id: job.firm_id || null,
      extracted_at: entity.extractedAt,
    }));

    const { data: insertedEntities, error: insertError } = await adminClient
      .from('extracted_entities')
      .insert(entitiesToInsert)
      .select('id, entity_type, text, normalized');

    if (insertError) {
      logger.error('Failed to insert entities', insertError as any);
      return NextResponse.json(
        { error: 'Failed to save entities to database' },
        { status: 500 }
      );
    }

    // Build entity ID mapping
    const entityIdMap = new Map<string, string>();
    for (let i = 0; i < knowledgeGraph.entities.length; i++) {
      const tempId = knowledgeGraph.entities[i].id;
      const dbId = insertedEntities![i].id;
      entityIdMap.set(tempId, dbId);
    }

    // Insert relations with mapped IDs
    const relationsToInsert = knowledgeGraph.relations.map((relation) => ({
      source_entity_id: entityIdMap.get(relation.sourceEntityId),
      target_entity_id: entityIdMap.get(relation.targetEntityId),
      relation_type: relation.type,
      confidence: relation.confidence,
      evidence: relation.evidence,
      word_indices: relation.wordIndices,
      properties: relation.properties || {},
      transcription_id: transcriptionId,
      job_id: jobId,
      extracted_at: relation.extractedAt,
    }));

    const { error: relationsError } = await adminClient
      .from('entity_relations')
      .insert(relationsToInsert);

    if (relationsError) {
      logger.error('Failed to insert relations', relationsError as any);
      // Don't fail the whole operation - entities are saved
    }

    // --- RETURN SUCCESS ---
    return NextResponse.json({
      success: true,
      message: 'Entity extraction complete',
      stats: {
        ...extractionResult.stats,
        entityCount: knowledgeGraph.entities.length,
        relationCount: knowledgeGraph.relations.length,
        coverage: knowledgeGraph.metadata.coverage,
      },
      warnings: extractionResult.warnings,
    });
  } catch (error) {
    logger.error(
      'Entity extraction error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred during entity extraction' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve extracted entities for a job
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = currentUser as { id: string; role: string; firmId?: string };

    // Parse query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const transcriptionId = searchParams.get('transcriptionId');
    const entityType = searchParams.get('entityType');

    if (!jobId && !transcriptionId) {
      return NextResponse.json(
        { error: 'Either jobId or transcriptionId is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Build query
    let query = supabase
      .from('extracted_entities')
      .select('*, entity_relations:entity_relations!source_entity_id(*)');

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    if (transcriptionId) {
      query = query.eq('transcription_id', transcriptionId);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    // Filter by firm
    if (user.firmId) {
      query = query.eq('firm_id', user.firmId);
    }

    const { data: entities, error } = await query;

    if (error) {
      logger.error('Failed to fetch entities', error as any);
      return NextResponse.json(
        { error: 'Failed to fetch entities' },
        { status: 500 }
      );
    }

    // Group by type
    const byType: Record<string, any[]> = {};
    entities?.forEach((entity) => {
      if (!byType[entity.entity_type]) {
        byType[entity.entity_type] = [];
      }
      byType[entity.entity_type].push(entity);
    });

    return NextResponse.json({
      success: true,
      entities: entities || [],
      totalCount: entities?.length || 0,
      byType,
    });
  } catch (error) {
    logger.error(
      'Entity fetch error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


