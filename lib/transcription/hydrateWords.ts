/**
 * Hydrate transcript_words from transcriptions.words JSONB.
 * Pipeline stores Deepgram output in transcriptions.words; formatter reads from transcript_words.
 * Call after storeTranscriptionResult in the pipeline.
 */

import { createAdminClient } from '@/lib/supabase/admin';

interface PipelineWord {
  word: string;
  punctuated_word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
  speaker_channel?: number;
}

function parseSpeakerIndex(speaker: string | number | undefined): number {
  if (typeof speaker === 'number') return speaker;
  if (!speaker) return 0;
  const match = String(speaker).match(/SPEAKER_?(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

export async function hydrateWords(
  transcriptionId: string,
  firmId: string,
  words: PipelineWord[]
): Promise<{ inserted: number }> {
  const supabase = createAdminClient();

  if (!words?.length) {
    return { inserted: 0 };
  }

  const rows = words.map((w, index) => {
    const speakerIndex = w.speaker_channel ?? parseSpeakerIndex(w.speaker);
    const punctuated = w.punctuated_word ?? w.word;
    return {
      transcription_id: transcriptionId,
      firm_id: firmId,
      position_index: index,
      original_word: w.word,
      word: w.word,
      punctuated_word: punctuated,
      display_word: punctuated,
      corrected_word: null,
      start_time: w.start,
      end_time: w.end,
      confidence: w.confidence,
      speaker_index: speakerIndex,
      is_corrected: false,
      is_deleted: false,
      is_filler: false,
    };
  });

  const { error } = await supabase
    .from('transcript_words')
    .upsert(rows, {
      onConflict: 'transcription_id,position_index',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Failed to hydrate transcript_words: ${error.message}`);
  }

  return { inserted: rows.length };
}
