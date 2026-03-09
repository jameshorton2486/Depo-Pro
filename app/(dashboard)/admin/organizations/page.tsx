import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const supabase = await createSupabaseServerClient();
  const { data: firms, count } = await supabase
    .from('firms')
    .select('id, name, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Organizations</h1>
          <p className="text-sm text-muted-foreground">Agency and firm records connected to deposition jobs.</p>
        </div>
        <Badge variant="secondary">Total Organizations: {count ?? 0}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Organizations</CardTitle>
          <CardDescription>Latest firms in the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {firms?.length ? (
            firms.map((firm) => (
              <div key={firm.id} className="rounded border p-3">
                <p className="font-medium">{firm.name || 'Untitled organization'}</p>
                <p className="text-xs text-muted-foreground">{firm.id}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No organizations found.</p>
          )}
        </CardContent>
      </Card>

      <Link href="/admin" className="text-sm text-primary underline-offset-4 hover:underline">
        Return to Admin Dashboard
      </Link>
    </div>
  );
}
