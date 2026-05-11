"use client";

import { useState, useTransition } from "react";
import { saveEnvKeys, snapshotFromProcessEnv } from "./actions";
import type { EnvGroup } from "./schema";

type EnvFormProps = {
  groups: EnvGroup[];
  currentValues: Record<string, string>;
  processEnvKeys: string[];
};

function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "•".repeat(value.length);
  return `${"•".repeat(value.length - 4)}${value.slice(-4)}`;
}

export function EnvForm({ groups, currentValues, processEnvKeys }: EnvFormProps) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; message: string }
    | { kind: "err"; message: string }
    | null
  >(null);

  const dirtyKeys = Object.keys(edits).filter(
    (k) => edits[k] !== (currentValues[k] ?? ""),
  );
  const hasDirty = dirtyKeys.length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDirty) return;
    const payload: Record<string, string> = {};
    for (const k of dirtyKeys) payload[k] = edits[k];
    startTransition(async () => {
      const r = await saveEnvKeys(payload);
      if (r.ok) {
        setFeedback({
          kind: "ok",
          message: `Saved ${dirtyKeys.length} key${dirtyKeys.length === 1 ? "" : "s"}. Restart any running dev servers to pick up the new values.`,
        });
        setEdits({});
      } else {
        setFeedback({ kind: "err", message: r.error });
      }
    });
  };

  const onSnapshot = () => {
    startTransition(async () => {
      const r = await snapshotFromProcessEnv();
      if (r.ok) {
        setFeedback({
          kind: "ok",
          message:
            "Captured the currently-running process environment into cms/.env.local. Restart any dev servers to share the values.",
        });
      } else {
        setFeedback({ kind: "err", message: r.error });
      }
    });
  };

  const availableInProcess = processEnvKeys.length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {availableInProcess && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            Capture current values
          </h3>
          <p className="mt-1 text-sm text-amber-900">
            {processEnvKeys.length} Pectus environment{" "}
            {processEnvKeys.length === 1 ? "variable is" : "variables are"}{" "}
            currently set in the running CMS process but not yet saved to{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
              cms/.env.local
            </code>
            . Save them once here so the Astro preview and future installs
            share the same source.
          </p>
          <button
            type="button"
            onClick={onSnapshot}
            disabled={pending}
            className="mt-3 inline-flex items-center justify-center rounded-md bg-amber-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-amber-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save current values to cms/.env.local"}
          </button>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="text-lg font-semibold text-zinc-900">
            {group.category}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{group.description}</p>
          <div className="mt-4 space-y-4">
            {group.keys.map((k) => {
              const persisted = currentValues[k.key] ?? "";
              const editing = k.key in edits;
              const editValue = editing ? edits[k.key] : persisted;
              const isRevealed = reveal[k.key] === true;
              const displayValue =
                k.secret && !isRevealed && !editing
                  ? maskSecret(persisted)
                  : editValue;
              const hasValue = persisted !== "";
              return (
                <div
                  key={k.key}
                  className="rounded-md border border-zinc-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label
                      htmlFor={k.key}
                      className="text-sm font-medium text-zinc-900"
                    >
                      {k.label}
                      {k.required && (
                        <span
                          className="ml-1.5 text-[10px] uppercase tracking-wide text-red-600"
                          title="Pectus needs this value to function."
                        >
                          required
                        </span>
                      )}
                      {!hasValue && (
                        <span
                          className="ml-1.5 text-[10px] uppercase tracking-wide text-zinc-500"
                          title="Not yet set in cms/.env.local."
                        >
                          unset
                        </span>
                      )}
                    </label>
                    <code className="font-mono text-[11px] text-zinc-500">
                      {k.key}
                    </code>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{k.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      id={k.key}
                      type={k.secret && !isRevealed ? "password" : "text"}
                      value={displayValue}
                      placeholder={k.placeholder ?? ""}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [k.key]: e.target.value,
                        }))
                      }
                      onFocus={() => {
                        if (!editing) {
                          setEdits((prev) => ({
                            ...prev,
                            [k.key]: persisted,
                          }));
                        }
                      }}
                      className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-xs shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    {k.secret && hasValue && (
                      <button
                        type="button"
                        onClick={() =>
                          setReveal((prev) => ({
                            ...prev,
                            [k.key]: !prev[k.key],
                          }))
                        }
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                        title={isRevealed ? "Hide value" : "Reveal value"}
                      >
                        {isRevealed ? "Hide" : "Reveal"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {feedback && (
        <p
          className={`text-sm ${
            feedback.kind === "ok" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <div className="sticky bottom-4 flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="submit"
          disabled={!hasDirty || pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : `Save ${dirtyKeys.length || ""} change${dirtyKeys.length === 1 ? "" : "s"}`.trim()}
        </button>
        {hasDirty && (
          <button
            type="button"
            onClick={() => setEdits({})}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Discard
          </button>
        )}
      </div>
    </form>
  );
}
