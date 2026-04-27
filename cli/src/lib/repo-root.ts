// Find the Pectus repo root by walking up from this file until we hit pectus.md.
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

export function findRepoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, "pectus.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find repo root (looked for pectus.md).");
}
