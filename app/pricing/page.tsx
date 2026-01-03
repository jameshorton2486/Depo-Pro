// =============================================================================
// PRICING PAGE
// app/pricing/page.tsx
//
// Pricing information (beta placeholder)
// =============================================================================

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Pricing</h1>
          <p className="text-xl text-gray-600">
            We're currently in beta. Contact us for early access pricing.
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Beta Access</h2>
              <p className="text-gray-600">
                Join our beta program and help shape the future of legal transcription.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Early Access</h3>
                  <p className="text-sm text-gray-600">
                    Get access to all features before general availability
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Priority Support</h3>
                  <p className="text-sm text-gray-600">
                    Direct access to our team for feedback and support
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Influence Product Roadmap</h3>
                  <p className="text-sm text-gray-600">
                    Your feedback directly shapes future features
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Special Beta Pricing</h3>
                  <p className="text-sm text-gray-600">
                    Lock in discounted rates for early adopters
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/contact"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
              >
                Contact Us for Beta Access
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              General availability pricing will be announced before the end of beta.
              Beta participants will receive special pricing guarantees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
