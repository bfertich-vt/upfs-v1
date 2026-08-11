import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const MATRIX = "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md";
const DIRECTORY = "docs/governance/task-closures";
const TASK_0002_PROTECTED_EVIDENCE = Object.freeze({
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0002-CLOSURE-002.yaml",
    task_sha256:
      "102402d3e1c989688e2809165c82ec279dc62a6d815523941a7fffeb490aa2a2",
    handoff: "docs/handoffs/RECOVERY-TASK-0002-CLOSURE-002.md",
    handoff_sha256:
      "bbc0fc4d40206bf64126aa4652dcfe53862ef33e86aa6f99434ac38104cb07df",
    implementation_commit: "8e77b1107f94e756f4865b3988aff7cd4a1b268b",
    candidate_commit: "c13b0134091937cfcb3cc4db4304ed7be3c5f740",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0002-CLOSURE-002-QA.md",
    review_sha256:
      "1f5c249334fd8638084da8790168f422e24ab4009351bcdd2921e90bbbebc00e",
    review_commit: "64782c157a50e02146cdad45049b8333033979c6",
    reviewed_candidate: "c13b0134091937cfcb3cc4db4304ed7be3c5f740",
  },
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "c13b0134091937cfcb3cc4db4304ed7be3c5f740",
    review_commit: "64782c157a50e02146cdad45049b8333033979c6",
    pr_head: "21c2eaa0a1087923d9086ddeb2647d8c57a82fc6",
    tree: "d470b55d94edac5288b4d673cd85f76651a47444",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 20,
    base_sha: "e84699d502d684ec1772e507379d47770f00f132",
    head_sha: "21c2eaa0a1087923d9086ddeb2647d8c57a82fc6",
    checks: [
      {
        name: "repository-validation",
        run_id: 31195839513,
        job_id: 92923707381,
        head_sha: "21c2eaa0a1087923d9086ddeb2647d8c57a82fc6",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31195838719,
        job_id: 92923709435,
        head_sha: "21c2eaa0a1087923d9086ddeb2647d8c57a82fc6",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9000781611,
      name: "validation-evidence",
      archive_digest:
        "sha256:27b01ad4a58152520ec18269a011e16c3d6e8936892bf30b0adca34bc5d45fc0",
      content_sha256:
        "f36a945b547137050c61c1b3b890ce5959674faa8a2c0de76892e815758b99e1",
      content_status: "passed",
    },
    post_merge_checks: [
      {
        name: "repository-validation",
        run_id: 31196001793,
        job_id: 92924244237,
        head_sha: "92e6ac9345e7cdd92db21e7fa65c0dcf531fd28c",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31196001771,
        job_id: 92924243995,
        head_sha: "92e6ac9345e7cdd92db21e7fa65c0dcf531fd28c",
        conclusion: "success",
      },
    ],
  },
  protected_merge: {
    commit: "92e6ac9345e7cdd92db21e7fa65c0dcf531fd28c",
    base_parent: "e84699d502d684ec1772e507379d47770f00f132",
    head_tree: "d470b55d94edac5288b4d673cd85f76651a47444",
    merged_at: "2026-08-07T16:07:01Z",
    pull_request: 20,
  },
});
const TASK_0003_PROTECTED_EVIDENCE = Object.freeze({
  rejected_candidates: [
    "188f9a9e644a025913866eb6ea2d68298ba2a4f9",
    "01a2c97f5c6a7ec6045705ac5e3ef4c25228938b",
    "1080d94ec9659852a5e63f278a05dd6e9aa84329",
  ],
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0003-CLOSURE-004.yaml",
    task_sha256:
      "886425e7c70203bad37340ccfa1693c9d347a1e26d15d9bfcb3d6997357fec2e",
    handoff: "docs/handoffs/RECOVERY-TASK-0003-CLOSURE-004.md",
    handoff_sha256:
      "e535f510236b44d357f1f12530008c0f6a75b0d4e01e27e3c3e691d143c2df29",
    implementation_commit: "1ed8e0dd5f216484a778eb00abe4ee223cedb24c",
    candidate_commit: "6f53a94e40715b4058f47f979abbc4081c6e4837",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0003-CLOSURE-004-QA.md",
    review_sha256:
      "3cf7708968ceaf1b2a3439d342974cbba6eb5c7aeaa08a8c9f7ca8f7ca882cff",
    review_commit: "d5d9a7316423ca4c2d39c50c6da3a098788a170c",
    reviewed_candidate: "6f53a94e40715b4058f47f979abbc4081c6e4837",
  },
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "6f53a94e40715b4058f47f979abbc4081c6e4837",
    review_commit: "d5d9a7316423ca4c2d39c50c6da3a098788a170c",
    pr_head: "d5d9a7316423ca4c2d39c50c6da3a098788a170c",
    tree: "6db599207b14c34dfc2eda43dafb9f3fe986cfd7",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 25,
    base_sha: "1156e7e8d2c03463768c0306a73fbaa584af3539",
    head_sha: "d5d9a7316423ca4c2d39c50c6da3a098788a170c",
    checks: [
      {
        name: "repository-validation",
        run_id: 31219179715,
        job_id: 92999633267,
        head_sha: "d5d9a7316423ca4c2d39c50c6da3a098788a170c",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31219179723,
        job_id: 92999633237,
        head_sha: "d5d9a7316423ca4c2d39c50c6da3a098788a170c",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9009713582,
      name: "validation-evidence",
      archive_digest:
        "sha256:61c33b3ad776da56c8534ac63ce2833a8e41668750d63c0d58e0c59b8b8356a0",
      content_sha256:
        "a930e5481de2122c0e719eec8983ad618a2ca13924eccf36851f4bffc085febb",
      content_status: "passed",
    },
    post_merge_checks: [
      {
        name: "repository-validation",
        run_id: 31219306164,
        job_id: 93000044640,
        head_sha: "ce1b966ef0614b8d567eca86ccc3f80cf8777ef0",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31219307407,
        job_id: 93000049813,
        head_sha: "ce1b966ef0614b8d567eca86ccc3f80cf8777ef0",
        conclusion: "success",
      },
    ],
  },
  protected_merge: {
    commit: "ce1b966ef0614b8d567eca86ccc3f80cf8777ef0",
    base_parent: "1156e7e8d2c03463768c0306a73fbaa584af3539",
    head_tree: "6db599207b14c34dfc2eda43dafb9f3fe986cfd7",
    merged_at: "2026-08-07T21:15:24Z",
    pull_request: 25,
  },
});
const TASK_0004_PROTECTED_EVIDENCE = Object.freeze({
  rejected_candidates: [
    "73e35437c5cad0224106fbe623aad5ea8c4d3641",
    "461a06e6269fe48d6713ec2355bb1d4a97deb4f4",
  ],
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0004-CLOSURE-003.yaml",
    task_sha256:
      "c07f9469af9950f52cb1eb23d3645285a90e7ef39b71312ca1404813efd87656",
    handoff: "docs/handoffs/RECOVERY-TASK-0004-CLOSURE-003.md",
    handoff_sha256:
      "e560b7871ca403e9e79d12e92f6b4aeceb483eaa5224f877f86a8ce290700fcf",
    implementation_commit: "286ee507a0fd855fd37b0d768ed04033dfc64de6",
    candidate_commit: "5781d099adc515e4cd8618b79588379fe4d3dcae",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0004-CLOSURE-003-QA.md",
    review_sha256:
      "0c68e42dc53a09f92fe427637e8b4bcb71e570523a0451bc6ad3c92c207d56c0",
    review_commit: "6f75a6a8c77d29ae8b97626a18d89813b7daddb6",
    reviewed_candidate: "5781d099adc515e4cd8618b79588379fe4d3dcae",
  },
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "5781d099adc515e4cd8618b79588379fe4d3dcae",
    review_commit: "6f75a6a8c77d29ae8b97626a18d89813b7daddb6",
    pr_head: "6f75a6a8c77d29ae8b97626a18d89813b7daddb6",
    tree: "0b6eda9127477751227fe2b3755d5904c73ae744",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 27,
    base_sha: "29dd908b8f777f4d61ecc887cbf4fba8aef44ee8",
    head_sha: "6f75a6a8c77d29ae8b97626a18d89813b7daddb6",
    checks: [
      {
        name: "repository-validation",
        run_id: 31229576739,
        job_id: 93030559904,
        head_sha: "6f75a6a8c77d29ae8b97626a18d89813b7daddb6",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31229576740,
        job_id: 93030559948,
        head_sha: "6f75a6a8c77d29ae8b97626a18d89813b7daddb6",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9013304570,
      name: "validation-evidence",
      archive_digest:
        "sha256:c3e286798a48c52ccf6119f69e60e1b3343d58723f79982c4d1f67185f39423e",
      content_sha256:
        "5762284a3a882a11a2847346cef20e897b1d2b333a447bf44831f8312316e7b1",
      content_status: "passed",
    },
    post_merge_checks: [
      {
        name: "repository-validation",
        run_id: 31229685860,
        job_id: 93030884677,
        head_sha: "9b2e2a72e35dafa82342d0655f788721eb2bbf48",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31229685916,
        job_id: 93030884834,
        head_sha: "9b2e2a72e35dafa82342d0655f788721eb2bbf48",
        conclusion: "success",
      },
    ],
  },
  protected_merge: {
    commit: "9b2e2a72e35dafa82342d0655f788721eb2bbf48",
    base_parent: "29dd908b8f777f4d61ecc887cbf4fba8aef44ee8",
    head_tree: "0b6eda9127477751227fe2b3755d5904c73ae744",
    merged_at: "2026-08-08T00:17:38Z",
    pull_request: 27,
  },
});
const TASK_0005_PROTECTED_EVIDENCE = Object.freeze({
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0005-CLOSURE-001.yaml",
    task_sha256:
      "13d7c67e97bd842a08358b759ea568077581709252a5cb904d84864ce198177d",
    handoff: "docs/handoffs/RECOVERY-TASK-0005-CLOSURE-001.md",
    handoff_sha256:
      "b915064e61ef405eb71396ea20bd398263d9b089ee031245adcf7eebd77729ad",
    implementation_commit: "b40ca058036d256584a0a9f6295f6ed6ce6e26f1",
    candidate_commit: "7b8c698e910199e86ae027bf2e6b96c77acafabb",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0005-CLOSURE-001-QA.md",
    review_sha256:
      "24e9c821166a8e040f26aaa9b73de82a33c74be3854f78a374a0d794a121dbcb",
    review_commit: "06cb195c7f859e3036eb7eb146a15d9a50a047be",
    reviewed_candidate: "7b8c698e910199e86ae027bf2e6b96c77acafabb",
  },
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "7b8c698e910199e86ae027bf2e6b96c77acafabb",
    review_commit: "06cb195c7f859e3036eb7eb146a15d9a50a047be",
    pr_head: "06cb195c7f859e3036eb7eb146a15d9a50a047be",
    tree: "3df2f58ecda32ca9a8e372625bb848a8ecacfdb8",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 29,
    base_sha: "5fa7e69458568d8c80bcbb4e913291e16afbdd60",
    head_sha: "06cb195c7f859e3036eb7eb146a15d9a50a047be",
    checks: [
      {
        name: "repository-validation",
        run_id: 31234607561,
        job_id: 93044727182,
        head_sha: "06cb195c7f859e3036eb7eb146a15d9a50a047be",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31234607591,
        job_id: 93044727261,
        head_sha: "06cb195c7f859e3036eb7eb146a15d9a50a047be",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9014966048,
      name: "validation-evidence",
      archive_digest:
        "sha256:7ac477139de2dad633dab25f8636e903969d08a8046005aaca94609f35e3a87a",
      content_sha256:
        "7bb3149e7a4b2a0f14a6ec9c0fa8dd436fec4ee71e7477470665e016824d4ec6",
      content_status: "passed",
    },
    post_merge_checks: [
      {
        name: "repository-validation",
        run_id: 31234694814,
        job_id: 93044947259,
        head_sha: "b0c7a20144c5f8dcb50d6207005a8621055e5e7b",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31234694820,
        job_id: 93044947237,
        head_sha: "b0c7a20144c5f8dcb50d6207005a8621055e5e7b",
        conclusion: "success",
      },
    ],
  },
  protected_merge: {
    commit: "b0c7a20144c5f8dcb50d6207005a8621055e5e7b",
    base_parent: "5fa7e69458568d8c80bcbb4e913291e16afbdd60",
    head_tree: "3df2f58ecda32ca9a8e372625bb848a8ecacfdb8",
    merged_at: "2026-08-08T02:19:16Z",
    pull_request: 29,
  },
});
const TASK_0006_PROTECTED_EVIDENCE = Object.freeze({
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0006-CLOSURE-001.yaml",
    task_sha256:
      "b709cd8cfe3641e960bedac8879bc2c13cecb1d0f6c4838e6a1c422a3c7cc5c4",
    handoff: "docs/handoffs/RECOVERY-TASK-0006-CLOSURE-001.md",
    handoff_sha256:
      "704c885900fd527d74d3b2d8f6b9aa54ba3d938b4e99a223714a926c4cc1ab59",
    implementation_commit: "0056c12569dec76a6cb293d75084058747f049d4",
    candidate_commit: "a7b8793db062d1819cc0436131b3abd13f25a009",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0006-CLOSURE-001-R3-QA.md",
    review_sha256:
      "f32d5fe2e35f683fc21f5d96f3b258d2680e4cdf6302e28a2be1ba7c306bdfdd",
    review_commit: "2a8e06be2ebb3cc9dd9665a538bcef39cd54000f",
    reviewed_candidate: "a7b8793db062d1819cc0436131b3abd13f25a009",
  },
  rejected_reviews: [
    {
      candidate_commit: "605b16fd830441272c323ff8a6f6f23d5cc202bb",
      review: "docs/reviews/RECOVERY-TASK-0006-CLOSURE-001-QA.md",
      review_sha256:
        "690730754a4452be78b88e0aa95dccb55ff0771879f9b3d90f12aa4dcb82557c",
      review_commit: "8e1b0674cd5f4f788f57cdd8192fd2585cda67c7",
    },
    {
      candidate_commit: "6a8a50d88120ee9d18372d2d4a9561cb14f7a1fc",
      review: "docs/reviews/RECOVERY-TASK-0006-CLOSURE-001-R2-QA.md",
      review_sha256:
        "8430769510533b792e4d909167d1a738c7f5f360e5c8516df1cece974e902170",
      review_commit: "0c9dbeb9762a895a6fea89b9f4064c617ea5d4dc",
    },
  ],
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "a7b8793db062d1819cc0436131b3abd13f25a009",
    review_commit: "2a8e06be2ebb3cc9dd9665a538bcef39cd54000f",
    pr_head: "2a8e06be2ebb3cc9dd9665a538bcef39cd54000f",
    tree: "b6bfb02b40856775f1c9535fc371e9fa8d3811b1",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 31,
    base_sha: "38f187386747acff0e3a62449b025ac406bb06e3",
    head_sha: "2a8e06be2ebb3cc9dd9665a538bcef39cd54000f",
    checks: [
      {
        name: "repository-validation",
        run_id: 31243303593,
        job_id: 93067657927,
        head_sha: "2a8e06be2ebb3cc9dd9665a538bcef39cd54000f",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31243303591,
        job_id: 93067657840,
        head_sha: "2a8e06be2ebb3cc9dd9665a538bcef39cd54000f",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9017702894,
      name: "validation-evidence",
      archive_digest:
        "sha256:271ac2c667522b658bfdd2c78c0bd2217250b8f6955bc67f6d9e2bce2b222a02",
      content_sha256:
        "07d76b052070210a545191f7706b4677ec951cf2d0a8df669fb4932c3672ebfc",
      content_status: "passed",
    },
    post_merge_checks: [
      {
        name: "repository-validation",
        run_id: 31243411393,
        job_id: 93067939403,
        head_sha: "244e297777261382bff221e5d9eaa15c9b090ac7",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31243411407,
        job_id: 93067939363,
        head_sha: "244e297777261382bff221e5d9eaa15c9b090ac7",
        conclusion: "success",
      },
    ],
  },
  protected_merge: {
    commit: "244e297777261382bff221e5d9eaa15c9b090ac7",
    base_parent: "38f187386747acff0e3a62449b025ac406bb06e3",
    head_tree: "b6bfb02b40856775f1c9535fc371e9fa8d3811b1",
    merged_at: "2026-08-08T06:12:49Z",
    pull_request: 31,
  },
});
const TASK_0007_PROTECTED_EVIDENCE = Object.freeze({
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0007-CLOSURE-001.yaml",
    task_sha256:
      "82c6b44614436956d1ef2a1646b1f155b9ba595f221194dfe48b463a20a96864",
    handoff: "docs/handoffs/RECOVERY-TASK-0007-CLOSURE-001.md",
    handoff_sha256:
      "709735ea5890ba9058afce5190dbb51ef1fe6f8c06a187230bc739bf14b0ea19",
    implementation_commit: "5dc68c891eb2337f98b79f2f9a180663f3ef093d",
    candidate_commit: "fc6cec0bb6d4b2689b6a07df7e8ccaa169d800fd",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0007-CLOSURE-001-R3-QA.md",
    review_sha256:
      "597357d694eb8b047e3401f62db8d58dc9f0e88b5c891d827f6092edb3dcf02f",
    review_commit: "ed83b582d161c3d9d2a13fc7098e56e776bb0f3e",
    reviewed_candidate: "fc6cec0bb6d4b2689b6a07df7e8ccaa169d800fd",
  },
  rejected_reviews: [
    {
      candidate_commit: "9a3b23f40bdd2a6bf75a8c74deba5011b6a30ab7",
      review: "docs/reviews/RECOVERY-TASK-0007-CLOSURE-001-QA.md",
      review_sha256:
        "5371687d6f88d6ebeced3a94966a8ce0423854dae2b80258cf7ad64bc732d0a0",
      review_commit: "2b830131e8d1d0915b0ceffde118ae8137133602",
    },
  ],
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "fc6cec0bb6d4b2689b6a07df7e8ccaa169d800fd",
    review_commit: "ed83b582d161c3d9d2a13fc7098e56e776bb0f3e",
    pr_head: "21213383ae3459d278a01e2d24753c1b2311b849",
    tree: "ececdaed82410ee5c6848c955553e8fc7a0615fe",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 33,
    base_sha: "54652c309b473ec7797b36cd6e9b7099306f3bfb",
    head_sha: "21213383ae3459d278a01e2d24753c1b2311b849",
    checks: [
      {
        name: "repository-validation",
        run_id: 31256188592,
        job_id: 93099768679,
        head_sha: "21213383ae3459d278a01e2d24753c1b2311b849",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31256188573,
        job_id: 93099768627,
        head_sha: "21213383ae3459d278a01e2d24753c1b2311b849",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9021478793,
      name: "validation-evidence",
      archive_digest:
        "sha256:ec7c919b73ee073bc521725474b04af2e20b7381aad3f8685baa2c12f17a9833",
      content_sha256:
        "3c41adce7e90fa853b946d69a81cdb5af0763a8d2c477cdc89911fddfed65bea",
      content_status: "passed",
    },
    post_merge_checks: [
      {
        name: "repository-validation",
        run_id: 31256343509,
        job_id: 93100130187,
        head_sha: "c0e0a065ecd019429ad4aa3a09c4ccf8859361fe",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31256343505,
        job_id: 93100129974,
        head_sha: "c0e0a065ecd019429ad4aa3a09c4ccf8859361fe",
        conclusion: "success",
      },
    ],
  },
  protected_merge: {
    commit: "c0e0a065ecd019429ad4aa3a09c4ccf8859361fe",
    base_parent: "54652c309b473ec7797b36cd6e9b7099306f3bfb",
    head_tree: "ececdaed82410ee5c6848c955553e8fc7a0615fe",
    merged_at: "2026-08-08T12:02:29Z",
    pull_request: 33,
  },
});
const TASK_0008_PROTECTED_EVIDENCE = Object.freeze({
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0008-CLOSURE-002.yaml",
    task_sha256:
      "598867166126de5e794298779babe0ff1f355bd401f470e66ea7d3b4b19b6d9b",
    handoff: "docs/handoffs/RECOVERY-TASK-0008-CLOSURE-002.md",
    handoff_sha256:
      "20f6e34b7b5d49e219197c6caab47cc521d5a90c0e369bea96bda71ec5ac2cde",
    implementation_commit: "50d28fee68c7ce9dbb9bccaec356c0daad2c87e8",
    candidate_commit: "facbafdf422033bd2dfbd9b2086fdd9bba12eb0c",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0008-CLOSURE-002-QA.md",
    review_sha256:
      "6d6722220170e7679dec03fa6c4a9b67c523bd4069035a6edff078d5e02ab3ca",
    review_commit: "0c66fa7006f9cc44053ef3eb8f8d06a941360c43",
    reviewed_candidate: "facbafdf422033bd2dfbd9b2086fdd9bba12eb0c",
  },
  rejected_reviews: [
    {
      candidate_commit: "a296fe5fed7114566e9e5c6419d03828ece10dba",
      review: "docs/reviews/RECOVERY-TASK-0008-CLOSURE-001-QA.md",
      review_sha256:
        "a98133b334518dd637c5aa8bc1a151c6461bd5598eb87de81440324ef9486722",
      review_commit: "44d7f5c769477b78be582831cb4bca0cb757a64c",
      preservation_commit: "275863078ee8829bd984e0d6be9af827934dfcf9",
    },
  ],
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "facbafdf422033bd2dfbd9b2086fdd9bba12eb0c",
    review_commit: "0c66fa7006f9cc44053ef3eb8f8d06a941360c43",
    pr_head: "ef046e56dd1f90c33456209498d798edc4cf47db",
    tree: "487cb28e88cbe92c78d7d0f658580da20401cb58",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 35,
    base_sha: "a9996e0496683f6297bee1833e527f004a3e64d6",
    head_sha: "ef046e56dd1f90c33456209498d798edc4cf47db",
    checks: [
      {
        name: "repository-validation",
        run_id: 31334852303,
        job_id: 93298914297,
        head_sha: "ef046e56dd1f90c33456209498d798edc4cf47db",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31334852304,
        job_id: 93298914302,
        head_sha: "ef046e56dd1f90c33456209498d798edc4cf47db",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9044065807,
      name: "validation-evidence",
      archive_digest:
        "sha256:6f768bc14a628e311d9a31d9b35666081ba66937d3bca92fc3639c3d540dd5d7",
      content_sha256:
        "79790e2e887f0a4250dbd0cd1b14f26979981ae16645e05a0ac83e71461e8a8a",
      content_status: "passed",
    },
    post_merge_checks: [
      {
        name: "repository-validation",
        run_id: 31335101488,
        job_id: 93299554736,
        head_sha: "7df6605a996bb993806b74980af35c0ca0558797",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31335101527,
        job_id: 93299554773,
        head_sha: "7df6605a996bb993806b74980af35c0ca0558797",
        conclusion: "success",
      },
    ],
  },
  protected_merge: {
    commit: "7df6605a996bb993806b74980af35c0ca0558797",
    base_parent: "a9996e0496683f6297bee1833e527f004a3e64d6",
    head_tree: "487cb28e88cbe92c78d7d0f658580da20401cb58",
    merged_at: "2026-08-09T20:46:15Z",
    pull_request: 35,
  },
});
const TASK_0009_PROTECTED_EVIDENCE = Object.freeze({
  remediation: {
    task: "tasks/recovery/RECOVERY-TASK-0009-CLOSURE-002.yaml",
    task_sha256:
      "66c1484d733d50a1643b80e36906a0d1aff039b1ea95191ed9b61a83e9004c25",
    handoff: "docs/handoffs/RECOVERY-TASK-0009-CLOSURE-002.md",
    handoff_sha256:
      "0146250fd098b7a7c8c9b438da5afdcfd8a0e02f3a81b199b7fbeba912d338c3",
    implementation_commit: "af3eeb73af2ec083fd7014dff2c72177dc0e700e",
    candidate_commit: "3af44b7ee48e5a60fa479693b72482ff3a1b805a",
  },
  independent_qa: {
    review: "docs/reviews/RECOVERY-TASK-0009-CLOSURE-002-QA.md",
    review_sha256:
      "a1250b23eaa3ffc464e808a9138d41d4f5bf74a1741336f3ae182c82f29cf5c2",
    review_commit: "90ef572be4457d47d4c4d817ba46cda891613332",
    reviewed_candidate: "3af44b7ee48e5a60fa479693b72482ff3a1b805a",
  },
  rejected_reviews: [
    {
      candidate_commit: "08f98c88e331c6466c5ceba3a3fccabd035a9886",
      review: "docs/reviews/RECOVERY-TASK-0009-CLOSURE-001-QA.md",
      review_sha256:
        "102ce90a6b2310f13566f857620f5c3485e455178d7f66637661239a4eb02a70",
      review_commit: "5b56ff40e6c881600f840239c967b8f87bbcff37",
    },
  ],
  protected_review: {
    mechanism: "independent-codex-qa-protected-flow",
    candidate_commit: "3af44b7ee48e5a60fa479693b72482ff3a1b805a",
    review_commit: "90ef572be4457d47d4c4d817ba46cda891613332",
    pr_head: "90ef572be4457d47d4c4d817ba46cda891613332",
    tree: "4cb92c4c200fdc33d5f3ae89ea7a49d9ae2f3366",
  },
  hosted: {
    evidence_boundary:
      "immutable inspected snapshot; GitHub API facts are not revalidated offline",
    repository: "bfertich-vt/upfs-v1",
    pull_request: 37,
    base_sha: "572b6d6f31ab10f41c6077bcf1fe7b12a159070a",
    head_sha: "90ef572be4457d47d4c4d817ba46cda891613332",
    checks: [
      {
        name: "repository-validation",
        run_id: 31420758944,
        job_id: 93560631707,
        head_sha: "90ef572be4457d47d4c4d817ba46cda891613332",
        conclusion: "success",
      },
      {
        name: "repository-security",
        run_id: 31420759086,
        job_id: 93560632371,
        head_sha: "90ef572be4457d47d4c4d817ba46cda891613332",
        conclusion: "success",
      },
    ],
    validation_artifact: {
      artifact_id: 9075398527,
      name: "validation-evidence",
      archive_digest:
        "sha256:be102389407d119b4c190e7b2df1e0fc28285708027bd6f145822c5b194bffbb",
      content_sha256:
        "b05f4804c33b63971a40a2fc190945405c1cb44f97b2d9b24dd43930783d467e",
      content_status: "passed",
    },
  },
  hosted_metadata_exception: {
    api_state: "OPEN",
    api_merge_commit: null,
    local_merge_commit: "77e24476f2ee2ad7168200c9ab94e14d602d9032",
    reason:
      "GitHub created the exact two-parent PR #37 merge commit after an API GraphQL fault, but the PR API did not record merged state and no push workflows fired.",
    corrective_requirement:
      "This activation must pass exact-head protected validation and security, retained-artifact inspection, protected merge, and post-merge checks before TASK-0009 acceptance is operationally final.",
  },
  protected_merge: {
    commit: "77e24476f2ee2ad7168200c9ab94e14d602d9032",
    base_parent: "572b6d6f31ab10f41c6077bcf1fe7b12a159070a",
    head_tree: "4cb92c4c200fdc33d5f3ae89ea7a49d9ae2f3366",
    merged_at: "2026-08-10T18:53:25Z",
    pull_request: 37,
  },
});
const PROTECTED_EVIDENCE = Object.freeze({
  "TASK-0002": TASK_0002_PROTECTED_EVIDENCE,
  "TASK-0003": TASK_0003_PROTECTED_EVIDENCE,
  "TASK-0004": TASK_0004_PROTECTED_EVIDENCE,
  "TASK-0005": TASK_0005_PROTECTED_EVIDENCE,
  "TASK-0006": TASK_0006_PROTECTED_EVIDENCE,
  "TASK-0007": TASK_0007_PROTECTED_EVIDENCE,
  "TASK-0008": TASK_0008_PROTECTED_EVIDENCE,
  "TASK-0009": TASK_0009_PROTECTED_EVIDENCE,
});
const DISPOSITION_SOURCE_COMMIT = "420403fc09962d35d19af0cd735b056cb2a9a1ba";
const DISPOSITION_SOURCE_SHA256 =
  "05e29ce65b83b934fa80b116bb4052e74088de9e766d4b8de703941c091b2922";
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const digest = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const inside = (root, target) =>
  target === root || target.startsWith(`${root}${path.sep}`);
