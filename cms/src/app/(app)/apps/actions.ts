"use server";

import { revalidatePath } from "next/cache";
import { activateApp, deactivateApp } from "@/lib/apps";

export async function activateAppAction(formData: FormData) {
  const name = String(formData.get("app_name") ?? "");
  if (!name) return;
  await activateApp(name);
  revalidatePath("/apps");
}

export async function deactivateAppAction(formData: FormData) {
  const name = String(formData.get("app_name") ?? "");
  if (!name) return;
  await deactivateApp(name);
  revalidatePath("/apps");
}
