import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRAPH_SCHEMA_VERSION, RELATIONSHIP_TYPES, validateManifest } from '../scripts/documentation-graph-lib.mjs';

const document = (id, overrides={}) => ({id,title:id,path:`${id}.md`,tier:'T2',status:'ACTIVE',owner:'Architecture',authoritative:false,authority_scopes:[],review_cycle:'annual',last_reviewed:'2026-08-05',governed_by:['ROOT'],supersedes:[],...overrides});
const manifest = (...documents) => ({schema_version:1,documents:[document('ROOT',{tier:'T1',authoritative:true,authority_scopes:['root'],governed_by:[]}),...documents]});
const errors = value => validateManifest(value).errors.join('\n');

const schema = JSON.parse(readFileSync(new URL('../scripts/documentation-graph-schema.json', import.meta.url), 'utf8'));

test('formal schema matches generator constants',()=>{
  assert.equal(schema.schema_version,GRAPH_SCHEMA_VERSION);
  assert.deepEqual(schema.relationship_types,RELATIONSHIP_TYPES);
});

test('accepts a connected valid graph',()=>assert.deepEqual(validateManifest(manifest(document('CHILD'))).errors,[]));
test('rejects governance cycles',()=>assert.match(errors({documents:[document('A',{governed_by:['B']}),document('B',{governed_by:['A']})]}),/Governance cycle/));
test('rejects supersession cycles',()=>assert.match(errors(manifest(document('A',{supersedes:['B']}),document('B',{supersedes:['A']}))),/Supersession cycle/));
test('rejects duplicate authority scopes',()=>assert.match(errors(manifest(document('A',{authoritative:true,authority_scopes:['shared']}),document('B',{authoritative:true,authority_scopes:['shared']}))),/Duplicate authority scope/));
test('rejects orphan authorities',()=>assert.match(errors(manifest(document('A',{authoritative:true,governed_by:[]}))),/Orphan authority/));
test('rejects multiple parents',()=>assert.match(errors(manifest(document('OTHER',{governed_by:[]}),document('A',{governed_by:['ROOT','OTHER']}))),/Multiple governance parents/));
test('rejects disconnected graphs caused by a closed component',()=>assert.match(errors(manifest(document('A',{governed_by:['B']}),document('B',{governed_by:['A']}))),/Disconnected document/));
test('rejects missing owners',()=>assert.match(errors(manifest(document('A',{owner:''}))),/missing an owner/));
test('rejects duplicate IDs',()=>assert.match(errors(manifest(document('A'),document('A'))),/Duplicate document ID/));
test('rejects missing relationship targets',()=>assert.match(errors(manifest(document('A',{governed_by:['MISSING']}))),/missing governed_by target/));
