import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      })),
    },
  })),
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
declare global {
  function createMockUser(overrides?: Partial<{ id: string; email: string; role: string }>): {
    id: string;
    email: string;
    role: string;
  };
  
  function createMockJob(overrides?: Partial<{ id: string; case_name: string; status: string }>): {
    id: string;
    case_name: string;
    status: string;
    created_by_id: string;
  };
}

globalThis.createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  role: 'REPORTER',
  ...overrides,
});

globalThis.createMockJob = (overrides = {}) => ({
  id: 'job-123',
  case_name: 'Test Case v. Example',
  status: 'PENDING',
  created_by_id: 'user-123',
  ...overrides,
});
