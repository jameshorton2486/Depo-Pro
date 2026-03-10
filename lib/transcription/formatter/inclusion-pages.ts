export interface InclusionPageParticipant {
  role?: string | null;
  full_name?: string | null;
  firm_name?: string | null;
  address_lines?: string[];
}

export interface InclusionPageIndexEntry {
  title: string;
  page_number: number | null;
}

export interface InclusionPageInput {
  caseName: string;
  causeNumber?: string | null;
  deponentName?: string | null;
  depositionDate?: string | Date | null;
  county?: string | null;
  reporterName?: string | null;
  reporterCsrNumber?: string | null;
  reporterExpiration?: string | null;
  participants?: InclusionPageParticipant[];
  examinationIndex?: InclusionPageIndexEntry[];
  exhibitIndex?: InclusionPageIndexEntry[];
}

export interface InclusionPages {
  title: string;
  appearance: string;
  index: string;
  certification: string;
}

export async function generateInclusionPages(
  input: InclusionPageInput
): Promise<InclusionPages> {
  return {
    title: buildTitlePage(input),
    appearance: buildAppearancePage(input),
    index: buildIndexPage(input),
    certification: buildCertificationPage(input),
  };
}

function buildTitlePage(input: InclusionPageInput): string {
  return [
    center(input.caseName || 'Untitled Case'),
    input.causeNumber ? center(`Cause No. ${input.causeNumber}`) : '',
    '',
    input.deponentName ? center(`DEPOSITION OF ${input.deponentName.toUpperCase()}`) : '',
    input.depositionDate ? center(formatLongDate(input.depositionDate)) : '',
  ]
    .filter((line, index, arr) => line || (index > 0 && arr[index - 1]))
    .join('\n');
}

function buildAppearancePage(input: InclusionPageInput): string {
  const lines = [center('APPEARANCES')];
  const participants = input.participants ?? [];

  if (participants.length === 0) {
    lines.push('', 'No appearance information available.');
    return lines.join('\n');
  }

  for (const participant of participants) {
    lines.push('');
    if (participant.role) {
      lines.push(`${normalizeRoleLabel(participant.role)}:`);
    }
    if (participant.full_name) {
      lines.push(participant.full_name.toUpperCase());
    }
    if (participant.firm_name) {
      lines.push(participant.firm_name);
    }
    for (const line of participant.address_lines ?? []) {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

function buildIndexPage(input: InclusionPageInput): string {
  const lines = [center('INDEX'), '', `WITNESS: ${input.deponentName ?? 'UNKNOWN'}`, `${'PAGE'.padStart(46)}`];

  const entries = [...(input.examinationIndex ?? [])];
  if ((input.exhibitIndex?.length ?? 0) > 0) {
    entries.push({ title: 'EXHIBITS', page_number: null }, ...(input.exhibitIndex ?? []));
  }

  if (entries.length === 0) {
    lines.push('No examination index available.');
    return lines.join('\n');
  }

  for (const entry of entries) {
    if (entry.page_number === null) {
      lines.push(entry.title);
      continue;
    }

    const dots = '.'.repeat(Math.max(3, 52 - entry.title.length - String(entry.page_number).length));
    lines.push(`${entry.title}${dots}${String(entry.page_number).padStart(3)}`);
  }

  return lines.join('\n');
}

function buildCertificationPage(input: InclusionPageInput): string {
  const reporterName = input.reporterName ?? 'Unknown Reporter';
  const csrNumber = input.reporterCsrNumber ?? '________';
  const depositionDate = input.depositionDate ? formatLongDate(input.depositionDate) : '________';
  const county = (input.county ?? '________').toUpperCase();

  return [
    "REPORTER'S CERTIFICATION",
    'STATE OF TEXAS',
    `COUNTY OF ${county}`,
    '',
    `I, ${reporterName}, Certified Shorthand Reporter No. ${csrNumber} in and`,
    'for the State of Texas, hereby certify that the foregoing is a true and',
    'correct transcript of the proceedings had in the above-entitled and',
    `numbered cause on ${depositionDate}; that I am neither attorney nor counsel for,`,
    'related to, nor employed by, any of the parties to the action in which',
    'this deposition was taken; and, further, that I am not a relative or',
    'employee of any attorney of record in this cause, nor am I financially',
    'or otherwise interested in the outcome of the action.',
    '',
    '',
    '_________________________________',
    reporterName,
    `CSR No. ${csrNumber}, Expiration ${input.reporterExpiration ?? '________'}`,
  ].join('\n');
}

function normalizeRoleLabel(role: string): string {
  const normalized = role.replace(/_/g, ' ').trim();
  switch (normalized.toLowerCase()) {
    case 'plaintiff attorney':
      return 'For the Plaintiff';
    case 'defendant attorney':
      return 'For the Defendant';
    case 'reporter':
      return 'Court Reporter';
    default:
      return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function formatLongDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function center(text: string): string {
  const width = 56;
  if (!text) {
    return '';
  }

  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return `${' '.repeat(padding)}${text}`;
}
