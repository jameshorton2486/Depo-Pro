import { getSupabaseClient } from "../supabase";
import type {
  ExtractionDocType,
  ExtractionFailure,
  ExtractionResponse,
  ExtractionSuccess,
} from "./aiExtractionTypes";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExtractionSuccess(value: unknown): value is ExtractionSuccess {
  return isObject(value) && "fields" in value && "model" in value;
}

function isExtractionFailure(value: unknown): value is ExtractionFailure {
  return isObject(value) && typeof value.error === "string";
}

export async function aiExtract(text: string, docType: ExtractionDocType): Promise<ExtractionResponse> {
  const supabase = await getSupabaseClient("extract-nod");
  const { data, error } = await supabase.functions.invoke("extract-nod", {
    body: { text, docType },
  });

  if (error) {
    return {
      error: error.message || "The extraction service did not respond.",
    };
  }

  if (isExtractionSuccess(data)) {
    return data;
  }

  if (isExtractionFailure(data)) {
    return data;
  }

  return {
    error: "The extraction service returned an invalid response.",
  };
}