const positiveSafeInteger = (value) => Number.isSafeInteger(value) && value > 0;

function canonicalRfc3339(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/.test(
      value,
    )
  )
    return false;
  const parsed = new Date(value);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().replace(".000Z", "Z") === value
  );
}

function safePath(root, rel, label, errors) {
  if (
    typeof rel !== "string" ||
    !rel ||
    path.isAbsolute(rel) ||
    rel.replace(/\\/g, "/").split("/").includes("..")
  ) {
    errors.push(`${label} must be a contained repository-relative path.`);
    return null;
  }
  const target = path.resolve(root, rel);
  try {
    const realRoot = fs.realpathSync.native(root);
    const realTarget = fs.realpathSync.native(target);
    if (!inside(realRoot, realTarget) || !fs.statSync(realTarget).isFile())
      throw new Error("unsafe");
    return realTarget;
  } catch {
    errors.push(`${label} cannot be resolved as a contained regular file.`);
    return null;
  }
}

function fileBytes(root, rel, expected, label, errors) {
  const target = safePath(root, rel, label, errors);
  if (!target) return null;
  const bytes = fs.readFileSync(target);
  if (!SHA64.test(expected || "") || digest(bytes) !== expected)
    errors.push(`${label} has a stale or incorrect SHA-256.`);
  return bytes;
}

