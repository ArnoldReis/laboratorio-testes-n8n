/**
 * V1.5 — console de laboratório exclusivamente sintético.
 * Referência pública sem identificadores internos ou credenciais.
 * Não chama n8n, Docker, banco, HTTP nem workflows.
 */
export const exampleSources={
 history:[
  {run_key:'SYNTH-002',run_kind:'baseline',suite:'sandbox_entrega_v1',version:'1.2',
   executed_at:'2026-10-20T19:11:00Z',total:7,passed:7,failed:0,status:'APROVADO'},
  {run_key:'SYNTH-001',run_kind:'baseline',suite:'sandbox_entrega_v1',version:'1.2',
   executed_at:'2026-10-20T19:10:00Z',total:7,passed:7,failed:0,status:'APROVADO'}
 ],
 radar:[{snapshot_key:'lab_v13_manual',generated_at:'2026-10-20T19:15:00Z',
   status:'ESTAVEL',regressions:0,baseline_runs:2,legacy_runs:3}],
 gate:[{run_key:'SYNTH-GATE',assessed_at:'2026-10-20T19:20:00Z',
   status:'BLOQUEADO',environment_class:'shared_instance',controls_ok:3,controls_total:8,blockers:8}]
};
export const defaultCommand=Object.freeze({
 schemaVersion:'1.5',command:'status',selectedSuite:'sandbox_entrega_v1',
 targetAlias:'LAB_SANDBOX_V1',readOnly:true,allowLiveExecution:false
});
export function validateCommand(c){
 const keys=['schemaVersion','command','selectedSuite','targetAlias','readOnly','allowLiveExecution'];
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).length!==keys.length||
    Object.keys(c).some(k=>!keys.includes(k))||c.schemaVersion!=='1.5'||
    c.command!=='status'||c.selectedSuite!=='sandbox_entrega_v1'||c.targetAlias!=='LAB_SANDBOX_V1'||
    c.readOnly!==true||c.allowLiveExecution!==false)throw Error('ONLY_READ_ONLY_STATUS_ALLOWED');
 return true;
}
export function buildConsole(command,sources){
 validateCommand(command);
 const {history,radar,gate}=sources??{};
 if(!Array.isArray(history)||history.length>30||!Array.isArray(radar)||radar.length>5||
    !Array.isArray(gate)||gate.length>5)throw Error('UNTRUSTED_SOURCES');
 const latest=(rows,fn,date)=>rows.filter(fn).sort((a,b)=>Date.parse(b[date])-Date.parse(a[date]))[0];
 const h=latest(history,r=>r.run_kind==='baseline'&&r.suite===command.selectedSuite&&r.version==='1.2'&&
   Number.isInteger(r.total)&&Number.isInteger(r.passed)&&Number.isInteger(r.failed)&&r.passed+r.failed===r.total&&
   (r.failed===0?'APROVADO':'REPROVADO')===r.status&&Number.isFinite(Date.parse(r.executed_at)),'executed_at');
 const r=latest(radar,x=>x.snapshot_key==='lab_v13_manual'&&
    ['ESTAVEL','REGRESSAO','ATENCAO','BASE_INSUFICIENTE','CONTRATO_ALTERADO','SEM_BASE'].includes(x.status)&&
    Number.isInteger(x.regressions)&&x.regressions>=0&&Number.isFinite(Date.parse(x.generated_at)),'generated_at');
 const g=latest(gate,x=>x.environment_class==='shared_instance'&&x.status==='BLOQUEADO'&&
    x.controls_total===8&&Number.isInteger(x.controls_ok)&&Number.isInteger(x.blockers)&&
    Number.isFinite(Date.parse(x.assessed_at)),'assessed_at');
 if(!h||!r||!g)throw Error('SOURCE_UNAVAILABLE_NO_REPORT');
 return {status:'HOMOLOGACAO_BLOQUEADA',suite:command.selectedSuite,
  latest_suite:{total:h.total,passed:h.passed,failed:h.failed,status:h.status},
  radar:{status:r.status,regressions:r.regressions},gate:{status:g.status,controls_ok:g.controls_ok,controls_total:8,blockers:g.blockers},
  snapshots_are_sampled:true,tests_are_synthetic:true,docker_deployed:false,
  production_workflows_executed:false,execution_authorized:false,public_webhook_enabled:false};
}
const esc=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderConsolePreview(report){
 if(report.execution_authorized!==false||report.production_workflows_executed!==false)throw Error('UNSAFE_REPORT');
 const suite=report.latest_suite,radar=report.radar,gate=report.gate;
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laboratório — Prévia interna</title>
 <style>body{background:#090d1b;color:#eaf2ff;font-family:system-ui;margin:0;padding:24px}
 main{max-width:800px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:12px}
 article{border:1px solid #304058;background:#141e33;border-radius:12px;padding:20px}
 strong{font-size:32px}small{color:#9bafcb}footer{padding-top:22px;color:#a5b4cf}</style></head>
 <body><main><h1>Laboratório de Testes</h1><p>Prévia interna • dados sintéticos • sem webhook público</p>
 <div class="grid"><article><small>Suite</small><div><strong>${esc(suite.passed)}/${esc(suite.total)}</strong></div>${esc(suite.status)}</article>
 <article><small>Regressões</small><div><strong>${esc(radar.regressions)}</strong></div>${esc(radar.status)}</article>
 <article><small>Homologação</small><div><strong>${esc(gate.status)}</strong></div>${esc(gate.controls_ok)}/8 controles</article></div>
 <footer>Sem deploy Docker • Sem execução de produção</footer></main></body></html>`;
}
