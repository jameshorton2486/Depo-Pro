#!/usr/bin/env node

/**
 * Log Viewer Script
 * Usage: node scripts/view-logs.js [category] [--tail N] [--errors]
 */

const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
const args = process.argv.slice(2);

const category = args.find(a => !a.startsWith('--')) || 'all';
const tailLines = parseInt(args.find(a => a.startsWith('--tail='))?.split('=')[1] || '50');
const errorsOnly = args.includes('--errors');

function getLogFiles() {
  if (!fs.existsSync(logsDir)) {
    console.log('No logs directory found.');
    return [];
  }
  
  let files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
  
  if (category !== 'all') {
    files = files.filter(f => f.startsWith(category));
  }
  
  if (errorsOnly) {
    files = files.filter(f => f.startsWith('errors'));
  }
  
  return files.sort().reverse();
}

function readLastLines(filePath, n) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  return lines.slice(-n).join('\n');
}

// Main
console.log(`\n📋 Log Viewer - Category: ${category}, Last ${tailLines} lines\n`);
console.log('='.repeat(80));

const files = getLogFiles();

if (files.length === 0) {
  console.log('No log files found.');
  process.exit(0);
}

files.slice(0, 5).forEach(file => {
  const filePath = path.join(logsDir, file);
  console.log(`\n📁 ${file}\n` + '-'.repeat(40));
  console.log(readLastLines(filePath, tailLines));
});

console.log('\n' + '='.repeat(80));
console.log(`Total log files: ${files.length}`);
