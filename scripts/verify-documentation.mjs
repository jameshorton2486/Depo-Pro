import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = resolve(repoRoot, 'scripts/documentation-policy.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const normalize = (value) => value.split(sep).join('/').replace(/^\.\//, '');
const nullValues = new Set(['', 'null', '~']);

function listMarkdownFiles() {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Unable to enumerate Markdown files with git.');
  }
  return [...new Set(result.stdout.split(/\r?\n/).filter(Boolean).map(normalize))]
    .filter((path) => existsSync(resolve(repoRoot, path)))
    .filter((path) => !policy.excludedPrefixes.some((prefix) => path.startsWith(prefix)))
    .sort();
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line, index) => index <= 4 && line.trim() === '---');
  if (start < 0) return null;
  const endOffset = lines.slice(start + 1).findIndex((line) => line.trim() === '---');
  if (endOffset < 0) return null;
  const metadata = {};
  for (const line of lines.slice(start + 1, start + 1 + endOffset)) {
    const match = line.match(/^([a-z_]+):\s*(.*?)\s*$/);
    if (match) metadata[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return metadata;
}

function resolveRepositoryPath(sourcePath, declaredPath) {
  const clean = declaredPath.trim().replace(/^<|>$/g, '').split('#')[0].replace(/:\d+$/, '');
  if (!clean || /^(https?:|mailto:)/i.test(clean)) return null;
  const normalized = decodeURIComponent(clean.replaceAll('\\', '/'));
  const windowsRepoMarker = normalized.toLowerCase().lastIndexOf('/depo-pro/');
  if (windowsRepoMarker >= 0) return resolve(repoRoot, normalized.slice(windowsRepoMarker + '/depo-pro/'.length));
  if (/^\/?[a-z]:\//i.test(normalized)) return null;
  if (normalized.startsWith('/')) return resolve(repoRoot, normalized.slice(1));
  return resolve(repoRoot, dirname(sourcePath), normalized);
}

function extractMarkdownTargets(content) {
  const targets = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(pattern)) targets.push(match[1].trim());
  const referencePattern = /^\[[^\]]+\]:\s*(\S+)/gm;
  for (const match of content.matchAll(referencePattern)) targets.push(match[1].trim());
  return targets;
}

const files = listMarkdownFiles();
const fileSet = new Set(files);
function resolveMetadataPath(declaredPath) {
  return resolve(repoRoot, declaredPath.replaceAll('\\\\', '/'));
}

const records = files.map((path) => {
  const content = readFileSync(resolve(repoRoot, path), 'utf8');
  return { path, content, metadata: parseFrontmatter(content) };
});

if (process.argv.includes('--write-metadata-baseline')) {
  const baseline = records.filter(({ metadata }) => !metadata?.authority_tier).map(({ path }) => path);
  writeFileSync(resolve(repoRoot, policy.metadataBaseline), `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Wrote ${baseline.length} metadata baseline entries to ${policy.metadataBaseline}.`);
  process.exit(0);
}

const errors = [];
const baseline = JSON.parse(readFileSync(resolve(repoRoot, policy.metadataBaseline), 'utf8'));
const baselineSet = new Set(baseline);

if (policy.schemaVersion !== 1) errors.push(`Unsupported documentation policy schemaVersion: ${policy.schemaVersion}`);
if (baselineSet.size !== baseline.length) errors.push('Metadata baseline contains duplicate paths.');

const manifest = JSON.parse(readFileSync(resolve(repoRoot, policy.manifestPath), 'utf8'));
const manifestIds = new Set();
const manifestPaths = new Set();
const manifestById = new Map();
const manifestAuthorityScopes = new Map();
const manifestRequiredFields = ['id', 'title', 'path', 'category', 'tier', 'status', 'owner', 'authoritative', 'authority_scopes', 'review_cycle', 'last_reviewed', 'governed_by', 'supersedes'];

if (manifest.schema_version !== 1) errors.push(`Unsupported document manifest schema_version: ${manifest.schema_version}`);
if (manifest.layout_frozen !== true) errors.push('Document manifest must declare layout_frozen: true.');
if (!Array.isArray(manifest.documents)) errors.push('Document manifest documents must be an array.');

