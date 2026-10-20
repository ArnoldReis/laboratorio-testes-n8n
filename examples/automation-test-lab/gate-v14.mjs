// Public reference for V1.4 — advisory only, no execution credentials, endpoints or privileges.
export const CONTROL_IDS=Object.freeze([
  'dedicated_instance','isolated_storage','isolated_network','egress_blocked',
  'no_production_secrets','mocks_only','static_target_allowlist','logs_sanitized'
]);
export const DEMO_CHECKLIST={
  policyVersion:'1.4',environmentClass:'shared_instance',
  controls:{dedicated_instance:false,isolated_storage:false,isolated_network:false,
    egress_blocked:false,no_production_secrets:false,mocks_only:true,
    static_target_allowlist:true,logs_sanitized:true},
  allowedTargetAliases:['LAB_SANDBOX_V1'],
  evidenceRefs:[],humanApproval:false
};
const exactKeys=(value,fields)=>Object.keys(value).length===fields.length &&
  Object.keys(value).every(x=>fields.includes(x));
export function assessReadiness(config){
  if(!config||typeof config!=='object'||Array.isArray(config)||
     !exactKeys(config,['policyVersion','environmentClass','controls','allowedTargetAliases','evidenceRefs','humanApproval'])||
     config.policyVersion!=='1.4'||JSON.stringify(config).length>3200)throw Error('SCHEMA_INVALID');
  if(!config.controls||typeof config.controls!=='object'||Array.isArray(config.controls)||
     !exactKeys(config.controls,CONTROL_IDS)||CONTROL_IDS.some(k=>typeof config.controls[k]!=='boolean'))throw Error('CONTROLS_INVALID');
  if(!['shared_instance','dedicated_lab'].includes(config.environmentClass)||
     typeof config.humanApproval!=='boolean')throw Error('ENV_INVALID');
  if(!Array.isArray(config.allowedTargetAliases)||config.allowedTargetAliases.length!==1||
     config.allowedTargetAliases[0]!=='LAB_SANDBOX_V1')throw Error('TARGET_NOT_ALLOWED');
  if(!Array.isArray(config.evidenceRefs)||config.evidenceRefs.length>12||
     config.evidenceRefs.some(x=>typeof x!=='string'||!/^LAB-EVIDENCE-[A-Z0-9_-]{6,32}$/.test(x)))throw Error('EVIDENCE_INVALID');
  const blockers=CONTROL_IDS.filter(id=>!config.controls[id]);
  if(config.environmentClass!=='dedicated_lab')blockers.push('environment_not_dedicated');
  if(config.evidenceRefs.length<3)blockers.push('insufficient_evidence');
  if(!config.humanApproval)blockers.push('human_approval_missing');
  // A declaration is not independent evidence. The gate cannot authorize real execution.
  return {status:blockers.length===0?'PENDENTE_VERIFICACAO_EXTERNA':'BLOQUEADO',
    controls_ok:CONTROL_IDS.length-CONTROL_IDS.filter(k=>!config.controls[k]).length,
    controls_total:CONTROL_IDS.length,blockers,execution_authorized:false,
    evidence_status:blockers.length===0?'DECLARADO_NAO_VERIFICADO':'INCOMPLETO'};
}
