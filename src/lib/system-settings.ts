import { databaseQuery } from "@/lib/auth";

export type SystemSettings = { title: string; logoUrl: string; faviconUrl: string; description: string };
const defaults: SystemSettings = { title: "MOTILAI Chat", logoUrl: "", faviconUrl: "", description: "MOTILAI 多模态 AI 对话工作台" };

export async function getSystemSettings(): Promise<SystemSettings> {
  const result = await databaseQuery<{ key: string; value: string }>("SELECT key, value FROM system_settings");
  const settings = { ...defaults };
  for (const row of result.rows) if (row.key in settings) settings[row.key as keyof SystemSettings] = row.value;
  return settings;
}

export async function updateSystemSettings(input: Partial<SystemSettings>) {
  for (const key of Object.keys(defaults) as Array<keyof SystemSettings>) {
    if (input[key] === undefined) continue;
    await databaseQuery("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [key, input[key]?.trim() ?? ""]);
  }
  return getSystemSettings();
}
