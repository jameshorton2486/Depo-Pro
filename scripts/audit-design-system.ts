#!/usr/bin/env npx tsx
// =============================================================================
// DESIGN SYSTEM AUDIT SCRIPT
// scripts/audit-design-system.ts
//
// Scans codebase for design system violations
// Usage: npx tsx scripts/audit-design-system.ts
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface Violation {
  file: string;
  line: number;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: string;
  suggestion?: string;
}

interface AuditResult {
  totalFiles: number;
  filesWithViolations: number;
  violations: Violation[];
  summary: Record<string, number>;
}

// =============================================================================
// PATTERNS TO DETECT
// =============================================================================

const PATTERNS = [
  {
    type: 'hex-color',
    pattern: /'#[0-9A-Fa-f]{3,8}'|"#[0-9A-Fa-f]{3,8}"/g,
    severity: 'error' as const,
    message: 'Hardcoded hex color found',
    suggestion: 'Use getStatusClasses() or getChartColor() from lib/status-colors.ts',
  },
  {
    type: 'inline-style',
    pattern: /style=\{\{[^}]*(?:color|background|border)[^}]*\}\}/gi,
    severity: 'warning' as const,
    message: 'Inline style with color found',
    suggestion: 'Use Tailwind classes or status-colors utility',
  },
  {
    type: 'raw-button',
    pattern: /<button(?![^>]*(?:Button))[^>]*className=/gi,
    severity: 'warning' as const,
    message: 'Raw <button> element with className',
    suggestion: 'Use <Button> from @/components/ui/button',
  },
  {
    type: 'raw-input',
    pattern: /<input(?![^>]*type=["'](?:hidden|file|checkbox|radio))[^>]*className=/gi,
    severity: 'info' as const,
    message: 'Raw <input> element',
    suggestion: 'Consider using <Input> from @/components/ui/input',
  },
  {
    type: 'raw-select',
    pattern: /<select[^>]*className=/gi,
    severity: 'info' as const,
    message: 'Raw <select> element',
    suggestion: 'Consider using <Select> from @/components/ui/select',
  },
];

// =============================================================================
// SCANNING
// =============================================================================

const SCAN_DIRS = ['app', 'components'];
const SCAN_EXTENSIONS = ['.tsx', '.jsx'];
const IGNORE_PATTERNS = ['node_modules', '.next', 'dist', 'ui/'];

function shouldScanFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (!SCAN_EXTENSIONS.includes(ext)) return false;
  for (const pattern of IGNORE_PATTERNS) {
    if (filePath.includes(pattern)) return false;
  }
  return true;
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_PATTERNS.some(p => entry.name.includes(p))) {
        files.push(...getAllFiles(fullPath));
      }
    } else if (shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip comments and imports
    if (line.trim().startsWith('//') || line.trim().startsWith('import ')) {
      return;
    }

    for (const check of PATTERNS) {
      const matches = line.match(check.pattern);
      if (matches) {
        // Skip CSS variable references
        if (check.type === 'hex-color' && (line.includes('var(--') || line.includes('hsl('))) {
          continue;
        }

        violations.push({
          file: filePath,
          line: lineNum,
          type: check.type,
          severity: check.severity,
          message: check.message,
          code: line.trim().substring(0, 80),
          suggestion: check.suggestion,
        });
      }
    }
  });

  return violations;
}

// =============================================================================
// REPORT
// =============================================================================

function generateReport(result: AuditResult): string {
  let report = '';

  report += '═══════════════════════════════════════════════════════════════\n';
  report += '🎨 DESIGN SYSTEM AUDIT REPORT\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  report += `📊 Summary:\n`;
  report += `   Files scanned: ${result.totalFiles}\n`;
  report += `   Files with violations: ${result.filesWithViolations}\n`;
  report += `   Total violations: ${result.violations.length}\n\n`;

  report += `📋 By Type:\n`;
  const sortedTypes = Object.entries(result.summary)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [type, count] of sortedTypes) {
    const icon = count > 10 ? '🔴' : count > 5 ? '🟡' : '🟢';
    report += `   ${icon} ${type}: ${count}\n`;
  }

  // Group by file
  const byFile = new Map<string, Violation[]>();
  for (const v of result.violations) {
    const existing = byFile.get(v.file) || [];
    existing.push(v);
    byFile.set(v.file, existing);
  }

  report += '\n═══════════════════════════════════════════════════════════════\n';
  report += '📁 VIOLATIONS BY FILE\n';
  report += '═══════════════════════════════════════════════════════════════\n';

  const sortedFiles = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [file, violations] of sortedFiles.slice(0, 10)) {
    report += `\n📄 ${file} (${violations.length})\n`;
    for (const v of violations.slice(0, 5)) {
      const icon = v.severity === 'error' ? '❌' : v.severity === 'warning' ? '⚠️' : 'ℹ️';
      report += `   ${icon} L${v.line}: ${v.message}\n`;
    }
    if (violations.length > 5) {
      report += `   ... and ${violations.length - 5} more\n`;
    }
  }

  if (sortedFiles.length > 10) {
    report += `\n... and ${sortedFiles.length - 10} more files\n`;
  }

  return report;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('🔍 Scanning for design system violations...\n');

  const allFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    allFiles.push(...getAllFiles(dir));
  }

  console.log(`Found ${allFiles.length} files to scan\n`);

  const allViolations: Violation[] = [];
  const filesWithViolations = new Set<string>();

  for (const file of allFiles) {
    const violations = scanFile(file);
    if (violations.length > 0) {
      filesWithViolations.add(file);
      allViolations.push(...violations);
    }
  }

  const summary: Record<string, number> = {};
  for (const v of allViolations) {
    summary[v.type] = (summary[v.type] || 0) + 1;
  }

  const result: AuditResult = {
    totalFiles: allFiles.length,
    filesWithViolations: filesWithViolations.size,
    violations: allViolations,
    summary,
  };

  console.log(generateReport(result));

  // Save JSON
  fs.writeFileSync('design-audit-results.json', JSON.stringify(result, null, 2));
  console.log('\n📄 Results saved to design-audit-results.json');

  const errorCount = allViolations.filter(v => v.severity === 'error').length;
  if (errorCount > 0) {
    console.log(`\n❌ ${errorCount} errors found`);
  } else {
    console.log('\n✅ No critical violations!');
  }
}

main();
