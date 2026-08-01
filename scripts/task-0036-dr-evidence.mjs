import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const c=(a,n,o,d)=>a.push({name:n,status:o?'passed':'failed',details:d});
export function evaluateDREvidence({backup,restore,failover,targets,synthetic_only=true,deployment='not-performed'}={}){
 const checks=[]; c(checks,'boundary',synthetic_only===true&&deployment==='not-performed','synthetic and deployment-free');
 c(checks,'backup',backup?.managed===true&&backup?.encrypted===true&&backup?.integrity_verified===true&&typeof backup?.evidence_ref==='string','managed encrypted backup integrity evidence required');
 c(checks,'restore',restore?.native_tooling===true&&restore?.schema_verified===true&&restore?.data_probe===true&&restore?.evidence_ref===backup?.evidence_ref,'native restore and bound evidence required');
 c(checks,'rpo-rto',Number.isFinite(targets?.rpo_minutes)&&Number.isFinite(targets?.rto_minutes)&&Number.isFinite(backup?.observed_lag_minutes)&&Number.isFinite(restore?.observed_minutes)&&backup.observed_lag_minutes<=targets.rpo_minutes&&restore.observed_minutes<=targets.rto_minutes,'observed RPO/RTO must satisfy targets');
 c(checks,'failover',failover?.managed===true&&failover?.tested===true&&failover?.corrective_forward===true&&typeof failover?.target==='string','managed failover and corrective-forward evidence required');
 c(checks,'tenant-safety',backup?.tenant_isolated===true&&restore?.tenant_isolated===true,'tenant isolation required for recovery evidence');
 return {schema_version:'upfs.dr-evidence-report.v1',status:checks.every(x=>x.status==='passed')?'passed':'failed',decision:checks.every(x=>x.status==='passed')?'READY_FOR_EXTERNAL_APPROVAL':'NO-GO_EXTERNAL_PREREQUISITES',synthetic_only,deployment,checks};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const r=evaluateDREvidence();fs.writeFileSync(path.join(root,'artifacts/task-0036-dr-evidence-report.json'),JSON.stringify({...r,generated_at:new Date().toISOString()},null,2)+'\n');console.log(`TASK-0036 DR evidence: ${r.decision}`);}
