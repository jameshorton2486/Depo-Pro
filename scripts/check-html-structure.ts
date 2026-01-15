#!/usr/bin/env tsx
/**
 * HTML Structure CI Check
 * 
 * Validates that <html> and <body> tags only appear in:
 * - app/layout.tsx (root layout)
 * - app/global-error.tsx (global error boundary)
 * 
 * Fails CI if violations are found.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Violation {
  file: string;
  line: number;
  content: string;
  tag: string;
}

const ALLOWED_FILES = [
  'app/layout.tsx',
  'app/global-error.tsx',
];

const FORBIDDEN_TAGS = ['<html', '</html>', '<body', '</body>', '<head', '</head>'];

const IGNORE_PATTERNS = [
  /HTMLFormElement/,
  /HTMLInputElement/,
  /HTMLButtonElement/,
  /HTMLTextAreaElement/,
  /HTMLSelectElement/,
  /HTMLAnchorElement/,
  /HTMLImageElement/,
  /HTMLDivElement/,
  /HTMLSpanElement/,
  /HTMLParagraphElement/,
  /HTMLElement/,
  /HTMLCollection/,
  /HTMLDocument/,
  /HTMLBodyElement/,
  /HTMLHeadElement/,
  /HTMLHtmlElement/,
];

function getAllTsxFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = fullPath.replace(baseDir + '/', '').replace(/\\/g, '/');

    // Skip node_modules, .next, etc.
    if (entry.name.startsWith('.') && entry.name !== '.cursor') {
      continue;
    }
    if (entry.name === 'node_modules' || entry.name === '.next') {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...getAllTsxFiles(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      // Only check app/ and components/ directories
      if (relativePath.startsWith('app/') || relativePath.startsWith('components/')) {
        files.push(relativePath);
      }
    }
  }

  return files;
}

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const isAllowed = ALLOWED_FILES.some(allowed => filePath === allowed);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip comments and ignore patterns
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Check for forbidden tags
      FORBIDDEN_TAGS.forEach(tag => {
        if (line.includes(tag)) {
          // Check if it's an ignore pattern (TypeScript types)
          const isIgnored = IGNORE_PATTERNS.some(pattern => pattern.test(line));
          
          if (!isIgnored) {
            // If file is not allowed and contains forbidden tag, it's a violation
            if (!isAllowed) {
              violations.push({
                file: filePath,
                line: index + 1,
                content: line.trim(),
                tag,
              });
            }
          }
        }
      });
    });
  } catch (error) {
    // File might not exist or be unreadable, skip it
    console.warn(`Warning: Could not read ${filePath}: ${error}`);
  }

  return violations;
}

function main() {
  const projectRoot = process.cwd();
  const violations: Violation[] = [];

  console.log('🔍 Checking HTML structure compliance...\n');

  // Get all TSX/TS files in app/ and components/
  const files = getAllTsxFiles(join(projectRoot, 'app'))
    .concat(getAllTsxFiles(join(projectRoot, 'components')));

  console.log(`📁 Scanning ${files.length} files...\n`);

  // Check each file
  files.forEach(file => {
    const fileViolations = checkFile(join(projectRoot, file));
    violations.push(...fileViolations);
  });

  // Report results
  if (violations.length === 0) {
    console.log('✅ All files comply with HTML structure rules!\n');
    console.log('✅ <html> and <body> tags only found in allowed locations:');
    ALLOWED_FILES.forEach(file => console.log(`   - ${file}`));
    process.exit(0);
  } else {
    console.error('❌ HTML structure violations found:\n');
    
    violations.forEach(violation => {
      console.error(`   ${violation.file}:${violation.line}`);
      console.error(`   Found: ${violation.tag}`);
      console.error(`   Line: ${violation.content}`);
      console.error('');
    });

    console.error('📋 Rules:');
    console.error('   - <html> and <body> tags are ONLY allowed in:');
    ALLOWED_FILES.forEach(file => console.error(`     • ${file}`));
    console.error('   - All other files must use semantic containers (<div>, <main>, etc.)\n');

    console.error('🔧 How to fix:');
    console.error('   1. Remove <html> and <body> tags from the violating files');
    console.error('   2. Use semantic HTML containers instead');
    console.error('   3. Only app/layout.tsx should contain document-level tags\n');

    process.exit(1);
  }
}

main();
