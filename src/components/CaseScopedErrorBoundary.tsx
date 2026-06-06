import React from "react";

interface CaseScopedErrorBoundaryProps {
  children: React.ReactNode;
  onBackToCases: () => void | Promise<void>;
}

interface CaseScopedErrorBoundaryState {
  error: Error | null;
}

export class CaseScopedErrorBoundary extends React.Component<
  CaseScopedErrorBoundaryProps,
  CaseScopedErrorBoundaryState
> {
  state: CaseScopedErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): CaseScopedErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Case-scoped render failure", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10"
          data-testid="case-scoped-error-card"
        >
          <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">Case Load Error</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">This case could not be opened.</h2>
            <p className="mt-3 text-sm text-slate-600">
              The selected case payload is malformed or incomplete. Return to the Case Browser to open a different case.
            </p>
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {this.state.error.message}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void this.props.onBackToCases()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to Cases
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
