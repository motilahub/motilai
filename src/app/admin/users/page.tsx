import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsers } from "./users-client";
import { AdminShell } from "../admin-shell";
import { getSystemSettings } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  const settings = await getSystemSettings();
  return <AdminShell currentUsername={user.username} avatarUrl={user.avatarUrl} logoUrl={settings.logoUrl} title={settings.title}><AdminUsers currentUsername={user.username} avatarUrl={user.avatarUrl} /></AdminShell>;
}
