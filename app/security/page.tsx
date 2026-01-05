// =============================================================================
// SECURITY PAGE
// app/security/page.tsx
//
// Authentication, Authorization, and Audit Trails
// =============================================================================

import Link from 'next/link';
import { 
  Shield, 
  Lock,
  Key,
  Users,
  FileText,
  CheckCircle,
  ArrowRight,
  Eye,
  Clock,
  UserCheck,
  Layers,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';

// =============================================================================
// HERO SECTION
// =============================================================================

function HeroSection() {
  return (
    <section className="relative bg-hero-gradient pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Enterprise Security
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            Enterprise-Grade Security, Built In
          </h1>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
            Legal transcripts demand the highest level of security. Depo-Pro is architected 
            from the ground up with authentication, authorization, and audit trails.
          </p>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// AUTHENTICATION SECTION
// =============================================================================

const AUTH_FEATURES = [
  { icon: Lock, label: 'Secure password hashing' },
  { icon: CheckCircle, label: 'Email verification' },
  { icon: Key, label: 'Password resets' },
  { icon: Users, label: 'SSO readiness' },
] as const;

function AuthenticationSection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <Lock className="h-4 w-4" />
              Authentication
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Passwords Never Touch Our Database
            </h2>
            
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              All authentication is handled by Supabase Auth. Depo-Pro never stores 
              plaintext or hashed passwords in the application database.
            </p>

            {/* Features */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {AUTH_FEATURES.map((feature) => (
                <div key={feature.label} className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{feature.label}</span>
                </div>
              ))}
            </div>

            {/* Security Note */}
            <div className="mt-8 p-6 rounded-xl bg-teal-50 border border-teal-100">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-teal-900 font-medium">Supabase-First Architecture</p>
                  <p className="mt-1 text-sm text-teal-700">
                    User credentials are managed entirely by Supabase's battle-tested auth system. 
                    Your application database only stores user profiles and roles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="mt-12 lg:mt-0">
            <div className="relative aspect-square max-w-md mx-auto rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 p-8">
              {/* Architecture Diagram */}
              <div className="absolute inset-8 flex flex-col justify-between">
                {/* User */}
                <div className="flex justify-center">
                  <div className="px-4 py-3 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-center">
                    <Users className="h-6 w-6 text-white mx-auto mb-1" />
                    <span className="text-xs text-white/80">User</span>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-0.5 h-8 bg-teal-400/50" />
                </div>

                {/* Supabase Auth */}
                <div className="flex justify-center">
                  <div className="px-6 py-4 rounded-lg bg-teal-500/20 backdrop-blur border border-teal-400/30 text-center">
                    <Lock className="h-6 w-6 text-teal-300 mx-auto mb-1" />
                    <span className="text-sm font-medium text-white">Supabase Auth</span>
                    <p className="text-xs text-teal-200 mt-1">Passwords stored here</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-0.5 h-8 bg-indigo-400/50" />
                </div>

                {/* Depo-Pro */}
                <div className="flex justify-center">
                  <div className="px-6 py-4 rounded-lg bg-indigo-500/20 backdrop-blur border border-indigo-400/30 text-center">
                    <Server className="h-6 w-6 text-indigo-300 mx-auto mb-1" />
                    <span className="text-sm font-medium text-white">Depo-Pro DB</span>
                    <p className="text-xs text-indigo-200 mt-1">Profiles & roles only</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// RBAC SECTION
// =============================================================================

const ROLES = [
  {
    name: 'Admin',
    description: 'Full system access, user management, firm settings',
    permissions: ['Manage users', 'View all jobs', 'Configure settings', 'Access reports'],
    color: 'purple',
  },
  {
    name: 'Reporter',
    description: 'Create jobs, upload audio, manage own transcripts',
    permissions: ['Create jobs', 'Upload audio', 'Assign scopists', 'Export transcripts'],
    color: 'indigo',
  },
  {
    name: 'Scopist',
    description: 'Review and edit assigned transcripts',
    permissions: ['View assignments', 'Edit transcripts', 'Flag issues', 'Submit reviews'],
    color: 'teal',
  },
  {
    name: 'Attorney',
    description: 'View and download completed transcripts',
    permissions: ['View transcripts', 'Download exports', 'Add annotations', 'Order copies'],
    color: 'amber',
  },
] as const;

const ROLE_COLORS = {
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
} as const;

function RBACSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
            <UserCheck className="h-4 w-4" />
            Authorization (RBAC)
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Role-Based Access Control
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Every user has a defined role. Access is enforced at middleware, API routes, and UI navigation.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ROLES.map((role) => (
            <div 
              key={role.name}
              className={`rounded-xl border bg-white p-6 ${ROLE_COLORS[role.color].split(' ')[2]}`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLORS[role.color]}`}>
                  {role.name}
                </span>
              </div>
              
              {/* Description */}
              <p className="text-slate-600 mb-4">
                {role.description}
              </p>
              
              {/* Permissions */}
              <ul className="space-y-2">
                {role.permissions.map((perm) => (
                  <li key={perm} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Enforcement Points */}
        <div className="mt-12 p-6 rounded-xl bg-white border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Access Enforced At:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Layers, label: 'Middleware', description: 'Route-level protection before page load' },
              { icon: Server, label: 'API Routes', description: 'Server-side validation on every request' },
              { icon: Eye, label: 'UI Navigation', description: 'Role-aware menus and dashboards' },
            ].map((point) => (
              <div key={point.label} className="flex items-start gap-3 p-4 rounded-lg bg-slate-50">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <point.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{point.label}</p>
                  <p className="text-sm text-slate-600">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// AUDIT TRAILS SECTION
// =============================================================================

function AuditSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-sm font-medium mb-6">
              <FileText className="h-4 w-4" />
              Audit Trails
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Every Action is Recorded
            </h2>
            
            <p className="mt-6 text-lg text-slate-300 leading-relaxed">
              For legal defensibility, every action in Depo-Pro is logged with full context. 
              You can always answer: who, what, when, and why.
            </p>

            {/* What's Logged */}
            <div className="mt-8 space-y-4">
              {[
                { icon: Users, label: 'Who changed what', description: 'User identity tied to every action' },
                { icon: Clock, label: 'When it happened', description: 'Precise timestamps on all events' },
                { icon: FileText, label: 'What version was affected', description: 'Full version history preserved' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual - Audit Log Mock */}
          <div className="mt-12 lg:mt-0">
            <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-xs text-slate-500 font-mono">audit_log.json</span>
              </div>
              
              {/* Log Entries */}
              <div className="p-4 font-mono text-xs space-y-3 max-h-80 overflow-y-auto">
                {[
                  { time: '14:32:15', user: 'jane.smith@firm.com', action: 'TRANSCRIPT_EDITED', target: 'Job #1847', detail: 'Word "plaintiff" corrected to "Plaintiff"' },
                  { time: '14:31:42', user: 'jane.smith@firm.com', action: 'AUDIO_PLAYED', target: 'Job #1847', detail: 'Segment 02:34-02:38' },
                  { time: '14:28:03', user: 'john.doe@firm.com', action: 'JOB_ASSIGNED', target: 'Job #1847', detail: 'Assigned to jane.smith@firm.com' },
                  { time: '14:25:11', user: 'system', action: 'TRANSCRIPTION_COMPLETE', target: 'Job #1847', detail: '847 low-confidence words flagged' },
                  { time: '14:12:00', user: 'john.doe@firm.com', action: 'AUDIO_UPLOADED', target: 'Job #1847', detail: 'deposition_2024.mp3 (45.2 MB)' },
                ].map((entry, i) => (
                  <div key={i} className="flex gap-3 text-slate-400">
                    <span className="text-slate-600">{entry.time}</span>
                    <span className="text-teal-400">{entry.action}</span>
                    <span className="text-slate-300">{entry.user}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-300">{entry.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// COMPLIANCE SECTION
// =============================================================================

function ComplianceSection() {
  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">Compliance & Certifications</h2>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6">
          {[
            { label: 'HIPAA Ready', status: 'Available', color: 'teal' },
            { label: 'SOC 2 Type II', status: 'In Progress', color: 'amber' },
            { label: '256-bit Encryption', status: 'Active', color: 'teal' },
            { label: 'BAA Available', status: 'On Request', color: 'indigo' },
          ].map((item) => (
            <div 
              key={item.label}
              className={`
                flex items-center gap-3 px-5 py-3 rounded-xl border
                ${item.color === 'teal' ? 'bg-teal-50 border-teal-200' : ''}
                ${item.color === 'amber' ? 'bg-amber-50 border-amber-200' : ''}
                ${item.color === 'indigo' ? 'bg-indigo-50 border-indigo-200' : ''}
              `}
            >
              <div className={`w-2 h-2 rounded-full ${
                item.color === 'teal' ? 'bg-teal-500' :
                item.color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500'
              }`} />
              <div>
                <p className="font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-600">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// CTA SECTION
// =============================================================================

function CTASection() {
  return (
    <section className="py-20 lg:py-24 bg-hero-gradient">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Security Questions?
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
          We're happy to discuss our security architecture in detail. 
          Contact us for a security review or to request our SOC 2 report.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            asChild 
            size="lg"
            className="h-12 px-8 text-base font-semibold bg-white text-indigo-900 hover:bg-white/90"
          >
            <Link href="/contact">
              Contact Security Team
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="h-12 px-8 text-base font-semibold bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <Link href="/architecture">
              View Architecture
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function SecurityPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection />
        <AuthenticationSection />
        <RBACSection />
        <AuditSection />
        <ComplianceSection />
        <CTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
