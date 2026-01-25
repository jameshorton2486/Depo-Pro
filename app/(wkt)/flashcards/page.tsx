'use client';

// ═══════════════════════════════════════════════════════════════
// WKT FLASHCARDS - DECK SELECTION
// ═══════════════════════════════════════════════════════════════

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WKTCategory } from '@/types/wkt';

const DECKS = [
  { category: 'medical_terminology' as WKTCategory, icon: '🏥', name: 'Medical Terminology', cards: 50 },
  { category: 'legal_terminology' as WKTCategory, icon: '⚖️', name: 'Legal Terminology', cards: 50 },
  { category: 'grammar_usage' as WKTCategory, icon: '📖', name: 'Grammar & Usage', cards: 45 },
  { category: 'spelling' as WKTCategory, icon: '✏️', name: 'Spelling', cards: 45 },
  { category: 'texas_rules' as WKTCategory, icon: '📋', name: 'Texas Rules', cards: 60 },
  { category: 'reporter_duties' as WKTCategory, icon: '💼', name: 'Reporter Duties', cards: 50 },
  { id: 'bookmarked', icon: '⭐', name: 'Bookmarked Questions', cards: 0 },
  { id: 'review', icon: '🔄', name: 'Due for Review', cards: 0 },
];

export default function FlashcardsPage() {
  function handleStudy(_deck: typeof DECKS[0]) {
    alert('Flashcard study coming soon!');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Flashcards</h1>
        <p className="text-muted-foreground">
          Study with spaced repetition flashcards
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {DECKS.map((deck) => (
          <Card key={deck.id || deck.category} className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">{deck.icon}</div>
              <CardTitle className="text-lg">
                {deck.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {deck.cards} cards
              </p>
              <Button
                onClick={() => handleStudy(deck)}
                className="w-full"
                variant="outline"
              >
                Study
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
