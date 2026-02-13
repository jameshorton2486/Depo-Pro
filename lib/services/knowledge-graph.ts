// lib/services/knowledge-graph.ts
// Knowledge Graph Builder for Evidence Relationships
// Analyzes entity co-occurrence and builds semantic relationships

import { v4 as uuidv4 } from 'uuid';
import type {
  ExtractedEntity,
  EntityRelation,
  KnowledgeGraph,
  EntityTimeline,
  CoOccurrenceMatrix,
} from '@/types/entities';

// ============================================================================
// Relationship Detection
// ============================================================================

/**
 * Build a knowledge graph from extracted entities
 * Detects relationships based on:
 * - Co-occurrence within same sentence/segment
 * - Temporal proximity
 * - Semantic patterns in context
 */
export function buildKnowledgeGraph(
  entities: ExtractedEntity[],
  jobId: string,
  transcriptionId: string
): KnowledgeGraph {
  const relations: EntityRelation[] = [];

  // Detect relationships
  relations.push(...detectMedicalRelationships(entities));
  relations.push(...detectTemporalRelationships(entities));
  relations.push(...detectLocationRelationships(entities));
  relations.push(...detectMonetaryRelationships(entities));
  relations.push(...detectCoOccurrenceRelationships(entities));

  return {
    entities,
    relations,
    metadata: {
      jobId,
      transcriptionId,
      extractedAt: new Date().toISOString(),
      entityCount: entities.length,
      relationCount: relations.length,
      coverage: calculateCoverage(entities),
    },
  };
}

/**
 * Detect medical relationships (Person → Medical Provider, Diagnosis, Treatment)
 */
