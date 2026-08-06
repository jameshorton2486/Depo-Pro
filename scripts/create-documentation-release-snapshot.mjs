import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { BUILD_SCHEMA_VERSION, validateReleaseId } from './documentation-build-lib.mjs';

const release=process.argv[2];
if(!validateReleaseId(release)){console.error('Usage: npm run docs:snapshot -- <release-id>');process.exit(1)}
const root=process.cwd(), parent=path.join(root,'docs/archive/releases'), target=path.join(parent,release);
await mkdir(parent,{recursive:true});
try{await mkdir(target,{recursive:false})}catch(error){console.error(`Release snapshot already exists or cannot be created: ${target}`);process.exit(1)}
const sources={
  'manifest.json':'docs/document-manifest.json',
  'graph.json':'docs/generated/document-graph.json',
  'search-index.json':'docs/generated/search-index.json',
  'documentation-health.md':'docs/generated/documentation-health.md'
};
const navigation={};
for(const name of ['root','architecture','standards','audits','reports','operations','archive'])navigation[name]=JSON.parse(await readFile(path.join(root,`docs/generated/navigation/${name}-index.json`),'utf8'));
const copied={};
for(const [name,source] of Object.entries(sources)){const content=await readFile(path.join(root,source));await writeFile(path.join(target,name),content);copied[name]=createHash('sha256').update(content).digest('hex')}
const navigationContent=JSON.stringify({schema_version:BUILD_SCHEMA_VERSION,release,navigation},null,2)+'\n';
await writeFile(path.join(target,'navigation.json'),navigationContent,'utf8');copied['navigation.json']=createHash('sha256').update(navigationContent).digest('hex');
await writeFile(path.join(target,'snapshot.json'),JSON.stringify({schema_version:BUILD_SCHEMA_VERSION,release,created_from:'docs:build',files:copied},null,2)+'\n','utf8');
console.log(`Created immutable documentation snapshot ${release} with ${Object.keys(copied).length} artifacts.`);
