import { createServerClient } from "@pectus/supabase";
import { getWorkspaceByCode } from "@/lib/workspace";
import { IcpEditor } from "./IcpEditor";
import type { Persona, Painpoint } from "./actions";

export default async function IcpPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const workspace = await getWorkspaceByCode(code);
  const supabase = await createServerClient();

  const { data: icp } = await supabase
    .from("icp_profiles")
    .select("*")
    .eq("workspace_id", workspace.id)
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
