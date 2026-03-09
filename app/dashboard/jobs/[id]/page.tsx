import { redirect } from 'next/navigation';

interface DashboardJobAliasPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardJobAliasPage({ params }: DashboardJobAliasPageProps) {
  const { id } = await params;
  redirect(`/jobs/${id}`);
}
