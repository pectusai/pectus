"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { signInWithPassword, type AuthResult } from "./actions";

type Props = { initialError: string | null };

export function LoginForm({ initialError }: Props) {
  const [state, formAction] = useActionState<AuthResult | null, FormData>(
    signInWithPassword,
    initialError ? { ok: false, error: initialError } : null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-700">
          Email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-700">
          Password
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </label>

      <SubmitButton
        pendingLabel="Signing in…"
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Sign in
      </SubmitButton>

      {state && !state.ok ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
