import { AppShell } from "@/components/app-shell/app-shell";
import { requireCurrentSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await requireCurrentSession();

  return <AppShell session={session}>{children}</AppShell>;
}
