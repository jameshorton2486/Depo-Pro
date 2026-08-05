export const GRAPH_SCHEMA_VERSION = '1.0.0';
export const RELATIONSHIP_TYPES = Object.freeze(['GOVERNANCE','SUPERSESSION','REFERENCE','HIERARCHY','REVIEW','OWNERSHIP']);

function cycles(documents, relation) {
  const adjacency = new Map(documents.map((document) => [document.id, document[relation] ?? []]));
  const active = new Set(), complete = new Set(), found = [];
  function visit(id, trail) {
    if (active.has(id)) { found.push([...trail.slice(trail.indexOf(id)), id].join(' -> ')); return; }
    if (complete.has(id)) return;
    active.add(id);
    for (const next of adjacency.get(id) ?? []) visit(next, [...trail, id]);
    active.delete(id); complete.add(id);
  }
  for (const document of documents) visit(document.id, []);
  return [...new Set(found)].sort();
}

export function validateManifest(manifest) {
  const documents = Array.isArray(manifest?.documents) ? manifest.documents : [];
  const errors = [], warnings = [], advisories = [];
  const ids = new Set(), paths = new Set(), scopes = new Map();
  for (const document of documents) {
    if (!document.id) errors.push('Document is missing an ID.');
    else if (ids.has(document.id)) errors.push(`Duplicate document ID: ${document.id}`);
    else ids.add(document.id);
    if (!document.path) errors.push(`${document.id ?? 'Unknown document'} is missing a path.`);
    else if (paths.has(document.path)) errors.push(`Duplicate document path: ${document.path}`);
    else paths.add(document.path);
    if (!document.owner?.trim()) errors.push(`${document.id ?? 'Unknown document'} is missing an owner.`);
    if (!Array.isArray(document.governed_by)) errors.push(`${document.id ?? 'Unknown document'} has invalid governed_by.`);
    if (!Array.isArray(document.supersedes)) errors.push(`${document.id ?? 'Unknown document'} has invalid supersedes.`);
    if (document.authoritative) for (const scope of document.authority_scopes ?? []) {
      if (scopes.has(scope)) errors.push(`Duplicate authority scope '${scope}': ${scopes.get(scope)}, ${document.id}`);
      else scopes.set(scope, document.id);
    }
  }
  for (const document of documents) {
    for (const relation of ['governed_by','supersedes']) for (const target of document[relation] ?? []) if (!ids.has(target)) errors.push(`${document.id} references missing ${relation} target ${target}.`);
    if (document.authoritative && document.tier !== 'T1' && (document.governed_by ?? []).length === 0) errors.push(`Orphan authority: ${document.id}`);
    if ((document.governed_by ?? []).length > 1) errors.push(`Multiple governance parents: ${document.id}`);
  }
  for (const cycle of cycles(documents, 'governed_by')) errors.push(`Governance cycle: ${cycle}`);
  for (const cycle of cycles(documents, 'supersedes')) errors.push(`Supersession cycle: ${cycle}`);
  const children = new Map(documents.map((document) => [document.id, []]));
  for (const document of documents) for (const parent of document.governed_by ?? []) children.get(parent)?.push(document.id);
  const reachable = new Set();
  function walk(id) { if (reachable.has(id)) return; reachable.add(id); for (const child of children.get(id) ?? []) walk(child); }
  for (const document of documents.filter((item) => (item.governed_by ?? []).length === 0)) walk(document.id);
  for (const document of documents) if (!reachable.has(document.id)) errors.push(`Disconnected document: ${document.id}`);
  return { errors: [...new Set(errors)].sort(), warnings, advisories };
}
