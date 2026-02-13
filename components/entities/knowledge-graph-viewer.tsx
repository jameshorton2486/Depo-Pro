// components/entities/knowledge-graph-viewer.tsx
// Visual display of extracted entities and their relationships

'use client';

import { useState, useEffect } from 'react';
import {
  Network,
  User,
  Stethoscope,
  Calendar,
  DollarSign,
  MapPin,
  Building,
  FileText,
  Car,
  Ruler,
  Heart,
  Activity,
  ArrowRight,
  Search,
  Filter,
} from 'lucide-react';
import type { ExtractedEntity, EntityType } from '@/types/entities';

interface KnowledgeGraphViewerProps {
  jobId: string;
  transcriptionId?: string;
  onEntityClick?: (entity: ExtractedEntity) => void;
}

const ENTITY_ICONS: Record<EntityType, React.ComponentType<any>> = {
  PERSON: User,
  MEDICAL: Stethoscope,
  DATE: Calendar,
  MONETARY: DollarSign,
  LOCATION: MapPin,
  ORGANIZATION: Building,
  LEGAL: FileText,
  VEHICLE: Car,
  MEASUREMENT: Ruler,
  DOCUMENT: FileText,
  INJURY: Heart,
  TREATMENT: Activity,
};

const ENTITY_COLORS: Record<EntityType, string> = {
  PERSON: 'bg-blue-100 text-blue-700 border-blue-300',
  MEDICAL: 'bg-red-100 text-red-700 border-red-300',
  DATE: 'bg-green-100 text-green-700 border-green-300',
  MONETARY: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  LOCATION: 'bg-purple-100 text-purple-700 border-purple-300',
  ORGANIZATION: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  LEGAL: 'bg-slate-100 text-slate-700 border-slate-300',
  VEHICLE: 'bg-orange-100 text-orange-700 border-orange-300',
  MEASUREMENT: 'bg-teal-100 text-teal-700 border-teal-300',
  DOCUMENT: 'bg-gray-100 text-gray-700 border-gray-300',
  INJURY: 'bg-pink-100 text-pink-700 border-pink-300',
  TREATMENT: 'bg-cyan-100 text-cyan-700 border-cyan-300',
};

export function KnowledgeGraphViewer({
  jobId,
  transcriptionId,
  onEntityClick,
}: KnowledgeGraphViewerProps) {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<EntityType | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');

  // Fetch entities
  useEffect(() => {
    async function fetchEntities() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ jobId });
        if (transcriptionId) params.append('transcriptionId', transcriptionId);

        const res = await fetch(`/api/entities/extract?${params}`);
        if (!res.ok) throw new Error('Failed to fetch entities');

        const data = await res.json();
        setEntities(data.entities || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchEntities();
  }, [jobId, transcriptionId]);

  // Filter entities
  const filteredEntities = entities.filter((entity) => {
    if (filterType !== 'ALL' && entity.entity_type !== filterType) return false;
    if (searchText && !entity.text.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group by type
  const groupedEntities = filteredEntities.reduce<Record<string, any[]>>((acc, entity) => {
    const type = entity.entity_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(entity);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-slate-600">
          <Network className="w-5 h-5 animate-spin" />
          <span>Loading knowledge graph...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error: {error}
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="p-8 text-center">
        <Network className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">
          No Entities Extracted
        </h3>
        <p className="text-slate-500 mb-4">
          Entities will appear here after extraction is complete.
        </p>
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/entities/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, transcriptionId }),
              });
              if (res.ok) {
                window.location.reload();
              }
            } catch (_err) {
              alert('Extraction failed');
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Extract Entities Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Evidence Knowledge Graph
          </h3>
          <p className="text-sm text-slate-500">
            {filteredEntities.length} entities extracted
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search entities..."
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EntityType | 'ALL')}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="PERSON">People</option>
              <option value="MEDICAL">Medical</option>
              <option value="DATE">Dates</option>
              <option value="MONETARY">Monetary</option>
              <option value="LOCATION">Locations</option>
              <option value="ORGANIZATION">Organizations</option>
              <option value="LEGAL">Legal</option>
              <option value="VEHICLE">Vehicles</option>
              <option value="INJURY">Injuries</option>
              <option value="TREATMENT">Treatments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entity Groups */}
      <div className="space-y-6">
        {Object.entries(groupedEntities).map(([type, typeEntities]) => {
          const Icon = ENTITY_ICONS[type as EntityType] || FileText;
          const colorClass = ENTITY_COLORS[type as EntityType];

          return (
            <div key={type} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-slate-600" />
                <h4 className="font-medium text-slate-900">
                  {type.replace(/_/g, ' ')}
                </h4>
                <span className="ml-auto text-sm text-slate-500">
                  {typeEntities.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {typeEntities.slice(0, 20).map((entity) => (
                  <button
                    key={entity.id}
                    onClick={() => onEntityClick?.(entity)}
                    className={`
                      px-3 py-1.5 rounded-md border text-sm font-medium
                      transition-all hover:shadow-sm
                      ${colorClass}
                    `}
                    title={`Confidence: ${(entity.confidence * 100).toFixed(0)}%`}
                  >
                    {entity.text}
                    {entity.role && (
                      <span className="ml-1.5 text-xs opacity-75">
                        ({entity.role})
                      </span>
                    )}
                  </button>
                ))}
                {typeEntities.length > 20 && (
                  <span className="px-3 py-1.5 text-sm text-slate-500">
                    +{typeEntities.length - 20} more
                  </span>
                )}
              </div>

              {/* Show relationships for this entity type */}
              {typeEntities.some((e: any) => e.entity_relations?.length > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    Relationships
                  </p>
                  <div className="space-y-1 text-xs text-slate-600">
                    {typeEntities
                      .flatMap((e: any) => e.entity_relations || [])
                      .slice(0, 5)
                      .map((rel: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-mono text-slate-500">
                            {rel.relation_type.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-3">Extraction Statistics</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Total Entities</p>
            <p className="text-lg font-semibold text-slate-900">{entities.length}</p>
          </div>
          <div>
            <p className="text-slate-500">Entity Types</p>
            <p className="text-lg font-semibold text-slate-900">
              {Object.keys(groupedEntities).length}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Avg Confidence</p>
            <p className="text-lg font-semibold text-slate-900">
              {entities.length > 0
                ? Math.round(
                    (entities.reduce((sum, e) => sum + e.confidence, 0) /
                      entities.length) *
                      100
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
