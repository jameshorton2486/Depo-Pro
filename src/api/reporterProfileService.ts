import { getSupabaseClient } from "../lib/supabase";
import type { ReporterProfile, ReporterProfilePatch } from "../types/reporterProfile";

function normalizeNullableString(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeReporterProfile(row: ReporterProfile): ReporterProfile {
  return {
    ...row,
    display_name: normalizeNullableString(row.display_name),
    csr_number: normalizeNullableString(row.csr_number),
    csr_cert_expiration: normalizeNullableString(row.csr_cert_expiration),
    firm_registration_number: normalizeNullableString(row.firm_registration_number),
    initials: normalizeNullableString(row.initials),
    realtime_capable: row.realtime_capable === true,
    remote_swear_authority: row.remote_swear_authority === true,
    notary_commission_expiration: normalizeNullableString(row.notary_commission_expiration),
    preferred_signature_block: normalizeNullableString(row.preferred_signature_block),
  };
}

async function getCurrentUserId() {
  const client = await getSupabaseClient("getCurrentReporterProfileUser");
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw error;
  }
  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Authenticated reporter profile access requires a user id.");
  }
  return { client, userId };
}

export async function getMyProfile(): Promise<ReporterProfile | null> {
  const { client, userId } = await getCurrentUserId();
  const { data, error } = await client
    .from("reporter_profiles")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeReporterProfile(data as ReporterProfile) : null;
}

export async function upsertMyProfile(patch: ReporterProfilePatch): Promise<ReporterProfile> {
  const { client, userId } = await getCurrentUserId();
  const existing = await getMyProfile();

  if (existing) {
    const { data, error } = await client
      .from("reporter_profiles")
      .update(patch)
      .eq("owner_user_id", userId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return normalizeReporterProfile(data as ReporterProfile);
  }

  const { data, error } = await client
    .from("reporter_profiles")
    .insert({
      owner_user_id: userId,
      ...patch,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeReporterProfile(data as ReporterProfile);
}
