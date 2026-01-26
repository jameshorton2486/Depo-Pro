'use client';

// ═══════════════════════════════════════════════════════════════
// WKT PRACTICE MODE
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Filter, CheckCircle2, XCircle } from 'lucide-react';
import type { WKTQuestion, WKTCategory } from '@/types/wkt';
import { CATEGORY_INFO } from '@/types/wkt';
import { PracticeSkeleton, QuestionSkeleton } from '@/components/wkt/loading-skeleton';
import { ErrorMessage } from '@/components/wkt/error-message';
import { NoQuestionsFound } from '@/components/wkt/empty-state';

type PracticeResult = {
  correct: boolean;
  correctAnswer?: string;
  explanation?: string | null;
};

export default function PracticePage() {
  const [questions, setQuestions] = useState<WKTQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    categories: Object.keys(CATEGORY_INFO) as WKTCategory[],
    difficulty: 'all' as 'all' | '1' | '2' | '3' | '4' | '5',
    missedOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadQuestions = useCallback(async (isMountedRef: { current: boolean }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wkt/questions/random?count=10');
      if (!response.ok) {
        throw new Error('Failed to load questions');
      }
      const data = await response.json();
      if (isMountedRef.current) {
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setIsCorrect(null);
        setResult(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const isMountedRef = { current: true };

    loadQuestions(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadQuestions]);

  const currentQuestion = questions[currentIndex];
  const categoryInfo = currentQuestion ? CATEGORY_INFO[currentQuestion.category] : null;

  async function handleSubmit() {
    if (!selectedAnswer || !currentQuestion) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/wkt/questions/${currentQuestion.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: selectedAnswer }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = (await response.json()) as PracticeResult;
      setResult(data);
      setIsCorrect(data.correct);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setIsCorrect(null);
      setResult(null);
    }
  }

  function handleCategoryToggle(category: WKTCategory) {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }

  function resetFilters() {
    setFilters({
      categories: Object.keys(CATEGORY_INFO) as WKTCategory[],
      difficulty: 'all',
      missedOnly: false,
    });
  }

  if (isLoading && questions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <PracticeSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-6">
        {/* Sidebar Filters (Desktop) */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Categories */}
              <div>
                <Label className="mb-3 block">Categories</Label>
                <div className="space-y-2">
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${key}`}
                        checked={filters.categories.includes(key as WKTCategory)}
                        onCheckedChange={() =>
                          handleCategoryToggle(key as WKTCategory)
                        }
                      />
                      <Label
                        htmlFor={`category-${key}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {info.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <Label className="mb-3 block">Difficulty</Label>
                <RadioGroup
                  value={filters.difficulty}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      difficulty: value as typeof filters.difficulty,
                    }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="diff-all" />
                    <Label htmlFor="diff-all" className="cursor-pointer">
                      All
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="diff-1" />
                    <Label htmlFor="diff-1" className="cursor-pointer">
                      Easy
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="diff-2" />
                    <Label htmlFor="diff-2" className="cursor-pointer">
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="diff-3" />
                    <Label htmlFor="diff-3" className="cursor-pointer">
                      Hard
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Missed Only */}
              <div className="flex items-center justify-between">
                <Label htmlFor="missed-only">Show missed only</Label>
                <Switch
                  id="missed-only"
                  checked={filters.missedOnly}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({ ...prev, missedOnly: checked }))
                  }
                />
              </div>

              <Button variant="outline" onClick={resetFilters} className="w-full">
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Mobile Filters Button */}
          <div className="md:hidden mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Loading questions...'
                : `Question ${currentIndex + 1} of ${questions.length}`}
            </p>
          </div>

          {/* Question Card */}
          {isLoading ? (
            <QuestionSkeleton />
          ) : error ? (
            <ErrorMessage
              message={error}
              onRetry={() => loadQuestions({ current: true })}
            />
          ) : !currentQuestion ? (
            <NoQuestionsFound
              onAction={() => {
                resetFilters();
                loadQuestions({ current: true });
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {currentQuestion.question_text}
                  </CardTitle>
                  {categoryInfo && (
                    <Badge
                      style={{
                        backgroundColor: `var(--${categoryInfo.color}-500)`,
                        color: 'white',
                      }}
                    >
                      {categoryInfo.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isSubmitted ? (
                  <>
                    <RadioGroup
                      value={selectedAnswer || ''}
                      onValueChange={setSelectedAnswer}
                    >
                      {currentQuestion.options?.map((option, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={option}
                            id={`option-${idx}`}
                          />
                          <Label
                            htmlFor={`option-${idx}`}
                            className="flex-1 cursor-pointer text-lg"
                          >
                            {String.fromCharCode(65 + idx)}. {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    <Button
                      onClick={handleSubmit}
                      disabled={!selectedAnswer || isSubmitting}
                      className="w-full"
                      size="lg"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      className={`flex items-center gap-2 p-4 rounded-lg ${
                        isCorrect
                          ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                      <span
                        className={`font-medium ${
                          isCorrect
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}
                      >
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                      </span>
                    </div>

                    {!isCorrect && result?.correctAnswer && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="font-medium mb-1">Correct Answer:</p>
                        <p>{result.correctAnswer}</p>
                      </div>
                    )}

                    {(result?.explanation || currentQuestion.explanation) && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="font-medium mb-1">Explanation:</p>
                        <p>{result?.explanation || currentQuestion.explanation}</p>
                      </div>
                    )}

                    {currentIndex < questions.length - 1 ? (
                      <Button onClick={handleNext} className="w-full" size="lg">
                        Next Question
                      </Button>
                    ) : (
                      <div className="text-center space-y-2">
                        <p className="text-muted-foreground">
                          You've completed all questions!
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCurrentIndex(0);
                            setSelectedAnswer(null);
                            setIsSubmitted(false);
                            setIsCorrect(null);
                          }}
                        >
                          Start Over
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
