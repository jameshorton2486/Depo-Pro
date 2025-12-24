// ═══════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════
// Home page with login/register links

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect to dashboard if already logged in
  const session = await getCurrentUser();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-4xl text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Depo-Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional deposition and transcription management for court reporters and scopists
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold text-lg mb-2">Job Management</h3>
            <p className="text-gray-600 text-sm">
              Track depositions, assignments, and deadlines in one place
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold text-lg mb-2">Team Collaboration</h3>
            <p className="text-gray-600 text-sm">
              Assign jobs to scopists and manage workflows seamlessly
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2">Insights & Reports</h3>
            <p className="text-gray-600 text-sm">
              Monitor productivity and track completed jobs
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/register">
              Get Started
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              Sign In
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-12 border-t border-gray-200 mt-12">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <Link href="/features" className="hover:text-gray-900">Features</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/security" className="hover:text-gray-900">Security</Link>
            <Link href="/about" className="hover:text-gray-900">About</Link>
            <Link href="/contact" className="hover:text-gray-900">Contact</Link>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            © {new Date().getFullYear()} Depo-Pro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
