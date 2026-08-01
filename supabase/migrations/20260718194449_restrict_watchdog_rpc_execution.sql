revoke execute on function public.fail_stale_transcription_jobs(interval) from public, anon, authenticated;
grant execute on function public.fail_stale_transcription_jobs(interval) to service_role;
