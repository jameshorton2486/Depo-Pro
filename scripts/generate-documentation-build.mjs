import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { BUILD_SCHEMA_VERSION, headingsFromMarkdown, healthFrom, keywordsFor, matchesNavigationGroup, navigationEntry } from './documentation-build-lib.mjs';

const root=process.cwd(), check=process.argv.includes('--check');
const readJson=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const manifest=await readJson('docs/document-manifest.json');
const graph=await readJson('docs/generated/document-graph.json');
const policy=await readJson('scripts/documentation-build-policy.json');
if(policy.schema_version!==BUILD_SCHEMA_VERSION)throw new Error(`Unsupported documentation build policy ${policy.schema_version}`);
const documents=[...manifest.documents].sort((a,b)=>a.id.localeCompare(b.id));
const generatedReadmes=new Set(policy.rendered_readmes);
const canonical=value=>JSON.stringify(value);
const manifestHash=createHash('sha256').update(canonical(manifest)).digest('hex');
const graphHash=createHash('sha256').update(canonical(graph)).digest('hex');
const provenance={generated:true,generated_on:manifest.generated_on,manifest_sha256:manifestHash,graph_sha256:graphHash};
const json=value=>JSON.stringify(value,null,2)+'\n';
const outputs=new Map();
async function atomicWrite(target,content){const temporary=target+'.tmp-'+process.pid;await writeFile(temporary,content,'utf8');await rename(temporary,target)}
const navigation={};
for(const [name,group] of Object.entries(policy.navigation_groups)){
  const entries=documents.filter(document=>matchesNavigationGroup(document,group)).map(navigationEntry);
  navigation[name]={schema_version:BUILD_SCHEMA_VERSION,...provenance,name,title:group.title,document_count:entries.length,documents:entries};
  outputs.set(`docs/generated/navigation/${name}-index.json`,json(navigation[name]));
}

const searchDocuments=[];
for(const document of documents){
  const headings=generatedReadmes.has(document.path)?[]:headingsFromMarkdown(await readFile(path.join(root,document.path),'utf8'));
  searchDocuments.push({id:document.id,title:document.title,path:document.path,category:document.category,owner:document.owner,authority:document.authoritative,tier:document.tier,status:document.status,keywords:keywordsFor(document,headings),headings});
}
outputs.set('docs/generated/search-index.json',json({schema_version:BUILD_SCHEMA_VERSION,...provenance,document_count:searchDocuments.length,documents:searchDocuments}));

const health=healthFrom(manifest,graph);
health.stale_indexes=0;
outputs.set('docs/generated/documentation-health.json',json({schema_version:BUILD_SCHEMA_VERSION,...provenance,...health}));
const list=items=>items.length?items.map(item=>`- ${item}`).join('\n'):'None';
const healthMarkdown=`<!-- GENERATED FILE. DO NOT EDIT. Run npm run docs:build. -->\n# Documentation Health\n\n**Repository status: ${health.status}**\n\n| Metric | Count |\n| --- | ---: |\n| Managed documents | ${health.managed_documents} |\n| Authority documents | ${health.authority_documents} |\n| Active documents | ${health.active_documents} |\n| Draft documents | ${health.draft_documents} |\n| Archived documents | ${health.archived_documents} |\n| Relationships | ${health.relationships} |\n| Governance cycles | ${health.governance_cycles} |\n| Supersession cycles | ${health.supersession_cycles} |\n| Duplicate authority scopes | ${health.duplicate_authority_scopes} |\n| Orphan authorities | ${health.orphan_authorities} |\n| Unreachable documents | ${health.unreachable_documents} |\n| Stale indexes | ${health.stale_indexes} |\n\n## Errors\n\n${list(health.errors)}\n\n## Warnings\n\n${list(health.warnings)}\n\n## Advisories\n\n${list(health.advisories)}\n`;
outputs.set('docs/generated/documentation-health.md',healthMarkdown);

const relativeLink=(from,to)=>{const value=path.posix.relative(path.posix.dirname(from),to);return value.includes(' ')?`<${value}>`:value};
const table=(from,entries)=>entries.map(item=>`| [${item.title.replaceAll('|','\\|')}](${relativeLink(from,item.path)}) | ${item.id} | ${item.tier} | ${item.status} | ${item.owner.replaceAll('|','\\|')} |`).join('\n');
const marker='<!-- GENERATED FILE. DO NOT EDIT. Run npm run docs:build. -->';
const authorities=documents.filter(document=>document.authoritative).map(navigationEntry);
const rootReadme=`${marker}\n# Depo-Pro Documentation\n\nThe [document manifest](document-manifest.json) is the canonical documentation inventory. Navigation, search, graphs, and health reports are deterministic build products.\n\nBefore changing application code, read [AGENTS.md](../AGENTS.md) and the [Master Architecture](architecture/MASTER_ARCHITECTURE.md).\n\n## Documentation areas\n\n| Area | Documents | Generated index |\n| --- | ---: | --- |\n${Object.entries(navigation).filter(([name])=>name!=='root').map(([name,index])=>`| ${index.title} | ${index.document_count} | [${name}-index.json](generated/navigation/${name}-index.json) |`).join('\n')}\n\n## Authority documents\n\n| Document | ID | Tier | Status | Owner |\n| --- | --- | --- | --- | --- |\n${table('docs/README.md',authorities)}\n\n## Generated discovery\n\n- [Documentation health](generated/documentation-health.md)\n- [Search index](generated/search-index.json)\n- [Document graph](generated/dependency-report.md)\n- [Mermaid authority graph](generated/document-graph.mmd)\n\n## Build\n\nRun \`npm run docs:build\` after changing the manifest or authored documentation. CI runs \`npm run docs:check\` to reject stale generated outputs.\n`;
outputs.set('docs/README.md',rootReadme);
const readmeGroups=new Map([['docs/audits/README.md','audits'],['docs/archive/README.md','archive'],['docs/standards/README.md','standards']]);
for(const [readmePath,name] of readmeGroups){
  const index=navigation[name], entries=index.documents.filter(item=>item.path!==readmePath);
  outputs.set(readmePath,`${marker}\n# ${index.title}\n\nThis index is generated from [the documentation manifest](${relativeLink(readmePath,'docs/document-manifest.json')}). Do not edit it by hand.\n\nManaged documents: **${entries.length}**\n\n| Document | ID | Tier | Status | Owner |\n| --- | --- | --- | --- | --- |\n${table(readmePath,entries)}\n`);
}

if(check){
  const stale=[];
  for(const [file,expected] of outputs){try{if(await readFile(path.join(root,file),'utf8')!==expected)stale.push(file)}catch{stale.push(file)}}
  if(stale.length){console.error(`Documentation build outputs are stale or missing:\n${stale.map(file=>`- ${file}`).join('\n')}\nRun npm run docs:build.`);process.exitCode=1}else console.log(`Documentation build check passed: ${Object.keys(navigation).length} navigation indexes, ${searchDocuments.length} search records, ${outputs.size} outputs.`);
}else{
  for(const [file,content] of outputs){await mkdir(path.dirname(path.join(root,file)),{recursive:true});await atomicWrite(path.join(root,file),content)}
  console.log(`Generated ${outputs.size} Phase 3 documentation build outputs.`);
}
