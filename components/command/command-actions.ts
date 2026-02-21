/**
 * Command Palette Actions
 * Role-aware navigation actions for ⌘K / Ctrl+K command palette
 */

export type UserRole = 'REPORTER' | 'SCOPIST' | 'ADMIN' | 'ATTORNEY' | 'PARALEGAL' | 'AGENCY' | 'AGENCY_ADMIN' | 'FIRM_ADMIN';

export interface CommandAction {
  label: string;
  href: string;
  icon?: string;
  keywords?: string[];
  group: string;
}

export const COMMAND_ACTIONS: Record<UserRole, CommandAction[]> = {
  REPORTER: [
    { label: "New Job", href: "/jobs/new", group: "Navigation", keywords: ["create", "new", "add"] },
    { label: "My Jobs", href: "/jobs", group: "Navigation", keywords: ["jobs", "list", "all"] },
    { label: "Calendar", href: "/calendar", group: "Navigation", keywords: ["schedule", "events"] },
    { label: "Dashboard", href: "/reporter", group: "Navigation", keywords: ["home", "overview"] },
    { label: "Transcript Editor", href: "/jobs", group: "Transcript", keywords: ["editor", "transcript", "edit"] },
    { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
  SCOPIST: [
    { label: "Assigned Jobs", href: "/scopist", group: "Navigation", keywords: ["jobs", "queue", "assigned"] },
    { label: "Calendar", href: "/calendar", group: "Navigation", keywords: ["schedule", "events"] },
    { label: "Transcript Review", href: "/scopist", group: "Transcript", keywords: ["review", "transcript", "edit"] },
    { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
  ADMIN: [
    { label: "Admin Dashboard", href: "/admin", group: "Navigation", keywords: ["overview", "stats"] },
    { label: "Users", href: "/admin/users", group: "Administration", keywords: ["user", "management"] },
    { label: "Billing", href: "/billing", group: "Administration", keywords: ["invoice", "payments"] },
    { label: "RX Queue", href: "/admin/rx-queue", group: "Administration", keywords: ["audio", "enhancement"] },
    { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
  ATTORNEY: [
    { label: "Dashboard", href: "/attorney/attorney-dashboard", group: "Navigation", keywords: ["home", "overview"] },
    { label: "Transcripts", href: "/attorney/transcripts", group: "Navigation", keywords: ["transcripts", "documents"] },
    { label: "Cases", href: "/attorney/cases", group: "Navigation", keywords: ["cases", "matters"] },
    { label: "Settings", href: "/attorney/settings", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
  PARALEGAL: [
    { label: "Dashboard", href: "/dashboard", group: "Navigation", keywords: ["home", "overview"] },
    { label: "Cases", href: "/attorney/cases", group: "Navigation", keywords: ["cases", "matters"] },
    { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
  AGENCY: [
    { label: "Dashboard", href: "/dashboard", group: "Navigation", keywords: ["home", "overview"] },
    { label: "Jobs", href: "/jobs", group: "Navigation", keywords: ["jobs", "list"] },
    { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
  AGENCY_ADMIN: [
    { label: "Admin Dashboard", href: "/admin", group: "Navigation", keywords: ["overview", "stats"] },
    { label: "Users", href: "/admin/users", group: "Administration", keywords: ["user", "management"] },
    { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
  FIRM_ADMIN: [
    { label: "Admin Dashboard", href: "/admin", group: "Navigation", keywords: ["overview", "stats"] },
    { label: "Billing", href: "/billing", group: "Administration", keywords: ["invoice", "payments"] },
    { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
  ],
};

const MINIMAL_ACTIONS: CommandAction[] = [
  { label: "Dashboard", href: "/dashboard", group: "Navigation", keywords: ["home", "overview"] },
  { label: "Settings", href: "/settings/profile", group: "Navigation", keywords: ["profile", "preferences"] },
];

/**
 * Get command actions for a specific role.
 * Returns minimal actions for unknown/unassigned roles (no elevation).
 */
export function getCommandActions(role: UserRole | null | undefined): CommandAction[] {
  if (!role || !(role in COMMAND_ACTIONS)) {
    return MINIMAL_ACTIONS;
  }
  return COMMAND_ACTIONS[role as UserRole];
}

/**
 * Search command actions by query
 */
export function searchCommandActions(
  role: UserRole | null | undefined,
  query: string
): CommandAction[] {
  const actions = getCommandActions(role);
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) return actions;

  return actions.filter((action) => {
    const labelMatch = action.label.toLowerCase().includes(lowerQuery);
    const keywordMatch = action.keywords?.some((keyword) =>
      keyword.toLowerCase().includes(lowerQuery)
    );
    return labelMatch || keywordMatch;
  });
}
