/**
 * V1.2 — Demonstration of an allowlisted, mocked sub-workflow call.
 * No n8n URLs, credentials, production IDs, network access, or dynamic code.
 */
const TARGET='LAB_SANDBOX_V1';
export const cases=[
 {caseId:'S01',eventId:'EVT-401',attempts:1,acknowledged:true,expected:{eventId:'EVT-401',classification:'entregue',attempts:1}},
 {caseId:'S02',eventId:'EVT-402',attempts:2,acknowledged:false,expected:{eventId:'EVT-402',classification:'reprocessar',attempts:2}},
 {caseId:'S03',eventId:'EVT-403',attempts:3,acknowledged:false,expected:{eventId:'EVT-403',classification:'fila_revisao',attempts:3}},
 {caseId:'S04',eventId:'invalid',attempts:1,acknowledged:true,expected:{errorCode:'INVALID_EVENT_ID'}},
 {caseId:'S05',eventId:'EVT-405',attempts:-1,acknowledged:false,expected:{errorCode:'INVALID_ATTEMPTS'}},
 {caseId:'S06',eventId:' evt-406 ',attempts:1,acknowledged:false,expected:{eventId:'EVT-406',classification:'reprocessar',attempts:1}},
 {caseId:'S07',eventId:'EVT-407',attempts:1,acknowledged:'true',expected:{errorCode:'INVALID_ACKNOWLEDGED'}}
];

export function fakeTarget(items) {
 if(!Array.isArray(items)||items.length<1||items.length>10)throw Error('TARGET_COUNT_INVALID');
 const seen=new Set();
 return items.map(item=>{
  if(!/^S[0-9]{2}$/.test(item.caseId)||seen.has(item.caseId))throw Error('TARGET_CASE_INVALID');
  seen.add(item.caseId);
  const eventId=String(item.eventId??'').trim().toUpperCase();
  let actual;
  if(!/^EVT-[0-9]{1,8}$/.test(eventId))actual={errorCode:'INVALID_EVENT_ID'};
  else{
   const attempts=Number(item.attempts);
   if(!Number.isSafeInteger(attempts)||attempts<1||attempts>5)actual={errorCode:'INVALID_ATTEMPTS'};
   else if(typeof item.acknowledged!=='boolean')actual={errorCode:'INVALID_ACKNOWLEDGED'};
   else actual={eventId,classification:item.acknowledged?'entregue':attempts>=3?'fila_revisao':'reprocessar',attempts};
  }
  return {caseId:item.caseId,targetTag:TARGET,actual};
 });
}
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?
 Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function evaluateOutput(expectedCases,outputs,{targetAlias=TARGET}={}){
 if(targetAlias!==TARGET)throw Error('TARGET_NOT_ALLOWED');
 if(!Array.isArray(expectedCases)||expectedCases.length<1||expectedCases.length>10||
    !Array.isArray(outputs)||outputs.length!==expectedCases.length)throw Error('OUTPUT_COUNT_MISMATCH');
 const map=new Map();
 for(const item of expectedCases){
  if(map.has(item.caseId))throw Error('DUPLICATED_INPUT');
  map.set(item.caseId,item);
 }
 const seen=new Set();
 const result=outputs.map(o=>{
  if(o.targetTag!==TARGET||!map.has(o.caseId)||seen.has(o.caseId)||o.actual===null||
     typeof o.actual!=='object'||Array.isArray(o.actual))throw Error('UNTRUSTED_TARGET_OUTPUT');
  seen.add(o.caseId);
  const expected=map.get(o.caseId).expected;
  return {caseId:o.caseId,passed:same(expected,o.actual),expected,actual:o.actual};
 });
 const passed=result.filter(x=>x.passed).length;
 return {status:passed===result.length?'APROVADO':'REPROVADO',total:result.length,passed,
   failed:result.length-passed,tests_are_synthetic:true,live_workflows_executed:false,
   duration_ms:null,results:result};
}
export function runMockedSandbox(testCases=cases,options={}){
 if(options.targetAlias&&options.targetAlias!==TARGET)throw Error('TARGET_NOT_ALLOWED');
 const sanitized=testCases.map(x=>{
  if(x.targetAlias&&x.targetAlias!==TARGET)throw Error('TARGET_NOT_ALLOWED');
  if(typeof x.eventId!=='string'||x.eventId.length>28||typeof x.attempts!=='number'||
    !['boolean','string'].includes(typeof x.acknowledged))throw Error('MOCK_INPUT_INVALID');
  return {caseId:x.caseId,eventId:x.eventId,attempts:x.attempts,acknowledged:x.acknowledged};
 });
 return evaluateOutput(testCases,fakeTarget(sanitized),options);
}
