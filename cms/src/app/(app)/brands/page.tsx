import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/active-brand";

export default async function BrandsListPage() {
  await requireUser();
  const brands = await listBrands();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pectus is multi-brand. Each brand has its own integrations, knowledge,
          workspaces, and review queue. Switch between them from the top bar.
        </p>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
          <p>No brands yet. Create your first from the terminal:</p>
          <pre className="mt-3 inline-block rounded bg-zinc-100 px-3 py-2 text-left text-xs text-zinc-700">
            npx pectus brand add
          </pre>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {brands.map((b) => (
            <li key={b.id}>
              <Link
                href={`/brands/${b.slug}`}
                className="block rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
              >
                <p className="text-lg font-semibold">{b.name ?? b.slug}</p>
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  {b.slug}
                </p>
                {b.tagline ? (
                  <p className="mt-2 text-sm text-zinc-600">{b.tagline}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
