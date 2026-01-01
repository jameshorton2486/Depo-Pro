// =============================================================================
// INVOICE PREVIEW MODAL
// =============================================================================
// Location: components/billing/invoice-preview-modal.tsx
// Phase: 5 - UI Completion
//
// This component displays a pre-charge cost estimate.
// It does NOT create invoices or charge anything.
//
// Shows:
// - Line item breakdown
// - Total cost
// - Warnings (if any)
// - Finalization status
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PreviewLineItem {
  label: string;
  description?: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  serviceType: string;
}

interface InvoicePreview {
  jobId: string;
  jobTitle: string;
  caseName: string;
  currency: string;
  items: PreviewLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  warnings: string[];
  canFinalize: boolean;
  blockedReason?: string;
}

interface InvoicePreviewModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: () => void;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getServiceTypeLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    TRANSCRIPTION_AUTOMATED: 'Transcription',
    MODEL_UPGRADE: 'Model Upgrade',
    AUDIO_ENHANCEMENT_MANUAL: 'RX Enhancement',
    CONFIDENCE_REVIEW: 'Word Review',
    FULL_SCOPIST_REVIEW: 'Full Review',
  };
  return labels[serviceType] || serviceType;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function InvoicePreviewModal({
  jobId,
  isOpen,
  onClose,
  onApprove,
}: InvoicePreviewModalProps) {
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/billing/invoice-preview?jobId=${jobId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load preview');
        }
        return res.json();
      })
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, jobId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Invoice Preview
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {preview && !loading && (
            <>
              {/* Job Info */}
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-gray-500">Job</p>
                <p className="font-medium">{preview.jobTitle}</p>
                <p className="text-sm text-gray-600">{preview.caseName}</p>
              </div>

              {/* Line Items */}
              <div className="space-y-3 mb-4">
                {preview.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.quantity} × {formatCurrency(item.unitPriceCents)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 ml-4">
                      {formatCurrency(item.totalCents)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(preview.subtotalCents)}</span>
                </div>
                {preview.taxCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(preview.taxCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(preview.totalCents)}</span>
                </div>
              </div>

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      {preview.warnings.map((warning, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Finalization Status */}
              {preview.canFinalize ? (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800">
                      Ready for billing
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      {preview.blockedReason || 'Cannot finalize yet'}
                    </span>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-gray-500 mt-4">
                This is a cost estimate based on current processing options.
                No charges will occur until you approve and submit for billing.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {onApprove && preview?.canFinalize && (
            <button
              onClick={onApprove}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Approve & Create Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Cost Estimate Component (For Job Creation Form)
// -----------------------------------------------------------------------------

interface CostEstimateProps {
  estimatedDurationMinutes: number;
  audioProcessingMode: 'AUTOMATED' | 'MANUAL_RX';
  asrModelTier: 'STANDARD' | 'ENHANCED';
}

export function CostEstimatePreview({
  estimatedDurationMinutes,
  audioProcessingMode,
  asrModelTier,
}: CostEstimateProps) {
  const [estimate, setEstimate] = useState<{
    items: PreviewLineItem[];
    totalCents: number;
    warnings: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (estimatedDurationMinutes <= 0) {
      setEstimate(null);
      return;
    }

    setLoading(true);

    const timeout = setTimeout(() => {
      fetch('/api/billing/invoice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimatedDurationMinutes,
          audioProcessingMode,
          asrModelTier,
        }),
      })
        .then((res) => res.json())
        .then(setEstimate)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300); // Debounce

    return () => clearTimeout(timeout);
  }, [estimatedDurationMinutes, audioProcessingMode, asrModelTier]);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-blue-900 mb-2">
        Estimated Cost
      </h4>
      <div className="space-y-1">
        {estimate.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-blue-800">{item.label}</span>
            <span className="text-blue-900 font-medium">
              {formatCurrency(item.totalCents)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between">
        <span className="font-semibold text-blue-900">Total</span>
        <span className="font-semibold text-blue-900">
          {formatCurrency(estimate.totalCents)}
        </span>
      </div>
      {estimate.warnings.length > 0 && (
        <p className="text-xs text-blue-700 mt-2">
          {estimate.warnings[0]}
        </p>
      )}
    </div>
  );
}

export default InvoicePreviewModal;