function detectMedicalRelationships(entities: ExtractedEntity[]): EntityRelation[] {
  const relations: EntityRelation[] = [];

  const people = entities.filter((e) => e.type === 'PERSON');
  const medical = entities.filter((e) => e.type === 'MEDICAL');
  const medicalProviders = entities.filter(
    (e) => e.type === 'PERSON' && e.role === 'MEDICAL_PROVIDER'
  );

  // Person TREATED_BY Medical Provider
  for (const person of people) {
    for (const provider of medicalProviders) {
      if (person.id === provider.id) continue; // Skip self

      const proximity = calculateProximity(person, provider);
      if (proximity > 0.5) {
        relations.push({
          id: uuidv4(),
          sourceEntityId: person.id,
          targetEntityId: provider.id,
          type: 'TREATED_BY',
          confidence: proximity,
          evidence: buildEvidence(person, provider),
          wordIndices: [...person.wordIndices, ...provider.wordIndices],
          extractedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Person DIAGNOSED_WITH Medical Condition
  for (const person of people) {
    for (const condition of medical) {
      const proximity = calculateProximity(person, condition);
      if (proximity > 0.5) {
        relations.push({
          id: uuidv4(),
          sourceEntityId: person.id,
          targetEntityId: condition.id,
          type: 'DIAGNOSED_WITH',
          confidence: proximity,
          evidence: buildEvidence(person, condition),
          wordIndices: [...person.wordIndices, ...condition.wordIndices],
          extractedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Medical Provider PRESCRIBED Treatment
  for (const provider of medicalProviders) {
    for (const treatment of medical) {
      // Check if treatment is a medication or procedure
      const isMedication = treatment.text.toLowerCase().match(/(medication|drug|pill|injection)/);
      const isProcedure = treatment.text.toLowerCase().match(/(surgery|therapy|injection|procedure)/);

      if (isMedication || isProcedure) {
        const proximity = calculateProximity(provider, treatment);
        if (proximity > 0.5) {
          relations.push({
            id: uuidv4(),
            sourceEntityId: provider.id,
            targetEntityId: treatment.id,
            type: 'PRESCRIBED',
            confidence: proximity,
            evidence: buildEvidence(provider, treatment),
            wordIndices: [...provider.wordIndices, ...treatment.wordIndices],
            extractedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return relations;
}

/**
 * Detect temporal relationships (Entity → Date)
 */
function detectTemporalRelationships(entities: ExtractedEntity[]): EntityRelation[] {
  const relations: EntityRelation[] = [];

  const dates = entities.filter((e) => e.type === 'DATE');
  const nonDates = entities.filter((e) => e.type !== 'DATE');

  for (const entity of nonDates) {
    for (const date of dates) {
      const proximity = calculateProximity(entity, date);

      // Only link if date is very close (same sentence)
      if (proximity > 0.7) {
        relations.push({
          id: uuidv4(),
          sourceEntityId: entity.id,
          targetEntityId: date.id,
          type: 'OCCURRED_ON',
          confidence: proximity,
          evidence: buildEvidence(entity, date),
          wordIndices: [...entity.wordIndices, ...date.wordIndices],
          extractedAt: new Date().toISOString(),
        });
      }
    }
  }

  return relations;
}

/**
 * Detect location relationships (Entity → Location)
 */
function detectLocationRelationships(entities: ExtractedEntity[]): EntityRelation[] {
  const relations: EntityRelation[] = [];

  const locations = entities.filter((e) => e.type === 'LOCATION');
  const nonLocations = entities.filter((e) => e.type !== 'LOCATION');

  for (const entity of nonLocations) {
    for (const location of locations) {
      const proximity = calculateProximity(entity, location);

      if (proximity > 0.6) {
        relations.push({
          id: uuidv4(),
          sourceEntityId: entity.id,
          targetEntityId: location.id,
          type: 'LOCATED_AT',
          confidence: proximity,
          evidence: buildEvidence(entity, location),
          wordIndices: [...entity.wordIndices, ...location.wordIndices],
          extractedAt: new Date().toISOString(),
        });
      }
    }
  }

  return relations;
}

/**
 * Detect monetary relationships (Monetary → Organization/Person)
 */
function detectMonetaryRelationships(entities: ExtractedEntity[]): EntityRelation[] {
  const relations: EntityRelation[] = [];

  const monetary = entities.filter((e) => e.type === 'MONETARY');
  const payers = entities.filter((e) => e.type === 'PERSON' || e.type === 'ORGANIZATION');

  for (const money of monetary) {
    for (const payer of payers) {
      const proximity = calculateProximity(money, payer);

      if (proximity > 0.6) {
        relations.push({
          id: uuidv4(),
          sourceEntityId: money.id,
          targetEntityId: payer.id,
          type: 'PAID_BY',
          confidence: proximity,
          evidence: buildEvidence(money, payer),
          wordIndices: [...money.wordIndices, ...payer.wordIndices],
          extractedAt: new Date().toISOString(),
        });
      }
    }
  }

  return relations;
}

/**
 * Detect co-occurrence relationships (general proximity-based)
 */
function detectCoOccurrenceRelationships(entities: ExtractedEntity[]): EntityRelation[] {
  const relations: EntityRelation[] = [];

  // For any entities that appear within 10 words of each other
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i];
      const entity2 = entities[j];

      // Skip if different types or already have a specific relationship
      if (entity1.type === entity2.type) continue;

      const proximity = calculateProximity(entity1, entity2);

      // High proximity = likely related
      if (proximity > 0.8) {
        relations.push({
          id: uuidv4(),
          sourceEntityId: entity1.id,
          targetEntityId: entity2.id,
          type: 'MENTIONED_IN',
          confidence: proximity,
          evidence: buildEvidence(entity1, entity2),
          wordIndices: [...entity1.wordIndices, ...entity2.wordIndices],
          extractedAt: new Date().toISOString(),
        });
      }
    }
  }

  return relations;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate proximity between two entities
 * Returns 0-1 score based on:
 * - Word index distance
 * - Time range overlap
 * - Context similarity
 */
function calculateProximity(entity1: ExtractedEntity, entity2: ExtractedEntity): number {
  // Calculate minimum distance between any word indices
  let minDistance = Infinity;
  for (const idx1 of entity1.wordIndices) {
    for (const idx2 of entity2.wordIndices) {
      const distance = Math.abs(idx1 - idx2);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
  }

  // Proximity score based on distance
  // 0 words apart = 1.0, 5 words apart = 0.5, 20+ words apart = 0
  if (minDistance === 0) return 1.0;
  if (minDistance <= 5) return 1.0 - (minDistance / 10);
  if (minDistance <= 10) return 0.5 - ((minDistance - 5) / 20);
  if (minDistance <= 20) return 0.25 - ((minDistance - 10) / 40);

  return 0;
}

/**
 * Build evidence strings for a relationship
 */
function buildEvidence(entity1: ExtractedEntity, entity2: ExtractedEntity): string[] {
  const evidence: string[] = [];

  // Combine contexts
  const combinedContext = [...entity1.context, ...entity2.context]
    .filter((word, index, arr) => arr.indexOf(word) === index) // unique
    .join(' ');

  if (combinedContext) {
    evidence.push(combinedContext);
  }

  return evidence;
}

/**
 * Calculate overall coverage of entities across transcript
 */
function calculateCoverage(entities: ExtractedEntity[]): number {
  const allWordIndices = new Set(entities.flatMap((e) => e.wordIndices));
  // Assuming average transcript is 5000 words (will be replaced with actual count)
  return allWordIndices.size / 5000;
}

// ============================================================================
// Graph Analysis Functions
// ============================================================================

/**
 * Build a timeline of entities ordered by date
 */
export function buildEntityTimeline(graph: KnowledgeGraph): EntityTimeline {
  const events: EntityTimeline['events'] = [];

  // Get all date entities
  const dateEntities = graph.entities.filter((e) => e.type === 'DATE' && e.metadata?.isoDate);

  // Sort by date
  const sortedDates = dateEntities.sort((a, b) => {
    const dateA = a.metadata?.isoDate || '';
    const dateB = b.metadata?.isoDate || '';
    return dateA.localeCompare(dateB);
  });

  for (const dateEntity of sortedDates) {
    // Find all entities that occurred on this date
    const relatedRelations = graph.relations.filter(
      (r) => r.targetEntityId === dateEntity.id && r.type === 'OCCURRED_ON'
    );

    const relatedEntities = relatedRelations.map((r) =>
      graph.entities.find((e) => e.id === r.sourceEntityId)
    ).filter((e): e is ExtractedEntity => e !== undefined);

    if (relatedEntities.length > 0) {
      events.push({
        date: dateEntity.metadata?.isoDate || dateEntity.text,
        entities: relatedEntities,
        relations: relatedRelations,
        description: `${relatedEntities.length} event(s) on ${dateEntity.text}`,
      });
    }
  }

  return {
    events,
    metadata: {
      startDate: sortedDates[0]?.metadata?.isoDate || '',
      endDate: sortedDates[sortedDates.length - 1]?.metadata?.isoDate || '',
      totalEvents: events.length,
    },
  };
}

/**
 * Build co-occurrence matrix to find entities frequently mentioned together
 */
export function buildCoOccurrenceMatrix(graph: KnowledgeGraph): CoOccurrenceMatrix {
  const pairs: CoOccurrenceMatrix['pairs'] = [];
  const pairMap = new Map<string, { count: number; contexts: Set<string> }>();

  // Analyze all relationships
  for (const relation of graph.relations) {
    const key = [relation.sourceEntityId, relation.targetEntityId].sort().join('|');

    if (!pairMap.has(key)) {
      pairMap.set(key, { count: 0, contexts: new Set() });
    }

    const entry = pairMap.get(key)!;
    entry.count += 1;
    relation.evidence.forEach((e) => entry.contexts.add(e));
  }

  // Convert to array
  for (const [key, { count, contexts }] of pairMap.entries()) {
    const [entity1Id, entity2Id] = key.split('|');
    pairs.push({
      entity1Id,
      entity2Id,
      coOccurrenceCount: count,
      contexts: Array.from(contexts),
    });
  }

  // Sort by occurrence count
  pairs.sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount);

  return { pairs };
}

/**
 * Find all entities connected to a given entity
 */
export function findConnectedEntities(
  graph: KnowledgeGraph,
  entityId: string,
  maxDepth: number = 2
): ExtractedEntity[] {
  const connected = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: entityId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);
    connected.add(id);

    // Find all relations involving this entity
    const outgoing = graph.relations.filter((r) => r.sourceEntityId === id);
    const incoming = graph.relations.filter((r) => r.targetEntityId === id);

    // Add connected entities to queue
    outgoing.forEach((r) => queue.push({ id: r.targetEntityId, depth: depth + 1 }));
    incoming.forEach((r) => queue.push({ id: r.sourceEntityId, depth: depth + 1 }));
  }

  // Return entity objects
  return graph.entities.filter((e) => connected.has(e.id));
}

/**
 * Find the shortest path between two entities
 */
export function findShortestPath(
  graph: KnowledgeGraph,
  startEntityId: string,
  endEntityId: string
): ExtractedEntity[] | null {
  const queue: Array<{ id: string; path: string[] }> = [{ id: startEntityId, path: [startEntityId] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    if (id === endEntityId) {
      // Found the path - return entity objects
      return path.map((entityId) => graph.entities.find((e) => e.id === entityId)!).filter(Boolean);
    }

    if (visited.has(id)) continue;
    visited.add(id);

    // Find neighbors
    const neighbors = graph.relations
      .filter((r) => r.sourceEntityId === id || r.targetEntityId === id)
      .map((r) => (r.sourceEntityId === id ? r.targetEntityId : r.sourceEntityId));

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, path: [...path, neighborId] });
      }
    }
  }

  return null; // No path found
}

/**
 * Get statistics about the knowledge graph
 */
export function getGraphStatistics(graph: KnowledgeGraph): {
  totalEntities: number;
  totalRelations: number;
  entitiesByType: Record<string, number>;
  relationsByType: Record<string, number>;
  avgEntitiesPerType: number;
  avgRelationsPerEntity: number;
  mostConnectedEntity: { entity: ExtractedEntity; connectionCount: number } | null;
} {
  const entitiesByType: Record<string, number> = {};
  const relationsByType: Record<string, number> = {};

  graph.entities.forEach((e) => {
    entitiesByType[e.type] = (entitiesByType[e.type] || 0) + 1;
  });

  graph.relations.forEach((r) => {
    relationsByType[r.type] = (relationsByType[r.type] || 0) + 1;
  });

  // Find most connected entity
  const connectionCounts = new Map<string, number>();
  graph.relations.forEach((r) => {
    connectionCounts.set(r.sourceEntityId, (connectionCounts.get(r.sourceEntityId) || 0) + 1);
    connectionCounts.set(r.targetEntityId, (connectionCounts.get(r.targetEntityId) || 0) + 1);
  });

  let mostConnectedEntity = null;
  let maxConnections = 0;
  for (const [entityId, count] of connectionCounts.entries()) {
    if (count > maxConnections) {
      maxConnections = count;
      const entity = graph.entities.find((e) => e.id === entityId);
      if (entity) {
        mostConnectedEntity = { entity, connectionCount: count };
      }
    }
  }

  return {
    totalEntities: graph.entities.length,
    totalRelations: graph.relations.length,
    entitiesByType,
    relationsByType,
    avgEntitiesPerType: graph.entities.length / Object.keys(entitiesByType).length,
    avgRelationsPerEntity: graph.relations.length / graph.entities.length,
    mostConnectedEntity,
  };
}

/**
 * Export graph to Cypher query format (Neo4j compatible)
 */
export function exportToCypher(graph: KnowledgeGraph): string[] {
  const queries: string[] = [];

  // Create nodes
  graph.entities.forEach((entity) => {
    const props = [
      `id: "${entity.id}"`,
      `type: "${entity.type}"`,
      `text: "${entity.text.replace(/"/g, '\\"')}"`,
      `normalized: "${entity.normalized.replace(/"/g, '\\"')}"`,
      `confidence: ${entity.confidence}`,
    ];

    if (entity.role) props.push(`role: "${entity.role}"`);

    queries.push(`CREATE (n:Entity {${props.join(', ')}})`);
  });

  // Create relationships
  graph.relations.forEach((relation) => {
    queries.push(
      `MATCH (a:Entity {id: "${relation.sourceEntityId}"}), (b:Entity {id: "${relation.targetEntityId}"}) ` +
      `CREATE (a)-[r:${relation.type} {confidence: ${relation.confidence}}]->(b)`
    );
  });

  return queries;
}
