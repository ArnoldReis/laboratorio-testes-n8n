import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReadiness,DEMO_CHECKLIST} from './gate-v14.mjs';

const base=()=>structuredClone(DEMO_CHECKLIST);
const complete=()=>({
  ...base(),environmentClass:'dedicated_lab',
  controls:Object.fromEntries(Object.keys(DEMO_CHECKLIST.controls).map(k=>[k,true])),
  evidenceRefs:['LAB-EVIDENCE-NETWORK01','LAB-EVIDENCE-STORAGE01','LAB-EVIDENCE-MOCKS001'],humanApproval:true
});
test('shared environment fails closed',()=>{
  const r=assessReadiness(base());
  assert.equal(r.status,'BLOQUEADO');assert.equal(r.execution_authorized,false);
  assert.ok(r.blockers.includes('environment_not_dedicated'));
});
test('even fully declared environment is not independently verified',()=>{
  const r=assessReadiness(complete());
  assert.equal(r.status,'PENDENTE_VERIFICACAO_EXTERNA');
  assert.equal(r.execution_authorized,false);
});
test('missing network isolation blocks',()=>{
  const c=complete();c.controls.isolated_network=false;
  assert.equal(assessReadiness(c).status,'BLOQUEADO');
});
test('missing real evidence identifiers blocks',()=>{
  const c=complete();c.evidenceRefs=[];
  assert.ok(assessReadiness(c).blockers.includes('insufficient_evidence'));
});
test('owner approval is not optional',()=>{
  const c=complete();c.humanApproval=false;
  assert.equal(assessReadiness(c).status,'BLOQUEADO');
});
test('no dynamic workflow targets',()=>{
  const c=complete();c.allowedTargetAliases=['some-other-workflow'];
  assert.throws(()=>assessReadiness(c),/TARGET_NOT_ALLOWED/);
});
test('only known boolean controls',()=>{
  const c=complete();c.controls.egress_blocked='yes';
  assert.throws(()=>assessReadiness(c),/CONTROLS_INVALID/);
});
test('unexpected hidden fields rejected',()=>{
  const c=complete();c.token='secret';
  assert.throws(()=>assessReadiness(c),/SCHEMA_INVALID/);
});
test('evidence links and URLs rejected from logs',()=>{
  const c=complete();c.evidenceRefs=['https://example.invalid/'];
  assert.throws(()=>assessReadiness(c),/EVIDENCE_INVALID/);
});
test('gate cannot return true authorization',()=>{
  for(const c of [base(),complete()])assert.equal(assessReadiness(c).execution_authorized,false);
});
