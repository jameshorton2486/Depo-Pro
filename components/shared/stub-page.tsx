// =============================================================================
// STUB PAGE TEMPLATE
// components/shared/stub-page.tsx
//
// Use this component for all "Coming Soon" stub pages
// =============================================================================

import Link from 'next/link';
import { 
  CreditCard, 
  BarChart3, 
  Settings, 
  FolderOpen, 
  AlertCircle,
  Wrench,
  type LucideIcon 
} from 'lucide-react';

interface StubPageProps {
  title: string;
  description?: string;
  icon?: 'billing' | 'reports' | 'settings' | 'folder' | 'alert' | 'wrench';
  backLink?: string;
  backLabel?: string;
}

const icons: Record<string, LucideIcon> = {
  billing: CreditCard,
  reports: BarChart3,
  settings: Settings,
  folder: FolderOpen,
  alert: AlertCircle,
  wrench: Wrench,
};

export function StubPage({ 
  title, 
  description = 'This feature is coming in a future release.',
  icon = 'wrench',
  backLink = '/dashboard',
  backLabel = 'Back to Dashboard',
}: StubPageProps) {
  const Icon = icons[icon];

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <Icon className="w-16 h-16 text-gray-400 mx-auto" />
        <h1 className="text-2xl font-bold mt-4">{title}</h1>
        <p className="text-gray-600 mt-2">{description}</p>
        <Link 
          href={backLink}
          className="inline-block mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
