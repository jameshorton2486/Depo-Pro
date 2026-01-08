// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.3: ATTORNEY CASES LIST PAGE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/(dashboard)/attorney/cases/page.tsx
// Case list with filtering, search, and pagination for attorneys
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { debounce } from 'lodash';
import {
  Search,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Types
interface CaseItem {
  id: string;
  caseNumber: string;
  caseStyle: string;
  shortTitle?: string;
  status: string;
  caseType?: string;
  courtName?: string;
  courtType?: string;
  county?: string;
  state: string;
  judgeAssigned?: string;
  firm?: { id: string; name: string };
  myRole: string;
  recentJobs: Array<{
    id: string;
    caseName: string;
    depositionDate: string;
    deponentName?: string;
    status: string;
    hasTranscript: boolean;
  }>;
  attorneys: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    firmName?: string;
  }>;
  counts: {
    jobs: number;
    attorneys: number;
    extractedTerms: number;
    sourceDocuments: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Filters {
  search: string;
  status: string;
  caseType: string;
  role: string;
  courtType: string;
  state: string;
  hasTranscripts: boolean;
  dateFrom: string;
  dateTo: string;
}

const CASE_STATUSES = ['ACTIVE', 'CLOSED', 'SETTLED', 'ARCHIVED'];
const CASE_TYPES = ['CIVIL', 'CRIMINAL', 'FAMILY', 'PROBATE', 'BANKRUPTCY', 'ADMINISTRATIVE', 'ARBITRATION', 'OTHER'];
const ATTORNEY_ROLES = ['PLAINTIFF', 'DEFENDANT', 'CO_COUNSEL', 'OBSERVER'];
const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

export default function AttorneyCasesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    caseType: searchParams.get('caseType') || '',
    role: searchParams.get('role') || '',
    courtType: searchParams.get('courtType') || '',
    state: searchParams.get('state') || '',
    hasTranscripts: searchParams.get('hasTranscripts') === 'true',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  });

  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));

  const [searchInput, setSearchInput] = useState(filters.search);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setFilters((prev) => ({ ...prev, search: value }));
      setCurrentPage(1);
    }, 300),
    []
  );

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchCases();
    }
  }, [isLoading, filters, sortBy, sortOrder, currentPage]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.caseType) params.set('caseType', filters.caseType);
      if (filters.role) params.set('role', filters.role);
      if (filters.courtType) params.set('courtType', filters.courtType);
      if (filters.state) params.set('state', filters.state);
      if (filters.hasTranscripts) params.set('hasTranscripts', 'true');
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      // Update URL without reload
      router.replace(`/attorney/cases?${params.toString()}`, { scroll: false });

      const response = await fetch(`/api/attorney/cases?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to load cases');
      }

      const data = await response.json();
      setCases(data.cases);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      caseType: '',
      role: '',
      courtType: '',
      state: '',
      hasTranscripts: false,
      dateFrom: '',
      dateTo: '',
    });
    setSearchInput('');
    setCurrentPage(1);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'search'
  ).length;

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return <CasesListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
          <p className="text-muted-foreground">
            {pagination ? `${pagination.totalCount} cases` : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases, numbers, parties..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {CASE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.caseType}
            onValueChange={(value) => handleFilterChange('caseType', value)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {CASE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Filters Sheet */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Cases</SheetTitle>
                <SheetDescription>
                  Narrow down your case list with advanced filters
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6">
                {/* Role Filter */}
                <div className="space-y-2">
                  <Label>My Role in Case</Label>
                  <Select
                    value={filters.role}
                    onValueChange={(value) => handleFilterChange('role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Role</SelectItem>
                      {ATTORNEY_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State Filter */}
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={filters.state}
                    onValueChange={(value) => handleFilterChange('state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All states" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All States</SelectItem>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Court Type */}
                <div className="space-y-2">
                  <Label>Court Type</Label>
                  <Input
                    placeholder="e.g., District Court"
                    value={filters.courtType}
                    onChange={(e) => handleFilterChange('courtType', e.target.value)}
                  />
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Created Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    />
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    />
                  </div>
                </div>

                {/* Has Transcripts */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasTranscripts"
                    checked={filters.hasTranscripts}
                    onCheckedChange={(checked) =>
                      handleFilterChange('hasTranscripts', checked)
                    }
                  />
                  <Label htmlFor="hasTranscripts">Only cases with transcripts</Label>
                </div>
              </div>

              <SheetFooter>
                <Button variant="outline" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Clear filters button */}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toggleSort('updatedAt')}>
              Last Updated {sortBy === 'updatedAt' && (sortOrder === 'desc' ? '↓' : '↑')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleSort('createdAt')}>
              Created Date {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleSort('caseNumber')}>
              Case Number {sortBy === 'caseNumber' && (sortOrder === 'desc' ? '↓' : '↑')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleSort('caseStyle')}>
              Case Name {sortBy === 'caseStyle' && (sortOrder === 'desc' ? '↓' : '↑')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchCases}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cases List */}
      {loading ? (
        <CasesListSkeleton />
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No cases found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || activeFilterCount > 0
                  ? 'Try adjusting your search or filters'
                  : "You'll see cases here once you're added to one"}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pagination.limit + 1} to{' '}
            {Math.min(currentPage * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} cases
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Case Card Component
function CaseCard({ caseItem }: { caseItem: CaseItem }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Link
                  href={`/attorney/cases/${caseItem.id}`}
                  className="font-semibold text-lg hover:underline line-clamp-1"
                >
                  {caseItem.shortTitle || caseItem.caseStyle}
                </Link>
                <p className="text-sm text-muted-foreground">{caseItem.caseNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={caseItem.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {caseItem.status}
                </Badge>
                {caseItem.caseType && (
                  <Badge variant="outline">{caseItem.caseType}</Badge>
                )}
              </div>
            </div>

            {/* Court Info */}
            {caseItem.courtName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Building2 className="h-4 w-4" />
                <span>{caseItem.courtName}</span>
                {caseItem.judgeAssigned && (
                  <>
                    <span>•</span>
                    <span>Judge {caseItem.judgeAssigned}</span>
                  </>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{caseItem.counts.jobs} depositions</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{caseItem.counts.attorneys} attorneys</span>
              </div>
              {caseItem.myRole && (
                <Badge variant="outline" className="text-xs">
                  {caseItem.myRole.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>

          {/* Recent Jobs */}
          {caseItem.recentJobs.length > 0 && (
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                RECENT DEPOSITIONS
              </p>
              <div className="space-y-2">
                {caseItem.recentJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {job.deponentName || job.caseName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {format(new Date(job.depositionDate), 'MMM d')}
                    </span>
                    {job.hasTranscript && (
                      <Eye className="h-3 w-3 text-green-500 ml-1" aria-label="Transcript available" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/attorney/cases/${caseItem.id}`}>View Details</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/attorney/cases/${caseItem.id}/transcripts`}>
              <FileText className="h-4 w-4 mr-2" />
              Transcripts
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function CasesListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-64 mb-2" />
                  <Skeleton className="h-4 w-32 mb-3" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
