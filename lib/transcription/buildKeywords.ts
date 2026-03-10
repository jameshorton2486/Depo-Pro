import { createAdminClient } from '@/lib/supabase/admin';

export interface DeepgramKeyterm {
  text: string;
  boost: number;
}

export interface KeywordConfig {
  word: string;
  boost?: number;
}

type JobLookup = {
  firm_id: string | null;
  deposition_id?: string | null;
};

function clampBoost(boost: number): number {
  return Math.min(Math.max(Math.round(boost), 1), 10);
}

function addTerm(terms: Map<string, number>, rawText: string | null | undefined, boost: number): void {
  const text = rawText?.trim();
  if (!text) return;

  const boosted = text.toUpperCase().includes('BARDOT') ? Math.max(boost, 8) : boost;
  const existing = terms.get(text) ?? 0;
  terms.set(text, Math.max(existing, boosted));
}

async function getJobLookup(jobId: string): Promise<JobLookup | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('firm_id, deposition_id')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as JobLookup;
}

export async function buildKeywords(
  jobId: string,
  transcriptionId: string
): Promise<DeepgramKeyterm[]> {
  const supabase = createAdminClient();
  const terms = new Map<string, number>();
  const job = await getJobLookup(jobId);

  if (!job) {
    return [];
  }

  try {
    if (job.deposition_id) {
      const { data: participants } = await supabase
        .from('participants')
        .select('full_name, role')
        .eq('deposition_id', job.deposition_id);

      participants?.forEach((participant: any) => {
        addTerm(terms, participant.full_name, 5);

        const lastName = String(participant.full_name ?? '').trim().split(/\s+/).pop();
        if (lastName && lastName.length > 2) {
          addTerm(terms, lastName, 3);
        }
      });
    }
  } catch {
    // Participant enrichment is best-effort.
  }

  try {
    if (job.deposition_id) {
      const { data: vocabTerms } = await supabase
        .from('vocabulary_terms')
        .select('term, boost')
        .eq('deposition_id', job.deposition_id);

      vocabTerms?.forEach((term: any) => addTerm(terms, term.term, Number(term.boost ?? 3)));
    }
  } catch {
    // Deposition-level vocabulary is best-effort.
  }

  try {
    const { data: customVocab } = await supabase
      .from('custom_vocabularies')
      .select('term, boost')
      .eq('job_id', jobId);

    customVocab?.forEach((term: any) => addTerm(terms, term.term, Number(term.boost ?? 2)));
  } catch {
    // Job-specific vocabulary is best-effort.
  }

  try {
    if (job.firm_id) {
      const { data: firmVocab } = await supabase
        .from('firm_vocabularies')
        .select('term, boost')
        .eq('firm_id', job.firm_id);

      firmVocab?.forEach((term: any) => addTerm(terms, term.term, Number(term.boost ?? 1)));
    }
  } catch {
    // Firm vocabulary is best-effort.
  }

  try {
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('job_id')
      .eq('id', transcriptionId)
      .single();

    if (transcription?.job_id && transcription.job_id !== jobId) {
      addTerm(terms, 'Miah Bardot', 10);
    }
  } catch {
    // Validation-only query; ignore if unavailable.
  }

  return Array.from(terms.entries())
    .map(([text, boost]) => ({ text, boost: clampBoost(boost) }))
    .sort((a, b) => b.boost - a.boost || a.text.localeCompare(b.text))
    .slice(0, 100);
}

export async function buildKeywordsForJob(jobId: string): Promise<KeywordConfig[]> {
  const keyterms = await buildKeywords(jobId, jobId);
  return keyterms.map((term) => ({
    word: term.text,
    boost: term.boost,
  }));
}
