"use client";

import * as React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchCommandActions, type UserRole } from "./command-actions";
import {
  FileText,
  Calendar,
  Plus,
  Settings,
  Users,
  CreditCard,
  BarChart3,
  Briefcase,
  Search,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "New Job": Plus,
  "My Jobs": FileText,
  "Assigned Jobs": FileText,
  "Calendar": Calendar,
  "Dashboard": BarChart3,
  "Admin Dashboard": BarChart3,
  "Settings": Settings,
  "Users": Users,
  "Billing": CreditCard,
  "RX Queue": FileText,
  "Transcripts": FileText,
  "Cases": Briefcase,
};

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const role = (user?.user_metadata?.role as UserRole) ?? null;
  const _session = user && role ? { user: { id: user.id, email: user.email || '', role, name: null } } : null;

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (controlledOnOpenChange) {
          controlledOnOpenChange(!isOpen);
        } else {
          setOpen((prev) => !prev);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [controlledOnOpenChange, isOpen]);

  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<{
    jobs: Array<{ id: string; title: string; href: string }>;
    transcripts: Array<{ id: string; title: string; href: string }>;
  }>({ jobs: [], transcripts: [] });
  const [isSearching, setIsSearching] = React.useState(false);

  // Global search for jobs and transcripts
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults({ jobs: [], transcripts: [] });
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        // Search jobs
        const jobsResponse = await fetch(`/api/jobs?search=${encodeURIComponent(search)}&limit=5`);
        const jobsData = jobsResponse.ok ? await jobsResponse.json() : { jobs: [] };

        // Search transcripts (if API exists)
        let transcriptsData = { transcripts: [] };
        try {
          const transcriptsResponse = await fetch(`/api/transcripts?search=${encodeURIComponent(search)}&limit=5`);
          if (transcriptsResponse.ok) {
            transcriptsData = await transcriptsResponse.json();
          }
        } catch (_e) {
          // Transcript search API might not exist yet
        }

        setSearchResults({
          jobs: (jobsData.jobs || []).map((job: any) => ({
            id: job.id,
            title: job.caseName || `Job ${job.id}`,
            href: `/jobs/${job.id}`,
          })),
          transcripts: (transcriptsData.transcripts || []).map((t: any) => ({
            id: t.id,
            title: t.job?.caseName || `Transcript ${t.id}`,
            href: `/jobs/${t.jobId}/review`,
          })),
        });
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults({ jobs: [], transcripts: [] });
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  const filteredActions = React.useMemo(() => {
    return searchCommandActions(role, search);
  }, [role, search]);

  // Group actions by group
  const groupedActions = React.useMemo(() => {
    const groups: Record<string, typeof filteredActions> = {};
    filteredActions.forEach((action) => {
      if (!groups[action.group]) {
        groups[action.group] = [];
      }
      groups[action.group].push(action);
    });
    return groups;
  }, [filteredActions]);

  const handleSelect = React.useCallback(
    (href: string) => {
      router.push(href);
      if (controlledOnOpenChange) {
        controlledOnOpenChange(false);
      } else {
        setOpen(false);
      }
      setSearch("");
    },
    [router, controlledOnOpenChange]
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(open);
    } else {
      setOpen(open);
    }
  }, [controlledOnOpenChange]);

  return (
    <CommandDialog open={isOpen} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Type a command or search…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {isSearching && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Search className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {/* Global Search Results */}
        {(searchResults.jobs.length > 0 || searchResults.transcripts.length > 0) && !isSearching && (
          <>
            {searchResults.jobs.length > 0 && (
              <CommandGroup heading="Jobs">
                {searchResults.jobs.map((job) => (
                  <CommandItem
                    key={job.id}
                    value={job.title}
                    onSelect={() => handleSelect(job.href)}
                    className="cursor-pointer"
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>{job.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Job
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults.transcripts.length > 0 && (
              <>
                {searchResults.jobs.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Transcripts">
                  {searchResults.transcripts.map((transcript) => (
                    <CommandItem
                      key={transcript.id}
                      value={transcript.title}
                      onSelect={() => handleSelect(transcript.href)}
                      className="cursor-pointer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>{transcript.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Transcript
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
          </>
        )}

        {/* Navigation Actions */}
        {Object.entries(groupedActions).map(([groupName, actions], groupIndex) => (
          <React.Fragment key={groupName}>
            <CommandGroup heading={groupName}>
              {actions.map((action) => {
                const Icon = iconMap[action.label] || Search;
                return (
                  <CommandItem
                    key={action.href}
                    value={action.label}
                    onSelect={() => handleSelect(action.href)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{action.label}</span>
                    {action.href && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {action.href}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {groupIndex < Object.keys(groupedActions).length - 1 && (
              <CommandSeparator />
            )}
          </React.Fragment>
        ))}

        <CommandEmpty>
          {search ? 'No results found.' : 'Type to search commands, jobs, or transcripts...'}
        </CommandEmpty>
      </CommandList>
    </CommandDialog>
  );
}
