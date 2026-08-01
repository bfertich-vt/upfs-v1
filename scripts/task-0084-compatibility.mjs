import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');const ref=x=>typeof x==='string'&&x.startsWith('evidence://');const content=x=>({scope:x.scope,source_refs:x.source_refs,changes:x.changes,state:x.state,deployment:x.deployment});
export function evaluateCompatibility({contract,synthetic_only=true}={}){const checks=[];const add=(name,ok)=>checks.push({name,status:ok?'passed':'failed'});const c=contract;const changes=Array.isArray(c?.changes)?c.changes:[];const sources=['specs/04_schema/identity_tenant_model.md','specs/05_apis/api_standards.md'];const base=x=>x?.name&&['schema','api','event'].includes(x?.surface)&&x?.from_version&&x?.to_version&&x?.breaking===true&&ref(x?.migration?.ref)&&x?.migration?.version===x?.to_version&&x?.migration?.status==='passed'&&ref(x?.compatibility?.ref)&&x?.compatibility?.version===x?.to_version&&x?.compatibility?.status==='passed';const by=x=>changes.find(y=>y.surface===x);
 add('boundary',synthetic_only&&c?.state==='blocked'&&c?.deployment==='not-performed');
 add('source',JSON.stringify(c?.source_refs)===JSON.stringify(sources)&&sources.every(x=>fs.existsSync(path.join(root,x))));
 add('versioning',c?.schema_version==='upfs.compatibility-gate.v1'&&c?.scope?.tenant&&c?.scope?.environment&&changes.length===3&&new Set(changes.map(x=>x.surface)).size===3&&changes.every(base));
 const schema=by('schema'),api=by('api'),event=by('event');
 add('schema',schema?.compatibility?.identity_scope_preserved===true&&schema?.compatibility?.audit_history_preserved===true);
 add('api',api?.compatibility?.idempotency_preserved===true&&api?.compatibility?.optimistic_concurrency_preserved===true&&api?.compatibility?.error_envelope_stable===true);
 add('event',event?.compatibility?.consumer_backward_compatible===true&&event?.compatibility?.replay_safe===true&&event?.compatibility?.versioned===true);
 add('integrity',c?.digest===sha(content(c)));return{status:checks.every(x=>x.status==='passed')?'passed':'failed',decision:'NO-GO_EXTERNAL_PREREQUISITES',checks};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const contract=JSON.parse(fs.readFileSync(path.join(root,'contracts/task-0084-compatibility.json')));fs.writeFileSync(path.join(root,'artifacts/task-0084-compatibility.json'),JSON.stringify(evaluateCompatibility({contract}),null,2)+'\n');}
