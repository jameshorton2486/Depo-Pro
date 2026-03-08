// Migrated from Prisma to Supabase queries — PASS 2A
// =============================================================================
// USER MANAGEMENT PAGE
// app/settings/users/page.tsx
//
// Admin user management interface
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listUsers } from '@/lib/supabase/queries/admin';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UsersSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  const usersList = await listUsers(supabase);

  // Map to expected format
  const users = usersList.map((u: any) => ({
    id: u.id,
    firstName: u.user_metadata?.firstName || '',
    lastName: u.user_metadata?.lastName || '',
    email: u.email || '',
    role: u.user_metadata?.role ?? 'UNASSIGNED',
    createdAt: u.created_at || new Date().toISOString(),
  })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-semibold">Name</th>
              <th className="text-left p-4 font-semibold">Email</th>
              <th className="text-left p-4 font-semibold">Role</th>
              <th className="text-left p-4 font-semibold">Created</th>
              <th className="text-left p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-4">
                  {u.firstName} {u.lastName}
                </td>
                <td className="p-4 text-sm text-gray-600">{u.email}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button className="text-indigo-600 hover:underline text-sm flex items-center">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    {u.id !== currentUser.id && (
                      <button className="text-red-600 hover:underline text-sm flex items-center">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


