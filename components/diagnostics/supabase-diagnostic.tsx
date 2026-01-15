// =============================================================================
// DIAGNOSTIC COMPONENT - Add to any page to test Supabase connection
// =============================================================================
// Usage: Import and render <SupabaseDiagnostic /> on any page
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface DiagnosticResult {
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export function SupabaseDiagnostic() {
  const [result, setResult] = useState<DiagnosticResult>({
    status: 'pending',
    message: 'Testing Supabase connection...',
  });

  useEffect(() => {
    async function testConnection() {
      try {
        // Test 1: Can we create the client?
        const supabase = getSupabaseBrowserClient();

        // Test 2: Can we make a request? (health check)
        const { error } = await supabase.auth.getSession();

        if (error) {
          setResult({
            status: 'error',
            message: 'Supabase request failed',
            details: {
              error: error.message,
              code: error.status,
            },
          });
          return;
        }

        // Connection successful - details are validated in browser.ts
        setResult({
          status: 'success',
          message: 'Supabase connection working!',
          details: {
            note: 'Connection validated - URL and key format checked in browser.ts',
          },
        });
      } catch (err) {
        setResult({
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    testConnection();
  }, []);

  return (
    <div
      style={{
        padding: '1rem',
        margin: '1rem',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor:
          result.status === 'success'
            ? '#d4edda'
            : result.status === 'error'
            ? '#f8d7da'
            : '#fff3cd',
      }}
    >
      <h3>Supabase Diagnostic</h3>
      <p>
        <strong>Status:</strong> {result.status}
      </p>
      <p>
        <strong>Message:</strong> {result.message}
      </p>
      {result.details && (
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(result.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default SupabaseDiagnostic;