for (const document of manifest.documents ?? []) {
  for (const field of manifestRequiredFields) {
    if (!(field in document)) errors.push(`${document.id ?? document.path ?? 'unknown manifest entry'}: missing manifest field '${field}'.`);
  }
  if (!/^DOC-\d{4,}$/.test(document.id ?? '')) errors.push(`${document.path ?? 'unknown'}: invalid document ID '${document.id}'.`);
  if (manifestIds.has(document.id)) errors.push(`Duplicate document manifest ID: ${document.id}`);
  if (manifestPaths.has(document.path)) errors.push(`Duplicate document manifest path: ${document.path}`);
  manifestIds.add(document.id);
  manifestPaths.add(document.path);
  manifestById.set(document.id, document);
  if (!document.owner) errors.push(`${document.id}: missing owner.`);
  if (!Array.isArray(document.authority_scopes) || document.authority_scopes.length === 0) errors.push(`${document.id}: missing authority scope.`);
  if (document.authoritative && !document.last_reviewed) errors.push(`${document.id}: authoritative document requires last_reviewed.`);
  if (document.authoritative && !['T1', 'T2', 'T3'].includes(document.tier)) errors.push(`${document.id}: authoritative documents must use T1, T2, or T3.`);
  if (document.authoritative && document.status !== 'ACTIVE') errors.push(`${document.id}: authoritative documents must be ACTIVE.`);
  if (document.tier !== 'T1' && (!Array.isArray(document.governed_by) || document.governed_by.length === 0)) errors.push(`${document.id}: orphaned document has no governing authority.`);
  if (document.authoritative) {
    for (const scope of document.authority_scopes) {
      const owners = manifestAuthorityScopes.get(scope) ?? [];
      owners.push(document.id);
      manifestAuthorityScopes.set(scope, owners);
    }
  }
}

for (const path of files) {
  if (!manifestPaths.has(path)) errors.push(`${path}: managed document exists outside the document manifest.`);
}
for (const path of manifestPaths) {
  if (!fileSet.has(path)) errors.push(`${path}: manifest document is missing from the repository.`);
}
for (const [scope, ids] of manifestAuthorityScopes) {
  if (ids.length > 1) errors.push(`Duplicate manifest authority scope '${scope}': ${ids.join(', ')}`);
}
for (const document of manifest.documents ?? []) {
  for (const id of [...(document.governed_by ?? []), ...(document.supersedes ?? [])]) {
    if (!manifestById.has(id)) errors.push(`${document.id}: relationship references missing document ID ${id}.`);
    if (id === document.id) errors.push(`${document.id}: document cannot reference itself as a governance or supersession dependency.`);
  }
}

for (const relation of ['governed_by', 'supersedes']) {
  const graph = new Map((manifest.documents ?? []).map((document) => [document.id, document[relation] ?? []]));
  for (const start of graph.keys()) {
    const visiting = new Set();
    const visited = new Set();
    const visit = (current) => {
      if (visiting.has(current)) {
        errors.push(`${relation} cycle detected from ${start} through ${current}.`);
        return;
      }
      if (visited.has(current)) return;
      visiting.add(current);
      for (const target of graph.get(current) ?? []) visit(target);
      visiting.delete(current);
      visited.add(current);
    };
    visit(start);
  }
}
for (const path of baseline) {
  if (!fileSet.has(path)) errors.push(`Metadata baseline contains a missing or excluded file: ${path}`);
}

