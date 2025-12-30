// ============================================================
// SCHEDULING SUGGESTION DISPLAY COMPONENT
// File: components/calendar/scheduling-suggestion.tsx
// ============================================================
// Advisory-only UI - suggestions never auto-apply
// ============================================================

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Lightbulb,
  Clock,
  User,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Info,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface SchedulingSuggestion {
  type: 'TIME_SLOT' | 'REPORTER' | 'DURATION' | 'LOCATION';
  recommendedStart?: Date;
  recommendedEnd?: Date;
  recommendedReporterId?: string;
  recommendedReporterName?: string;
  recommendedDuration?: number;
  recommendedLocation?: string;
  confidenceScore: number;
  rationale: string[];
  factors?: Array<{
    name: string;
    weight: number;
    value: number;
    description: string;
  }>;
  alternatives?: Array<{
    start?: Date;
    end?: Date;
    reporterId?: string;
    reporterName?: string;
    confidenceScore: number;
    rationale: string;
  }>;
}

interface SchedulingSuggestionCardProps {
  suggestion: SchedulingSuggestion;
  onApply?: (suggestion: SchedulingSuggestion) => void;
  onReject?: (suggestion: SchedulingSuggestion) => void;
  onSelectAlternative?: (alternative: any) => void;
  isApplying?: boolean;
  userRole: string;
  showDetails?: boolean;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} minutes`;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return 'text-green-600 bg-green-50';
  if (score >= 0.6) return 'text-blue-600 bg-blue-50';
  if (score >= 0.4) return 'text-yellow-600 bg-yellow-50';
  return 'text-gray-600 bg-gray-50';
}

function getSuggestionIcon(type: string) {
  switch (type) {
    case 'TIME_SLOT': return <Clock className="h-5 w-5" />;
    case 'REPORTER': return <User className="h-5 w-5" />;
    case 'DURATION': return <Calendar className="h-5 w-5" />;
    case 'LOCATION': return <MapPin className="h-5 w-5" />;
    default: return <Lightbulb className="h-5 w-5" />;
  }
}

function getSuggestionTitle(type: string): string {
  switch (type) {
    case 'TIME_SLOT': return 'Suggested Time';
    case 'REPORTER': return 'Suggested Reporter';
    case 'DURATION': return 'Suggested Duration';
    case 'LOCATION': return 'Suggested Location';
    default: return 'Suggestion';
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SchedulingSuggestionCard({
  suggestion,
  onApply,
  onReject,
  onSelectAlternative,
  isApplying = false,
  userRole,
  showDetails = false,
}: SchedulingSuggestionCardProps) {
  const [expanded, setExpanded] = useState(showDetails);
  const [showAlternatives, setShowAlternatives] = useState(false);
  
  const canApply = ['ADMIN', 'AGENCY', 'COURT_REPORTER'].includes(userRole);
  const confidenceColor = getConfidenceColor(suggestion.confidenceScore);
  
  // Render the main suggestion value
  const renderSuggestionValue = () => {
    switch (suggestion.type) {
      case 'TIME_SLOT':
        if (!suggestion.recommendedStart || !suggestion.recommendedEnd) return null;
        return (
          <div className="space-y-1">
            <div className="font-medium">
              {formatDate(suggestion.recommendedStart)}
            </div>
            <div className="text-muted-foreground">
              {formatTime(suggestion.recommendedStart)} - {formatTime(suggestion.recommendedEnd)}
            </div>
          </div>
        );
        
      case 'REPORTER':
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="font-medium">{suggestion.recommendedReporterName}</span>
          </div>
        );
        
      case 'DURATION':
        return (
          <div className="font-medium">
            {formatDuration(suggestion.recommendedDuration || 0)}
          </div>
        );
        
      case 'LOCATION':
        return (
          <div className="font-medium">
            {suggestion.recommendedLocation}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card className="border-l-4 border-l-blue-400">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {getSuggestionTitle(suggestion.type)}
                <Badge className={cn('text-xs', confidenceColor)}>
                  {Math.round(suggestion.confidenceScore * 100)}% confidence
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                AI-powered suggestion based on availability and history
              </CardDescription>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Main suggestion value */}
        <div className="p-3 bg-gray-50 rounded-lg mb-3">
          {renderSuggestionValue()}
        </div>
        
        {/* Rationale */}
        <div className="space-y-1 mb-3">
          {suggestion.rationale.slice(0, expanded ? undefined : 2).map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
        
        {/* Expanded details */}
        {expanded && (
          <div className="space-y-3 border-t pt-3">
            {/* Factors */}
            {suggestion.factors && suggestion.factors.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Factors considered
                </h5>
                <div className="grid gap-2">
                  {suggestion.factors.map((factor, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{factor.description}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${factor.value * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12">
                          {Math.round(factor.value * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Alternatives */}
            {suggestion.alternatives && suggestion.alternatives.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className="mb-2"
                >
                  {showAlternatives ? 'Hide' : 'Show'} {suggestion.alternatives.length} alternatives
                </Button>
                
                {showAlternatives && (
                  <div className="space-y-2">
                    {suggestion.alternatives.map((alt, i) => (
                      <div
                        key={i}
                        className={cn(
                          'p-2 border rounded flex items-center justify-between',
                          'hover:bg-gray-50 cursor-pointer'
                        )}
                        onClick={() => onSelectAlternative?.(alt)}
                      >
                        <div className="text-sm">
                          {alt.start && (
                            <span>
                              {formatDate(alt.start)} {formatTime(alt.start)}
                            </span>
                          )}
                          {alt.reporterName && <span>{alt.reporterName}</span>}
                          <span className="text-muted-foreground ml-2">
                            ({alt.rationale})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(alt.confidenceScore * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground">
                  ℹ️ Suggestions are advisory only
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm max-w-xs">
                  This suggestion will not be applied automatically.
                  Click "Apply" to use this suggestion.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {canApply ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject?.(suggestion)}
                disabled={isApplying}
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={() => onApply?.(suggestion)}
                disabled={isApplying}
              >
                {isApplying ? (
                  '...'
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Apply
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">
              View only
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SUGGESTION LIST COMPONENT
// ============================================================

interface SuggestionListProps {
  suggestions: SchedulingSuggestion[];
  onApply?: (suggestion: SchedulingSuggestion) => void;
  onReject?: (suggestion: SchedulingSuggestion) => void;
  userRole: string;
  isLoading?: boolean;
}

export function SchedulingSuggestionList({
  suggestions,
  onApply,
  onReject,
  userRole,
  isLoading = false,
}: SuggestionListProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <div className="animate-pulse flex items-center justify-center gap-2">
          <Lightbulb className="h-5 w-5" />
          <span>Generating suggestions...</span>
        </div>
      </div>
    );
  }
  
  if (suggestions.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No suggestions available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <span>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available</span>
      </div>
      
      {suggestions.map((suggestion, i) => (
        <SchedulingSuggestionCard
          key={i}
          suggestion={suggestion}
          onApply={onApply}
          onReject={onReject}
          userRole={userRole}
        />
      ))}
    </div>
  );
}

// ============================================================
// INLINE SUGGESTION HINT
// ============================================================

interface SuggestionHintProps {
  message: string;
  confidence?: number;
  onClick?: () => void;
}

export function SuggestionHint({ message, confidence, onClick }: SuggestionHintProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs',
        'bg-blue-50 text-blue-700 border border-blue-200',
        onClick && 'cursor-pointer hover:bg-blue-100'
      )}
      onClick={onClick}
    >
      <Lightbulb className="h-3 w-3" />
      <span>{message}</span>
      {confidence !== undefined && (
        <Badge variant="outline" className="text-xs py-0">
          {Math.round(confidence * 100)}%
        </Badge>
      )}
    </div>
  );
}
