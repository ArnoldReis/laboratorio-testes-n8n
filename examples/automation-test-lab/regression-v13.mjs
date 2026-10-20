/**
 * Public-safe example of the n8n V1.3 retrospective radar.
 * This pure function does not fetch real history, send alerts or modify data.
 */
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v==='object'
  ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])) : v;
const stable = v => JSON.stringify(canonical(v));
const signature = cases => JSON.stringify(
  cases.map(c=>[c.caseId,canonical(c.expected)]).sort(([a],[b])=>a.localeCompare(b))
);
export function analyzeHistory(rows,{sourceLimit=100}={}){
  if(!Array.isArray(rows)||!Number.isInteger(sourceLimit)||sourceLimit<1||rows.length>sourceLimit)throw Error('SAMPLE_INVALID');
  const counters={baseline_runs:0,control_runs:0,legacy_runs:0,discarded_runs:0};
  const groups=new Map(),seen=new Set();
  for(const r of rows){
    if(!r||typeof r.run_key!=='string'){counters.discarded_runs++;continue;}
    if(r.run_kind==null||r.run_kind===''){counters.legacy_runs++;continue;}
    if(r.run_kind==='negative_control'){counters.control_runs++;continue;}
    if(r.run_kind!=='baseline'){counters.discarded_runs++;continue;}
    try{
      if(!/^LAB12-[0-9]{14,18}-[0-9]+$/.test(r.run_key)||seen.has(r.run_key)||!Number.isFinite(Date.parse(r.executed_at)))throw Error('BAD_KEY');
      seen.add(r.run_key);
      const cases=JSON.parse(r.cases_json),suiteRows=JSON.parse(r.suite_results_json);
      if(!Array.isArray(cases)||!cases.length||cases.length>30||!Array.isArray(suiteRows)||!suiteRows.length||
         cases.length!==r.total||r.passed+r.failed!==r.total||
         !['APROVADO','REPROVADO'].includes(r.status))throw Error('BAD_REPORT');
      if(new Set(cases.map(c=>c.caseId)).size!==cases.length)throw Error('DUPLICATED_CASE');
      let total=0,passed=0;
      const staged=[];
      for(const s of suiteRows){
        if(typeof s.id!=='string'||typeof s.version!=='string')throw Error('BAD_SUITE');
        const group=cases.filter(c=>c.suiteId===s.id);
        const ok=group.filter(c=>c.passed).length;
        if(!group.length||group.length!==s.total||s.passed!==ok||s.failed!==group.length-ok)throw Error('BAD_SUITE_TOTAL');
        for(const c of group)if(typeof c.caseId!=='string'||typeof c.passed!=='boolean'||!c.expected||!c.actual||
          (stable(c.expected)===stable(c.actual))!==c.passed)throw Error('BAD_CASE');
        total+=group.length;passed+=ok;
        staged.push({key:s.id+'@'+s.version,id:s.id,version:s.version,stamp:Date.parse(r.executed_at),
          run_key:r.run_key,total:s.total,passed:ok,failed:s.failed,
          contract:signature(group),failedIds:group.filter(c=>!c.passed).map(c=>c.caseId)});
      }
      if(total!==r.total||passed!==r.passed||(r.failed===0?'APROVADO':'REPROVADO')!==r.status)throw Error('BAD_AGGREGATE');
      for(const e of staged){if(!groups.has(e.key))groups.set(e.key,[]);groups.get(e.key).push(e);}
      counters.baseline_runs++;
    }catch {counters.discarded_runs++;}
  }
  const suites=[];
  for(const rows of groups.values()){
    rows.sort((a,b)=>b.stamp-a.stamp||b.run_key.localeCompare(a.run_key));
    const latest=rows[0],prior=rows[1];
    let status='SEM_BASE_COMPARAVEL',regressedCaseIds=[];
    if(prior){
      if(latest.contract!==prior.contract)status='CONTRATO_ALTERADO';
      else{
        regressedCaseIds=latest.failedIds.filter(id=>!prior.failedIds.includes(id));
        if(regressedCaseIds.length)status='REGRESSAO';
        else if(latest.failed)status='FALHA_PERSISTENTE';
        else if(prior.failed)status='RECUPERADO';
        else status='ESTAVEL';
      }
    }
    suites.push({id:latest.id,version:latest.version,status,total:latest.total,passed:latest.passed,
      failed:latest.failed,baselines:rows.length,regressed_case_ids:regressedCaseIds,
      comparable:!!prior&&latest.contract===prior.contract});
  }
  suites.sort((a,b)=>a.id.localeCompare(b.id));
  const regressions=suites.reduce((n,s)=>n+s.regressed_case_ids.length,0);
  const status=regressions?'REGRESSAO':!suites.length?'SEM_BASE':suites.some(s=>s.status==='CONTRATO_ALTERADO')?
    'CONTRATO_ALTERADO':suites.some(s=>s.failed)?'ATENCAO':suites.some(s=>s.status==='SEM_BASE_COMPARAVEL')?
    'BASE_INSUFICIENTE':'ESTAVEL';
  return {status,...counters,regressions,suites_checked:suites.length,suites,
    source_rows:rows.length,source_limit:sourceLimit,sample_may_be_truncated:rows.length===sourceLimit,
    tests_are_synthetic:true};
}
