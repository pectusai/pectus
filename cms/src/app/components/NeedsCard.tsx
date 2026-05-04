import Link from "next/link";

export type Missing = {
  name: string;
  fixHref: string;
  fixLabel: string;
};

export function NeedsCard({
  title,
  missing,
  appContext,
}: {
  title: string;
  missing: Missing[];
  appContext?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8">
      <header>
        <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
        {appContext ? (
          <p className="mt-1 text-sm text-zinc-600">{appContext}</p>
        ) : null}
      </header>

      {missing.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Nothing missing. Refresh to try again.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {missing.map((m) => (
            <li
              key={m.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4"
            >
              <span className="text-sm font-medium text-zinc-900">{m.name}</span>
              <Link
                href={m.fixHref}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
              >
                {m.fixLabel} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
