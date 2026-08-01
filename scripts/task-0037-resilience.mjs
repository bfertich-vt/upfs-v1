import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const c=(a,n,o,d)=>a.push({name:n,status:o?'passed':'failed',details:d});
export function evaluateResilience({load,soak,failures,projection,tenants,recovery,evidence,synthetic_only=true,deployment='not-performed'}={}){
 const checks=[]; c(checks,'boundary',synthetic_only===true&&deployment==='not-performed','synthetic no-deployment rehearsal');
 c(checks,'load',load?.environment_sized===true&&load?.slo_compliant===true,'environment-sized load and SLO evidence required');
 c(checks,'soak',soak?.duration_minutes>=30&&soak?.error_rate<=0.01,'bounded soak and error threshold required');
 c(checks,'failures',failures?.dependency_outage===true&&failures?.projection_lag===true&&failures?.recovered===true,'dependency failure and projection lag recovery required');
 c(checks,'tenants',tenants?.cross_tenant_escapes===0&&tenants?.isolated===true,'tenant isolation must remain zero-escape');
 c(checks,'recovery',recovery?.checkpoint_replayed===true&&recovery?.outbox_reconciled===true&&recovery?.corrective_forward===true,'checkpoint/outbox recovery required');
 const payload={load,soak,failures,projection,tenants,recovery}; const digest=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 c(checks,'evidence',evidence?.immutable===true&&evidence?.sha256===digest&&evidence?.references_bound===true,'immutable evidence digest and references required');
 return {schema_version:'upfs.resilience-report.v1',status:checks.every(x=>x.status==='passed')?'passed':'failed',decision:checks.every(x=>x.status==='passed')?'READY_FOR_EXTERNAL_APPROVAL':'NO-GO_EXTERNAL_PREREQUISITES',synthetic_only,deployment,checks};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const r=evaluateResilience();fs.writeFileSync(path.join(root,'artifacts/task-0037-resilience-report.json'),JSON.stringify({...r,generated_at:new Date().toISOString()},null,2)+'\n');console.log(`TASK-0037 resilience: ${r.decision}`);}
