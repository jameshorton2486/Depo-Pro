'use client';

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE THRESHOLD CONTROL - Adjustable sensitivity slider
// ═══════════════════════════════════════════════════════════════
// Features:
// - Slider to adjust threshold (0.50 - 1.00)
// - Visual feedback showing current value
// - Displays count of flagged words at current threshold
// - Preset buttons for common thresholds

import React from 'react';

interface ConfidenceThresholdControlProps {
  threshold: number;
  onChange: (threshold: number) => void;
  totalWords: number;
  flaggedCount: number;
  className?: string;
}

const PRESETS = [
  { value: 0.70, label: 'Lenient (70%)' },
  { value: 0.85, label: 'Standard (85%)' },
  { value: 0.95, label: 'Strict (95%)' },
];

export function ConfidenceThresholdControl({
  threshold,
  onChange,
  totalWords,
  flaggedCount,
  className = '',
}: ConfidenceThresholdControlProps) {
  const thresholdPercent = Math.round(threshold * 100);
  const flaggedPercent = totalWords > 0 ? Math.round((flaggedCount / totalWords) * 100) : 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <label htmlFor="confidence-threshold" className="text-sm font-medium text-gray-700">
          Confidence Threshold
        </label>
        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
          {thresholdPercent}%
        </span>
      </div>

      {/* Slider */}
      <input
        id="confidence-threshold"
        type="range"
        min="50"
        max="100"
        step="1"
        value={thresholdPercent}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />

      {/* Slider labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-1 mb-4">
        <span>50% (More flagged)</span>
        <span>100% (Less flagged)</span>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2 mb-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={`flex-1 text-xs py-1.5 px-2 rounded border transition-colors ${
              Math.abs(threshold - preset.value) < 0.01
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-gray-50 rounded p-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Words needing review:</span>
          <span className="font-semibold text-red-600">
            {flaggedCount} <span className="text-gray-400 font-normal">({flaggedPercent}%)</span>
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${flaggedPercent}%` }}
          />
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500 mt-3">
        Words with confidence below this threshold will be highlighted in{' '}
        <span className="text-red-600 font-medium">red</span> for review.
      </p>
    </div>
  );
}

export default ConfidenceThresholdControl;
