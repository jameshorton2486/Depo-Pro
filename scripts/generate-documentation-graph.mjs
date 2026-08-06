import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { GRAPH_SCHEMA_VERSION, RELATIONSHIP_TYPES, validateManifest } from './documentation-graph-lib.mjs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd(), out=path.join(root,'docs/generated'), check=process.argv.includes('--check');
const manifestText=await readFile(path.join(root,'docs/document-manifest.json'),'utf8');
const manifest=JSON.parse(manifestText);
const buildPolicy=JSON.parse(await readFile(path.join(root,'scripts/documentation-build-policy.json'),'utf8'));
const generatedReadmes=new Set(buildPolicy.rendered_readmes??[]);
const manifestValidation=validateManifest(manifest);
if(manifestValidation.errors.length){console.error('Manifest graph validation failed.');for(const error of manifestValidation.errors)console.error(`- ERROR: ${error}`);process.exit(1)}
const docs=[...manifest.documents].sort((a,b)=>a.id.localeCompare(b.id));
const byId=new Map(docs.map(d=>[d.id,d])), byPath=new Map(docs.map(d=>[d.path,d]));
const hash=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
const meta={generated:true,generated_on:manifest.generated_on,source:'docs/document-manifest.json',source_sha256:hash};
const edge=(type,source,target)=>{if(!RELATIONSHIP_TYPES.includes(type))throw new Error(`Unsupported relationship type: ${type}`);return {type,source,target}};
const unique=a=>[...new Set(a)].sort();
async function atomicWrite(target,content){const temporary=target+'.tmp-'+process.pid;await writeFile(temporary,content,'utf8');await rename(temporary,target)}

function linkedIds(source,markdown){
  const raw=[];
  for(const regex of [/!?\[[^\]]*\]\(([^)]+)\)/g,/^\s*\[[^\]]+\]:\s*(\S+)/gm]) for(const m of markdown.matchAll(regex)) raw.push(m[1]);
  return unique(raw.flatMap(value=>{
    let target=value.trim().replace(/^<|>$/g,'').split('#')[0].split('?')[0];
    if(!target||/^(?:https?:|mailto:|tel:|data:)/i.test(target)) return [];
    try{target=decodeURIComponent(target)}catch{}
    target=target.replaceAll('\\','/');
    if(target.includes('/Depo-Pro/')) target=target.split('/Depo-Pro/').at(-1);
    const resolved=target.startsWith('/')?target.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(source),target));
    if(!resolved.toLowerCase().endsWith('.md')) return [];
    return byPath.has(resolved)?[byPath.get(resolved).id]:[];
  }));
}

function cycles(edges){
  const adj=new Map(); for(const e of edges){if(!adj.has(e.source))adj.set(e.source,[]);adj.get(e.source).push(e.target)}
  const active=new Set(),done=new Set(),found=[];
  function visit(id,trail){if(active.has(id)){found.push([...trail.slice(trail.indexOf(id)),id].join(' -> '));return}if(done.has(id))return;active.add(id);for(const next of adj.get(id)??[])visit(next,[...trail,id]);active.delete(id);done.add(id)}
  for(const d of docs)visit(d.id,[]); return unique(found);
}

