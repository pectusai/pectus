#!/usr/bin/env node
// Pectus CLI shim. Resolves to the compiled CLI in dist/, or the TS source via tsx in dev.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "../dist/index.js");
const src = resolve(here, "../src/index.ts");

if (existsSync(dist)) {
  await import(dist);
} else if (existsSync(src)) {
  const { pathToFileURL } = await import("node:url");
  const tsx = await import("tsx/esm/api");
  await tsx.tsImport(pathToFileURL(src).href, import.meta.url);
} else {
  console.error("pectus CLI: no entry point found.");
  process.exit(1);
}
