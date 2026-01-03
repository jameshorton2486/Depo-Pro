// =============================================================================
// FEATURES PAGE
// app/features/page.tsx
//
// Detailed feature descriptions
// =============================================================================

import Link from 'next/link';
import { 
  Mic, 
  AlertCircle, 
  Users, 
  FileText, 
  Shield, 
  Clock, 
  CheckCircle,
  Calendar,
  Lock,
  Download,
  Search
} from 'lucide-react';

const features = [
  {
    title: "AI-Powered Transcription",
    description: "Deepgram Nova-3 model optimized for legal terminology and accuracy. Automatic speaker diarization and timestamp alignment.",
    icon: Mic,
    details: [
      "Real-time transcription processing",
      "Legal terminology recognition",
      "Speaker identification and labeling",
      "Timestamp synchronization"
    ],
  },
  {
    title: "Low-Confidence Word Review",
    description: "Scopists efficiently review uncertain words with audio sync. Click any word to jump to the exact moment in the audio.",
    icon: AlertCircle,
    details: [
      "Audio-synchronized word review",
      "Confidence threshold customization",
      "Bulk review workflows",
      "Review progress tracking"
    ],
  },
  {
    title: "Role-Based Workflow",
    description: "Separate dashboards for reporters, scopists, and administrators. Each role sees only what they need.",
    icon: Users,
    details: [
      "Reporter dashboard for job management",
      "Scopist queue for review assignments",
      "Admin console for system oversight",
      "Attorney read-only access"
    ],
  },
  {
    title: "Professional Export",
    description: "DOCX and PDF exports with legal formatting standards. Multiple export profiles for different use cases.",
    icon: FileText,
    details: [
      "Court-ready Word format",
      "Review PDF with annotations",
      "Custom export profiles",
      "Export history tracking"
    ],
  },
  {
    title: "Calendar & Scheduling",
    description: "Manage availability, view assignments, and schedule depositions. Visual calendar with conflict detection.",
    icon: Calendar,
    details: [
      "Availability block management",
      "Job assignment visualization",
      "Conflict warnings",
      "Calendar integration ready"
    ],
  },
  {
    title: "Transcript Versioning",
    description: "Immutable version history at key lifecycle points. Track changes and restore previous versions if needed.",
    icon: Clock,
    details: [
      "Automatic version snapshots",
      "Version comparison tools",
      "Restore capabilities",
      "Complete audit trail"
    ],
  },
  {
    title: "Security & Compliance",
    description: "HIPAA-ready infrastructure with end-to-end encryption, role-based access control, and comprehensive audit logging.",
    icon: Shield,
    details: [
      "End-to-end encryption",
      "Role-based access control",
      "Comprehensive audit logging",
      "HIPAA compliance path"
    ],
  },
  {
    title: "Transcript Locking",
    description: "Finalize transcripts to prevent accidental edits. Admin override available with full audit trail.",
    icon: Lock,
    details: [
      "Hard lock on finalization",
      "Admin override with reason",
      "Immutable finalized transcripts",
      "Legal defensibility"
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Features</h1>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
            Everything you need for professional legal transcription workflows
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow"
              >
                <feature.icon className="w-12 h-12 text-indigo-600 mb-4" />
                <h2 className="text-2xl font-bold mb-3">{feature.title}</h2>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-indigo-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Try Depo-Pro?</h2>
          <p className="text-gray-600 mb-8">
            Start your free trial today and experience the future of legal transcription.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/contact"
              className="bg-white hover:bg-gray-50 text-indigo-600 px-8 py-3 rounded-lg font-semibold border-2 border-indigo-600 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
