import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeHistory} from './regression-v13.mjs';

function record(idx,{failed=[],runKind='baseline',version='1.2',contract='v1'}={}){
  const ids=['S01','S02'];
  const cases=ids.map(id=>({caseId:id,suiteId:'sandbox_entrega_v1',passed:!failed.includes(id),
    expected:{value:contract==='v1'?id:'NEW_'+id},actual:{value:failed.includes(id)?'WRONG':contract==='v1'?id:'NEW_'+id}}));
  return {run_key:'LAB12-2026102019000'+String(idx).padStart(4,'0')+'-210111',run_kind:runKind,
    executed_at:new Date(Date.UTC(2026,9,20,19,0,idx)).toISOString(),total:2,passed:2-failed.length,failed:failed.length,
    status:failed.length?'REPROVADO':'APROVADO',cases_json:JSON.stringify(cases),
    suite_results_json:JSON.stringify([{id:'sandbox_entrega_v1',version,total:2,passed:2-failed.length,failed:failed.length}])};
}
test('two passing baselines produce ESTAVEL',()=>{
  const v=analyzeHistory([record(2),record(1)]);
  assert.deepEqual([v.status,v.baseline_runs,v.regressions],['ESTAVEL',2,0]);
});
test('new regression detected in same suite and contract',()=>{
  const v=analyzeHistory([record(2,{failed:['S01']}),record(1)]);
  assert.equal(v.status,'REGRESSAO');
  assert.deepEqual(v.suites[0].regressed_case_ids,['S01']);
});
test('controlled failures do not count as regressions',()=>{
  const v=analyzeHistory([record(3,{failed:['S02'],runKind:'negative_control'}),record(2),record(1)]);
  assert.deepEqual([v.status,v.control_runs,v.regressions],['ESTAVEL',1,0]);
});
test('legacy records are not counted in baselines',()=>{
  const old=record(3,{failed:['S01']});delete old.run_kind;
  const v=analyzeHistory([old,record(2),record(1)]);
  assert.deepEqual([v.legacy_runs,v.baseline_runs,v.status],[1,2,'ESTAVEL']);
});
test('contract changes cannot be mislabeled regression',()=>{
  const v=analyzeHistory([record(2,{failed:['S01'],contract:'v2'}),record(1)]);
  assert.equal(v.status,'CONTRATO_ALTERADO');
  assert.equal(v.regressions,0);
});
test('different suite version does not count as comparison',()=>{
  const v=analyzeHistory([record(2,{failed:['S01'],version:'1.3'}),record(1)]);
  assert.equal(v.suites_checked,2);
  assert.equal(v.regressions,0);
});
test('recovery correctly classified',()=>{
  const v=analyzeHistory([record(2),record(1,{failed:['S01']})]);
  assert.equal(v.suites[0].status,'RECUPERADO');
});
test('invalid record is discarded and cannot contaminate baseline',()=>{
  const malformed=record(3,{failed:['S01']});malformed.total=999;
  const v=analyzeHistory([malformed,record(2),record(1)]);
  assert.deepEqual([v.status,v.baseline_runs,v.discarded_runs],['ESTAVEL',2,1]);
});
test('single baseline is not interpreted as stable evidence',()=>{
  const v=analyzeHistory([record(1)]);
  assert.equal(v.status,'BASE_INSUFICIENTE');
  assert.equal(v.suites[0].status,'SEM_BASE_COMPARAVEL');
});
test('bounded sample reveals possible truncation',()=>{
  const v=analyzeHistory([record(1)],{sourceLimit:1});
  assert.equal(v.sample_may_be_truncated,true);
  assert.throws(()=>analyzeHistory([record(1),record(2)],{sourceLimit:1}),/SAMPLE_INVALID/);
});
