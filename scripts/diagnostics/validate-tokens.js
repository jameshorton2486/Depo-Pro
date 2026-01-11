#!/usr/bin/env node
/**
 * Design Token Validation Script
 * 
 * Scans for invalid token patterns that will break CSS parsing:
 * - --spacing(8) - Function calls in token names
 * - var(--spacing(8)) - Function calls in var()
 * - --color(primary) - Nested function calls
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INVALID_PATTERNS = [
  /--[a-z-]+\([^)]*\)/g,           // Function calls in token names
  /var\(--[^)]*\([^)]*\)/g,         // Function calls in var()
  /\[--[^:]+:--[^)]+\(/g,           // Invalid arbitrary value syntax
];

const SCAN_DIRS = [
  'app',
  'components',
  'styles',
];

let foundErrors = false;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    INVALID_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        console.error(`❌ ${filePath}:${index + 1}`);
        console.error(`   ${line.trim()}`);
        foundErrors = true;
      }
    });
  });
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach((file) => {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      scanDirectory(fullPath);
    } else if (file.isFile() && (file.name.endsWith('.css') || file.name.endsWith('.tsx') || file.name.endsWith('.ts'))) {
      scanFile(fullPath);
    }
  });
}

console.log('🔍 Scanning for invalid token patterns...\n');

SCAN_DIRS.forEach((dir) => {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
});

if (foundErrors) {
  console.error('\n❌ Invalid token patterns found!');
  console.error('See DESIGN_TOKENS.md for correct usage patterns.');
  process.exit(1);
} else {
  console.log('✅ No invalid token patterns found!');
  process.exit(0);
}