function git(root, args, label, errors, binary = false) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: binary ? null : "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    errors.push(`${label} cannot be verified from repository Git objects.`);
    return null;
  }
}

function commitExists(root, value, label, errors) {
  if (!SHA40.test(value || "")) {
    errors.push(`${label} must be a 40-character commit SHA.`);
    return false;
  }
  const type = git(
    root,
    ["cat-file", "-t", `${value}^{commit}`],
    label,
    errors,
  );
  if (type !== null && type.trim() !== "commit") {
    errors.push(`${label} must resolve to a commit.`);
    return false;
  }
  return type !== null;
}

function immutableBytes(root, rel, commit, expected, label, errors) {
  if (!commitExists(root, commit, `${label}.commit`, errors)) return null;
  const safe =
    typeof rel === "string" &&
    rel &&
    !path.isAbsolute(rel) &&
    !rel.replace(/\\/g, "/").split("/").includes("..");
  if (!safe) {
    errors.push(
      `${label}.artifact must be a contained repository-relative path.`,
    );
    return null;
  }
  const bytes = git(
    root,
    ["show", `${commit}:${rel.replace(/\\/g, "/")}`],
    label,
    errors,
    true,
  );
  if (bytes && (!SHA64.test(expected || "") || digest(bytes) !== expected))
    errors.push(`${label} has a stale or incorrect immutable SHA-256.`);
  return bytes;
}

