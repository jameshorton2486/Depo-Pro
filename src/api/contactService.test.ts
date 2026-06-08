import { beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "./contactService";

type QueryResponse = { data: unknown; error: unknown };

type QueryCall = {
  table: string;
  methods: Array<{ name: string; args: unknown[] }>;
};

const getSupabaseClientMock = vi.fn();

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
}));

function buildAwaitableQuery(response: QueryResponse, call: QueryCall) {
  const query = {
    select: vi.fn((...args: unknown[]) => {
      call.methods.push({ name: "select", args });
      return query;
    }),
    order: vi.fn((...args: unknown[]) => {
      call.methods.push({ name: "order", args });
      return query;
    }),
    eq: vi.fn((...args: unknown[]) => {
      call.methods.push({ name: "eq", args });
      return query;
    }),
    ilike: vi.fn((...args: unknown[]) => {
      call.methods.push({ name: "ilike", args });
      return query;
    }),
    insert: vi.fn((...args: unknown[]) => {
      call.methods.push({ name: "insert", args });
      return query;
    }),
    update: vi.fn((...args: unknown[]) => {
      call.methods.push({ name: "update", args });
      return query;
    }),
    single: vi.fn(() => {
      call.methods.push({ name: "single", args: [] });
      return Promise.resolve(response);
    }),
    maybeSingle: vi.fn(() => {
      call.methods.push({ name: "maybeSingle", args: [] });
      return Promise.resolve(response);
    }),
    then: (onFulfilled: (value: QueryResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(response).then(onFulfilled, onRejected),
  };

  return query;
}

function buildClient(options: {
  fromResponses?: QueryResponse[];
  rpcResponse?: QueryResponse;
}) {
  const calls: QueryCall[] = [];
  const responses = [...(options.fromResponses ?? [])];
  const client = {
    from: vi.fn((table: string) => {
      const response = responses.shift() ?? { data: null, error: null };
      const call: QueryCall = { table, methods: [] };
      calls.push(call);
      return buildAwaitableQuery(response, call);
    }),
    rpc: vi.fn((fn: string, args: unknown) => {
      void fn;
      void args;
      return Promise.resolve(options.rpcResponse ?? { data: null, error: null });
    }),
  };

  return { client, calls };
}

const attorneyRow = {
  id: "contact_1",
  type: "attorney",
  name: "Karen M. Alvarado",
  organization: "Brothers Law",
  phone: "2105550101",
  email: "karen@example.com",
  address: "123 Main",
  times_used: 7,
  notes: "",
  firm_id: "firm_1",
  details: {
    bar_number: "24012345",
    direct_phone: "2105550101",
    extension: "101",
    fax: "2105550102",
    assistant_name: "Dana",
    assistant_email: "dana@example.com",
    preferred_appearance_label: "MS. ALVARADO",
  },
  created_at: "2026-06-08T00:00:00.000Z",
  updated_at: "2026-06-08T00:00:00.000Z",
};

describe("contactService", () => {
  beforeEach(() => {
    getSupabaseClientMock.mockReset();
  });

  it("lists contacts without a type filter using the current ordering shape", async () => {
    const { client, calls } = buildClient({
      fromResponses: [{ data: [attorneyRow], error: null }],
    });
    getSupabaseClientMock.mockResolvedValue(client);

    const contacts = await service.listContacts();

    expect(getSupabaseClientMock).toHaveBeenCalledWith("listContacts");
    expect(contacts).toHaveLength(1);
    expect(calls).toEqual([
      {
        table: "contacts",
        methods: [
          { name: "select", args: ["*"] },
          { name: "order", args: ["times_used", { ascending: false }] },
          { name: "order", args: ["name", { ascending: true }] },
        ],
      },
    ]);
  });

  it("lists contacts with a type filter by appending the current eq clause", async () => {
    const { client, calls } = buildClient({
      fromResponses: [{ data: [attorneyRow], error: null }],
    });
    getSupabaseClientMock.mockResolvedValue(client);

    await service.listContacts("attorney");

    expect(calls[0]).toEqual({
      table: "contacts",
      methods: [
        { name: "select", args: ["*"] },
        { name: "order", args: ["times_used", { ascending: false }] },
        { name: "order", args: ["name", { ascending: true }] },
        { name: "eq", args: ["type", "attorney"] },
      ],
    });
  });

  it("searches contacts by ilike name and optional type using the current query shape", async () => {
    const { client, calls } = buildClient({
      fromResponses: [{ data: [attorneyRow], error: null }],
    });
    getSupabaseClientMock.mockResolvedValue(client);

    await service.searchContacts("alvarado", "attorney");

    expect(getSupabaseClientMock).toHaveBeenCalledWith("searchContacts");
    expect(calls[0]).toEqual({
      table: "contacts",
      methods: [
        { name: "select", args: ["*"] },
        { name: "ilike", args: ["name", "%alvarado%"] },
        { name: "order", args: ["times_used", { ascending: false }] },
        { name: "order", args: ["name", { ascending: true }] },
        { name: "eq", args: ["type", "attorney"] },
      ],
    });
  });

  it("upserts a new directory contact through the insert path and persists firm_id with normalized phone", async () => {
    const createdRow = {
      ...attorneyRow,
      id: "contact_2",
      phone: "2105559999",
      firm_id: "firm_2",
      details: {
        ...attorneyRow.details,
        bar_number: "24099999",
      },
    };
    const { client, calls } = buildClient({
      fromResponses: [
        { data: [], error: null },
        { data: createdRow, error: null },
      ],
    });
    getSupabaseClientMock.mockResolvedValue(client);

    const result = await service.upsertDirectoryContact({
      type: "attorney",
      name: "Karen M. Alvarado",
      organization: "Brothers Law",
      phone: "(210) 555-9999",
      email: "karen@example.com",
      address: "123 Main",
      notes: "",
      firm_id: "firm_2",
      details: {
        bar_number: "24099999",
        direct_phone: "(210) 555-9999",
        extension: "101",
        fax: "210-555-0102",
        assistant_name: "Dana",
        assistant_email: "dana@example.com",
        preferred_appearance_label: "MS. ALVARADO",
      },
    });

    expect(result.created).toBe(true);
    expect(result.contact.firm_id).toBe("firm_2");
    expect(calls).toEqual([
      {
        table: "contacts",
        methods: [
          { name: "select", args: ["*"] },
          { name: "order", args: ["times_used", { ascending: false }] },
          { name: "order", args: ["name", { ascending: true }] },
          { name: "eq", args: ["type", "attorney"] },
        ],
      },
      {
        table: "contacts",
        methods: [
          {
            name: "insert",
            args: [{
              type: "attorney",
              name: "Karen M. Alvarado",
              organization: "Brothers Law",
              phone: "2105559999",
              email: "karen@example.com",
              address: "123 Main",
              notes: "",
              firm_id: "firm_2",
              details: {
                kind: "attorney",
                bar_number: "24099999",
                direct_phone: "(210) 555-9999",
                extension: "101",
                fax: "210-555-0102",
                assistant_name: "Dana",
                assistant_email: "dana@example.com",
                preferred_appearance_label: "MS. ALVARADO",
              },
              times_used: 0,
            }],
          },
          { name: "select", args: [] },
          { name: "single", args: [] },
        ],
      },
    ]);
  });

  it("upserts an existing directory contact through the update path and persists merged firm_id", async () => {
    const existing = {
      ...attorneyRow,
      id: "contact_3",
      name: "Curtis L. Cukjati",
      organization: "",
      phone: "",
      email: "",
      address: "",
      firm_id: null,
      details: {
        bar_number: null,
        direct_phone: null,
        extension: null,
        fax: null,
        assistant_name: null,
        assistant_email: null,
        preferred_appearance_label: null,
      },
    };
    const updatedRow = {
      ...existing,
      organization: "Cukjati Law Firm",
      phone: "2105550101",
      firm_id: "firm_77",
      details: {
        ...existing.details,
        bar_number: "24000001",
      },
    };
    const { client, calls } = buildClient({
      fromResponses: [
        { data: [existing], error: null },
        { data: existing, error: null },
        { data: updatedRow, error: null },
      ],
    });
    getSupabaseClientMock.mockResolvedValue(client);

    const result = await service.upsertDirectoryContact({
      type: "attorney",
      name: "Curtis L. Cukjati",
      organization: "Cukjati Law Firm",
      phone: "(210) 555-0101",
      email: "",
      address: "",
      notes: "",
      firm_id: "firm_77",
      details: {
        bar_number: "24000001",
        direct_phone: "(210) 555-0101",
        extension: null,
        fax: null,
        assistant_name: null,
        assistant_email: null,
        preferred_appearance_label: null,
      },
    });

    expect(result.created).toBe(false);
    expect(result.conflicts).toEqual([]);
    expect(calls).toEqual([
      {
        table: "contacts",
        methods: [
          { name: "select", args: ["*"] },
          { name: "order", args: ["times_used", { ascending: false }] },
          { name: "order", args: ["name", { ascending: true }] },
          { name: "eq", args: ["type", "attorney"] },
        ],
      },
      {
        table: "contacts",
        methods: [
          { name: "select", args: ["*"] },
          { name: "eq", args: ["id", "contact_3"] },
          { name: "maybeSingle", args: [] },
        ],
      },
      {
        table: "contacts",
        methods: [
          {
            name: "update",
            args: [{
              organization: "Cukjati Law Firm",
              phone: "2105550101",
              email: "",
              address: "",
              notes: "",
              firm_id: "firm_77",
              details: {
                kind: "attorney",
                bar_number: "24000001",
                direct_phone: "(210) 555-0101",
                extension: null,
                fax: null,
                assistant_name: null,
                assistant_email: null,
                preferred_appearance_label: null,
              },
            }],
          },
          { name: "eq", args: ["id", "contact_3"] },
          { name: "select", args: [] },
          { name: "single", args: [] },
        ],
      },
    ]);
  });

  it("increments usage through the RPC path when available", async () => {
    const { client } = buildClient({
      rpcResponse: { data: null, error: null },
    });
    getSupabaseClientMock.mockResolvedValue(client);

    await service.incrementUsage("contact_9");

    expect(getSupabaseClientMock).toHaveBeenCalledWith("incrementUsage");
    expect(client.rpc).toHaveBeenCalledWith("increment_contact_usage", {
      contact_id: "contact_9",
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("falls back to manual usage increment when the RPC returns an error", async () => {
    const { client, calls } = buildClient({
      fromResponses: [
        { data: { ...attorneyRow, id: "contact_10", times_used: 4 }, error: null },
        { data: null, error: null },
      ],
      rpcResponse: { data: null, error: { message: "missing function" } },
    });
    getSupabaseClientMock.mockResolvedValue(client);

    await service.incrementUsage("contact_10");

    expect(client.rpc).toHaveBeenCalledWith("increment_contact_usage", {
      contact_id: "contact_10",
    });
    expect(calls).toEqual([
      {
        table: "contacts",
        methods: [
          { name: "select", args: ["*"] },
          { name: "eq", args: ["id", "contact_10"] },
          { name: "maybeSingle", args: [] },
        ],
      },
      {
        table: "contacts",
        methods: [
          { name: "update", args: [{ times_used: 5 }] },
          { name: "eq", args: ["id", "contact_10"] },
        ],
      },
    ]);
  });
});
