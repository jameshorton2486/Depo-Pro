export interface ReporterProfile {
  owner_user_id: string;
  display_name: string | null;
  csr_number: string | null;
  csr_cert_expiration: string | null;
  firm_registration_number: string | null;
  initials: string | null;
  realtime_capable: boolean;
  remote_swear_authority: boolean;
  notary_commission_expiration: string | null;
  preferred_signature_block: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReporterProfilePatch {
  display_name?: string | null;
  csr_number?: string | null;
  csr_cert_expiration?: string | null;
  firm_registration_number?: string | null;
  initials?: string | null;
  realtime_capable?: boolean;
  remote_swear_authority?: boolean;
  notary_commission_expiration?: string | null;
  preferred_signature_block?: string | null;
}
