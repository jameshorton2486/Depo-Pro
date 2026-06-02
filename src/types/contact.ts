export type ContactType = "attorney" | "interpreter" | "videographer" | "participant" | "firm";

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  organization: string;
  phone: string;
  email: string;
  address: string;
  times_used: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type ContactInsert = Omit<Contact, "id" | "times_used" | "created_at" | "updated_at">;
export type ContactUpdate = Partial<Omit<Contact, "id" | "created_at" | "updated_at">>;
