// App.tsx is used only for standalone dev previews.
// Production entry: main.tsx → mountEditor().
import { ExtractedFieldsTable } from "./components/ExtractedFieldsTable/ExtractedFieldsTable";
import { mockCaseRecord, mockConflictAlternates } from "./components/ExtractedFieldsTable/mockRecord";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="mx-auto max-w-6xl">
        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Extracted Fields Review
            </h1>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              Intake — Stage 1
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Smith v. Meridian Infrastructure Partners &mdash; Case No. 2024-CV-08821
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Review all extracted fields below. Confirm accurate values, resolve conflicts, and verify required fields before proceeding.
          </p>
        </div>

        <ExtractedFieldsTable
          record={mockCaseRecord}
          conflictAlternates={mockConflictAlternates}
        />
      </div>
    </div>
  );
}
