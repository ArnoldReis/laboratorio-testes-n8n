import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runConfiguredSuites,validateConfiguration} from './configurable.mjs';

const loaded=JSON.parse(readFileSync(new URL('./suites.example.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(loaded);
test('two selected suites pass all 13 contracts',()=>{
  const r=runConfiguredSuites(copy());
  assert.deepEqual([r.total,r.passed,r.failed,r.suites.length],[13,13,0,2]);
  assert.equal(r.status,'APROVADO');
  assert.equal(r.duration_ms,null);
});
test('selection runs only one suite',()=>{
  const v=copy();v.selectedSuites=['evento_entrega_v1'];
  const r=runConfiguredSuites(v);
  assert.equal(r.total,5);assert.equal(r.passed,5);
  assert.deepEqual(r.suites.map(x=>x.id),['evento_entrega_v1']);
});
test('synthetic regression correctly rejects the suite',()=>{
  const v=copy();v.selectedSuites=['evento_entrega_v1'];
  v.suites.find(x=>x.id==='evento_entrega_v1').cases[0].expected.classification='reprocessar';
  const r=runConfiguredSuites(v);
  assert.equal(r.status,'REPROVADO');assert.equal(r.failed,1);
});
test('unknown suite fails closed',()=>{
  const v=copy();v.selectedSuites=['unknown'];
  assert.throws(()=>validateConfiguration(v),/SUITE_UNKNOWN/);
});
test('unknown adapter cannot execute arbitrary code',()=>{
  const v=copy();v.suites[0].adapter='unsafe_dynamic_code';
  assert.throws(()=>runConfiguredSuites(v),/SUITE_SCHEMA_INVALID/);
});
test('duplicate suite selection rejected',()=>{
  const v=copy();v.selectedSuites=['contrato_tarefas_v1','contrato_tarefas_v1'];
  assert.throws(()=>runConfiguredSuites(v),/SELECTION_INVALID/);
});
test('duplicate case IDs rejected',()=>{
  const v=copy();v.suites[0].cases[1].id=v.suites[0].cases[0].id;
  assert.throws(()=>runConfiguredSuites(v),/CASE_SCHEMA_INVALID/);
});
test('limit of 30 selected cases enforced',()=>{
  const v=copy();v.suites[0].cases=Array.from({length:29},(_,i)=>({...v.suites[0].cases[0],id:'X'+i}));
  assert.throws(()=>runConfiguredSuites(v),/SELECTED_CASE_LIMIT/);
});
test('does not execute live workflows',()=>{
  const result=runConfiguredSuites(copy());
  assert.equal(result.live_workflows_executed,false);
  assert.equal(result.tests_are_synthetic,true);
});
