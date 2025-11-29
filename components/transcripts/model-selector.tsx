// components/transcripts/model-selector.tsx
'use client';

import { MODEL_DESCRIPTIONS, DeepgramModelType } from '@/lib/transcription/config';
import { Check, Sparkles } from 'lucide-react';

interface ModelSelectorProps {
  value: DeepgramModelType;
  onChange: (model: DeepgramModelType) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const models = Object.entries(MODEL_DESCRIPTIONS) as [DeepgramModelType, typeof MODEL_DESCRIPTIONS[keyof typeof MODEL_DESCRIPTIONS]][];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Transcription Model
      </label>
      
      <div className="space-y-2">
        {models.map(([key, model]) => (
          <label
            key={key}
            className={`
              relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all
              ${value === key 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name="model"
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
              disabled={disabled}
              className="sr-only"
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${value === key ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                  {model.name}
                </span>
                {'recommended' in model && model.recommended && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {model.description}
              </p>
            </div>
            
            {value === key && (
              <div className="flex-shrink-0 ml-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
