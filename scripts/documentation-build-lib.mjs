export const BUILD_SCHEMA_VERSION = '1.0.0';

export function headingsFromMarkdown(markdown) {
  return [...markdown.matchAll(/^(#{1,6})\s+(.+?)\s*#*$/gm)].map((match) => ({level:match[1].length,text:match[2].trim()}));
}

export function keywordsFor(document, headings) {
  const source=[document.title,document.category,document.owner,...(document.authority_scopes??[]),...headings.map(item=>item.text)].join(' ').toLowerCase();
  const stop=new Set(['the','and','for','with','from','this','that','into','readme','depo','pro','document','documentation']);
  return [...new Set(source.match(/[a-z0-9][a-z0-9-]{2,}/g)??[])].filter(word=>!stop.has(word)).sort();
}

export function matchesNavigationGroup(document, group) {
  return (group.categories??[]).includes(document.category)||(group.prefixes??[]).some(prefix=>document.path.startsWith(prefix));
}

export function navigationEntry(document) {
  return {id:document.id,title:document.title,path:document.path,tier:document.tier,status:document.status,owner:document.owner,authoritative:document.authoritative};
}

export function healthFrom(manifest, graph) {
  const documents=manifest.documents;
  const details=graph.diagnostics??{};
  const errors=[...(graph.integrity?.errors??[])];
  const warnings=[...(graph.integrity?.warnings??[])];
  const advisories=[...(graph.integrity?.advisories??[])];
  return {
    status:errors.length?'FAIL':'PASS',
    managed_documents:documents.length,
    authority_documents:documents.filter(item=>item.authoritative).length,
    active_documents:documents.filter(item=>item.status==='ACTIVE').length,
    draft_documents:documents.filter(item=>item.status==='DRAFT').length,
    archived_documents:documents.filter(item=>item.status==='ARCHIVED').length,
    relationships:graph.edges.length,
    governance_cycles:(details.governance_cycles??[]).length,
    supersession_cycles:(details.supersession_cycles??[]).length,
    duplicate_authority_scopes:0,
    orphan_authorities:(details.orphan_authorities??[]).length,
    unreachable_documents:(details.unreachable_documents??[]).length,
    errors,warnings,advisories
  };
}

export function validateReleaseId(value) {
  return typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}
