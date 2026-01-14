@'
'use client';

import { useEffect, useState } from 'react';

export default function DebugEnvPage() {
  const [testResult, setTestResult] = useState('Testing...');
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  useEffect(() => {
    async function testConnection() {
      try {
        const response = await fetch(url + '/auth/v1/health', {
          headers: { 'apikey': key || '' }
        });
        const data = await response.json();
        setTestResult('Status: ' + response.status + ' - ' + JSON.stringify(data));
      } catch (err) {
        setTestResult('Error: ' + err);
      }
    }
    if (url && key) testConnection();
  }, [url, key]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1>DEBUG PAGE</h1>
      <p>URL: {url || 'UNDEFINED'}</p>
      <p>KEY: {key ? key.substring(0,30) + '... (' + key.length + ' chars)' : 'UNDEFINED'}</p>
      <p>API Test: {testResult}</p>
    </div>
  );
}
'@ | Out-File -FilePath "app/debug-env/page.tsx" -Encoding utf8