import { type NextRequest } from "next/server";
import { updateSession } from "@pectus/supabase";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets, image optimisation,
     * and the favicon. The session refresher needs to run on every page load
     * (incl. /login) so the cookies stay valid.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
