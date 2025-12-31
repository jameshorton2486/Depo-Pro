'use client';

// =============================================================================
// LIVE NOTES CAPTURE COMPONENT
// Allows reporters to quickly add proper nouns during deposition
// =============================================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  User,
  Building2,
  MapPin,
  FileText,
  Scale,
  Heart,
  Code,
  Hash,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// Proper noun categories matching Prisma enum
type ProperNounCategory =
  | 'PERSON_NAME'
  | 'COMPANY_NAME'
  | 'PLACE_NAME'
  | 'PRODUCT_NAME'
  | 'LEGAL_TERM'
  | 'MEDICAL_TERM'
  | 'TECHNICAL_TERM'
  | 'ACRONYM'
  | 'OTHER';

interface CSRProperNoun {
  id: string;
  value: string;
  category: ProperNounCategory;
  phoneticHint: string | null;
  priority: number;
  useInTranscription: boolean;
  createdAt: string;
}

interface LiveNotesCaptureProps {
  jobId: string;
}

const CATEGORY_CONFIG: Record<ProperNounCategory, { label: string; icon: typeof User }> = {
  PERSON_NAME: { label: 'Person Name', icon: User },
  COMPANY_NAME: { label: 'Company Name', icon: Building2 },
  PLACE_NAME: { label: 'Place Name', icon: MapPin },
  PRODUCT_NAME: { label: 'Product Name', icon: FileText },
  LEGAL_TERM: { label: 'Legal Term', icon: Scale },
  MEDICAL_TERM: { label: 'Medical Term', icon: Heart },
  TECHNICAL_TERM: { label: 'Technical Term', icon: Code },
  ACRONYM: { label: 'Acronym', icon: Hash },
  OTHER: { label: 'Other', icon: HelpCircle },
};

export function LiveNotesCapture({ jobId }: LiveNotesCaptureProps) {
  const [properNouns, setProperNouns] = useState<CSRProperNoun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProperNounCategory | 'ALL'>('ALL');

  // Form state
  const [formValue, setFormValue] = useState('');
  const [formCategory, setFormCategory] = useState<ProperNounCategory>('PERSON_NAME');
  const [formPhoneticHint, setFormPhoneticHint] = useState('');
  const [formPriority, setFormPriority] = useState(0);

  // Load proper nouns
  useEffect(() => {
    loadProperNouns();
  }, [jobId]);

  async function loadProperNouns() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/jobs/${jobId}/proper-nouns`);
      if (!response.ok) throw new Error('Failed to load proper nouns');
      const data = await response.json();
      setProperNouns(data.properNouns || []);
    } catch (error) {
      console.error('Error loading proper nouns:', error);
      toast.error('Failed to load proper nouns');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        // Update existing
        const response = await fetch(`/api/jobs/${jobId}/proper-nouns/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: formValue.trim(),
            category: formCategory,
            phoneticHint: formPhoneticHint.trim() || null,
            priority: formPriority,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update');
        }

        toast.success('Proper noun updated');
        setEditingId(null);
      } else {
        // Create new
        const response = await fetch(`/api/jobs/${jobId}/proper-nouns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: formValue.trim(),
            category: formCategory,
            phoneticHint: formPhoneticHint.trim() || null,
            priority: formPriority,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create');
        }

        toast.success('Proper noun added');
      }

      // Reset form
      setFormValue('');
      setFormPhoneticHint('');
      setFormPriority(0);
      setFormCategory('PERSON_NAME');

      // Reload list
      await loadProperNouns();
    } catch (error: any) {
      console.error('Error saving proper noun:', error);
      toast.error(error.message || 'Failed to save proper noun');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(noun: CSRProperNoun) {
    setEditingId(noun.id);
    setFormValue(noun.value);
    setFormCategory(noun.category);
    setFormPhoneticHint(noun.phoneticHint || '');
    setFormPriority(noun.priority);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setFormValue('');
    setFormPhoneticHint('');
    setFormPriority(0);
    setFormCategory('PERSON_NAME');
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this proper noun?')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/proper-nouns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Proper noun deleted');
      await loadProperNouns();
    } catch (error) {
      console.error('Error deleting proper noun:', error);
      toast.error('Failed to delete proper noun');
    }
  }

  // Filter proper nouns
  const filteredNouns = properNouns.filter((noun) => {
    const matchesSearch = noun.value.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || noun.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Notes Capture</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add proper nouns as they're mentioned during the deposition
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Add Form */}
        <form onSubmit={handleSubmit} className="space-y-3 border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="value">Proper Noun *</Label>
              <Input
                id="value"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="e.g., Dr. Martinez"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ProperNounCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phoneticHint">Phonetic Hint (optional)</Label>
              <Input
                id="phoneticHint"
                value={formPhoneticHint}
                onChange={(e) => setFormPhoneticHint(e.target.value)}
                placeholder="e.g., mar-TEE-nez"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="100"
                value={formPriority}
                onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher priority terms get boosted in transcription
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || !formValue.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Filters */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search proper nouns..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="w-48">
            <Label htmlFor="categoryFilter">Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as ProperNounCategory | 'ALL')}
            >
              <SelectTrigger id="categoryFilter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNouns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {properNouns.length === 0
              ? 'No proper nouns added yet. Add one above to get started.'
              : 'No proper nouns match your filters.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredNouns.map((noun) => {
              const config = CATEGORY_CONFIG[noun.category];
              const Icon = config.icon;
              return (
                <div
                  key={noun.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{noun.value}</span>
                      {noun.phoneticHint && (
                        <span className="text-sm text-muted-foreground">
                          ({noun.phoneticHint})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{config.label}</span>
                      {noun.priority > 0 && <span>Priority: {noun.priority}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(noun)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(noun.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {properNouns.length > 0 && (
          <div className="text-sm text-muted-foreground text-center pt-2 border-t">
            {filteredNouns.length} of {properNouns.length} proper nouns
          </div>
        )}
      </CardContent>
    </Card>
  );
}