function ancestor(root, older, newer, label, errors) {
  const resolvedNewer =
    newer === "HEAD"
      ? git(root, ["rev-parse", "HEAD"], `${label}.descendant`, errors)?.trim()
      : newer;
  if (
    !commitExists(root, older, `${label}.ancestor`, errors) ||
    !commitExists(root, resolvedNewer, `${label}.descendant`, errors)
  )
    return;
  git(
    root,
    ["merge-base", "--is-ancestor", older, resolvedNewer],
    label,
    errors,
  );
}

function strictReviewTopology(root, qa, remediation, label, errors) {
  if (qa.reviewed_candidate !== remediation.candidate_commit) {
    errors.push(
      `${label} reviewed_candidate must equal remediation.candidate_commit.`,
    );
    return;
  }
  if (qa.review_commit === qa.reviewed_candidate) {
    errors.push(`${label} review_commit must be distinct from the candidate.`);
    return;
  }
  if (
    !commitExists(root, qa.reviewed_candidate, `${label}.candidate`, errors) ||
    !commitExists(root, qa.review_commit, `${label}.review_commit`, errors)
  )
    return;
  const parents = git(
    root,
    ["show", "-s", "--format=%P", qa.review_commit],
    `${label}.parents`,
    errors,
  )
    ?.trim()
    .split(/\s+/);
  if (parents?.length !== 1 || parents[0] !== qa.reviewed_candidate)
    errors.push(
      `${label} review_commit must have the exact reviewed candidate as its sole parent.`,
    );
  const before = git(
    root,
    ["cat-file", "-e", `${qa.reviewed_candidate}:${qa.review}`],
    `${label}.preseed probe`,
    [],
    true,
  );
  if (before !== null)
    errors.push(
      `${label} review artifact must not be pre-seeded in the candidate.`,
    );
  const introduced = git(
    root,
    [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "-r",
      qa.review_commit,
      "--",
      qa.review,
    ],
    `${label}.introduction`,
    errors,
  )?.trim();
  if (introduced !== `A\t${qa.review}`)
    errors.push(
      `${label} review artifact must be introduced at review_commit.`,
    );
}

