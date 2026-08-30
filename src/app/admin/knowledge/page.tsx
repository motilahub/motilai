import { getCurrentUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/system-settings";
import { AdminShell } from "../admin-shell";
import { ResourcesClient } from "../resources-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() { const user = await getCurrentUser(); if (!user) redirect("/login"); if (user.role !== "admin") redirect("/"); const settings = await getSystemSettings(); return <AdminShell currentUsername={user.username} avatarUrl={user.avatarUrl} logoUrl={settings.logoUrl} title={settings.title}><ResourcesClient kind="knowledge" currentUsername={user.username} avatarUrl={user.avatarUrl} /></AdminShell>; }
