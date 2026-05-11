import { requireUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { listProjectFiles } from "./actions";
import { FilesManager } from "./FilesManager";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  await requireUser();
  const ws = await getProjectByCode(code);
  if (!(await isAppActiveForProject(ws.id, "content-hub"))) {
    return <ActivateAppPointer appName="content-hub" surface="Files" />;
  }

  const result = await listProjectFiles(code);
  const files = result.ok ? result.files : [];

  return (
    <div>
      <header className="mb-6">
        <h1
          className="text-2xl font-semibold tracking-tight"
          title="Project file library. Upload logos, hero images, photos, and PDFs here once; reference them by URL from any page or article in the project."
        >
          Files
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload images, logos, and other assets you want to reuse across pages
          and articles. Each upload gets a permanent URL.
        </p>
        {!result.ok && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Could not load existing files: {result.error}. The first upload
            will create the bucket if a migration is missing — check{" "}
            <code>/settings/updates</code>.
          </p>
        )}
      </header>

      <FilesManager projectCode={code} initialFiles={files} />
    </div>
  );
}
