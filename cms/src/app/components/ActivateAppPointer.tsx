import Link from "next/link";

export function ActivateAppPointer({
  appName,
  surface,
}: {
  appName: string;
  surface: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
      <p className="text-sm font-medium text-zinc-900">
        {surface} is part of the{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">{appName}</code>{" "}
        app.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
        Activate the app from the Apps page to turn this surface on for every
        workspace.
      </p>
      <Link
        href="/apps"
        className="mt-4 inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
      >
        Open Apps →
      </Link>
    </div>
  );
}
