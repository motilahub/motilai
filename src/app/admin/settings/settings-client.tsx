"use client";

import { App, Upload } from "antd";
import { ImagePlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminHeader } from "../admin-shell";

type Settings = {
  title: string;
  logoUrl: string;
  faviconUrl: string;
  description: string;
};
type ImageSetting = "logoUrl" | "faviconUrl";

const defaults: Settings = {
  title: "MOTILAI Chat",
  logoUrl: "",
  faviconUrl: "",
  description: "MOTILAI 多模态 AI 对话工作台",
};

export function SystemSettingsClient({ currentUsername = "", avatarUrl }: { currentUsername?: string; avatarUrl?: string } = {}) {
  const { message } = App.useApp();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.title) document.title = settings.title;
  }, [settings.title]);
  useEffect(() => {
    let active = true;
    void fetch("/api/system-settings")
      .then(async (response) => ({
        response,
        result: (await response.json().catch(() => null)) as {
          settings?: Settings;
          error?: string;
        } | null,
      }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) return setError(result?.error ?? "读取失败");
        if (result?.settings) setSettings(result.settings);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateSettings(update: Partial<Settings>) {
    setSettings((current) => ({ ...current, ...update }));
    setSaved(false);
  }

  function handleImageFile(key: ImageSetting, label: string, file: File) {
    if (!file.type.startsWith("image/")) {
      message.error("请选择图片文件");
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error(`${label}图片不能超过 2 MB`);
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        updateSettings({ [key]: reader.result });
    };
    reader.onerror = () => message.error("读取图片失败，请重新选择");
    reader.readAsDataURL(file);
    return false;
  }

  async function save() {
    setError("");
    setSaved(false);
    const response = await fetch("/api/system-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const result = (await response.json().catch(() => null)) as {
      settings?: Settings;
      error?: string;
    } | null;
    if (!response.ok) return setError(result?.error ?? "保存失败");
    if (result?.settings) setSettings(result.settings);
    setSaved(true);
  }

  const imageFields: Array<{
    key: ImageSetting;
    label: string;
    description: string;
  }> = [
    {
      key: "logoUrl",
      label: "系统 Logo",
      description: "用于聊天页和后台品牌区",
    },
    {
      key: "faviconUrl",
      label: "浏览器图标",
      description: "用于浏览器标签页图标",
    },
  ];

  return (
    <div className="admin-page">
      <AdminHeader
        menuTitle="系统配置"
        currentUsername={currentUsername}
        avatarUrl={avatarUrl}
      />
      <section className="admin-content">
        <div className="settings-panel">
          <div className="settings-heading">
            <div>
              <h2>基础信息</h2>
              <p>设置系统在浏览器标题和后台品牌区使用的信息。</p>
            </div>
            {saved && <span className="settings-saved">已保存</span>}
          </div>
          <div className="settings-grid">
            <label>
              系统标题
              <input
                value={settings.title}
                onChange={(event) =>
                  updateSettings({ title: event.target.value })
                }
              />
            </label>
            <label>
              系统描述
              <input
                value={settings.description}
                onChange={(event) =>
                  updateSettings({ description: event.target.value })
                }
              />
            </label>
          </div>
          <div className="settings-grid settings-image-grid">
            {imageFields.map(({ key, label, description }) => (
              <div className="settings-image-field" key={key}>
                <span className="settings-field-label">{label}</span>
                <div className="settings-image-control">
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={(file) => handleImageFile(key, label, file)}
                  >
                    <button
                      type="button"
                      className="settings-image-select"
                      aria-label={`选择${label}`}
                    >
                      <span className="settings-image-preview">
                        {settings[key] ? (
                          <img src={settings[key]} alt={`${label}预览`} />
                        ) : (
                          <ImagePlusIcon className="size-4" />
                        )}
                      </span>
                      <span>{settings[key] ? "更换图片" : "选择图片"}</span>
                    </button>
                  </Upload>
                  {settings[key] && (
                    <button
                      type="button"
                      className="settings-image-clear"
                      aria-label={`清空${label}`}
                      title={`清空${label}`}
                      onClick={() => updateSettings({ [key]: "" })}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  )}
                </div>
                <small>{description}</small>
              </div>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button
            type="button"
            className="admin-primary"
            onClick={() => void save()}
          >
            <SaveIcon className="size-4" />
            保存配置
          </button>
        </div>
      </section>
    </div>
  );
}
