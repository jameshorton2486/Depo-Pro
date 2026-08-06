import test from 'node:test';
import assert from 'node:assert/strict';
import { headingsFromMarkdown, healthFrom, keywordsFor, matchesNavigationGroup, navigationEntry, validateReleaseId } from '../scripts/documentation-build-lib.mjs';

const document={id:'DOC-1',title:'Project Architecture Guide',path:'docs/architecture/GUIDE.md',category:'architecture',owner:'Architecture',tier:'T2',status:'ACTIVE',authoritative:true,authority_scopes:['project-architecture']};

test('extracts ordered Markdown headings',()=>assert.deepEqual(headingsFromMarkdown('# Title\n### Detail'),[{level:1,text:'Title'},{level:3,text:'Detail'}]));
test('builds normalized search keywords',()=>assert.deepEqual(keywordsFor(document,[{level:2,text:'Review Workflow'}]),['architecture','guide','project','project-architecture','review','workflow']));
test('matches navigation prefixes and categories',()=>{assert.equal(matchesNavigationGroup(document,{prefixes:['docs/architecture/'],categories:[]}),true);assert.equal(matchesNavigationGroup(document,{prefixes:[],categories:['audits']}),false)});
test('creates stable navigation entries',()=>assert.deepEqual(navigationEntry(document),{id:'DOC-1',title:'Project Architecture Guide',path:'docs/architecture/GUIDE.md',tier:'T2',status:'ACTIVE',owner:'Architecture',authoritative:true}));
test('summarizes graph health',()=>{const result=healthFrom({documents:[document]},{edges:[{}],integrity:{errors:[],warnings:[],advisories:[]},diagnostics:{}});assert.equal(result.status,'PASS');assert.equal(result.managed_documents,1);assert.equal(result.relationships,1)});
test('accepts safe release IDs and rejects traversal',()=>{assert.equal(validateReleaseId('2026.2'),true);assert.equal(validateReleaseId('../main'),false);assert.equal(validateReleaseId(''),false)});
