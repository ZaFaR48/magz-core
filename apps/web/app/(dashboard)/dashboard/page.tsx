import { redirect } from "next/navigation";

export const metadata = {
  title: "Workspace"
};

export default function DashboardPage() {
  redirect("/workspace");
}