export function structuredVerdictAttestation(bytes, expected) {
  if (!Buffer.isBuffer(bytes) || !object(expected)) return false;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  )
    return false;
  let body;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  body = body.replace(/\r\n/g, "\n");
  const value = {
    version: 1,
    task_id: expected.task_id,
    reviewed_candidate: expected.reviewed_candidate,
    verdict: "ACCEPTED",
    reviewer_role: "Independent QA/Security",
  };
  if (
    !/^TASK-\d{4}$/.test(value.task_id || "") ||
    !SHA40.test(value.reviewed_candidate || "")
  )
    return false;
  return body === `${JSON.stringify(value, null, 2)}\n`;
}

function strictAttestationTopology(root, qa, taskId, label, errors) {
  const canonical = `docs/reviews/attestations/${taskId}-closure-verdict.json`;
  if (qa.attestation !== canonical)
    errors.push(`${label}.attestation must use the canonical task path.`);
  if (
    qa.attestation_commit === qa.attestation_parent ||
    qa.attestation_commit === qa.review_commit
  )
    errors.push(
      `${label}.attestation_commit must be a distinct review commit.`,
    );
  if (
    !commitExists(
      root,
      qa.attestation_parent,
      `${label}.attestation_parent`,
      errors,
    ) ||
    !commitExists(
      root,
      qa.attestation_commit,
      `${label}.attestation_commit`,
      errors,
    )
  )
    return;
  if (qa.attestation_parent !== qa.review_commit)
    errors.push(
      `${label}.attestation_parent must equal review_commit exactly.`,
    );
  const parents = git(
    root,
    ["show", "-s", "--format=%P", qa.attestation_commit],
    `${label}.attestation parents`,
    errors,
  )
    ?.trim()
    .split(/\s+/);
  if (parents?.length !== 1 || parents[0] !== qa.attestation_parent)
    errors.push(
      `${label}.attestation_commit must have attestation_parent as its sole parent.`,
    );
  const before = git(
    root,
    ["cat-file", "-e", `${qa.attestation_parent}:${qa.attestation}`],
    `${label}.attestation preseed probe`,
    [],
    true,
  );
  if (before !== null)
    errors.push(`${label}.attestation must not be pre-seeded.`);
  const introduced = git(
    root,
    [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "-z",
      "--find-renames",
      "--find-copies",
      "--find-copies-harder",
      "-r",
      qa.attestation_commit,
    ],
    `${label}.attestation introduction`,
    errors,
    true,
  );
  if (!exactAttestationDiff(introduced, canonical))
    errors.push(
      `${label}.attestation commit diff must contain exactly one added canonical attestation.`,
    );
  const entry = git(
    root,
    ["ls-tree", "-z", qa.attestation_commit, "--", canonical],
    `${label}.attestation tree entry`,
    errors,
    true,
  );
  const entryPattern = new RegExp(
    `^100(?:644|755) blob [a-f0-9]{40}\\t${canonical.replaceAll("/", "\\/")}\\u0000$`,
  );
  if (!entryPattern.test(entry?.toString("utf8") || ""))
    errors.push(
      `${label}.attestation must be a regular blob at the canonical path.`,
    );
}

export function exactAttestationDiff(status, canonical) {
  return (
    Buffer.isBuffer(status) &&
    status.equals(Buffer.from(`A\0${canonical}\0`, "utf8"))
  );
}

function criterionEvidenceCell(body, criterion) {
  const prefix = `| ${criterion} |`;
  const row = body.split(/\r?\n/).find((line) => line.startsWith(prefix));
  if (!row) return "";
  const fields = row
    .slice(1, -1)
    .split("|")
    .map((value) => value.trim());
  return fields.length === 3 && fields[0] === criterion ? fields[1] : "";
}

function exact(value, keys, label, errors) {
  if (!object(value)) {
    errors.push(`${label} must be an object.`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    errors.push(`${label} must contain exactly: ${expected.join(", ")}.`);
    return false;
  }
  return true;
}

function matrixRows(root, errors) {
  const file = safePath(root, MATRIX, MATRIX, errors);
  const rows = new Map();
  if (!file) return rows;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!/^\| TASK-\d{4} \|/.test(line)) continue;
    const fields = line
      .slice(1, -1)
      .split("|")
      .map((value) => value.trim());
    if (fields.length !== 18)
      errors.push(
        `${MATRIX} ${fields[0] || "row"} must have exactly 18 fields.`,
      );
    else if (rows.has(fields[0]))
      errors.push(`${MATRIX} duplicates ${fields[0]}.`);
    else rows.set(fields[0], fields);
  }
  return rows;
}

export function auditedDispositionMap(bytes, expectedDigest, errors) {
  const dispositions = new Map();
  if (
    !Buffer.isBuffer(bytes) ||
    !SHA64.test(expectedDigest || "") ||
    digest(bytes || Buffer.alloc(0)) !== expectedDigest
  ) {
    errors.push(
      "Audited historical disposition source has a stale or incorrect SHA-256.",
    );
    return dispositions;
  }
  const allowed = new Set([
    "ACCEPTED",
    "REMEDIATION_REQUIRED",
    "EXTERNAL_PREREQUISITE",
    "NOT_IMPLEMENTED",
  ]);
  for (const line of bytes.toString("utf8").split(/\r?\n/)) {
    if (!/^\| TASK-\d{4} \|/.test(line)) continue;
    const fields = line
      .slice(1, -1)
      .split("|")
      .map((value) => value.trim());
    const taskId = fields[0];
    const disposition = fields[9];
    if (fields.length !== 18 || !allowed.has(disposition))
      errors.push(
        `Audited historical disposition source has an invalid ${taskId || "row"}.`,
      );
    else if (dispositions.has(taskId))
      errors.push(
        `Audited historical disposition source duplicates ${taskId}.`,
      );
    else dispositions.set(taskId, disposition);
  }
  if (dispositions.size !== 110)
    errors.push(
      "Audited historical disposition source must bind exactly 110 tasks.",
    );
  return dispositions;
}

