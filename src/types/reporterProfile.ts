export interface ReporterProfile {
  owner_user_id: string;
  display_name: string | null;
  csr_number: string | null;
  csr_cert_expiration: string | null;
  firm_registration_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReporterProfilePatch {
  display_name?: string | null;
  csr_number?: string | null;
  csr_cert_expiration?: string | null;
  firm_registration_number?: string | null;
}
