/* ============================================================================
   NAVIGATION NORMALIZER
   Enforces globally unique, role-scoped navigation IDs
   Works with lib/navigation.ts single-file structure
   
   NOTE: This script modifies lib/navigation.ts in place.
   Make sure you have a backup or commit before running.
============================================================================ */

import fs from 'fs';
import path from 'path';
import { NAVIGATION } from '../lib/navigation';

type NavItem = {
  id?: string;
  label: string;
  href: string;
  icon?: unknown;
  description?: string;
  badge?: string | number;
};

type NavSection = {
  section: string;
  icon?: unknown;
  items: NavItem[];
  collapsed?: boolean;
};

type NavigationSchema = NavSection[];

const NAV_FILE = path.resolve('lib/navigation.ts');

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeItemId(item: NavItem, section: NavSection, role: string): string {
  // If ID already follows the pattern, keep it
  const expectedPrefix = `${role.toLowerCase()}-${slugify(section.section)}-`;
  if (item.id && item.id.startsWith(expectedPrefix)) {
    return item.id;
  }
  
  // Generate new ID: role-section-label
  return `${role.toLowerCase()}-${slugify(section.section)}-${slugify(item.label)}`;
}

function normalizeSchema(schema: NavigationSchema, role: string): NavigationSchema {
  return schema.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      id: normalizeItemId(item, section, role),
    })),
  }));
}

function processNavigationFile() {
  console.log(`[INFO] Reading ${NAV_FILE}...`);
  
  if (!fs.existsSync(NAV_FILE)) {
    console.error(`[FAIL] ${NAV_FILE} not found`);
    process.exit(1);
  }

  const src = fs.readFileSync(NAV_FILE, 'utf-8');
  
  // Get schemas from imported NAVIGATION
  const roleSchemas: Array<{ role: string; schema: NavigationSchema }> = [];
  
  for (const [role, schema] of Object.entries(NAVIGATION)) {
    roleSchemas.push({ role: role.toUpperCase(), schema });
  }

  if (roleSchemas.length === 0) {
    console.error('[FAIL] No navigation schemas found');
    process.exit(1);
  }

  console.log(`[INFO] Found ${roleSchemas.length} navigation schemas`);

  // Normalize each schema
  const normalizedSchemas: Array<{ role: string; varName: string; schema: NavigationSchema }> = [];
  const allIds = new Set<string>();
  
  for (const { role, schema } of roleSchemas) {
    const normalized = normalizeSchema(schema, role);
    
    // Check for duplicates
    for (const section of normalized) {
      for (const item of section.items) {
        if (allIds.has(item.id!)) {
          console.error(`[FAIL] Duplicate ID after normalization: ${item.id}`);
          process.exit(1);
        }
        allIds.add(item.id!);
      }
    }
    
    normalizedSchemas.push({
      role,
      varName: `${role}_NAV`,
      schema: normalized,
    });
  }

  // Build ID mapping (old -> new) and replace IDs in place
  const idMappings: Array<{ oldId: string; newId: string }> = [];
  
  for (const { role, schema } of roleSchemas) {
    const normalized = normalizeSchema(schema, role);
    
    // Build mapping of old IDs to new IDs
    for (let i = 0; i < schema.length; i++) {
      const oldSection = schema[i];
      const newSection = normalized[i];
      
      for (let j = 0; j < oldSection.items.length; j++) {
        const oldItem = oldSection.items[j];
        const newItem = newSection.items[j];
        
        if (oldItem.id && oldItem.id !== newItem.id) {
          idMappings.push({ oldId: oldItem.id, newId: newItem.id! });
        }
      }
    }
  }

  // Replace IDs in source file using regex (preserves everything else including icons)
  let newContent = src;
  for (const { oldId, newId } of idMappings) {
    // Match: id: 'oldId' or id: "oldId"
    const pattern = new RegExp(`(id:\\s*['"])${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'g');
    newContent = newContent.replace(pattern, `$1${newId}$2`);
  }

  // Write back
  fs.writeFileSync(NAV_FILE, newContent);
  
  console.log(`[SUCCESS] Normalized ${normalizedSchemas.length} navigation schemas`);
  console.log(`[INFO] Updated ${idMappings.length} navigation item IDs`);
  console.log(`[INFO] Total unique IDs: ${allIds.size}`);
}

// Run
try {
  processNavigationFile();
  console.log('\n✅ Navigation normalization complete');
  console.log('⚠️  Please review lib/navigation.ts and restore icon references if needed');
} catch (error) {
  console.error('\n❌ Navigation normalization failed:', error);
  process.exit(1);
}
