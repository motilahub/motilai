import { Assistant } from "./assistant";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { getActiveProvider } from "@/lib/model-providers";
import { getSystemSettings } from "@/lib/system-settings";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const provider = await getActiveProvider();
  const settings = await getSystemSettings();
  const hasModel = Boolean(provider?.apiKey || process.env.OPENAI_API_KEY);
  const modelName = hasModel
    ? (provider?.model || process.env.OPENAI_MODEL || "gpt-4.1-mini")
    : "演示模型";

  return <Assistant hasModel={hasModel} modelName={modelName} user={publicUser(user)} systemTitle={settings.title} logoUrl={settings.logoUrl} />;
}
