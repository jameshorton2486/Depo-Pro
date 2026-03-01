'use client';

import { useEffect, useState } from 'react';
import type {
  SpeakerMapping,
  TranscriptFormatConfig,
} from '@/types/transcript-format';
import {
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_PROCESSING_RULES,
} from '@/types/transcript-format';

interface FormatSettingsPanelProps {
  jobId: string;
  detectedSpeakers: string[];
}

const DEFAULT_CONFIG: TranscriptFormatConfig = {
  speakerMappings: [],
  examinationSections: [],
  formatOptions: DEFAULT_FORMAT_OPTIONS,
  processingRules: DEFAULT_PROCESSING_RULES,
};

type ToggleRuleKey =
  | 'insertEmDashes'
  | 'fixDoctorTitle'
  | 'fixDiarization'
  | 'normalizeSentenceSpacing';

export default function FormatSettingsPanel({
  jobId,
  detectedSpeakers,
}: FormatSettingsPanelProps) {
  const [config, setConfig] = useState<TranscriptFormatConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response = await fetch(`/api/jobs/${jobId}/format-settings`);
        const payload = await response.json();
        if (!mounted) return;

        if (payload?.data) {
          const incoming = payload.data as TranscriptFormatConfig;
          const mappings = Array.isArray(incoming.speakerMappings)
            ? incoming.speakerMappings
            : [];
          setConfig({
            speakerMappings:
              mappings.length > 0
                ? mappings
                : detectedSpeakers.map((id) => ({
                    deepgramId: id,
                    displayLabel: '',
                    role: 'other',
                  })),
            examinationSections: Array.isArray(incoming.examinationSections)
              ? incoming.examinationSections
              : [],
            formatOptions: {
              ...DEFAULT_FORMAT_OPTIONS,
              ...(incoming.formatOptions || {}),
            },
            processingRules: {
              ...DEFAULT_PROCESSING_RULES,
              ...(incoming.processingRules || {}),
            },
          });
        }
      } finally {
        if (mounted) setLoaded(true);
      }
    }

    void loadSettings();
    return () => {
      mounted = false;
    };
  }, [jobId, detectedSpeakers]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/jobs/${jobId}/format-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } finally {
      setSaving(false);
    }
  }

  function updateSpeaker(
    index: number,
    field: keyof SpeakerMapping,
    value: string,
  ) {
    setConfig((prev) => {
      const updated = [...prev.speakerMappings];
      const mapping = updated[index];
      if (!mapping) return prev;
      updated[index] = { ...mapping, [field]: value };
      return { ...prev, speakerMappings: updated };
    });
  }

  function toggleRule(field: ToggleRuleKey) {
    setConfig((prev) => ({
      ...prev,
      processingRules: {
        ...prev.processingRules,
        [field]: !prev.processingRules[field],
      },
    }));
  }

  function updateSentenceSpaces(value: 1 | 2) {
    setConfig((prev) => ({
      ...prev,
      formatOptions: {
        ...prev.formatOptions,
        sentenceSpaces: value,
      },
    }));
  }

  function updateQASpaces(value: 1 | 2) {
    setConfig((prev) => ({
      ...prev,
      formatOptions: {
        ...prev.formatOptions,
        qaSpaces: value,
      },
    }));
  }

  if (!loaded) {
    return <div className="h-48 animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Transcript Formatting</h3>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Speaker Labels</h4>
        {config.speakerMappings.map((mapping, index) => (
          <div key={mapping.deepgramId} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm text-gray-500">{mapping.deepgramId}</span>
            <input
              type="text"
              placeholder="e.g., MR. SALAZAR"
              value={mapping.displayLabel}
              onChange={(event) =>
                updateSpeaker(index, 'displayLabel', event.target.value)
              }
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={mapping.role}
              onChange={(event) =>
                updateSpeaker(index, 'role', event.target.value)
              }
              className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="videographer">Videographer</option>
              <option value="court_reporter">Court Reporter</option>
              <option value="witness">Witness</option>
              <option value="examining_attorney">Examining Attorney</option>
              <option value="cross_examining_attorney">Cross-Examining Attorney</option>
              <option value="other">Other</option>
            </select>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Formatting Options</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Sentence spacing:</span>
            <select
              value={config.formatOptions.sentenceSpaces}
              onChange={(event) =>
                updateSentenceSpaces(Number(event.target.value) as 1 | 2)
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value={1}>1 space</option>
              <option value={2}>2 spaces</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Q/A spacing:</span>
            <select
              value={config.formatOptions.qaSpaces}
              onChange={(event) =>
                updateQASpaces(Number(event.target.value) as 1 | 2)
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value={1}>1 space</option>
              <option value={2}>2 spaces</option>
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Auto-Processing</h4>
        {[
          {
            key: 'insertEmDashes' as const,
            label: 'Insert em dashes for stutters/repeated words',
          },
          {
            key: 'fixDoctorTitle' as const,
            label: 'Abbreviate "doctor" to "Dr." before names',
          },
          {
            key: 'fixDiarization' as const,
            label: 'Merge short mis-attributed speaker segments',
          },
          {
            key: 'normalizeSentenceSpacing' as const,
            label: 'Normalize sentence spacing',
          },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={Boolean(config.processingRules[key])}
              onChange={() => toggleRule(key)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {label}
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
