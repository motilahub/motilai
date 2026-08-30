import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProvidersClient } from "./providers-client";
import { AdminShell } from "../admin-shell";
import { getSystemSettings } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  const settings = await getSystemSettings();
  return <AdminShell currentUsername={user.username} avatarUrl={user.avatarUrl} logoUrl={settings.logoUrl} title={settings.title}><ProvidersClient currentUsername={user.username} avatarUrl={user.avatarUrl} /></AdminShell>;
}