const governance=docs.flatMap(d=>d.governed_by.map(id=>edge('GOVERNANCE',d.id,id)));
const supersession=docs.flatMap(d=>d.supersedes.map(id=>edge('SUPERSESSION',d.id,id)));
const references=[];
for(const d of docs){const md=generatedReadmes.has(d.path)?'':await readFile(path.join(root,d.path),'utf8');for(const id of linkedIds(d.path,md))if(id!==d.id)references.push(edge('REFERENCE',d.id,id))}
references.sort((a,b)=>`${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
const hierarchy=[];
for(const d of docs){let dir=path.posix.dirname(d.path);while(dir!=='.'){const parent=byPath.get(`${dir}/README.md`);if(parent&&parent.id!==d.id){hierarchy.push(edge('HIERARCHY',d.id,parent.id));break}const next=path.posix.dirname(dir);if(next===dir)break;dir=next}}
hierarchy.sort((a,b)=>`${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
const review=docs.flatMap(d=>d.review_cycle==='as-needed'?[]:d.governed_by.map(id=>edge('REVIEW',d.id,id)));
const ownership=docs.map(d=>edge('OWNERSHIP',d.id,`OWNER:${d.owner}`));
const edges=[...governance,...supersession,...references,...hierarchy,...review,...ownership];

const children=new Map(docs.map(d=>[d.id,[]]));for(const e of governance)children.get(e.target)?.push(e.source);for(const ids of children.values())ids.sort();
const roots=docs.filter(d=>d.governed_by.length===0).map(d=>d.id),reachable=new Set();
function walk(id){if(reachable.has(id))return;reachable.add(id);for(const child of children.get(id)??[])walk(child)}for(const id of roots)walk(id);
const orphanAuthorities=docs.filter(d=>d.authoritative&&d.tier!=='T1'&&d.governed_by.length===0).map(d=>d.id);
const unreachable=docs.filter(d=>!reachable.has(d.id)).map(d=>d.id);
const multipleParents=docs.filter(d=>d.governed_by.length>1).map(d=>({id:d.id,parents:d.governed_by}));
const ownerIds=new Set(docs.map(d=>`OWNER:${d.owner}`));
const missing=edges.filter(e=>!byId.has(e.source)||(!byId.has(e.target)&&!ownerIds.has(e.target)));
const governanceCycles=cycles(governance),supersessionCycles=cycles(supersession);
const inboundGov=new Map(docs.map(d=>[d.id,0])),inboundRef=new Map(docs.map(d=>[d.id,0]));for(const e of governance)inboundGov.set(e.target,inboundGov.get(e.target)+1);for(const e of references)inboundRef.set(e.target,inboundRef.get(e.target)+1);
const unusedScopes=docs.filter(d=>d.authoritative&&inboundGov.get(d.id)===0&&inboundRef.get(d.id)===0).flatMap(d=>d.authority_scopes.map(scope=>({id:d.id,scope})));
const supersededTargets=new Set(supersession.map(e=>e.target));
const deadChains=docs.filter(d=>['SUPERSEDED','DEPRECATED'].includes(d.status)&&!supersededTargets.has(d.id)).map(d=>d.id);
const archivedReferences=references.filter(e=>byId.get(e.source).status==='ACTIVE'&&byId.get(e.target).status==='ARCHIVED');
const diagnostics={orphan_authorities:orphanAuthorities,unreachable_documents:unreachable,multiple_parents:multipleParents,governance_cycles:governanceCycles,supersession_cycles:supersessionCycles,missing_relationships:missing,unused_authority_scopes:unusedScopes,dead_supersession_chains:deadChains,active_references_to_archived:archivedReferences};
const owners=Object.fromEntries(unique(docs.map(d=>d.owner)).map(owner=>[owner,docs.filter(d=>d.owner===owner).map(d=>d.id)]));
const documentNodes=docs.map(d=>Object.fromEntries(['id','title','path','tier','status','owner','authoritative','authority_scopes','review_cycle','last_reviewed'].map(k=>[k,d[k]])));
const nodes=[...documentNodes.map(node=>({entity_type:'DOCUMENT',...node})),...unique(docs.map(d=>d.owner)).map(owner=>({entity_type:'OWNER',id:`OWNER:${owner}`,name:owner}))];
const authorities=docs.filter(d=>d.authoritative).map(d=>({id:d.id,title:d.title,tier:d.tier,status:d.status,scopes:d.authority_scopes,parents:d.governed_by.filter(id=>byId.get(id)?.authoritative),children:children.get(d.id).filter(id=>byId.get(id)?.authoritative)}));
function previousManifest() {
  try {
    const commits=execFileSync('git',['log','--format=%H','--','docs/document-manifest.json'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
    for(const commit of commits){
      const text=execFileSync('git',['show',`${commit}:docs/document-manifest.json`],{cwd:root,encoding:'utf8'});
      const candidate=JSON.parse(text);
      if(JSON.stringify(candidate)!==JSON.stringify(manifest))return {commit,manifest:candidate};
    }
  } catch {}
  return {commit:null,manifest:{documents:[]}};
}
const prior=previousManifest(), priorById=new Map(prior.manifest.documents.map(d=>[d.id,d]));
const added=docs.filter(d=>!priorById.has(d.id)).map(d=>d.id), removed=prior.manifest.documents.filter(d=>!byId.has(d.id)).map(d=>d.id).sort();
const changesFor=field=>docs.filter(d=>priorById.has(d.id)&&JSON.stringify(priorById.get(d.id)[field])!==JSON.stringify(d[field])).map(d=>({id:d.id,before:priorById.get(d.id)[field],after:d[field]}));
const manifestHistory={schema_version:GRAPH_SCHEMA_VERSION,...meta,compared_to_commit:prior.commit,added_documents:added,removed_documents:removed,authority_changes:changesFor('authoritative'),owner_changes:changesFor('owner'),supersession_changes:changesFor('supersedes')};
const authorityIds=new Set(authorities.map(d=>d.id));
const mermaidLines=['%% GENERATED FILE. DO NOT EDIT. Run npm run docs:graph.','flowchart TD'];
for(const authority of authorities){const label=`${authority.id}: ${authority.title}`.replaceAll('"','&quot;');mermaidLines.push(`  ${authority.id.replaceAll('-','_')}["${label}"]`)}
for(const item of governance.filter(e=>authorityIds.has(e.source)&&authorityIds.has(e.target)))mermaidLines.push(`  ${item.source.replaceAll('-','_')} -->|GOVERNANCE| ${item.target.replaceAll('-','_')}`);
for(const item of supersession.filter(e=>authorityIds.has(e.source)&&authorityIds.has(e.target)))mermaidLines.push(`  ${item.source.replaceAll('-','_')} -.->|SUPERSESSION| ${item.target.replaceAll('-','_')}`);
const mermaid=mermaidLines.join('\n')+'\n';
const errorFindings=[...orphanAuthorities.map(id=>`Orphan authority ${id}`),...unreachable.map(id=>`Unreachable document ${id}`),...multipleParents.map(v=>`Multiple governance parents ${v.id}`),...governanceCycles.map(v=>`Governance cycle ${v}`),...supersessionCycles.map(v=>`Supersession cycle ${v}`),...missing.map(v=>`Missing relationship ${v.source} -> ${v.target}`)];
const warningFindings=[];
const advisoryFindings=[...unusedScopes.map(v=>`Unused authority scope ${v.id}:${v.scope}`),...deadChains.map(id=>`Dead supersession chain ${id}`),...archivedReferences.map(v=>`Active ${v.source} references archived ${v.target}`)];
const integrity={status:errorFindings.length?'FAIL':'PASS',errors:errorFindings,warnings:warningFindings,advisories:advisoryFindings};
const reportValue=a=>a.length?a.map(v=>typeof v==='string'?v:JSON.stringify(v)).join(', '):'None';
const listSection=items=>items.length?items.map(item=>`- ${item}`).join('\n'):'None';
const report=`<!-- GENERATED FILE. DO NOT EDIT. Run npm run docs:graph. -->
# Documentation Dependency Report

Source: \`docs/document-manifest.json\`
Manifest SHA-256: \`${hash}\`
Generated: ${manifest.generated_on}

## Integrity

**${integrity.status}**

### Errors

${listSection(errorFindings)}

### Warnings

${listSection(warningFindings)}

### Advisories

${listSection(advisoryFindings)}

## Summary

| Metric | Count |
| --- | ---: |
| Documents | ${docs.length} |
| Authorities | ${authorities.length} |
| Relationships | ${edges.length} |
| Governance | ${governance.length} |
| Supersession | ${supersession.length} |
| References | ${references.length} |
| Hierarchy | ${hierarchy.length} |
| Review dependencies | ${review.length} |
| Ownership | ${ownership.length} |
| Owners | ${Object.keys(owners).length} |

## Ownership

| Owner | Documents |
| --- | ---: |
${Object.entries(owners).map(([owner,ids])=>`| ${owner.replaceAll('|','\\|')} | ${ids.length} |`).join('\n')}

## Authority Inventory

| ID | Tier | Status | Title | Scopes |
| --- | --- | --- | --- | --- |
${authorities.map(d=>`| ${d.id} | ${d.tier} | ${d.status} | ${d.title.replaceAll('|','\\|')} | ${d.scopes.join(', ')} |`).join('\n')}
`;const outputs=new Map([
 ['document-graph.json',JSON.stringify({schema_version:GRAPH_SCHEMA_VERSION,...meta,nodes,edges,owners,integrity,diagnostics},null,2)+'\n'],
 ['authority-tree.json',JSON.stringify({schema_version:GRAPH_SCHEMA_VERSION,...meta,roots:authorities.filter(d=>d.parents.length===0).map(d=>d.id),documents:authorities,unused_authority_scopes:unusedScopes},null,2)+'\n'],
 ['supersession-tree.json',JSON.stringify({schema_version:GRAPH_SCHEMA_VERSION,...meta,edges:supersession,roots:unique(supersession.map(e=>e.source).filter(id=>!supersededTargets.has(id))),cycles:supersessionCycles,dead_chains:deadChains},null,2)+'\n'],
 ['governance-graph.json',JSON.stringify({schema_version:GRAPH_SCHEMA_VERSION,...meta,roots,edges:governance,reachable_documents:[...reachable].sort(),diagnostics:{orphan_authorities:orphanAuthorities,unreachable_documents:unreachable,multiple_parents:multipleParents,cycles:governanceCycles}},null,2)+'\n'],
 ['dependency-report.md',report],
 ['document-graph.mmd',mermaid],
 ['manifest-history.json',JSON.stringify(manifestHistory,null,2)+'\n']
]);
const hard=[orphanAuthorities,unreachable,multipleParents,governanceCycles,supersessionCycles,missing].flat();
if(hard.length){console.error('Documentation graph integrity failed.');for(const [name,values] of Object.entries(diagnostics))if(values.length)console.error(`- ${name}: ${reportValue(values)}`);process.exitCode=1}
else if(check){const stale=[];for(const [name,expected] of outputs){try{if(await readFile(path.join(out,name),'utf8')!==expected)stale.push(name)}catch{stale.push(name)}}if(stale.length){console.error(`Generated documentation graph is stale or missing: ${stale.join(', ')}. Run npm run docs:graph.`);process.exitCode=1}else console.log(`Documentation graph check passed: ${docs.length} documents, ${edges.length} relationships, ${outputs.size} generated artifacts.`)}
else{await mkdir(out,{recursive:true});for(const [name,content] of outputs)await atomicWrite(path.join(out,name),content);console.log(`Generated ${outputs.size} documentation graph artifacts from ${docs.length} manifest records.`)}
