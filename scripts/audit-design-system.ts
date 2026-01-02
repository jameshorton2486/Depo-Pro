// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM AUDIT SCRIPT
// scripts/audit-design-system.ts
//
// Scans codebase for design system violations:
// - Hex colors (bg-[#...], text-[#...])
// - Inline styles (style={{}})
// - Raw HTML form elements (<button>, <input>, <select>)
// - Missing page containers
// - Raw Tailwind color classes
// ═══════════════════════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const SCAN_DIRS = ['app', 'components'];
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/ui/**', // shadcn/ui components are allowed
  '**/*.d.ts',
  '**/globals.css',
];

// ═══════════════════════════════════════════════════════════════════════════════
// VIOLATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Violation {
  file: string;
  line: number;
  column: number;
  type: 'hex-color' | 'inline-style' | 'raw-element' | 'raw-color' | 'missing-container';
  message: string;
  code: string;
}

const violations: Violation[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const HEX_COLOR_PATTERN = /(?:bg|text|border|ring)-\[#[\da-fA-F]{3,8}\]/g;
const INLINE_STYLE_PATTERN = /style=\{\{/g;
const RAW_BUTTON_PATTERN = /<button(?!\s+onClick=\{)/g; // Allow onClick handlers
const RAW_INPUT_PATTERN = /<input(?!\s+type="hidden")/g; // Allow hidden inputs
const RAW_SELECT_PATTERN = /<select/g;
const RAW_COLORS = [
  /bg-(red|blue|green|yellow|purple|pink|indigo|gray|grey|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d{2,3}/g,
  /text-(red|blue|green|yellow|purple|pink|indigo|gray|grey|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d{2,3}/g,
  /border-(red|blue|green|yellow|purple|pink|indigo|gray|grey|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d{2,3}/g,
];

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function scanFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(process.cwd(), filePath);

  // Skip UI component files (they're the source of truth)
  if (relativePath.includes('/ui/')) {
    return;
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for hex colors
    const hexMatches = line.matchAll(HEX_COLOR_PATTERN);
    for (const match of hexMatches) {
      violations.push({
        file: relativePath,
        line: lineNum,
        column: (match.index || 0) + 1,
        type: 'hex-color',
        message: `Hex color detected: ${match[0]}. Use semantic tokens (bg-primary, text-foreground, etc.)`,
        code: line.trim(),
      });
    }

    // Check for inline styles
    if (INLINE_STYLE_PATTERN.test(line)) {
      violations.push({
        file: relativePath,
        line: lineNum,
        column: line.indexOf('style={{') + 1,
        type: 'inline-style',
        message: 'Inline style detected. Use Tailwind utility classes instead.',
        code: line.trim(),
      });
    }

    // Check for raw HTML elements
    if (RAW_BUTTON_PATTERN.test(line) && !line.includes('from components/ui')) {
      violations.push({
        file: relativePath,
        line: lineNum,
        column: line.indexOf('<button') + 1,
        type: 'raw-element',
        message: 'Raw <button> detected. Use <Button> component from components/ui.',
        code: line.trim(),
      });
    }

    if (RAW_INPUT_PATTERN.test(line) && !line.includes('from components/ui')) {
      violations.push({
        file: relativePath,
        line: lineNum,
        column: line.indexOf('<input') + 1,
        type: 'raw-element',
        message: 'Raw <input> detected. Use <Input> component from components/ui.',
        code: line.trim(),
      });
    }

    if (RAW_SELECT_PATTERN.test(line) && !line.includes('from components/ui')) {
      violations.push({
        file: relativePath,
        line: lineNum,
        column: line.indexOf('<select') + 1,
        type: 'raw-element',
        message: 'Raw <select> detected. Use <Select> component from components/ui.',
        code: line.trim(),
      });
    }

    // Check for raw Tailwind colors
    RAW_COLORS.forEach((pattern) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        // Allow certain semantic uses (destructive, muted, etc.)
        if (
          match[0].includes('destructive') ||
          match[0].includes('muted') ||
          match[0].includes('background') ||
          match[0].includes('foreground') ||
          match[0].includes('border') ||
          match[0].includes('primary') ||
          match[0].includes('secondary') ||
          match[0].includes('accent')
        ) {
          continue;
        }

        violations.push({
          file: relativePath,
          line: lineNum,
          column: (match.index || 0) + 1,
          type: 'raw-color',
          message: `Raw Tailwind color detected: ${match[0]}. Use semantic tokens instead.`,
          code: line.trim(),
        });
      }
    });
  });

  // Check for missing page container (only for page.tsx files)
  if (filePath.endsWith('page.tsx') && !content.includes('container max-w-7xl')) {
    // Allow exceptions for special pages
    if (
      !content.includes('layout.tsx') &&
      !content.includes('template.tsx') &&
      !content.includes('loading.tsx') &&
      !content.includes('error.tsx') &&
      !content.includes('not-found.tsx')
    ) {
      violations.push({
        file: relativePath,
        line: 1,
        column: 1,
        type: 'missing-container',
        message:
          'Page missing standard container. Add: <div className="container max-w-7xl space-y-6 py-6">',
        code: lines[0]?.trim() || '',
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🔍 Scanning for design system violations...\n');

  // Find all TypeScript/TSX files
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  Directory ${dir} does not exist, skipping...`);
      continue;
    }
    const pattern = `${dir}/**/*.{ts,tsx}`;
    const matches = await glob(pattern, { ignore: IGNORE_PATTERNS, cwd: process.cwd() });
    files.push(...matches.map((f) => path.resolve(f)));
  }

  console.log(`📁 Scanning ${files.length} files...\n`);

  // Scan each file
  files.forEach(scanFile);

  // Report results
  if (violations.length === 0) {
    console.log('✅ No design system violations found!\n');
    process.exit(0);
  }

  // Group violations by type
  const byType = violations.reduce(
    (acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    },
    {} as Record<string, Violation[]>
  );

  console.log(`❌ Found ${violations.length} violation(s):\n`);

  // Print violations by type
  const typeLabels: Record<string, string> = {
    'hex-color': '🔴 Hex Colors',
    'inline-style': '🔴 Inline Styles',
    'raw-element': '🔴 Raw HTML Elements',
    'raw-color': '🔴 Raw Tailwind Colors',
    'missing-container': '🔴 Missing Page Container',
  };

  Object.entries(byType).forEach(([type, vs]) => {
    console.log(`\n${typeLabels[type] || type} (${vs.length}):`);
    console.log('─'.repeat(80));

    vs.forEach((v) => {
      console.log(`\n  ${v.file}:${v.line}:${v.column}`);
      console.log(`  ${v.message}`);
      console.log(`  ${v.code.substring(0, 100)}${v.code.length > 100 ? '...' : ''}`);
    });
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\n❌ Total violations: ${violations.length}`);
  console.log('\n📖 See DESIGN_RULES.md for required fixes.\n');

  process.exit(1);
}

main().catch((error) => {
  console.error('Error running audit:', error);
  process.exit(1);
});
