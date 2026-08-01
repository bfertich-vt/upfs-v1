import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),"upfs-task-0015-"));for(const file of ["package.json","package-lock.json","specs/09_cicd/delivery_pipeline.md","infra/migrations/001_identity_tenant_rls.sql","docs/handoffs/TASK-0014.md"]){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}return root;}

test("TASK-0015 produces signed immutable synthetic release evidence", () => {
  const result = spawnSync(process.execPath, ["scripts/task-0015-release-evidence.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(fs.readFileSync("artifacts/task-0015-release-report.json"));
  const manifest = JSON.parse(fs.readFileSync("artifacts/upfs-release-manifest.json"));
  assert.equal(report.status, "passed");
  assert.equal(report.synthetic_only, true);
  assert.match(manifest.signature.value, /^[a-f0-9]{64}$/);
  assert.equal(manifest.deployment.approval_required, true);
  for (const name of ["managed-configuration", "immutable-manifest", "sbom-provenance", "canary-health-gate", "post-deploy-reconciliation", "rollback-procedure"]) assert.equal(report.checks.find((c) => c.name === name)?.status, "passed", name);
});

test("production configuration fails closed without managed references", () => {
  const root=fixture();try{const result=spawnSync(process.execPath,[path.resolve("scripts/task-0015-release-evidence.mjs"),root],{encoding:"utf8",env:{...process.env,UPFS_ENVIRONMENT:"pilot",UPFS_MANAGED_SECRET_REF:"",UPFS_CONFIG_REF:""}});assert.notEqual(result.status,0);assert.match(JSON.parse(fs.readFileSync(path.join(root,"artifacts/task-0015-release-report.json"))).error,/managed-configuration/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test("pilot signing fails closed without a managed signing key and key reference", () => {
  const root=fixture();try{const result=spawnSync(process.execPath,[path.resolve("scripts/task-0015-release-evidence.mjs"),root],{encoding:"utf8",env:{...process.env,UPFS_ENVIRONMENT:"pilot",UPFS_MANAGED_SECRET_REF:"secret://upfs/pilot",UPFS_CONFIG_REF:"config://upfs/pilot",UPFS_RELEASE_SIGNING_KEY:"",UPFS_RELEASE_SIGNING_KEY_REF:""}});assert.notEqual(result.status,0);assert.match(JSON.parse(fs.readFileSync(path.join(root,"artifacts/task-0015-release-report.json"))).error,/release-signing/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
