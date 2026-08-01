import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const c=(a,n,o,d)=>a.push({name:n,status:o?'passed':'failed',details:d});
export function evaluateObservability({ provider, telemetry, alerts, incident, audit, synthetic_only=true, deployment='not-performed' }={}) {
 const checks=[]; c(checks,'boundary',synthetic_only===true&&deployment==='not-performed', 'synthetic and deployment-free');
 c(checks,'provider',provider?.managed===true&&typeof provider?.identity==='string'&&provider.identity.startsWith('external-'),'managed observability provider identity required');
 c(checks,'tenant-safety',telemetry?.tenant_scoped===true&&telemetry?.redacted===true&&telemetry?.cross_tenant_isolation===true,'tenant-safe telemetry and redaction required');
 c(checks,'signals',['metrics','logs','traces'].every(k=>telemetry?.[k]===true),'metrics, logs, and traces required');
 c(checks,'slo-alerts',alerts?.slo_defined===true&&alerts?.error_rate===true&&alerts?.latency===true&&alerts?.paging_route===true,'SLO alert thresholds and paging route required');
 c(checks,'incident-order',Array.isArray(incident?.sequence)&&JSON.stringify(incident.sequence)==='["detect","pause","abort","recover"]','incident detect/pause/abort/recover ordering required');
 c(checks,'incident-evidence',incident?.rollback_verified===true&&incident?.corrective_forward===true,'rollback and corrective-forward evidence required');
 c(checks,'audit',audit?.append_only===true&&audit?.actor_bound===true&&audit?.tenant_bound===true&&audit?.retained===true,'tenant-safe append-only audit evidence required');
 return {schema_version:'upfs.observability-report.v1',status:checks.every(x=>x.status==='passed')?'passed':'failed',decision:checks.every(x=>x.status==='passed')?'READY_FOR_EXTERNAL_APPROVAL':'NO-GO_EXTERNAL_PREREQUISITES',synthetic_only,deployment,checks};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const r=evaluateObservability();fs.writeFileSync(path.join(root,'artifacts/task-0035-observability-report.json'),JSON.stringify({...r,generated_at:new Date().toISOString()},null,2)+'\n');console.log(`TASK-0035 observability: ${r.decision}`);}
