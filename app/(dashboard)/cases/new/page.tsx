import { CaseIntake } from '@/components/cases/case-intake';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewCasePage() {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    redirect('/login');
  }

  // Only ADMIN, REPORTER, and AGENCY can create cases
  const allowedRoles = ['ADMIN', 'REPORTER', 'AGENCY'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Case Intake</h1>
        <p className="text-muted-foreground mt-1">
          Upload deposition documents for AI-powered extraction
        </p>
      </div>
      <CaseIntake />
    </div>
  );
}
