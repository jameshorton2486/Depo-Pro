import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const supabase = await createSupabaseServerClient();

  const [{ count: totalUsers }, { data: recentUsers }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Users</h1>
          <p className="text-sm text-muted-foreground">Manage roles and user access across organizations.</p>
        </div>
        <Badge variant="secondary">Total Users: {totalUsers ?? 0}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Newest profiles in the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentUsers?.length ? (
            recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{user.full_name || 'Unnamed user'}</p>
                  <p className="text-xs text-muted-foreground">{user.id}</p>
                </div>
                <Badge variant="outline">{user.role || 'UNKNOWN'}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Role history is available via API endpoint{' '}
        <code>/api/admin/users/[id]/role-history</code>.
        {' '}
        <Link href="/admin" className="text-primary underline-offset-4 hover:underline">
          Return to Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
