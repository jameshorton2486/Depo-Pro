import { getSupabaseClient } from "../lib/supabase";
import type { ReporterProfile, ReporterProfilePatch } from "../types/reporterProfile";

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

  return (data as ReporterProfile | null) ?? null;
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

    return data as ReporterProfile;
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

  return data as ReporterProfile;
}
