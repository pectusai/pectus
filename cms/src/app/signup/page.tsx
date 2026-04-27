import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Pectus
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Create account
          </h1>
          <p className="text-sm text-zinc-600">
            On a fresh install the first signup is auto-promoted to admin.
          </p>
        </div>

        <SignupForm />

        <p className="text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="underline">Sign in</Link>.
        </p>
      </div>
    </div>
  );
}
