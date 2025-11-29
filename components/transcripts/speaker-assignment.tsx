// components/transcripts/speaker-assignment.tsx
'use client';

import { useState } from 'react';
import { Plus, Trash2, Volume2 } from 'lucide-react';
import { SPEAKER_TYPES, SpeakerType } from '@/lib/transcription/config';
import { SpeakerAssignment } from '@/types/transcript';
import { SpeakerGuess } from '@/lib/services/speaker-identification';

interface SpeakerAssignmentProps {
  detectedSpeakers: number[];  // Speaker IDs from Deepgram
  speakerGuesses?: SpeakerGuess[];  // AI suggestions
  initialAssignments?: SpeakerAssignment[];
  audioRef?: React.RefObject<HTMLAudioElement>;
  speakerTimestamps?: Map<number, number>;  // Speaker ID -> first timestamp
  onChange: (assignments: SpeakerAssignment[]) => void;
}

const DEFAULT_SPEAKER_COUNT = 6;

export function SpeakerAssignmentTable({
  detectedSpeakers,
  speakerGuesses = [],
  initialAssignments = [],
  audioRef,
  speakerTimestamps,
  onChange,
}: SpeakerAssignmentProps) {
  // Initialize with default rows or existing assignments
  const [assignments, setAssignments] = useState<SpeakerAssignment[]>(() => {
    if (initialAssignments.length > 0) {
      return initialAssignments;
    }
    
    // Create default rows
    return Array.from({ length: DEFAULT_SPEAKER_COUNT }, (_, i) => ({
      speakerId: -1,  // Unassigned
      speakerName: '',
      speakerType: 'Attorney' as SpeakerType,
      excludeFromTranscript: false,
    }));
  });

  const updateAssignment = (
    index: number,
    field: keyof SpeakerAssignment,
    value: string | number | boolean
  ) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssignments(updated);
    onChange(updated);
  };

  const addSpeaker = () => {
    const newAssignment: SpeakerAssignment = {
      speakerId: -1,
      speakerName: '',
      speakerType: 'Attorney',
      excludeFromTranscript: false,
    };
    const updated = [...assignments, newAssignment];
    setAssignments(updated);
    onChange(updated);
  };

  const removeSpeaker = (index: number) => {
    if (assignments.length <= 2) return;  // Keep at least 2 rows
    const updated = assignments.filter((_, i) => i !== index);
    setAssignments(updated);
    onChange(updated);
  };

  const playSpeakerSample = (speakerId: number) => {
    if (!audioRef?.current || !speakerTimestamps) return;
    const timestamp = speakerTimestamps.get(speakerId);
    if (timestamp !== undefined) {
      audioRef.current.currentTime = Math.max(0, timestamp - 0.5);
      audioRef.current.play();
      // Stop after 5 seconds
      setTimeout(() => {
        audioRef.current?.pause();
      }, 5000);
    }
  };

  // Get AI suggestion for a speaker
  const getSuggestion = (speakerId: number): SpeakerGuess | undefined => {
    return speakerGuesses.find(g => g.speakerId === speakerId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Speaker Assignment
        </h3>
        <span className="text-sm text-slate-500">
          {detectedSpeakers.length} speaker(s) detected
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                Speaker Name
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-400 w-24">
                Speaker #
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                Speaker Type
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-400 w-32">
                Exclude
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-400 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment, index) => {
              const suggestion = assignment.speakerId >= 0 
                ? getSuggestion(assignment.speakerId) 
                : undefined;
              
              return (
                <tr 
                  key={index}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  {/* Speaker Name */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={assignment.speakerName}
                      onChange={(e) => updateAssignment(index, 'speakerName', e.target.value)}
                      placeholder="Enter name..."
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md 
                        bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Speaker # Dropdown */}
                  <td className="px-4 py-3">
                    <select
                      value={assignment.speakerId}
                      onChange={(e) => updateAssignment(index, 'speakerId', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md
                        bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={-1}>--</option>
                      {detectedSpeakers.map(id => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Speaker Type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={assignment.speakerType}
                        onChange={(e) => updateAssignment(index, 'speakerType', e.target.value as SpeakerType)}
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md
                          bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {SPEAKER_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {suggestion && (
                        <span 
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                          title={suggestion.reasoning}
                        >
                          AI: {suggestion.suggestedType} ({Math.round(suggestion.confidence * 100)}%)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Exclude Checkbox */}
                  <td className="px-4 py-3 text-center">
                    <label className="flex items-center justify-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignment.excludeFromTranscript}
                        onChange={(e) => updateAssignment(index, 'excludeFromTranscript', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600
                          text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-500">
                        (interpreter)
                      </span>
                    </label>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {assignment.speakerId >= 0 && speakerTimestamps && (
                        <button
                          onClick={() => playSpeakerSample(assignment.speakerId)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 
                            dark:hover:bg-blue-900/50 rounded-md transition-colors"
                          title="Play 5-second sample"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeSpeaker(index)}
                        disabled={assignments.length <= 2}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 
                          dark:hover:bg-red-900/50 rounded-md transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove speaker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Speaker Button */}
      <button
        onClick={addSpeaker}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 
          hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Speaker
      </button>

      {/* Help Text */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>ℹ️ Tip:</strong> Speaker numbers will be assigned automatically when voices are 
          detected during transcription. Use the play button to hear a sample of each speaker 
          and match names to numbers. Check &quot;Exclude&quot; for witnesses speaking through an interpreter.
        </p>
      </div>
    </div>
  );
}
