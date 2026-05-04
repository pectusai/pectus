import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { IcpEditor } from "./IcpEditor";
import type { Persona, Painpoint } from "./actions";

export default async function IcpPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const project = await getProjectByCode(code);
  const supabase = await createServerClient();

  const { data: icp } = await supabase
    .from("icp_profiles")
    .select("*")
    .eq("project_id", project.id)
    .maybeSingle();

  return (
    <IcpEditor
      code={code}
      initialPersonas={(icp?.personas ?? []) as Persona[]}
      initialPainpoints={(icp?.painpoints ?? []) as Painpoint[]}
      initialNotes={icp?.notes ?? ""}
    />
  );
}