function validateAccepted(root, task, tasks, row, errors) {
  const rel = `${DIRECTORY}/${task.id}.json`;
  const file = safePath(root, rel, rel, errors);
  if (!file) return;
  let record;
  try {
    record = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    errors.push(`${rel} must contain valid JSON.`);
    return;
  }
  const protectedReviewMode = Object.hasOwn(record, "protected_review");
  if (
    !exact(
      record,
      [
        "version",
        "task_id",
        "disposition",
        "historical",
        "remediation",
        "independent_qa",
        ...(["TASK-0003", "TASK-0004"].includes(task.id)
          ? ["rejected_candidates"]
          : ["TASK-0006", "TASK-0007", "TASK-0008", "TASK-0009"].includes(
                task.id,
              )
            ? ["rejected_reviews"]
            : []),
        protectedReviewMode ? "protected_review" : "stage_a",
        "hosted",
        ...(task.id === "TASK-0009" ? ["hosted_metadata_exception"] : []),
        "protected_merge",
        "acceptance_mapping",
        "dependencies",
        "limitations",
      ],
      rel,
      errors,
    )
  )
    return;
  if (
    record.version !== 1 ||
    record.task_id !== task.id ||
    record.disposition !== "ACCEPTED"
  )
    errors.push(`${rel} must bind version 1, ${task.id}, and ACCEPTED.`);

  const historicalKeys = [
    "classification",
    "artifact",
    "artifact_sha256",
    "artifact_commit",
    "evidence_excerpt",
  ];
  if (exact(record.historical, historicalKeys, `${rel}.historical`, errors)) {
    const expected = {
      classification: task.classification,
      ...task.historical_evidence,
    };
    for (const key of historicalKeys)
      if (record.historical[key] !== expected[key])
        errors.push(
          `${rel}.historical.${key} does not preserve the immutable queue evidence.`,
        );
  }

  const remediation = record.remediation;
  if (
    exact(
      remediation,
      [
        "task",
        "task_sha256",
        "handoff",
        "handoff_sha256",
        "implementation_commit",
        "candidate_commit",
      ],
      `${rel}.remediation`,
      errors,
    )
  ) {
    const taskBytes = fileBytes(
      root,
      remediation.task,
      remediation.task_sha256,
      `${rel}.remediation.task`,
      errors,
    );
    const handoffBytes = fileBytes(
      root,
      remediation.handoff,
      remediation.handoff_sha256,
      `${rel}.remediation.handoff`,
      errors,
    );
    const immutableTask = immutableBytes(
      root,
      remediation.task,
      remediation.candidate_commit,
      remediation.task_sha256,
      `${rel}.remediation.task`,
      errors,
    );
    const immutableHandoff = immutableBytes(
      root,
      remediation.handoff,
      remediation.candidate_commit,
      remediation.handoff_sha256,
      `${rel}.remediation.handoff`,
      errors,
    );
    if (taskBytes && immutableTask && !taskBytes.equals(immutableTask))
      errors.push(`${rel}.remediation.task differs from its candidate blob.`);
    if (
      handoffBytes &&
      immutableHandoff &&
      !handoffBytes.equals(immutableHandoff)
    )
      errors.push(
        `${rel}.remediation.handoff differs from its candidate blob.`,
      );
    ancestor(
      root,
      remediation.implementation_commit,
      remediation.candidate_commit,
      `${rel}.remediation ancestry`,
      errors,
    );
  }

  const qa = record.independent_qa;
  let acceptedReviewBody = "";
  if (
    exact(
      qa,
      ["review", "review_sha256", "review_commit", "reviewed_candidate"],
      `${rel}.independent_qa`,
      errors,
    )
  ) {
    const current = fileBytes(
      root,
      qa.review,
      qa.review_sha256,
      `${rel}.independent_qa.review`,
      errors,
    );
    const immutable = immutableBytes(
      root,
      qa.review,
      qa.review_commit,
      qa.review_sha256,
      `${rel}.independent_qa.review`,
      errors,
    );
    if (current && immutable && !current.equals(immutable))
      errors.push(
        `${rel}.independent_qa.review differs from its review-commit blob.`,
      );
    acceptedReviewBody = immutable?.toString("utf8") || "";
    strictReviewTopology(
      root,
      qa,
      remediation,
      `${rel}.independent_qa`,
      errors,
    );
  }

  const protectedReview = record.protected_review;
  if (protectedReviewMode) {
    const expectedProtectedEvidence = PROTECTED_EVIDENCE[task.id];
    if (!expectedProtectedEvidence)
      errors.push(`${rel}.protected_review is not authorized for this task.`);
    else
      for (const key of [
        ...(["TASK-0003", "TASK-0004"].includes(task.id)
          ? ["rejected_candidates"]
          : ["TASK-0006", "TASK-0007", "TASK-0008", "TASK-0009"].includes(
                task.id,
              )
            ? ["rejected_reviews"]
            : []),
        "remediation",
        "independent_qa",
        "protected_review",
        "hosted",
        ...(task.id === "TASK-0009" ? ["hosted_metadata_exception"] : []),
        "protected_merge",
      ])
        if (
          JSON.stringify(record[key]) !==
          JSON.stringify(expectedProtectedEvidence[key])
        )
          errors.push(
            `${rel}.${key} does not match exact ${task.id} protected evidence.`,
          );
    if (["TASK-0003", "TASK-0004"].includes(task.id))
      for (const rejected of record.rejected_candidates || [])
        ancestor(
          root,
          rejected,
          remediation?.candidate_commit,
          `${rel}.rejected candidate ${rejected} ancestry`,
          errors,
        );
    if (["TASK-0006", "TASK-0007", "TASK-0008", "TASK-0009"].includes(task.id))
      for (const rejected of record.rejected_reviews || []) {
        if (
          !exact(
            rejected,
            [
              "candidate_commit",
              "review",
              "review_sha256",
              "review_commit",
              ...(Object.hasOwn(rejected, "preservation_commit")
                ? ["preservation_commit"]
                : []),
            ],
            `${rel}.rejected_reviews`,
            errors,
          )
        )
          continue;
        immutableBytes(
          root,
          rejected.review,
          rejected.review_commit,
          rejected.review_sha256,
          `${rel}.rejected review`,
          errors,
        );
        if (rejected.preservation_commit)
          immutableBytes(
            root,
            rejected.review,
            rejected.preservation_commit,
            rejected.review_sha256,
            `${rel}.preserved rejected review`,
            errors,
          );
        ancestor(
          root,
          rejected.candidate_commit,
          rejected.review_commit,
          `${rel}.rejected review topology`,
          errors,
        );
        ancestor(
          root,
          rejected.preservation_commit || rejected.review_commit,
          remediation?.candidate_commit,
          `${rel}.rejected review preservation`,
          errors,
        );
      }
    if (
      exact(
        protectedReview,
        ["mechanism", "candidate_commit", "review_commit", "pr_head", "tree"],
        `${rel}.protected_review`,
        errors,
      )
    ) {
      const reviewTree = git(
        root,
        ["show", "-s", "--format=%T", protectedReview.review_commit],
        `${rel}.protected_review.review_commit`,
        errors,
      )?.trim();
      const prTree = git(
        root,
        ["show", "-s", "--format=%T", protectedReview.pr_head],
        `${rel}.protected_review.pr_head`,
        errors,
      )?.trim();
      const reviewParents =
        git(
          root,
          ["show", "-s", "--format=%P", protectedReview.review_commit],
          `${rel}.protected_review.review parents`,
          errors,
        )
          ?.trim()
          .split(/\s+/) || [];
      const prParents =
        git(
          root,
          ["show", "-s", "--format=%P", protectedReview.pr_head],
          `${rel}.protected_review PR parents`,
          errors,
        )
          ?.trim()
          .split(/\s+/) || [];
      if (
        protectedReview.mechanism !== "independent-codex-qa-protected-flow" ||
        protectedReview.candidate_commit !== remediation?.candidate_commit ||
        protectedReview.review_commit !== qa?.review_commit ||
        (task.id === "TASK-0002" &&
          protectedReview.review_commit === protectedReview.pr_head) ||
        reviewParents.length !== 1 ||
        reviewParents[0] !== protectedReview.candidate_commit ||
        (task.id === "TASK-0002" &&
          (prParents.length !== 1 ||
            prParents[0] !== protectedReview.candidate_commit)) ||
        !reviewTree ||
        reviewTree !== prTree ||
        protectedReview.tree !== reviewTree
      )
        errors.push(
          `${rel}.protected_review must bind the exact single-parent QA evidence and protected PR-head tree to the candidate.`,
        );
    }
  }

  const stageA = record.stage_a;
  if (
    !protectedReviewMode &&
    exact(
      stageA,
      [
        "candidate_commit",
        "review",
        "review_sha256",
        "review_commit",
        "attestation",
        "attestation_sha256",
        "attestation_commit",
        "attestation_parent",
      ],
      `${rel}.stage_a`,
      errors,
    )
  ) {
    const stageReview = fileBytes(
      root,
      stageA.review,
      stageA.review_sha256,
      `${rel}.stage_a.review`,
      errors,
    );
    const immutableStageReview = immutableBytes(
      root,
      stageA.review,
      stageA.review_commit,
      stageA.review_sha256,
      `${rel}.stage_a.review`,
      errors,
    );
    if (
      stageReview &&
      immutableStageReview &&
      !stageReview.equals(immutableStageReview)
    )
      errors.push(`${rel}.stage_a.review differs from its review-commit blob.`);
    strictReviewTopology(
      root,
      { ...stageA, reviewed_candidate: stageA.candidate_commit },
      { candidate_commit: stageA.candidate_commit },
      `${rel}.stage_a`,
      errors,
    );
    const attestation = fileBytes(
      root,
      stageA.attestation,
      stageA.attestation_sha256,
      `${rel}.stage_a.attestation`,
      errors,
    );
    const immutableAttestation = immutableBytes(
      root,
      stageA.attestation,
      stageA.attestation_commit,
      stageA.attestation_sha256,
      `${rel}.stage_a.attestation`,
      errors,
    );
    if (
      attestation &&
      immutableAttestation &&
      !attestation.equals(immutableAttestation)
    )
      errors.push(
        `${rel}.stage_a.attestation differs from its attestation-commit blob.`,
      );
    if (
      !immutableAttestation ||
      !structuredVerdictAttestation(immutableAttestation, {
        task_id: task.id,
        reviewed_candidate: stageA.candidate_commit,
      })
    )
      errors.push(
        `${rel}.stage_a attestation is not the exact canonical ACCEPTED structure.`,
      );
    strictAttestationTopology(root, stageA, task.id, `${rel}.stage_a`, errors);
  }

  const hosted = record.hosted;
  if (
    exact(
      hosted,
      [
        "evidence_boundary",
        "repository",
        "pull_request",
        "base_sha",
        "head_sha",
        "checks",
        "validation_artifact",
        ...(protectedReviewMode && task.id !== "TASK-0009"
          ? ["post_merge_checks"]
          : []),
      ],
      `${rel}.hosted`,
      errors,
    )
  ) {
    if (
      hosted.evidence_boundary !==
        "immutable inspected snapshot; GitHub API facts are not revalidated offline" ||
      hosted.repository !== "bfertich-vt/upfs-v1" ||
      !positiveSafeInteger(hosted.pull_request) ||
      hosted.head_sha !==
        (protectedReviewMode ? protectedReview?.pr_head : qa?.review_commit)
    )
      errors.push(
        `${rel}.hosted has an invalid repository, PR, boundary, or exact-head binding.`,
      );
    if (!Array.isArray(hosted.checks) || hosted.checks.length !== 2)
      errors.push(
        `${rel}.hosted.checks must contain exactly two required checks.`,
      );
    else {
      const names = new Set();
      const runs = new Set();
      const jobs = new Set();
      for (const check of hosted.checks) {
        if (
          !exact(
            check,
            ["name", "run_id", "job_id", "head_sha", "conclusion"],
            `${rel}.hosted.check`,
            errors,
          )
        )
          continue;
        names.add(check.name);
        runs.add(check.run_id);
        jobs.add(check.job_id);
        if (
          !positiveSafeInteger(check.run_id) ||
          !positiveSafeInteger(check.job_id) ||
          check.head_sha !== hosted.head_sha ||
          check.conclusion !== "success"
        )
          errors.push(
            `${rel}.hosted.check must bind numeric IDs, exact head, and success.`,
          );
      }
      if (
        names.size !== 2 ||
        !names.has("repository-validation") ||
        !names.has("repository-security") ||
        runs.size !== 2 ||
        jobs.size !== 2
      )
        errors.push(
          `${rel}.hosted.checks must uniquely bind repository-validation and repository-security run/job IDs.`,
        );
    }
    const artifact = hosted.validation_artifact;
    if (
      exact(
        artifact,
        protectedReviewMode
          ? [
              "artifact_id",
              "name",
              "archive_digest",
              "content_sha256",
              "content_status",
            ]
          : [
              "artifact_id",
              "name",
              "archive_digest",
              "content",
              "content_sha256",
              "content_status",
            ],
        `${rel}.hosted.validation_artifact`,
        errors,
      )
    ) {
      let content = { status: artifact.content_status };
      if (!protectedReviewMode) {
        const bytes = fileBytes(
          root,
          artifact.content,
          artifact.content_sha256,
          `${rel}.hosted.validation_artifact.content`,
          errors,
        );
        try {
          content = bytes ? JSON.parse(bytes.toString("utf8")) : null;
        } catch {
          errors.push(
            `${rel}.hosted.validation_artifact.content must be JSON.`,
          );
        }
      }
      if (
        !positiveSafeInteger(artifact.artifact_id) ||
        artifact.name !== "validation-evidence" ||
        !/^sha256:[a-f0-9]{64}$/.test(artifact.archive_digest || "") ||
        !/^[a-f0-9]{64}$/.test(artifact.content_sha256 || "") ||
        artifact.content_status !== "passed" ||
        content?.status !== "passed"
      )
        errors.push(
          `${rel}.hosted.validation_artifact must bind an inspected passed artifact.`,
        );
    }
    if (protectedReviewMode && task.id !== "TASK-0009") {
      const post = hosted.post_merge_checks;
      if (!Array.isArray(post) || post.length !== 2)
        errors.push(
          `${rel}.hosted.post_merge_checks must contain exactly two required checks.`,
        );
      else {
        const names = new Set();
        const runs = new Set();
        const jobs = new Set();
        for (const check of post) {
          if (
            !exact(
              check,
              ["name", "run_id", "job_id", "head_sha", "conclusion"],
              `${rel}.hosted.post_merge_check`,
              errors,
            )
          )
            continue;
          names.add(check.name);
          runs.add(check.run_id);
          jobs.add(check.job_id);
          if (
            !positiveSafeInteger(check.run_id) ||
            !positiveSafeInteger(check.job_id) ||
            check.head_sha !== record.protected_merge?.commit ||
            check.conclusion !== "success"
          )
            errors.push(
              `${rel}.hosted.post_merge_check must bind the protected merge and success.`,
            );
        }
        if (
          names.size !== 2 ||
          !names.has("repository-validation") ||
          !names.has("repository-security") ||
          runs.size !== 2 ||
          jobs.size !== 2
        )
          errors.push(
            `${rel}.hosted.post_merge_checks must uniquely bind both required checks.`,
          );
      }
    }
  }

  const merge = record.protected_merge;
  if (
    exact(
      merge,
      ["commit", "base_parent", "head_tree", "merged_at", "pull_request"],
      `${rel}.protected_merge`,
      errors,
    )
  ) {
    const mergeTree = git(
      root,
      ["show", "-s", "--format=%T", merge.commit],
      `${rel}.protected_merge.commit`,
      errors,
    )?.trim();
    const headTree = git(
      root,
      ["show", "-s", "--format=%T", hosted?.head_sha],
      `${rel}.hosted.head`,
      errors,
    )?.trim();
    const parents =
      git(
        root,
        ["show", "-s", "--format=%P", merge.commit],
        `${rel}.protected_merge.parents`,
        errors,
      )
        ?.trim()
        .split(/\s+/) || [];
    const validParents = protectedReviewMode
      ? parents.length === 2 &&
        parents[0] === merge.base_parent &&
        parents[1] === hosted?.head_sha
      : parents.length === 1 && parents[0] === merge.base_parent;
    if (
      !SHA40.test(merge.commit || "") ||
      !validParents ||
      merge.base_parent !== hosted?.base_sha ||
      mergeTree !== headTree ||
      merge.head_tree !== headTree ||
      merge.pull_request !== hosted?.pull_request ||
      !canonicalRfc3339(merge.merged_at)
    )
      errors.push(
        `${rel}.protected_merge does not bind the base, exact hosted-head tree, PR, and timestamp.`,
      );
    const subject =
      git(
        root,
        ["show", "-s", "--format=%s", merge.commit],
        `${rel}.protected_merge.subject`,
        errors,
      )?.trim() || "";
    const prToken = new RegExp(
      `(?:^|[^0-9])#${merge.pull_request}(?:$|[^0-9])`,
    );
    if (!prToken.test(subject))
      errors.push(`${rel}.protected_merge subject does not bind its PR.`);
    ancestor(
      root,
      merge.commit,
      "HEAD",
      `${rel}.protected_merge reachability`,
      errors,
    );
  }

  if (
    !Array.isArray(record.acceptance_mapping) ||
    record.acceptance_mapping.length !== task.acceptance.length
  )
    errors.push(
      `${rel}.acceptance_mapping must map every queue criterion exactly once.`,
    );
  else {
    const mapped = new Set();
    const usedEvidence = new Set();
    for (const mapping of record.acceptance_mapping) {
      if (
        !exact(
          mapping,
          ["criterion", "evidence"],
          `${rel}.acceptance_mapping`,
          errors,
        )
      )
        continue;
      mapped.add(mapping.criterion);
      if (
        !task.acceptance.includes(mapping.criterion) ||
        !Array.isArray(mapping.evidence) ||
        mapping.evidence.length !== 1
      )
        errors.push(
          `${rel}.acceptance_mapping must bind one criterion to exactly one evidence record.`,
        );
      for (const evidence of mapping.evidence || []) {
        if (
          !exact(
            evidence,
            ["artifact", "artifact_sha256", "commit", "excerpt"],
            `${rel}.acceptance evidence`,
            errors,
          )
        )
          continue;
        const bytes = immutableBytes(
          root,
          evidence.artifact,
          evidence.commit,
          evidence.artifact_sha256,
          `${rel}.acceptance evidence`,
          errors,
        );
        const evidenceKey = `${evidence.commit}\0${evidence.artifact}\0${evidence.excerpt}`;
        const criterionCell = protectedReviewMode
          ? acceptedReviewBody
          : criterionEvidenceCell(acceptedReviewBody, mapping.criterion);
        if (
          evidence.artifact !== qa?.review ||
          evidence.commit !== qa?.review_commit ||
          evidence.artifact_sha256 !== qa?.review_sha256 ||
          typeof evidence.excerpt !== "string" ||
          evidence.excerpt.trim().length < 32 ||
          !criterionCell.includes(evidence.excerpt) ||
          (bytes && !bytes.toString("utf8").includes(evidence.excerpt)) ||
          usedEvidence.has(evidenceKey)
        )
          errors.push(
            `${rel}.acceptance evidence must be unique, criterion-specific, and bound to the accepted QA review.`,
          );
        usedEvidence.add(evidenceKey);
      }
    }
    if (mapped.size !== task.acceptance.length)
      errors.push(`${rel}.acceptance_mapping duplicates or omits a criterion.`);
  }

  if (
    !Array.isArray(record.dependencies) ||
    record.dependencies.length !== task.dependencies.length ||
    record.dependencies.some(
      (value, index) => value !== task.dependencies[index],
    )
  )
    errors.push(`${rel}.dependencies must exactly match the queue.`);
  else
    for (const dependency of record.dependencies)
      if (tasks.get(dependency)?.status !== "complete")
        errors.push(
          `${rel} cannot accept before dependency ${dependency} is complete.`,
        );
  if (
    !Array.isArray(record.limitations) ||
    !record.limitations.length ||
    !record.limitations.every(
      (value) => typeof value === "string" && value.trim(),
    )
  )
    errors.push(`${rel}.limitations must disclose remaining boundaries.`);
  if (
    [
      "TASK-0002",
      "TASK-0003",
      "TASK-0004",
      "TASK-0005",
      "TASK-0006",
      "TASK-0007",
      "TASK-0008",
      "TASK-0009",
    ].includes(task.id)
  ) {
    const limitations = (record.limitations || []).join(" ").toLowerCase();
    if (row?.[8] !== "Proven reference implementation")
      errors.push(
        `${MATRIX} ${task.id} classification must remain Proven reference implementation.`,
      );
    for (const boundary of ["durable", "oidc", "deployment", "runtime"])
      if (!limitations.includes(boundary))
        errors.push(
          `${rel}.limitations must preserve the unimplemented ${boundary} boundary.`,
        );
  }
  if (!row || row[9] !== "ACCEPTED")
    errors.push(`${MATRIX} ${task.id} disposition must be ACCEPTED.`);
}

