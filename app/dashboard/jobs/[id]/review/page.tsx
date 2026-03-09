import { redirect } from 'next/navigation';

interface DashboardJobReviewAliasPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardJobReviewAliasPage({ params }: DashboardJobReviewAliasPageProps) {
  const { id } = await params;
  redirect(`/jobs/${id}/review`);
}
