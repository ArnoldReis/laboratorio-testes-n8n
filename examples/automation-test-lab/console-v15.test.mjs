import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCommand,exampleSources,validateCommand,buildConsole,renderConsolePreview} from './console-v15.mjs';

const clone=v=>structuredClone(v);
test('read-only console uses only synthetic sources',()=>{
 const r=buildConsole(defaultCommand,exampleSources);
 assert.deepEqual([r.latest_suite.passed,r.latest_suite.total,r.radar.regressions,r.gate.controls_ok],[7,7,0,3]);
 assert.equal(r.status,'HOMOLOGACAO_BLOQUEADA');
 assert.equal(r.production_workflows_executed,false);
 assert.equal(r.docker_deployed,false);
});
test('command execute is blocked',()=>{
 const c={...defaultCommand,command:'execute'};
 assert.throws(()=>validateCommand(c),/ONLY_READ_ONLY_STATUS_ALLOWED/);
});
test('injected workflow aliases never selected',()=>{
 const c={...defaultCommand,targetAlias:'other-workflow'};
 assert.throws(()=>buildConsole(c,exampleSources),/ONLY_READ_ONLY_STATUS_ALLOWED/);
});
test('sources cannot silently disappear',()=>{
 const v=clone(exampleSources);v.gate=[];
 assert.throws(()=>buildConsole(defaultCommand,v),/SOURCE_UNAVAILABLE_NO_REPORT/);
});
test('oversized datasets are rejected',()=>{
 const v=clone(exampleSources);v.history=Array(31).fill(v.history[0]);
 assert.throws(()=>buildConsole(defaultCommand,v),/UNTRUSTED_SOURCES/);
});
test('legacy and negative controls are not latest baseline',()=>{
 const v=clone(exampleSources);
 v.history.unshift({ ...v.history[0],run_kind:'negative_control',status:'REPROVADO',passed:6,failed:1,executed_at:'2026-10-20T21:00:00Z'});
 assert.equal(buildConsole(defaultCommand,v).latest_suite.passed,7);
});
test('HTML preview is private static text with no embedded script',()=>{
 const html=renderConsolePreview(buildConsole(defaultCommand,exampleSources));
 assert.match(html,/<html lang="pt-BR">/);
 assert.doesNotMatch(html,/<script|<iframe|<form/i);
});
test('HTML output escapes untrusted values',()=>{
 const r=buildConsole(defaultCommand,exampleSources);
 r.gate.status='<script>alert(1)</script>';
 const html=renderConsolePreview(r);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>alert'));
});
test('render refuses unexpectedly authorized execution',()=>{
 const r=buildConsole(defaultCommand,exampleSources);
 r.execution_authorized=true;
 assert.throws(()=>renderConsolePreview(r),/UNSAFE_REPORT/);
});
