'use client';

// ═══════════════════════════════════════════════════════════════
// PROCESSING MODE SELECTOR
// components/billing/processing-mode-selector.tsx
//
// Required selection component for job creation
// Allows user to choose between Automated and Manual RX enhancement
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  Wrench, 
  Clock, 
  DollarSign, 
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AudioProcessingMode = 'AUTOMATED' | 'MANUAL_RX';
export type AsrModelTier = 'STANDARD' | 'ENHANCED';

export interface ProcessingModeSelection {
  mode: AudioProcessingMode;
  modelTier: AsrModelTier;
}

interface ProcessingModeSelectorProps {
  value?: ProcessingModeSelection;
  onChange: (selection: ProcessingModeSelection) => void;
  estimatedDuration?: number; // minutes
  disabled?: boolean;
  showPricing?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PRICING INFO (matches billing service defaults)
// ═══════════════════════════════════════════════════════════════

const PRICING = {
  TRANSCRIPTION_AUTOMATED: 0.25, // per minute
  MODEL_UPGRADE: 0.10, // per minute additional
  FORENSIC_AUDIO_RX: 150.00, // flat fee per file
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ProcessingModeSelector({
  value,
  onChange,
  estimatedDuration = 0,
  disabled = false,
  showPricing = true,
}: ProcessingModeSelectorProps) {
  const [selection, setSelection] = useState<ProcessingModeSelection>(
    value || { mode: 'AUTOMATED', modelTier: 'STANDARD' }
  );

  useEffect(() => {
    if (value) {
      setSelection(value);
    }
  }, [value]);

  const handleModeChange = (mode: AudioProcessingMode) => {
    const newSelection = { ...selection, mode };
    setSelection(newSelection);
    onChange(newSelection);
  };

  const handleModelTierChange = (modelTier: AsrModelTier) => {
    const newSelection = { ...selection, modelTier };
    setSelection(newSelection);
    onChange(newSelection);
  };

  // Calculate estimated costs
  const calculateCost = () => {
    const minutes = Math.ceil(estimatedDuration);
    let total = 0;

    // Base transcription
    total += minutes * PRICING.TRANSCRIPTION_AUTOMATED;

    // Model upgrade
    if (selection.modelTier === 'ENHANCED') {
      total += minutes * PRICING.MODEL_UPGRADE;
    }

    // RX flat fee
    if (selection.mode === 'MANUAL_RX') {
      total += PRICING.FORENSIC_AUDIO_RX;
    }

    return total;
  };

  return (
    <div className="space-y-6">
      {/* Processing Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Audio Processing Mode
          </CardTitle>
          <CardDescription>
            Choose how your audio will be enhanced before transcription.
            This selection cannot be changed after processing starts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selection.mode}
            onValueChange={(v) => handleModeChange(v as AudioProcessingMode)}
            disabled={disabled}
            className="space-y-4"
          >
            {/* Automated Enhancement Option */}
            <div className={`
              relative flex items-start space-x-4 rounded-lg border p-4 transition-all
              ${selection.mode === 'AUTOMATED' 
                ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}>
              <RadioGroupItem value="AUTOMATED" id="automated" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="automated" className="flex items-center gap-2 cursor-pointer">
                  <span className="font-medium">Automated Enhancement</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Recommended
                  </Badge>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered noise reduction and audio optimization using Dolby.io
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Processing: Minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    99.5-99.8% accuracy
                  </span>
                  {showPricing && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${PRICING.TRANSCRIPTION_AUTOMATED.toFixed(2)}/min
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Best for: </span>
                  <span>Zoom/Teams, courtroom recordings, standard depositions</span>
                </div>
              </div>
            </div>

            {/* Manual RX Enhancement Option */}
            <div className={`
              relative flex items-start space-x-4 rounded-lg border p-4 transition-all
              ${selection.mode === 'MANUAL_RX' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}>
              <RadioGroupItem value="MANUAL_RX" id="manual_rx" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="manual_rx" className="flex items-center gap-2 cursor-pointer">
                  <span className="font-medium">Manual Forensic Enhancement</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Premium
                  </Badge>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Expert human operator using iZotope RX Advanced
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Processing: 1-2 business days
                  </span>
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-blue-600" />
                    Human operator
                  </span>
                  {showPricing && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${PRICING.FORENSIC_AUDIO_RX.toFixed(2)} flat fee
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Best for: </span>
                  <span>Poor quality audio, crosstalk, HVAC noise, whispered testimony</span>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* ASR Model Tier Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            ASR Model Tier
          </CardTitle>
          <CardDescription>
            Choose the speech recognition model quality level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selection.modelTier}
            onValueChange={(v: string) => handleModelTierChange(v as AsrModelTier)}
            disabled={disabled}
            className="space-y-3"
          >
            <div className={`
              flex items-center space-x-4 rounded-lg border p-3 transition-all
              ${selection.modelTier === 'STANDARD' 
                ? 'border-gray-500 bg-gray-50 dark:bg-gray-950/20' 
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }
            `}>
              <RadioGroupItem value="STANDARD" id="standard" />
              <Label htmlFor="standard" className="flex-1 cursor-pointer">
                <span className="font-medium">Standard (Deepgram Nova)</span>
                <p className="text-xs text-muted-foreground">
                  Excellent accuracy for most legal proceedings
                </p>
              </Label>
              {showPricing && (
                <span className="text-xs text-muted-foreground">Included</span>
              )}
            </div>

            <div className={`
              flex items-center space-x-4 rounded-lg border p-3 transition-all
              ${selection.modelTier === 'ENHANCED' 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20' 
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }
            `}>
              <RadioGroupItem value="ENHANCED" id="enhanced" />
              <Label htmlFor="enhanced" className="flex-1 cursor-pointer">
                <span className="font-medium">Enhanced (Nova-2 Medical)</span>
                <p className="text-xs text-muted-foreground">
                  Superior accuracy for medical terminology and complex cases
                </p>
              </Label>
              {showPricing && (
                <span className="text-xs text-muted-foreground">
                  +${PRICING.MODEL_UPGRADE.toFixed(2)}/min
                </span>
              )}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* RX Warning */}
      {selection.mode === 'MANUAL_RX' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Manual RX Enhancement selected.</strong> This job will be queued for 
            processing by a trained audio engineer. Typical turnaround is 1-2 business days.
            A flat fee of ${PRICING.FORENSIC_AUDIO_RX.toFixed(2)} will be applied to this job.
          </AlertDescription>
        </Alert>
      )}

      {/* Cost Estimate */}
      {showPricing && estimatedDuration > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estimated Cost</p>
                <p className="text-xs text-muted-foreground">
                  Based on {Math.ceil(estimatedDuration)} minutes of audio
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${calculateCost().toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  + human review costs
                </p>
              </div>
            </div>
            
            {/* Cost breakdown */}
            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Automated transcription ({Math.ceil(estimatedDuration)} min)</span>
                <span>${(Math.ceil(estimatedDuration) * PRICING.TRANSCRIPTION_AUTOMATED).toFixed(2)}</span>
              </div>
              {selection.modelTier === 'ENHANCED' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Enhanced model upgrade</span>
                  <span>${(Math.ceil(estimatedDuration) * PRICING.MODEL_UPGRADE).toFixed(2)}</span>
                </div>
              )}
              {selection.mode === 'MANUAL_RX' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Manual RX enhancement (flat fee)</span>
                  <span>${PRICING.FORENSIC_AUDIO_RX.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Processing Total</span>
                <span>${calculateCost().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProcessingModeSelector;
