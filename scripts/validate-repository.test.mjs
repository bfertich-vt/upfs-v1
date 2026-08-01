import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateNodeWorkflowPin } from "./validate-repository.mjs";

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
