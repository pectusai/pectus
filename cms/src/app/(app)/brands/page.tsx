import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/active-brand";
import { AddBrandForm } from "./AddBrandForm";

export default async function BrandsListPage() {
  await requireUser();
  const brands = await listBrands();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Pectus is multi-brand. Each brand has its own integrations,
            knowledge, projects, and review queue.
          </p>
        </div>
        <AddBrandForm />
      </div>

      {brands.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
          <p>No brands yet. Click <strong>Add brand</strong> above to create one.</p>
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
