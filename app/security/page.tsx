// =============================================================================
// SECURITY PAGE
// app/security/page.tsx
//
// Security practices and compliance information
// =============================================================================

import { Shield, Lock, Eye, FileCheck, AlertTriangle, CheckCircle } from 'lucide-react';

const securityFeatures = [
  {
    title: "End-to-End Encryption",
    description: "All data is encrypted in transit and at rest using industry-standard encryption protocols.",
    icon: Lock,
  },
  {
    title: "SOC 2 Type II Compliance Path",
    description: "Infrastructure designed to meet SOC 2 Type II requirements. Certification in progress.",
    icon: Shield,
  },
  {
    title: "HIPAA-Ready Infrastructure",
    description: "Built with HIPAA compliance in mind. Business Associate Agreement templates available.",
    icon: FileCheck,
  },
  {
    title: "Role-Based Access Control",
    description: "Granular permissions ensure users only access data they're authorized to see.",
    icon: Eye,
  },
  {
    title: "Audit Logging",
    description: "Comprehensive audit trail for all sensitive actions. Immutable logs for legal defensibility.",
    icon: AlertTriangle,
  },
  {
    title: "Secure File Storage",
    description: "Files stored in Supabase with encrypted storage and secure access controls.",
    icon: Lock,
  },
];

const complianceItems = [
  "Data encryption at rest (AES-256)",
  "Data encryption in transit (TLS 1.3)",
  "Access logs retained for 6 years",
  "User authentication enforced",
  "Complete audit trail",
  "Business Associate Agreement template ready",
  "Incident response plan documented",
  "Regular security assessments scheduled",
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Security & Compliance</h1>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
            Your data security is our top priority
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Security Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <feature.icon className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">HIPAA Readiness Checklist</h2>
            <div className="bg-gray-50 rounded-lg p-8">
              <ul className="space-y-3">
                {complianceItems.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-center text-gray-600 mt-6">
              We're committed to maintaining the highest security standards. 
              For specific compliance questions, please{' '}
              <a href="/contact" className="text-indigo-600 hover:underline">
                contact our security team
              </a>.
            </p>
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Data Protection</h2>
            <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Data Retention</h3>
                <p className="text-gray-600">
                  We follow strict data retention policies. Transcripts are retained indefinitely 
                  while active, with archival policies for completed work. Audit logs are retained 
                  for 7 years minimum.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Backup & Recovery</h3>
                <p className="text-gray-600">
                  Daily automated backups with point-in-time recovery capabilities. Backups are 
                  stored in geographically separate locations for disaster recovery.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Access Controls</h3>
                <p className="text-gray-600">
                  Multi-factor authentication available. Role-based access ensures users only see 
                  data they're authorized to access. All access attempts are logged and monitored.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
