import { decideDirectoryContactUpsert, decideFirmUpsert, type DirectoryMergeConflict } from "../lib/directory/mergeDirectoryRecords";
import {
  normalizeContactInsert,
  normalizeContactUpdate,
  type Contact,
  type ContactInsert,
  type ContactType,
  type ContactUpdate,
} from "../types/contact";
import { normalizeFirmInsert, normalizeFirmUpdate, type Firm, type FirmInsert, type FirmUpdate } from "../types/firm";

type MockDirectoryContactUpsertResult = {
  contact: Contact;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
};

type MockFirmUpsertResult = {
  firm: Firm;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
};

const MOCK_DIRECTORY_FIRMS_BASE: Firm[] = [
  {
    id: "firm_mock_1",
    name: "Brothers, Alvarado, Piazza & Cozort, P.C.",
    address: "123 Main St",
    city: "San Antonio",
    state: "TX",
    zip: "78205",
    main_phone: "2105550202",
    fax: "2105550203",
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
  {
    id: "firm_mock_2",
    name: "Bardot Reporting, LLC",
    address: "400 Market St",
    city: "San Antonio",
    state: "TX",
    zip: "78205",
    main_phone: "2105550303",
    fax: "2105550304",
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
  {
    id: "firm_mock_3",
    name: "Acme Video, LLC",
    address: "500 Broadway",
    city: "San Antonio",
    state: "TX",
    zip: "78205",
    main_phone: "2105550404",
    fax: "2105550405",
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
];

const MOCK_DIRECTORY_CONTACTS_BASE: Contact[] = [
  {
    id: "contact_mock_attorney_1",
    type: "attorney",
    name: "Karen M. Alvarado",
    organization: "",
    phone: "2105550101",
    email: "karen@example.com",
    address: "123 Main St",
    times_used: 5,
    notes: "",
    firm_id: "firm_mock_1",
    details: {
      kind: "attorney",
      bar_number: "24012345",
      direct_phone: "2105550101",
      extension: null,
      fax: null,
      assistant_name: null,
      assistant_email: null,
      preferred_appearance_label: "MS. ALVARADO",
    },
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
  {
    id: "contact_mock_reporter_1",
    type: "reporter",
    name: "Miah Bardot",
    organization: "Bardot Reporting, LLC",
    phone: "2105550303",
    email: "miah@bardotreporting.com",
    address: "400 Market St",
    times_used: 3,
    notes: "",
    firm_id: "firm_mock_2",
    details: {
      kind: "reporter",
      csr_number: "12129",
      csr_cert_expiration: "2027-12-31",
      firm_registration_number: "9001",
    },
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
  {
    id: "contact_mock_interpreter_1",
    type: "interpreter",
    name: "Rosa Pena",
    organization: "Lingua Bridge",
    phone: "2105550505",
    email: "rosa@linguabridge.com",
    address: "",
    times_used: 1,
    notes: "",
    firm_id: null,
    details: {
      kind: "interpreter",
      certified: true,
      cert_number: "INT-7788",
      certification_authority: "Texas Court Interpreters",
      certification_expiration: "2027-12-31",
      remote_capable: true,
      agency: "Lingua Bridge",
      agency_contact: "Ana Lopez",
      default_languages: ["es", "en"],
    },
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
  {
    id: "contact_mock_videographer_1",
    type: "videographer",
    name: "Victor Stone",
    organization: "Acme Video, LLC",
    phone: "2105550404",
    email: "victor@acmevideo.com",
    address: "",
    times_used: 1,
    notes: "",
    firm_id: "firm_mock_3",
    details: {
      kind: "videographer",
      cert_number: "VID-2001",
      role_title: "Lead Videographer",
    },
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
  {
    id: "contact_mock_participant_1",
    type: "corporate_representative",
    name: "Jordan Smith",
    organization: "Home Depot",
    phone: "2105550606",
    email: "jordan@example.com",
    address: "",
    times_used: 0,
    notes: "",
    firm_id: null,
    details: {
      kind: "corporate_representative",
    },
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let mockDirectoryContacts = clone(MOCK_DIRECTORY_CONTACTS_BASE);
let mockDirectoryFirms = clone(MOCK_DIRECTORY_FIRMS_BASE);
let mockContactSequence = mockDirectoryContacts.length + 1;
let mockFirmSequence = mockDirectoryFirms.length + 1;

function nowIso() {
  return new Date().toISOString();
}

function contactSort(a: Contact, b: Contact) {
  if (b.times_used !== a.times_used) {
    return b.times_used - a.times_used;
  }
  return a.name.localeCompare(b.name);
}

function firmSort(a: Firm, b: Firm) {
  return a.name.localeCompare(b.name);
}

export function resetMockDirectoryStore() {
  mockDirectoryContacts = clone(MOCK_DIRECTORY_CONTACTS_BASE);
  mockDirectoryFirms = clone(MOCK_DIRECTORY_FIRMS_BASE);
  mockContactSequence = mockDirectoryContacts.length + 1;
  mockFirmSequence = mockDirectoryFirms.length + 1;
}

export function listMockContacts(type?: ContactType): Contact[] {
  return clone(
    mockDirectoryContacts
      .filter((contact) => !type || contact.type === type)
      .sort(contactSort),
  );
}

export function searchMockContacts(term: string, type?: ContactType): Contact[] {
  const normalized = term.trim().toLowerCase();
  return clone(
    mockDirectoryContacts
      .filter((contact) => !type || contact.type === type)
      .filter((contact) => !normalized || contact.name.toLowerCase().includes(normalized))
      .sort(contactSort),
  );
}

export function getMockContact(id: string): Contact | null {
  return clone(mockDirectoryContacts.find((contact) => contact.id === id) ?? null);
}

export function createMockContact(payload: ContactInsert): Contact {
  const normalized = normalizeContactInsert(payload);
  const timestamp = nowIso();
  const created: Contact = {
    ...normalized,
    id: `contact_mock_${mockContactSequence++}`,
    times_used: 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
  mockDirectoryContacts.push(created);
  return clone(created);
}

export function updateMockContact(id: string, patch: ContactUpdate): Contact {
  const index = mockDirectoryContacts.findIndex((contact) => contact.id === id);
  if (index === -1) {
    throw new Error(`Contact ${id} not found.`);
  }

  const current = mockDirectoryContacts[index];
  const normalized = normalizeContactUpdate(current.type, patch);
  const updated: Contact = {
    ...current,
    ...normalized,
    details: normalized.details ? clone(normalized.details as Contact["details"]) : current.details,
    updated_at: nowIso(),
  };
  mockDirectoryContacts[index] = updated;
  return clone(updated);
}

export function incrementMockContactUsage(id: string): void {
  const index = mockDirectoryContacts.findIndex((contact) => contact.id === id);
  if (index === -1) {
    return;
  }
  mockDirectoryContacts[index] = {
    ...mockDirectoryContacts[index],
    times_used: mockDirectoryContacts[index].times_used + 1,
    updated_at: nowIso(),
  };
}

export function upsertMockDirectoryContact(payload: ContactInsert): MockDirectoryContactUpsertResult {
  const decision = decideDirectoryContactUpsert(mockDirectoryContacts, payload);

  if (decision.created && decision.payload) {
    return {
      contact: createMockContact(decision.payload),
      conflicts: [],
      created: true,
    };
  }

  if (decision.conflicts.length > 0 && decision.contact) {
    return {
      contact: clone(decision.contact),
      conflicts: decision.conflicts,
      created: false,
    };
  }

  if (!decision.contact) {
    throw new Error("Directory upsert could not determine a contact result.");
  }

  const updated = updateMockContact(decision.contact.id, {
    organization: decision.contact.organization,
    phone: decision.contact.phone,
    email: decision.contact.email,
    address: decision.contact.address,
    notes: decision.contact.notes,
    firm_id: decision.contact.firm_id,
    details: decision.contact.details,
  });

  return {
    contact: updated,
    conflicts: [],
    created: false,
  };
}

export function listMockFirms(): Firm[] {
  return clone(mockDirectoryFirms.slice().sort(firmSort));
}

export function searchMockFirms(term: string): Firm[] {
  const normalized = term.trim().toLowerCase();
  return clone(
    mockDirectoryFirms
      .filter((firm) => !normalized || firm.name.toLowerCase().includes(normalized))
      .sort(firmSort),
  );
}

export function getMockFirm(id: string): Firm | null {
  return clone(mockDirectoryFirms.find((firm) => firm.id === id) ?? null);
}

export function createMockFirm(payload: FirmInsert): Firm {
  const normalized = normalizeFirmInsert(payload);
  const timestamp = nowIso();
  const created: Firm = {
    ...normalized,
    id: `firm_mock_${mockFirmSequence++}`,
    created_at: timestamp,
    updated_at: timestamp,
  };
  mockDirectoryFirms.push(created);
  return clone(created);
}

export function updateMockFirm(id: string, patch: FirmUpdate): Firm {
  const index = mockDirectoryFirms.findIndex((firm) => firm.id === id);
  if (index === -1) {
    throw new Error(`Firm ${id} not found.`);
  }
  const normalized = normalizeFirmUpdate(patch);
  const updated: Firm = {
    ...mockDirectoryFirms[index],
    ...normalized,
    updated_at: nowIso(),
  };
  mockDirectoryFirms[index] = updated;
  return clone(updated);
}

export function upsertMockFirm(payload: FirmInsert): MockFirmUpsertResult {
  const decision = decideFirmUpsert(mockDirectoryFirms, payload);

  if (decision.created && decision.payload) {
    return {
      firm: createMockFirm(decision.payload),
      conflicts: [],
      created: true,
    };
  }

  if (decision.conflicts.length > 0 && decision.firm) {
    return {
      firm: clone(decision.firm),
      conflicts: decision.conflicts,
      created: false,
    };
  }

  if (!decision.firm) {
    throw new Error("Firm upsert could not determine a firm result.");
  }

  return {
    firm: updateMockFirm(decision.firm.id, {
      address: decision.firm.address,
      city: decision.firm.city,
      state: decision.firm.state,
      zip: decision.firm.zip,
      main_phone: decision.firm.main_phone,
      fax: decision.firm.fax,
    }),
    conflicts: [],
    created: false,
  };
}
