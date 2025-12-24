// ═══════════════════════════════════════════════════════════════
// DICTIONARY MANAGEMENT CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Edit, Trash2, Search, X } from 'lucide-react';

type TermCategory = 'MEDICAL' | 'LEGAL' | 'TECHNICAL' | 'NAME' | 'PLACE' | 'OTHER' | null;

interface DictionaryTerm {
  id: string;
  term: string;
  phonetic: string | null;
  notes: string | null;
  category: TermCategory;
  createdAt: Date;
  addedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface DictionaryManagementProps {
  jobId: string;
  terms: DictionaryTerm[];
  canAdd: boolean;
  canEdit: boolean;
}

const categoryColors: Record<string, string> = {
  MEDICAL: 'bg-red-100 text-red-800',
  LEGAL: 'bg-blue-100 text-blue-800',
  TECHNICAL: 'bg-purple-100 text-purple-800',
  NAME: 'bg-green-100 text-green-800',
  PLACE: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export function DictionaryManagement({
  jobId,
  terms: initialTerms,
  canAdd,
  canEdit,
}: DictionaryManagementProps) {
  const router = useRouter();
  const terms = initialTerms;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    term: '',
    phonetic: '',
    notes: '',
    category: 'OTHER' as string,
  });

  const resetForm = () => {
    setFormData({ term: '', phonetic: '', notes: '', category: 'OTHER' });
    setShowAddForm(false);
    setEditingTerm(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/jobs/${jobId}/dictionary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: formData.term,
          phonetic: formData.phonetic || undefined,
          notes: formData.notes || undefined,
          category: formData.category !== 'OTHER' ? formData.category : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add term');
      }

      router.refresh();
      resetForm();
      toast.success('Term added successfully');
    } catch (error) {
      console.error('Add term error:', error);
      toast.error('Failed to add term');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (termId: string) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/dictionary/${termId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: formData.term,
          phonetic: formData.phonetic || null,
          notes: formData.notes || null,
          category: formData.category !== 'OTHER' ? formData.category : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update term');
      }

      router.refresh();
      resetForm();
      toast.success('Term updated successfully');
    } catch (error) {
      console.error('Update term error:', error);
      toast.error('Failed to update term');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this term?')) {
      return;
    }

    try {
      const response = await fetch(`/api/dictionary/${termId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete term');
      }

      router.refresh();
      toast.success('Term deleted successfully');
    } catch (error) {
      console.error('Delete term error:', error);
      toast.error('Failed to delete term');
    }
  };

  const startEdit = (term: DictionaryTerm) => {
    setFormData({
      term: term.term,
      phonetic: term.phonetic || '',
      notes: term.notes || '',
      category: term.category || 'OTHER',
    });
    setEditingTerm(term.id);
    setShowAddForm(true);
  };

  // Filter terms
  const filteredTerms = terms.filter((term) => {
    const matchesSearch =
      term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (term.notes && term.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      categoryFilter === 'ALL' || term.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Dictionary ({filteredTerms.length})
          </CardTitle>
          {canAdd && !showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Term
            </Button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="MEDICAL">Medical</SelectItem>
              <SelectItem value="LEGAL">Legal</SelectItem>
              <SelectItem value="TECHNICAL">Technical</SelectItem>
              <SelectItem value="NAME">Name</SelectItem>
              <SelectItem value="PLACE">Place</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Add/Edit Form */}
        {showAddForm && (
          <form onSubmit={editingTerm ? (e) => { e.preventDefault(); handleUpdate(editingTerm); } : handleAdd} className="mb-6 p-4 border rounded-lg bg-accent/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editingTerm ? 'Edit Term' : 'Add New Term'}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="term">Term *</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  required
                  placeholder="Enter term"
                />
              </div>

              <div>
                <Label htmlFor="phonetic">Phonetic Spelling</Label>
                <Input
                  id="phonetic"
                  value={formData.phonetic}
                  onChange={(e) => setFormData({ ...formData, phonetic: e.target.value })}
                  placeholder="e.g., foh-NET-ik"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEDICAL">Medical</SelectItem>
                    <SelectItem value="LEGAL">Legal</SelectItem>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="NAME">Name</SelectItem>
                    <SelectItem value="PLACE">Place</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional context or definition"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !formData.term}>
                  {loading ? 'Saving...' : editingTerm ? 'Update Term' : 'Add Term'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Terms List */}
        {filteredTerms.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== 'ALL'
                ? 'No terms match your filters'
                : 'No dictionary terms yet'}
            </p>
            {canAdd && !showAddForm && (
              <Button
                onClick={() => setShowAddForm(true)}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Add your first term
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTerms.map((term) => (
              <div
                key={term.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{term.term}</span>
                    {term.phonetic && (
                      <span className="text-sm text-muted-foreground">({term.phonetic})</span>
                    )}
                    {term.category && (
                      <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[term.category]}`}>
                        {term.category}
                      </span>
                    )}
                  </div>
                  {term.notes && (
                    <p className="text-sm text-muted-foreground">{term.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Added by {term.addedBy.name}
                  </p>
                </div>

                {canEdit && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(term)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(term.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
