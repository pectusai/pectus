import Link from "next/link";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href?: string;
  cta?: string;
  command?: string;
};

export function SetupChecklist({
  items,
  workspaceCode,
}: {
  items: ChecklistItem[];
  workspaceCode: string;
}) {
  void workspaceCode;
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const allDone = done === total;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            {allDone ? "Setup complete" : "Getting started"}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {allDone
              ? "Everything is wired up. The first analysis will use all of your inputs."
              : "Finish these steps to get a useful first analysis. Each step links to the page where you do it."}
          </p>
        </div>
        <span
          className={
            allDone
              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
              : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
          }
        >
          {done} of {total} done
        </span>
      </header>

      <ol className="mt-5 space-y-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={
              "flex items-start gap-3 rounded-md border p-3 " +
              (item.done
                ? "border-emerald-100 bg-emerald-50/50"
                : "border-zinc-200 bg-white")
            }
          >
            <span
              aria-hidden
              className={
                "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                (item.done
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-200 text-zinc-700")
              }
            >
              {item.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={
                  "text-sm font-medium " +
                  (item.done ? "text-zinc-500 line-through" : "text-zinc-900")
                }
              >
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {item.description}
              </p>
              {item.command ? (
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
                  {item.command}
                </pre>
              ) : null}
              {item.href && item.cta ? (
                <Link
                  href={item.href}
                  className={
                    "mt-2 inline-block text-xs font-medium " +
                    (item.done
                      ? "text-zinc-500 hover:text-zinc-700"
                      : "text-blue-600 hover:text-blue-800")
                  }
                >
                  {item.cta} →
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
