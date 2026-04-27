import { NavBar } from "@/app/components/NavBar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
