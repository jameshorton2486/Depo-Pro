// ═══════════════════════════════════════════════════════════════
// ISSUE CODE PALETTE
// ═══════════════════════════════════════════════════════════════
// Sidebar palette for selecting issue codes

'use client';

import { IssueCode, getAllIssueCodes } from '@/types/issue-code';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface IssueCodePaletteProps {
  selectedCode?: IssueCode | null;
  onSelectCode: (code: IssueCode) => void;
  customCodes?: IssueCode[];
  onCreateCustom?: () => void;
}

export function IssueCodePalette({
  selectedCode,
  onSelectCode,
  customCodes = [],
  onCreateCustom,
}: IssueCodePaletteProps) {
  const allCodes = getAllIssueCodes(customCodes);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Issue Codes</h3>
        <div className="space-y-2">
          {allCodes.map((code) => (
            <button
              key={code.code}
              onClick={() => onSelectCode(code)}
              className={`w-full text-left px-3 py-2 rounded-md border-2 transition-colors ${
                selectedCode?.code === code.code
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: code.color }}
                />
                <span className="text-sm font-medium text-gray-900">{code.label}</span>
              </div>
              {code.description && (
                <p className="text-xs text-gray-500 mt-1">{code.description}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {onCreateCustom && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateCustom}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Code
        </Button>
      )}
    </div>
  );
}

