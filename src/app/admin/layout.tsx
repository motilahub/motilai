import { getCurrentUser, publicUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/system-settings";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "./admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  const settings = await getSystemSettings();
  const safeUser = publicUser(user);
  return <AdminShell currentUsername={safeUser.username} avatarUrl={safeUser.avatarUrl} logoUrl={settings.logoUrl} title={settings.title}>{children}</AdminShell>;
}
