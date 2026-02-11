'use client';

/**
 * ChronologyViewer
 * Phase 10 — Depo-Pro
 *
 * Displays medical chronology entries in a filterable, sortable table.
 * Supports inline editing, verification, manual entry, and DOCX export.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ChronologyEntryRow,
  ChronologySummary,
  ChronologyCategory,
} from '@/types/medical';

interface ChronologyViewerProps {
  jobId: string;
  canEdit?: boolean;
  refreshKey?: number; // Increment to trigger refresh
}

const CATEGORIES: ChronologyCategory[] = [
  'Visit', 'Surgery', 'Imaging', 'Lab', 'Prescription', 'Diagnosis',
  'Therapy', 'Hospitalization', 'Consultation', 'Procedure', 'Follow-Up', 'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Visit': 'bg-green-100 text-green-800',
  'Surgery': 'bg-red-100 text-red-800',
  'Imaging': 'bg-blue-100 text-blue-800',
  'Lab': 'bg-orange-100 text-orange-800',
  'Prescription': 'bg-purple-100 text-purple-800',
  'Diagnosis': 'bg-pink-100 text-pink-800',
  'Therapy': 'bg-cyan-100 text-cyan-800',
  'Hospitalization': 'bg-red-50 text-red-700',
  'Consultation': 'bg-indigo-100 text-indigo-800',
  'Procedure': 'bg-yellow-100 text-yellow-800',
  'Follow-Up': 'bg-lime-100 text-lime-800',
  'Other': 'bg-gray-100 text-gray-700',
};

export default function ChronologyViewer({
  jobId,
  canEdit = true,
  refreshKey = 0,
}: ChronologyViewerProps) {
  const [entries, setEntries] = useState<ChronologyEntryRow[]>([]);
  const [summary, setSummary] = useState<ChronologySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [filterVerified, setFilterVerified] = useState<string>('');

  // Add entry form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    event_date: '',
    category: 'Visit' as ChronologyCategory,
    provider: '',
    summary: '',
    details: '',
  });

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ChronologyEntryRow>>({});

  // Exporting
  const [exporting, setExporting] = useState(false);

  // ── Fetch entries ────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ summary: 'true' });
      if (filterCategory) params.set('category', filterCategory);
      if (filterProvider) params.set('provider', filterProvider);
      if (filterVerified) params.set('isVerified', filterVerified);

      const res = await fetch(`/api/jobs/${jobId}/chronology?${params}`);
      const json = await res.json();

      if (res.ok) {
        setEntries(json.data || []);
        if (json.summary) setSummary(json.summary);
      } else {
        setError(json.error || 'Failed to load chronology');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [jobId, filterCategory, filterProvider, filterVerified]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  // ── Verify entry ─────────────────────────────────────────
  const handleVerify = async (entryId: string, verified: boolean) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/chronology/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: verified ? 'verify' : 'unverify' }),
      });
      if (res.ok) {
        await fetchEntries();
      }
    } catch {
      setError('Failed to verify entry');
    }
  };

  // ── Save edit ────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}/chronology/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        setEditForm({});
        await fetchEntries();
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to save edit');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Delete entry ─────────────────────────────────────────
  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this chronology entry?')) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/chronology/${entryId}`, {
        method: 'DELETE',
      });
      if (res.ok) await fetchEntries();
    } catch {
      setError('Delete failed');
    }
  };

  // ── Add manual entry ────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.event_date || !addForm.summary || !addForm.category) {
      setError('Date, category, and summary are required');
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}/chronology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setShowAddForm(false);
        setAddForm({ event_date: '', category: 'Visit', provider: '', summary: '', details: '' });
        await fetchEntries();
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to add entry');
      }
    } catch {
      setError('Network error');
    }
  };

  // ── Export DOCX ──────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/chronology/export`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '')
        || 'Medical_Chronology.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // ── Format date ──────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header with summary stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Medical Chronology</h3>
          {summary && (
            <p className="text-sm text-gray-500">
              {summary.total_entries} entries from {summary.records_count} records
              {summary.date_range && (
                <> &middot; {formatDate(summary.date_range.earliest)} to {formatDate(summary.date_range.latest)}</>
              )}
              {summary.verified_entries > 0 && (
                <> &middot; {summary.verified_entries} verified</>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {showAddForm ? 'Cancel' : '+ Add Entry'}
            </button>
          )}
          {entries.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export DOCX'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 underline">Dismiss</button>
        </div>
      )}

      {/* Add entry form */}
      {showAddForm && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-blue-900">Add Manual Entry</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={addForm.event_date}
                onChange={(e) => setAddForm({ ...addForm, event_date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value as ChronologyCategory })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
              <input
                type="text"
                value={addForm.provider}
                onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })}
                placeholder="Dr. Smith"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Summary *</label>
            <input
              type="text"
              value={addForm.summary}
              onChange={(e) => setAddForm({ ...addForm, summary: e.target.value })}
              placeholder="Brief description of the medical event"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Details (optional)</label>
            <textarea
              value={addForm.details}
              onChange={(e) => setAddForm({ ...addForm, details: e.target.value })}
              rows={2}
              placeholder="Additional clinical details..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {entries.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded-md"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {summary && summary.providers.length > 0 && (
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="">All providers</option>
              {summary.providers.map((p) => (
                <option key={p.provider} value={p.provider}>{p.provider} ({p.count})</option>
              ))}
            </select>
          )}

          <select
            value={filterVerified}
            onChange={(e) => setFilterVerified(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded-md"
          >
            <option value="">All entries</option>
            <option value="true">Verified only</option>
            <option value="false">Unverified only</option>
          </select>

          {(filterCategory || filterProvider || filterVerified) && (
            <button
              onClick={() => { setFilterCategory(''); setFilterProvider(''); setFilterVerified(''); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <svg className="animate-spin mx-auto h-6 w-6 mb-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading chronology...
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">No chronology entries yet.</p>
          <p className="text-xs text-gray-400 mt-1">Upload and extract medical records to build a chronology.</p>
        </div>
      )}

      {/* Entries table */}
      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                {canEdit && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  {/* Date */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editingId === entry.id ? (
                      <input
                        type="date"
                        value={(editForm.event_date as string) || entry.event_date}
                        onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                        className="w-28 px-1 py-0.5 text-sm border border-gray-300 rounded"
                      />
                    ) : (
                      <div>
                        <span className="text-sm text-gray-900">{formatDate(entry.event_date)}</span>
                        {entry.date_precision !== 'DAY' && (
                          <span className="ml-1 text-xs text-gray-400">({entry.date_precision.toLowerCase()})</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editingId === entry.id ? (
                      <select
                        value={(editForm.category as string) || entry.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="px-1 py-0.5 text-xs border border-gray-300 rounded"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Other']}`}>
                        {entry.category}
                      </span>
                    )}
                  </td>

                  {/* Provider */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editingId === entry.id ? (
                      <input
                        type="text"
                        value={(editForm.provider as string) ?? entry.provider ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                        className="w-32 px-1 py-0.5 text-sm border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{entry.provider || '—'}</span>
                    )}
                  </td>

                  {/* Summary */}
                  <td className="px-3 py-2 max-w-md">
                    {editingId === entry.id ? (
                      <input
                        type="text"
                        value={(editForm.summary as string) || entry.summary}
                        onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                        className="w-full px-1 py-0.5 text-sm border border-gray-300 rounded"
                      />
                    ) : (
                      <div>
                        <p className="text-sm text-gray-900">{entry.summary}</p>
                        {entry.details && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry.details}</p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Source */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-500">
                      {entry.source_type === 'AI_EXTRACTED' && (
                        <span className="text-blue-600">AI</span>
                      )}
                      {entry.source_type === 'MANUAL' && (
                        <span className="text-gray-600">Manual</span>
                      )}
                      {entry.source_type === 'EDITED' && (
                        <span className="text-amber-600">Edited</span>
                      )}
                      {entry.page_reference && (
                        <span className="ml-1 text-gray-400">{entry.page_reference}</span>
                      )}
                    </div>
                    {entry.is_verified && (
                      <span className="inline-flex items-center text-xs text-green-600">
                        <svg className="h-3 w-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  {canEdit && (
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {editingId === entry.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={handleSaveEdit}
                            className="px-2 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditForm({}); }}
                            className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleVerify(entry.id, !entry.is_verified)}
                            className={`p-1 rounded ${entry.is_verified ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={entry.is_verified ? 'Unverify' : 'Verify'}
                          >
                            <svg className="h-4 w-4" fill={entry.is_verified ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setEditingId(entry.id); setEditForm({}); }}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
