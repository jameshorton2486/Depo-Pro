export type DocumentType =
  | 'notice_of_deposition'
  | 'court_order'
  | 'subpoena'
  | 'scheduling_form'
  | 'duces_tecum'
  | 'other';

export interface DepositionExtractionResult {
  document_type: DocumentType | null;
  confidence: number;
  case_information: {
    cause_number: string | null;
    case_style: string | null;
    court_name: string | null;
    court_number: string | null;
    county: string | null;
    state: string | null;
  };
  parties: {
    plaintiffs: string[];
    defendants: string[];
    third_parties: string[];
  };
  attorneys: Array<{
    name: string;
    firm: string | null;
    role: 'ordering' | 'opposing' | 'copy' | null;
    represents: 'plaintiff' | 'defendant' | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    phone: string | null;
    fax: string | null;
    email: string | null;
    delivery_format: string | null;
    is_rush: boolean;
  }>;
  deposition_sessions: Array<{
    deponent_name: string;
    deposition_date: string | null;
    start_time: string | null;
    location: string | null;
    is_remote: boolean;
    remote_platform: string | null;
    zoom_link: string | null;
    is_videotaped: boolean;
    includes_duces_tecum: boolean;
  }>;
  court_reporter: {
    firm: string | null;
    name: string | null;
    phone: string | null;
  };
  transcription_keywords: {
    names: string[];
    firms: string[];
    locations: string[];
    legal_terms: string[];
    all_keywords: string[];
  };
  ordered_by: string | null;
  notes: string | null;
}

export const EMPTY_EXTRACTION: DepositionExtractionResult = {
  document_type: null,
  confidence: 0,
  case_information: {
    cause_number: null,
    case_style: null,
    court_name: null,
    court_number: null,
    county: null,
    state: 'Texas',
  },
  parties: {
    plaintiffs: [],
    defendants: [],
    third_parties: [],
  },
  attorneys: [],
  deposition_sessions: [],
  court_reporter: {
    firm: null,
    name: null,
    phone: null,
  },
  transcription_keywords: {
    names: [],
    firms: [],
    locations: [],
    legal_terms: [],
    all_keywords: [],
  },
  ordered_by: null,
  notes: null,
};

export function normalizeExtraction(
  value: Partial<DepositionExtractionResult> | null | undefined,
): DepositionExtractionResult {
  const merged: DepositionExtractionResult = {
    ...EMPTY_EXTRACTION,
    ...value,
    case_information: {
      ...EMPTY_EXTRACTION.case_information,
      ...(value?.case_information ?? {}),
    },
    parties: {
      ...EMPTY_EXTRACTION.parties,
      ...(value?.parties ?? {}),
    },
    court_reporter: {
      ...EMPTY_EXTRACTION.court_reporter,
      ...(value?.court_reporter ?? {}),
    },
    transcription_keywords: {
      ...EMPTY_EXTRACTION.transcription_keywords,
      ...(value?.transcription_keywords ?? {}),
    },
    attorneys: (value?.attorneys ?? []).map((attorney) => ({
      name: attorney?.name ?? '',
      firm: attorney?.firm ?? null,
      role: attorney?.role ?? null,
      represents: attorney?.represents ?? null,
      address: attorney?.address ?? null,
      city: attorney?.city ?? null,
      state: attorney?.state ?? null,
      postal_code: attorney?.postal_code ?? null,
      phone: attorney?.phone ?? null,
      fax: attorney?.fax ?? null,
      email: attorney?.email ?? null,
      delivery_format: attorney?.delivery_format ?? null,
      is_rush: Boolean(attorney?.is_rush),
    })).filter((attorney) => attorney.name.trim().length > 0),
    deposition_sessions: (value?.deposition_sessions ?? []).map((session) => ({
      deponent_name: session?.deponent_name ?? '',
      deposition_date: session?.deposition_date ?? null,
      start_time: session?.start_time ?? null,
      location: session?.location ?? null,
      is_remote: Boolean(session?.is_remote),
      remote_platform: session?.remote_platform ?? null,
      zoom_link: session?.zoom_link ?? null,
      is_videotaped: Boolean(session?.is_videotaped),
      includes_duces_tecum: Boolean(session?.includes_duces_tecum),
    })).filter((session) => session.deponent_name.trim().length > 0),
  };

  merged.confidence = typeof merged.confidence === 'number'
    ? Math.max(0, Math.min(1, merged.confidence))
    : 0;

  merged.transcription_keywords.all_keywords = Array.from(
    new Set(
      [
        ...merged.transcription_keywords.names,
        ...merged.transcription_keywords.firms,
        ...merged.transcription_keywords.locations,
        ...merged.transcription_keywords.legal_terms,
        ...(merged.transcription_keywords.all_keywords ?? []),
      ]
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );

  return merged;
}
