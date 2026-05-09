"use client";

import { useState, useTransition } from "react";
import {
  applyMigration,
  markMigrationApplied,
  type ApplyResult,
} from "./actions";
import type { Migration } from "@/lib/migrations-list";

export function MigrationRow({
  migration,
  status,
}: {
  migration: Migration;
  status: "pending" | "done";
}) {
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onApply = (formData: FormData) => {
    startTransition(async () => {
      const res = await applyMigration(formData);
      setResult(res);
    });
  };

  const onMarkApplied = (formData: FormData) => {
    startTransition(async () => {
      const res = await markMigrationApplied(formData);
      setResult(res);
    });
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(migration.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard might be blocked; user can still select manually */
    }
  };

  return (
    <li className={`pectus-updates-row pectus-updates-row-${status}`}>
      <div className="pectus-updates-row-head">
        <code className="pectus-updates-filename">{migration.filename}</code>
        <span
          className={`pectus-updates-status pectus-updates-status-${status}`}
        >
          {status === "done" ? "Applied" : "Pending"}
        </span>
      </div>

      {status === "pending" ? (
        <div className="pectus-updates-actions">
          <form action={onApply} className="pectus-updates-action">
            <input type="hidden" name="id" value={migration.id} />
            <button
              type="submit"
              disabled={isPending}
              className="pectus-updates-button-primary"
            >
              {isPending ? "Applying..." : "Apply automatically"}
            </button>
            <span className="pectus-updates-hint">
              Runs via Supabase Management API. Needs SUPABASE_ACCESS_TOKEN in
              your <code>.env.local</code>.
            </span>
          </form>
          <button
            type="button"
            className="pectus-updates-button-secondary"
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? "Hide SQL" : "Copy SQL for manual paste"}
          </button>
        </div>
      ) : null}

      {result ? (
        <p
          className={
            result.ok ? "pectus-updates-ok" : "pectus-updates-error"
          }
          style={{ whiteSpace: "pre-wrap" }}
        >
          {result.message}
        </p>
      ) : null}

      {showManual ? (
        <div className="pectus-updates-manual">
          <div className="pectus-updates-manual-head">
            <button
              type="button"
              onClick={onCopy}
              className="pectus-updates-button-secondary"
            >
              {copied ? "Copied" : "Copy to clipboard"}
            </button>
            <a
              href="https://supabase.com/dashboard/project/_/sql/new"
              target="_blank"
              rel="noreferrer"
              className="pectus-updates-link"
            >
              Open Supabase SQL editor
            </a>
            <form action={onMarkApplied} className="pectus-updates-action">
              <input type="hidden" name="filename" value={migration.filename} />
              <button
                type="submit"
                disabled={isPending}
                className="pectus-updates-button-secondary"
              >
                {isPending ? "Recording..." : "I ran it — mark applied"}
              </button>
            </form>
          </div>
          <pre className="pectus-updates-sql">{migration.sql}</pre>
        </div>
      ) : null}
    </li>
  );
}
