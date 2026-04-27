import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Pectus
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Sign in
          </h1>
          <p className="text-sm text-zinc-600">
            Use the email and password you set up during install.
          </p>
        </div>

        <LoginForm initialError={error ? decodeURIComponent(error) : null} />

        <p className="text-xs text-zinc-500">
          New install? <Link href="/signup" className="underline">Create the first account</Link>.
        </p>
      </div>
    </div>
  );
}