for (const { path, content, metadata } of records) {
  if (metadata?.authority_tier && baselineSet.has(path)) errors.push(`${path}: stale metadata baseline entry; remove it now that governance metadata exists.`);
  if (!metadata?.authority_tier && !baselineSet.has(path)) {
    errors.push(`${path}: missing required documentation metadata; add frontmatter or deliberately update the reviewed baseline.`);
  }
  if (metadata?.authority_tier) {
    for (const field of policy.requiredMetadataFields) {
      if (!(field in metadata)) errors.push(`${path}: missing metadata field '${field}'.`);
    }
    if (metadata.authority_tier && !policy.allowedTiers.includes(metadata.authority_tier)) {
      errors.push(`${path}: invalid authority_tier '${metadata.authority_tier}'.`);
    }
    if (metadata.status && !policy.allowedStatuses.includes(metadata.status)) {
      errors.push(`${path}: invalid status '${metadata.status}'.`);
    }
    if (metadata.ratification && !policy.allowedRatification.includes(metadata.ratification)) {
      errors.push(`${path}: invalid ratification '${metadata.ratification}'.`);
    }
    if (metadata.implementation_status && !policy.allowedImplementationStatuses.includes(metadata.implementation_status)) {
      errors.push(`${path}: invalid implementation_status '${metadata.implementation_status}'.`);
    }
    if (metadata.ratification === 'RATIFIED') {
      if (nullValues.has(metadata.approved_by ?? '')) errors.push(`${path}: RATIFIED documents require approved_by.`);
      if (nullValues.has(metadata.ratified_date ?? '')) errors.push(`${path}: RATIFIED documents require ratified_date.`);
    }
    if (metadata.status === 'ACTIVE' && ['T1', 'T2', 'T3'].includes(metadata.authority_tier) && metadata.ratification !== 'RATIFIED') {
      errors.push(`${path}: active ${metadata.authority_tier} authority must be RATIFIED.`);
    }
    if (metadata.status === 'SUPERSEDED' && nullValues.has(metadata.superseded_by ?? '')) {
      errors.push(`${path}: SUPERSEDED documents require superseded_by.`);
    }
    if (metadata.authority_tier === 'T7') {
      if (nullValues.has(metadata.original_authority_tier ?? '')) errors.push(`${path}: T7 documents require original_authority_tier.`);
      if (nullValues.has(metadata.archive_category ?? '')) errors.push(`${path}: T7 documents require archive_category.`);
    }
    for (const field of ['supersedes', 'superseded_by']) {
      const target = metadata[field];
      if (!target || nullValues.has(target)) continue;
      const absolute = resolveMetadataPath(target);
      if (!existsSync(absolute)) errors.push(`${path}: ${field} target does not exist: ${target}`);
    }
  }

  for (const target of extractMarkdownTargets(content)) {
    const clean = target.replace(/^<|>$/g, '').split('#')[0].replace(/:\d+$/, '');
    if (!clean || /^(https?:|mailto:)/i.test(clean)) continue;
    if (!clean.toLowerCase().endsWith('.md') && !clean.endsWith('/')) continue;
    const absolute = resolveRepositoryPath(path, target);
    if (!absolute || !existsSync(absolute)) errors.push(`${path}: broken local Markdown link: ${target}`);
  }
}

const allowedRoot = new Set(policy.allowedRootMarkdown);
for (const path of files.filter((value) => !value.includes('/'))) {
  if (!allowedRoot.has(path)) errors.push(`${path}: Markdown files at repository root are prohibited.`);
}
for (const allowed of allowedRoot) {
  if (!fileSet.has(allowed)) errors.push(`Required root authority/discovery file is missing: ${allowed}`);
}

const activeScopes = new Map();
for (const { path, metadata } of records) {
  if (!metadata || metadata.status !== 'ACTIVE' || !['T1', 'T2', 'T3'].includes(metadata.authority_tier)) continue;
  const key = metadata.scope;
  const paths = activeScopes.get(key) ?? [];
  paths.push(`${metadata.authority_tier}:${path}`);
  activeScopes.set(key, paths);
}
for (const [key, paths] of activeScopes) {
  if (paths.length > 1) errors.push(`Conflicting active authority declarations for scope ${key}: ${paths.join(', ')}`);
}

const supersessionGraph = new Map();
for (const { path, metadata } of records) {
  if (!metadata || nullValues.has(metadata.superseded_by ?? '')) continue;
  const absolute = resolveMetadataPath(metadata.superseded_by);
  supersessionGraph.set(path, normalize(relative(repoRoot, absolute)));
}
for (const start of supersessionGraph.keys()) {
  const seen = new Set();
  let current = start;
  while (supersessionGraph.has(current)) {
    if (seen.has(current)) {
      errors.push(`Supersession cycle detected from ${start}: ${[...seen, current].join(' -> ')}`);
      break;
    }
    seen.add(current);
    current = supersessionGraph.get(current);
  }
}

if (errors.length) {
  console.error(`Documentation validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const metadataCount = records.filter(({ metadata }) => metadata?.authority_tier).length;
console.log(`Documentation validation passed: ${files.length} files, ${metadataCount} metadata declarations, ${baseline.length} reviewed legacy metadata exceptions.`);
console.log('Checks: manifest inventory, IDs, ownership, authority scopes, governance graph, metadata, links, supersession, and root placement.');
