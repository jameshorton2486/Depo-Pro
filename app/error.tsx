'use client';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem' }}>⚠️</div>
        <h1 style={{ fontWeight: 'bold' }}>Something went wrong</h1>
        <button onClick={() => reset()} style={{
          backgroundColor: '#4f46e5',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
        }}>Try Again</button>
      </div>
    </div>
  );
}
