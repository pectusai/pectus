import { redirect } from "next/navigation";

export default function RootPage() {
  /* Authenticated users want /workspaces. The middleware bounces unauth'd
   * traffic to /login. */
  redirect("/workspaces");
}
