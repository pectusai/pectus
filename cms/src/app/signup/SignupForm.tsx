"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { signUpWithPassword, type AuthResult } from "../login/actions";

export function SignupForm() {
  const [state, formAction] = useActionState<AuthResult | null, FormData>(
    signUpWithPassword,
    null,
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
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </label>

      <SubmitButton
        pendingLabel="Creating account…"
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Create account
      </SubmitButton>

      {state && !state.ok ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state && state.ok ? (
        <p className="text-sm text-emerald-600">
          Check your inbox for the confirmation link, then sign in.
        </p>
      ) : null}
    </form>
  );
}
