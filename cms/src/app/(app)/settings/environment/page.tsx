import { requireUser } from "@/lib/auth";
import { readEnvLocal, envFilePath, envFileExists } from "@/lib/env-file";
import { KNOWN_ENV_KEYS } from "./schema";
import { EnvForm } from "./EnvForm";

export default async function EnvironmentSettingsPage() {
  await requireUser();

  const persisted = readEnvLocal();
  const filePath = envFilePath();
  const fileExists = envFileExists();

  /* Pectus-known keys that are set in the running process but missing from
   * the env file. Drives the "snapshot" prompt. */
  const processOnlyKeys: string[] = [];
  for (const group of KNOWN_ENV_KEYS) {
    for (const k of group.keys) {
      const fromProcess = process.env[k.key];
      if (
        fromProcess !== undefined &&
        fromProcess !== "" &&
        !(k.key in persisted)
      ) {
        processOnlyKeys.push(k.key);
      }
    }
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Environment</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pectus reads every server-side secret from{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
            cms/.env.local
          </code>
          . Edit here once and the CMS, the Astro preview, and any future
          Pectus app share the same values.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          File on disk:{" "}
          <code className="font-mono">{filePath}</code>
          {fileExists ? null : (
            <span className="ml-2 text-amber-700">
              (does not exist yet — Save creates it)
            </span>
          )}
        </p>
      </header>

      <div className="mt-6">
        <EnvForm
          groups={KNOWN_ENV_KEYS}
          currentValues={persisted}
          processEnvKeys={processOnlyKeys}
        />
      </div>
    </div>
  );
}
