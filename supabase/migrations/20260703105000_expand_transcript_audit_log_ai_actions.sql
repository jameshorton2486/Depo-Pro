alter table public.transcript_audit_log
  drop constraint if exists transcript_audit_log_action_check;

alter table public.transcript_audit_log
  add constraint transcript_audit_log_action_check
  check (
    action in (
      'edit_word',
      'mark_reviewed',
      'assign_speaker',
      'bulk_save',
      'ingest',
      'ai_suggestion_accepted',
      'ai_suggestion_rejected',
      'ai_suggestion_auto_applied'
    )
  );
