import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,fakeTarget,evaluateOutput,runMockedSandbox} from './sandbox-v12.mjs';

test('all seven synthetic cases match',()=>{
 const report=runMockedSandbox();
 assert.deepEqual([report.status,report.total,report.passed,report.failed],['APROVADO',7,7,0]);
 assert.equal(report.duration_ms,null);
 assert.equal(report.live_workflows_executed,false);
});
test('wrong expected result is REPROVADO, not infrastructure failure',()=>{
 const modified=structuredClone(cases);
 modified[0].expected.classification='reprocessar';
 const report=runMockedSandbox(modified);
 assert.deepEqual([report.status,report.passed,report.failed],['REPROVADO',6,1]);
});
test('only the explicit synthetic alias is allowed',()=>{
 assert.throws(()=>runMockedSandbox(cases,{targetAlias:'another-workflow'}),/TARGET_NOT_ALLOWED/);
});
test('untrusted result is rejected',()=>{
 const inputs=cases.map(x=>({caseId:x.caseId,eventId:x.eventId,attempts:x.attempts,acknowledged:x.acknowledged}));
 const outputs=fakeTarget(inputs);
 outputs[0].targetTag='OTHER_TARGET';
 assert.throws(()=>evaluateOutput(cases,outputs),/UNTRUSTED_TARGET_OUTPUT/);
});
test('missing result is rejected, never silently approved',()=>{
 const inputs=cases.map(x=>({caseId:x.caseId,eventId:x.eventId,attempts:x.attempts,acknowledged:x.acknowledged}));
 assert.throws(()=>evaluateOutput(cases,fakeTarget(inputs).slice(1)),/OUTPUT_COUNT_MISMATCH/);
});
test('duplicate results are rejected',()=>{
 const inputs=cases.map(x=>({caseId:x.caseId,eventId:x.eventId,attempts:x.attempts,acknowledged:x.acknowledged}));
 const outputs=fakeTarget(inputs);
 outputs[1].caseId=outputs[0].caseId;
 assert.throws(()=>evaluateOutput(cases,outputs),/UNTRUSTED_TARGET_OUTPUT/);
});
test('target adapter protects from duplicate input cases',()=>{
 const inputs=cases.map(x=>({caseId:x.caseId,eventId:x.eventId,attempts:x.attempts,acknowledged:x.acknowledged}));
 inputs[1].caseId=inputs[0].caseId;
 assert.throws(()=>fakeTarget(inputs),/TARGET_CASE_INVALID/);
});
test('no external endpoint can be injected',()=>{
 const altered=structuredClone(cases);
 altered[0].targetAlias='https://example.invalid/';
 assert.throws(()=>runMockedSandbox(altered),/TARGET_NOT_ALLOWED/);
});
