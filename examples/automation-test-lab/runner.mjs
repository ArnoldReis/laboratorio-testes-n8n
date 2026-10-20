/** Generic synthetic test-lab example. No network or n8n calls. */
export function transform(record) {
  const id=String(record.ticketId??'').trim().toUpperCase();
  if(!/^T-\d{1,8}$/.test(id))return {errorCode:'INVALID_ID'};
  const duration=Number(record.minutes);
  if(record.minutes===null||record.minutes===''||!Number.isSafeInteger(duration)||duration<0)return {errorCode:'INVALID_MINUTES'};
  const priority=String(record.priority??'').trim().toLowerCase();
  if(!['low','medium','high'].includes(priority))return {errorCode:'INVALID_PRIORITY'};
  const status=String(record.status??'').trim().toLowerCase();
  if(!['open','done'].includes(status))return {errorCode:'INVALID_STATUS'};
  return {id,priority,minutes:duration,status,attention:priority==='high'&&status==='open'};
}
const canonical=value => Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
export const equal = (a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function runSuite(cases) {
  if(!Array.isArray(cases)||cases.length<1||cases.length>100)throw Error('Suite size is invalid');
  const selfTest=!equal({status:'good'},{status:'wrong'})&&equal({a:1,b:2},{b:2,a:1});
  if(!selfTest)throw Error('Comparator self-test failed');
  const results=cases.map(test=>{
    if(!test?.id||!test.expected||!test.input)throw Error('Case schema missing');
    const actual=transform(test.input), passed=equal(test.expected,actual);
    return {id:test.id,passed,actual,expected:test.expected};
  });
  return {status:results.every(r=>r.passed)?'APROVADO':'REPROVADO',
    total:results.length,passed:results.filter(r=>r.passed).length,
    failed:results.filter(r=>!r.passed).length,duration_ms:null,
    synthetic:true,results};
}
