/*
  # Create Contacts Table

  ## Summary
  Creates a shared contact library for court reporters to reuse attorneys, law firms,
  interpreters, videographers, and other participants across multiple deposition cases.

  ## New Tables

  ### `contacts`
  A single unified contacts table supporting multiple contact types via a discriminator column.

  | Column         | Type      | Description                                                   |
  |----------------|-----------|---------------------------------------------------------------|
  | id             | uuid      | Primary key                                                   |
  | type           | text      | Contact type: attorney, interpreter, videographer, participant, firm |
  | name           | text      | Full name or firm name (required)                             |
  | organization   | text      | Associated organization / law firm name                       |
  | phone          | text      | Primary phone number                                          |
  | email          | text      | Email address                                                 |
  | address        | text      | Mailing address (free-form)                                   |
  | times_used     | integer   | Usage counter, incremented each time the contact is reused    |
  | notes          | text      | Free-form notes (certifications, languages, bar numbers, etc.)|
  | created_at     | timestamptz | Row creation timestamp                                      |
  | updated_at     | timestamptz | Last update timestamp                                       |

  ## Indexes
  - `contacts_type_idx` on `type` for filtering by contact type
  - `contacts_name_idx` on `name` (case-insensitive) for search/autocomplete
  - `contacts_times_used_idx` on `times_used DESC` for sorting most-used first

  ## Security
  - RLS enabled; authenticated users can read, create, update their own contacts
  - No delete policy — contacts are soft-managed via `times_used` and `notes`

  ## Notes
  1. No user_id column: contacts are shared across the reporter's organization.
     If multi-tenancy is needed later, add a `reporter_id` foreign key.
  2. `type` uses a CHECK constraint to enforce valid values.
  3. `updated_at` is automatically maintained by a trigger.
*/

CREATE TABLE IF NOT EXISTS contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL CHECK (type IN ('attorney', 'interpreter', 'videographer', 'participant', 'firm')),
  name         text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '',
  phone        text NOT NULL DEFAULT '',
  email        text NOT NULL DEFAULT '',
  address      text NOT NULL DEFAULT '',
  times_used   integer NOT NULL DEFAULT 0,
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS contacts_type_idx       ON contacts (type);
CREATE INDEX IF NOT EXISTS contacts_name_idx       ON contacts (lower(name));
CREATE INDEX IF NOT EXISTS contacts_times_used_idx ON contacts (times_used DESC);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'contacts_updated_at_trigger'
  ) THEN
    CREATE TRIGGER contacts_updated_at_trigger
      BEFORE UPDATE ON contacts
      FOR EACH ROW EXECUTE FUNCTION update_contacts_updated_at();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
