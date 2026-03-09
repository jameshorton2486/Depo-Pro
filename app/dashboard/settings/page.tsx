import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const SETTINGS_LINKS = [
  { title: 'Profile', description: 'Update profile and personal details.', href: '/settings/profile' },
  { title: 'Users', description: 'Manage team users and access.', href: '/settings/users' },
  { title: 'Roles', description: 'Review role permissions and responsibilities.', href: '/settings/roles' },
  { title: 'Integrations', description: 'Configure third-party integrations.', href: '/settings/integrations' },
  { title: 'AI Models', description: 'Manage AI and transcription model preferences.', href: '/settings/ai-models' },
  { title: 'Audio Processing', description: 'Tune audio and transcription processing defaults.', href: '/settings/audio-processing' },
];

export default async function DashboardSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Configure workspace, user, and processing preferences.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SETTINGS_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="no-underline">
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/20">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Open {item.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
