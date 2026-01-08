'use client';

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSIVE REVIEW LAYOUT
// Adapts scopist review interface for different screen sizes
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, AlertTriangle } from 'lucide-react';

interface ResponsiveReviewLayoutProps {
  audioPlayer: React.ReactNode;
  transcript: React.ReactNode;
  flaggedWords: React.ReactNode;
  className?: string;
}

export function ResponsiveReviewLayout({
  audioPlayer,
  transcript,
  flaggedWords,
  className,
}: ResponsiveReviewLayoutProps) {
  const [activeTab, setActiveTab] = useState('transcript');

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Audio Player - Always visible */}
      <div className="shrink-0 border-b">
        {audioPlayer}
      </div>

      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <div className="flex-1 overflow-hidden border-r">
          {transcript}
        </div>
        <div className="w-96 shrink-0 overflow-hidden">
          {flaggedWords}
        </div>
      </div>

      {/* Tablet Layout - Tabbed */}
      <div className="hidden md:block lg:hidden flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="flagged" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flagged Words
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transcript" className="flex-1 min-h-0 mt-0">
            {transcript}
          </TabsContent>
          <TabsContent value="flagged" className="flex-1 min-h-0 mt-0">
            {flaggedWords}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Layout - Sheet overlay */}
      <div className="md:hidden flex-1 min-h-0 relative">
        <div className="h-full overflow-hidden">
          {transcript}
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="absolute bottom-4 right-4 shadow-lg"
              size="lg"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Review Words
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            {flaggedWords}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default ResponsiveReviewLayout;
