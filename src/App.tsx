// App.tsx is used only for standalone dev previews.
// Production entry: main.tsx → mountEditor().
import { ExtractedFieldsTable } from "./components/ExtractedFieldsTable/ExtractedFieldsTable";
import { mockCaseRecord, mockConflictAlternates } from "./components/ExtractedFieldsTable/mockRecord";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <h1 className="font-serif text-xl font-semibold text-slate-800">
            Intake — Extracted Fields Review
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Smith v. Meridian Infrastructure Partners &mdash; 2024-CV-08821 &mdash; Mock Data
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
