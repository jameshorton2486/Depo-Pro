'use client';

// =============================================================================
// CONFIDENCE CONTROLS
// components/transcripts/confidence-controls.tsx
//
// Phase 3B-3: Confidence threshold slider and navigation
// =============================================================================

import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfidenceControlsProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
  onJumpNext: () => void;
  onJumpPrev: () => void;
  currentIndex: number;
  totalFlagged: number;
}

export function ConfidenceControls({
  threshold,
  onThresholdChange,
  onJumpNext,
  onJumpPrev,
  currentIndex,
  totalFlagged,
}: ConfidenceControlsProps) {
  const [localThreshold, setLocalThreshold] = useState(threshold);

  // Persist threshold in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('transcript-confidence-threshold');
    if (saved) {
      const value = parseFloat(saved);
      if (!isNaN(value) && value >= 0.5 && value <= 0.95) {
        setLocalThreshold(value);
        onThresholdChange(value);
      }
    }
  }, []);

  const handleThresholdChange = (value: number[]) => {
    const newValue = value[0];
    setLocalThreshold(newValue);
    onThresholdChange(newValue);
    localStorage.setItem('transcript-confidence-threshold', newValue.toString());
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with text input
      }

      if (e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        onJumpNext();
      } else if (e.key === 'N' && e.shiftKey) {
        e.preventDefault();
        onJumpPrev();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        // Could open threshold slider focus here
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onJumpNext, onJumpPrev]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Confidence Threshold
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Threshold: {(localThreshold * 100).toFixed(0)}%</Label>
            <span className="text-xs text-muted-foreground">
              {totalFlagged} words flagged
            </span>
          </div>
          <Slider
            value={[localThreshold]}
            onValueChange={handleThresholdChange}
            min={0.5}
            max={0.95}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50%</span>
            <span>95%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onJumpPrev}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Previous (Shift+N)
          </Button>
          <div className="text-xs text-muted-foreground px-2">
            {currentIndex + 1} / {totalFlagged}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onJumpNext}
            disabled={currentIndex >= totalFlagged - 1}
            className="flex-1"
          >
            Next (N)
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
