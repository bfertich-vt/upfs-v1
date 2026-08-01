import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { main } from "./task-0014-embedded-postgres.mjs";

export async function runEmbeddedPostgresGate(run = main) {
  const previous = process.env.UPFS_RUN_EMBEDDED_POSTGRES;
  process.env.UPFS_RUN_EMBEDDED_POSTGRES = "1";
  try {
    const result = await run();
    if (result?.status !== "passed") {
      throw new Error(
        `embedded PostgreSQL migration and tenant-isolation gate did not pass: ${result?.status ?? "no result"}`,
      );
    }
    return result;
  } finally {
    if (previous === undefined) delete process.env.UPFS_RUN_EMBEDDED_POSTGRES;
    else process.env.UPFS_RUN_EMBEDDED_POSTGRES = previous;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const result = await runEmbeddedPostgresGate();
  console.log(
    `embedded PostgreSQL CI gate passed with ${result.checks.length} checks`,
  );
}
