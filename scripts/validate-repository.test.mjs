import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateNodeWorkflowPin,
  validateTrivyWorkflowPin,
} from "./validate-repository.mjs";

const root = process.cwd();
const expectedSetupNode =
  "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020";

function fixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "upfs-workflow-pin-"),
  );
  fs.mkdirSync(path.join(directory, ".github", "workflows"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(directory, ".github", "workflows", "validate.yml"),
    fs.readFileSync(path.join(root, ".github", "workflows", "validate.yml")),
  );
  fs.writeFileSync(
    path.join(directory, ".github", "workflows", "security.yml"),
    fs.readFileSync(path.join(root, ".github", "workflows", "security.yml")),
  );
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ dependencies: { yaml: "2.8.1" } }),
  );
  return directory;
}

function mutateWorkflow(directory, mutate) {
  const file = path.join(directory, ".github", "workflows", "validate.yml");
  fs.writeFileSync(file, mutate(fs.readFileSync(file, "utf8")));
}

function mutateSecurityWorkflow(directory, mutate) {
  const file = path.join(directory, ".github", "workflows", "security.yml");
  fs.writeFileSync(file, mutate(fs.readFileSync(file, "utf8")));
}

function invalid(name, mutate, message) {
  test(name, () => {
    const directory = fixture();
    try {
      mutateWorkflow(directory, mutate);
      assert.throws(
        () =>
          validateNodeWorkflowPin(
            fs.readFileSync(
              path.join(directory, ".github", "workflows", "validate.yml"),
              "utf8",
            ),
          ),
        new RegExp(message),
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("accepts canonical formatted YAML while enforcing the exact Node pin", () => {
  const directory = fixture();
  try {
    assert.doesNotThrow(() =>
      validateNodeWorkflowPin(
        fs.readFileSync(
          path.join(directory, ".github", "workflows", "validate.yml"),
          "utf8",
        ),
      ),
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

invalid(
  "rejects a pinned setup-node action without node-version",
  (workflow) => workflow.replace('node-version: "24.16.0"', "cache: npm"),
  "exact Node.js version",
);
invalid(
  "rejects a different Node version",
  (workflow) =>
    workflow.replace('node-version: "24.16.0"', 'node-version: "24.15.0"'),
  "exact Node.js version",
);
invalid(
  "rejects an unpinned setup-node action",
  (workflow) =>
    workflow.replace(expectedSetupNode, "actions/setup-node@v4.4.0"),
  "reviewed immutable commit",
);
invalid(
  "rejects a malformed setup-node with block",
  (workflow) =>
    workflow.replace(
      'with:\n          node-version: "24.16.0"',
      "with: 24.16.0",
    ),
  "must declare a mapping",
);
invalid(
  "rejects node-version supplied by a non-setup-node action",
  (workflow) =>
    workflow.replace(
      expectedSetupNode,
      "actions/checkout@49933ea5288caeca8642d1e84afbd3f7d6820020",
    ),
  "must use pinned actions/setup-node",
);

const expectedTrivy =
  "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25";

function invalidTrivy(name, mutate, message) {
  test(name, () => {
    const directory = fixture();
    try {
      mutateSecurityWorkflow(directory, mutate);
      assert.throws(
        () =>
          validateTrivyWorkflowPin(
            fs.readFileSync(
              path.join(directory, ".github", "workflows", "security.yml"),
              "utf8",
            ),
          ),
        new RegExp(message),
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("accepts formatted YAML while enforcing exact Trivy security settings", () => {
  const directory = fixture();
  try {
    assert.doesNotThrow(() =>
      validateTrivyWorkflowPin(
        fs.readFileSync(
          path.join(directory, ".github", "workflows", "security.yml"),
          "utf8",
        ),
      ),
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

invalidTrivy(
  "rejects a mutable Trivy action tag",
  (workflow) =>
    workflow.replace(expectedTrivy, "aquasecurity/trivy-action@v0.36.0"),
  "reviewed immutable commit",
);
invalidTrivy(
  "rejects a wrong Trivy action source",
  (workflow) =>
    workflow.replace(
      expectedTrivy,
      "evil/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25",
    ),
  "exactly one aquasecurity/trivy-action",
);
for (const [name, before, after, message] of [
  [
    "wrong tool version",
    "version: v0.69.3",
    "version: v0.69.2",
    "exact version: v0.69.3",
  ],
  [
    "missing filesystem scan",
    "scan-type: fs",
    "scan-type: image",
    "exact scan-type: fs",
  ],
  [
    "missing vulnerability scanner",
    "scanners: vuln,secret",
    "scanners: secret",
    "exact scanners: vuln,secret",
  ],
  [
    "missing high severity",
    "severity: HIGH,CRITICAL",
    "severity: CRITICAL",
    "exact severity: HIGH,CRITICAL",
  ],
  [
    "missing failure exit code",
    'exit-code: "1"',
    'exit-code: "0"',
    "exact exit-code: 1",
  ],
]) {
  invalidTrivy(
    `rejects ${name}`,
    (workflow) => workflow.replace(before, after),
    message,
  );
}
invalidTrivy(
  "rejects a malformed Trivy settings mapping",
  (workflow) =>
    workflow.replace(
      /with:\n          version: v0\.69\.3\n          scan-type: fs\n          scan-ref: \.\n          scanners: vuln,secret\n          severity: HIGH,CRITICAL\n          exit-code: "1"/,
      'with: "v0.69.3"',
    ),
  "must declare a mapping",
);
for (const [name, uses] of [
  [
    "immutable case-variant duplicate",
    "AquaSecurity/Trivy-Action@ed142fd0673e97e23eac54620cfb913e5ce36c25",
  ],
  ["mutable case-variant duplicate", "AQUASECURITY/TRIVY-ACTION@main"],
]) {
  invalidTrivy(
    `rejects a ${name}`,
    (workflow) =>
      workflow.replace(
        '          exit-code: "1"',
        `          exit-code: "1"\n      - uses: ${uses}\n        with:\n          version: v0.69.3\n          scan-type: fs\n          scan-ref: .\n          scanners: vuln,secret\n          severity: HIGH,CRITICAL\n          exit-code: "1"`,
      ),
    "exactly one aquasecurity/trivy-action",
  );
}
invalidTrivy(
  "rejects duplicate Trivy action steps introduced through YAML aliases",
  (workflow) =>
    workflow.replace(
      '          exit-code: "1"',
      '          exit-code: "1"\n      - &trivy\n        uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25\n        with:\n          version: v0.69.3\n          scan-type: fs\n          scan-ref: .\n          scanners: vuln,secret\n          severity: HIGH,CRITICAL\n          exit-code: "1"\n      - *trivy',
    ),
  "exactly one aquasecurity/trivy-action",
);
