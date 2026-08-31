import { databaseQuery } from "@/lib/auth";
import { createImageThumbnails, isDataImage } from "@/lib/image-thumbnails";

export type SystemSettings = { title: string; logoUrl: string; faviconUrl: string; logoUrl64: string; faviconUrl64: string; description: string };
const defaults: SystemSettings = { title: "MOTILAI Chat", logoUrl: "", faviconUrl: "", logoUrl64: "", faviconUrl64: "", description: "MOTILAI 多模态 AI 对话工作台" };

export async function getSystemSettings(): Promise<SystemSettings> {
  const result = await databaseQuery<{ key: string; value: string; updated_at: string }>("SELECT key, value, updated_at FROM system_settings");
  const settings = { ...defaults };
  for (const row of result.rows) {
    if (row.key === "logoUrl" || row.key === "faviconUrl") settings[row.key] = row.value ? `/api/media/system/${row.key === "logoUrl" ? "logo" : "favicon"}?v=${encodeURIComponent(row.updated_at)}` : "";
    else if (row.key === "logoUrl64" || row.key === "faviconUrl64") settings[row.key] = row.value ? `/api/media/system/${row.key === "logoUrl64" ? "logo-64" : "favicon-64"}?v=${encodeURIComponent(row.updated_at)}` : "";
    else if (row.key in settings) settings[row.key as keyof SystemSettings] = row.value;
  }
  return settings;
}

export async function updateSystemSettings(input: Partial<SystemSettings>) {
  for (const key of ["title", "description"] as const) {
    if (input[key] === undefined) continue;
    await databaseQuery("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [key, input[key]?.trim() ?? ""]);
  }
  for (const key of ["logoUrl", "faviconUrl"] as const) {
    if (input[key] === undefined) continue;
    const value = input[key] ?? "";
    if (value && !isDataImage(value)) continue;
    if (!value) {
      await databaseQuery("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, '', NOW()) ON CONFLICT (key) DO UPDATE SET value = '', updated_at = NOW()", [key]);
      await databaseQuery("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, '', NOW()) ON CONFLICT (key) DO UPDATE SET value = '', updated_at = NOW()", [`${key}64`]);
      continue;
    }
    const thumbnails = await createImageThumbnails(value);
    await databaseQuery("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [key, thumbnails.small]);
    await databaseQuery("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [`${key}64`, thumbnails.medium]);
  }
  return getSystemSettings();
}
