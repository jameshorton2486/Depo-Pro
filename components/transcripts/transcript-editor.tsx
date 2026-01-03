// =============================================================================
// TRANSCRIPT EDITOR COMPONENT
// components/transcripts/transcript-editor.tsx
//
// Rich text editor for transcript editing
// =============================================================================

'use client';

import { useState } from 'react';

interface TranscriptEditorProps {
  transcriptId: string;
  initialContent: string;
  jobId: string;
}

export function TranscriptEditor({
  transcriptId,
  initialContent,
  jobId: _jobId,
}: TranscriptEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/transcripts/${transcriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (_err) {
      alert('Failed to save transcript');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="font-semibold">Transcript Content</h2>
          <p className="text-sm text-gray-500">Edit the transcript text below</p>
        </div>
        <div className="flex gap-2">
          {saved && (
            <span className="text-sm text-green-600 flex items-center">
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="p-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Enter transcript content..."
        />
      </div>
    </div>
  );
}
