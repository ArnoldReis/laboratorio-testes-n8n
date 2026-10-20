import test from 'node:test';
import assert from 'node:assert/strict';
import {runSuite,transform,equal} from './runner.mjs';

const cases=[
 {id:'T01',input:{ticketId:' t-101 ',priority:'HIGH',minutes:35,status:'OPEN'},expected:{id:'T-101',priority:'high',minutes:35,status:'open',attention:true}},
 {id:'T02',input:{ticketId:'T-102',priority:'high',minutes:75,status:'done'},expected:{id:'T-102',priority:'high',minutes:75,status:'done',attention:false}},
 {id:'T03',input:{ticketId:'T-103',priority:'medium',minutes:0,status:'open'},expected:{id:'T-103',priority:'medium',minutes:0,status:'open',attention:false}},
 {id:'T04',input:{ticketId:'T-104',priority:'low',minutes:'12',status:'open'},expected:{id:'T-104',priority:'low',minutes:12,status:'open',attention:false}},
 {id:'T05',input:{ticketId:'INVALID',priority:'high',minutes:5,status:'open'},expected:{errorCode:'INVALID_ID'}},
 {id:'T06',input:{ticketId:'T-106',priority:'medium',minutes:-4,status:'open'},expected:{errorCode:'INVALID_MINUTES'}},
 {id:'T07',input:{ticketId:'T-107',priority:'critical',minutes:15,status:'open'},expected:{errorCode:'INVALID_PRIORITY'}},
 {id:'T08',input:{ticketId:'T-108',priority:'low',minutes:2,status:'undefined'},expected:{errorCode:'INVALID_STATUS'}}
];
test('eight synthetic contracts pass',()=>{
 const result=runSuite(cases);
 assert.equal(result.total,8);assert.equal(result.passed,8);assert.equal(result.failed,0);
 assert.equal(result.status,'APROVADO');assert.equal(result.duration_ms,null);
});
test('false expected result produces a failed verdict',()=>{
 const wrong=structuredClone(cases[0]);wrong.expected.minutes=10000;
 const report=runSuite([wrong]);
 assert.equal(report.status,'REPROVADO');assert.equal(report.failed,1);
});
test('expected rejection is a passing test',()=>{
 const report=runSuite([cases[4]]);
 assert.equal(report.status,'APROVADO');
 assert.deepEqual(report.results[0].actual,{errorCode:'INVALID_ID'});
});
test('missing case contract is rejected',()=>{
 assert.throws(()=>runSuite([{id:'wrong',input:{}}]),/schema missing/);
});
test('suite size is bounded',()=>assert.throws(()=>runSuite([]),/size/));
test('comparator ignores key order but detects different values',()=>{
 assert.equal(equal({a:1,b:2},{b:2,a:1}),true);
 assert.equal(equal({a:1},{a:2}),false);
});
test('no external calls and no real records',()=>{
 const result=transform({ticketId:'T-12',priority:'LOW',minutes:2,status:'open'});
 assert.equal(result.id,'T-12');
});