export function validateHistoricalClosures(root, tasks, errors) {
  const historical = [...tasks.values()].filter(
    (task) =>
      /^TASK-\d{4}$/.test(task.id) &&
      Number(task.id.slice(5)) >= 1 &&
      Number(task.id.slice(5)) <= 110,
  );
  const governed = historical.filter((task) =>
    object(task.historical_evidence),
  );
  const hasClosure =
    governed.some((task) => task.status === "complete") ||
    fs.existsSync(path.join(root, DIRECTORY));
  if (!hasClosure) return;
  const rows = matrixRows(root, errors);
  const dispositionSource = immutableBytes(
    root,
    MATRIX,
    DISPOSITION_SOURCE_COMMIT,
    DISPOSITION_SOURCE_SHA256,
    "audited historical disposition source",
    errors,
  );
  ancestor(
    root,
    DISPOSITION_SOURCE_COMMIT,
    "HEAD",
    "audited historical disposition source ancestry",
    errors,
  );
  const auditedDispositions = auditedDispositionMap(
    dispositionSource,
    DISPOSITION_SOURCE_SHA256,
    errors,
  );
  if (rows.size !== 110)
    errors.push(`${MATRIX} must contain exactly 110 historical rows.`);
  for (const task of governed) {
    const closure = path.join(root, DIRECTORY, `${task.id}.json`);
    if (task.status === "complete")
      validateAccepted(root, task, tasks, rows.get(task.id), errors);
    else {
      if (fs.existsSync(closure))
        errors.push(`${task.id} has a closure record but is not complete.`);
      const audited = auditedDispositions.get(task.id);
      if (rows.get(task.id)?.[9] !== audited)
        errors.push(
          `${MATRIX} ${task.id} must preserve exact audited disposition ${audited || "<missing>"} without accepted closure evidence.`,
        );
    }
  }
}
