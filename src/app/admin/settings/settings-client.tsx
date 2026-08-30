"use client";

import { SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminHeader } from "../admin-shell";

type Settings = { title: string; logoUrl: string; faviconUrl: string; description: string };
const defaults: Settings = { title: "MOTILAI Chat", logoUrl: "", faviconUrl: "", description: "MOTILAI 多模态 AI 对话工作台" };

export function SystemSettingsClient({ currentUsername, avatarUrl }: { currentUsername: string; avatarUrl?: string }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (settings.title) document.title = settings.title; }, [settings.title]);
  useEffect(() => {
    let active = true;
    void fetch("/api/system-settings").then(async (response) => ({ response, result: await response.json().catch(() => null) as { settings?: Settings; error?: string } | null })).then(({ response, result }) => { if (!active) return; if (!response.ok) return setError(result?.error ?? "读取失败"); if (result?.settings) setSettings(result.settings); });
    return () => { active = false; };
  }, []);
  async function save() { setError(""); setSaved(false); const response = await fetch("/api/system-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); const result = await response.json().catch(() => null) as { settings?: Settings; error?: string } | null; if (!response.ok) return setError(result?.error ?? "保存失败"); if (result?.settings) setSettings(result.settings); setSaved(true); }
  return <div className="admin-page"><AdminHeader menuTitle="系统配置" currentUsername={currentUsername} avatarUrl={avatarUrl} /><section className="admin-content"><div className="settings-panel"><div className="settings-heading"><div><h2>基础信息</h2><p>设置系统在浏览器标题和后台品牌区使用的信息。</p></div>{saved && <span className="settings-saved">已保存</span>}</div><div className="settings-grid"><label>系统标题<input value={settings.title} onChange={(event) => setSettings({ ...settings, title: event.target.value })} /></label><label>系统描述<input value={settings.description} onChange={(event) => setSettings({ ...settings, description: event.target.value })} /></label><label>Logo 图片 URL<input value={settings.logoUrl} onChange={(event) => setSettings({ ...settings, logoUrl: event.target.value })} placeholder="https://... 或 data:image/..." /></label><label>Favicon 图片 URL<input value={settings.faviconUrl} onChange={(event) => setSettings({ ...settings, faviconUrl: event.target.value })} placeholder="可选" /></label></div>{settings.logoUrl && <div className="settings-logo-preview"><img src={settings.logoUrl} alt="Logo 预览" /></div>}{error && <p className="form-error">{error}</p>}<button type="button" className="admin-primary" onClick={() => void save()}><SaveIcon className="size-4" />保存配置</button></div></section></div>;
}
