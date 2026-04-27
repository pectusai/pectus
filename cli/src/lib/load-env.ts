// Load .env.local from the repo root into process.env.
// Lightweight; does not require dotenv as a dependency.
import { readEnvLocal } from "./env-file.js";

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  try {
    const env = readEnvLocal();
    for (const [k, v] of Object.entries(env)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  } catch {
    // No repo root or no .env.local — that's fine for some commands.
  }
}
