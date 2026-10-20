/**
 * Public, standalone V1.1 example: a suite selector and two allowlisted
 * synthetic adapters. It never executes an n8n workflow or makes I/O calls.
 */
import { transform, equal } from './runner.mjs';

function classifyDelivery(input) {
  const eventId=String(input.eventId??'').trim().toUpperCase();
  if(!/^EVT-\d{1,8}$/.test(eventId))return {errorCode:'INVALID_EVENT_ID'};
  const attempts=Number(input.attempts);
  if(!Number.isSafeInteger(attempts)||attempts<1||attempts>5)return {errorCode:'INVALID_ATTEMPTS'};
  if(typeof input.acknowledged!=='boolean')return {errorCode:'INVALID_ACKNOWLEDGED'};
  return {eventId,classification:input.acknowledged?'entregue':attempts>=3?'fila_revisao':'reprocessar',attempts};
}

const adapters=Object.freeze({
  ticket_normalizer: transform,
  delivery_classifier: classifyDelivery
});
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keysOnly=(value,fields)=>Object.keys(value).every(key=>fields.includes(key));

export function validateConfiguration(configuration) {
  if(!plain(configuration)||JSON.stringify(configuration).length>24000||
    !keysOnly(configuration,['configurationVersion','selectedSuites','suites'])||
    configuration.configurationVersion!=='1.1')throw Error('CONFIG_SCHEMA_INVALID');
  const {suites,selectedSuites}=configuration;
  if(!Array.isArray(suites)||suites.length<1||suites.length>10)throw Error('SUITE_COUNT_INVALID');
  if(!Array.isArray(selectedSuites)||selectedSuites.length<1||selectedSuites.length>10||
     new Set(selectedSuites).size!==selectedSuites.length)throw Error('SELECTION_INVALID');
  const known=new Set();
  for(const suite of suites) {
    if(!plain(suite)||!keysOnly(suite,['id','version','adapter','cases'])||
       typeof suite.id!=='string'||!/^[-a-z0-9_]{1,48}$/.test(suite.id)||
       typeof suite.version!=='string'||!/^\d+\.\d+$/.test(suite.version)||
       !Object.hasOwn(adapters,suite.adapter)||known.has(suite.id)||
       !Array.isArray(suite.cases)||suite.cases.length<1||suite.cases.length>30)throw Error('SUITE_SCHEMA_INVALID');
    known.add(suite.id);
    const caseIds=new Set();
    for(const item of suite.cases) {
      if(!plain(item)||!keysOnly(item,['id','name','input','expected'])||
         typeof item.id!=='string'||!/^[-A-Z0-9_]{1,32}$/.test(item.id)||
         typeof item.name!=='string'||item.name.length<1||item.name.length>100||
         !plain(item.input)||!plain(item.expected)||
         JSON.stringify(item).length>1400||caseIds.has(item.id))throw Error('CASE_SCHEMA_INVALID');
      caseIds.add(item.id);
    }
  }
  if(selectedSuites.some(id=>!known.has(id)))throw Error('SUITE_UNKNOWN');
  const selected=suites.filter(s=>selectedSuites.includes(s.id));
  const total=selected.reduce((n,s)=>n+s.cases.length,0);
  if(total<1||total>30)throw Error('SELECTED_CASE_LIMIT');
  return selected;
}

export function runConfiguredSuites(configuration) {
  const selected=validateConfiguration(configuration);
  const cases=selected.flatMap(suite=>suite.cases.map(item=>{
    const actual=adapters[suite.adapter](item.input);
    return {caseId:item.id,suiteId:suite.id,passed:equal(item.expected,actual),actual,expected:item.expected};
  }));
  const suites=selected.map(s=> {
    const within=cases.filter(c=>c.suiteId===s.id);
    const passed=within.filter(x=>x.passed).length;
    return {id:s.id,version:s.version,total:within.length,passed,failed:within.length-passed,
      status:passed===within.length?'APROVADO':'REPROVADO'};
  });
  const passed=cases.filter(x=>x.passed).length;
  return {status:passed===cases.length?'APROVADO':'REPROVADO',
    total:cases.length,passed,failed:cases.length-passed,suites,cases,
    duration_ms:null,tests_are_synthetic:true,live_workflows_executed:false};
}
