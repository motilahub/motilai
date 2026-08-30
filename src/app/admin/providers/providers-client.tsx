"use client";

import { App, Button, Card, Col, Drawer, Form, Input, Popconfirm, Row, Select, Space, Switch, Tag } from "antd";
import { CheckCircle2Icon, DownloadIcon, PencilIcon, PlusIcon, Trash2Icon, XCircleIcon } from "lucide-react";
import { MODEL_PROVIDER_TYPES, type ModelProviderType } from "@/lib/model-provider-types";
import { useEffect, useState } from "react";
import { AdminHeader } from "../admin-shell";

type Provider = { id: string; name: string; providerType: ModelProviderType; baseUrl: string; model: string; enabled: boolean; models: string[]; hasApiKey: boolean };
type FormValue = { name: string; providerType: ModelProviderType; baseUrl: string; apiKey: string; model: string; enabled: boolean };
const emptyForm: FormValue = { name: "OpenAI", providerType: "openai", baseUrl: "https://api.openai.com/v1", apiKey: "", model: "", enabled: false };

export function ProvidersClient({ currentUsername, avatarUrl }: { currentUsername: string; avatarUrl?: string }) {
  const { message } = App.useApp();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState<FormValue>(emptyForm);
  const [formModels, setFormModels] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/model-providers")
      .then(async (response) => ({ response, result: await response.json().catch(() => null) as { providers?: Provider[]; error?: string } | null }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) return setError(result?.error ?? "加载失败");
        setProviders(result?.providers ?? []);
      });
    return () => { active = false; };
  }, []);

  function open(provider?: Provider) {
    setError("");
    setEditingId(provider?.id ?? null);
    setForm(provider ? { name: provider.name, providerType: provider.providerType, baseUrl: provider.baseUrl, apiKey: "", model: provider.model, enabled: provider.enabled } : emptyForm);
    setFormModels(provider ? [...new Set([...provider.models, provider.model].filter(Boolean))] : []);
    setFormOpen(true);
  }

  function selectProviderType(providerType: ModelProviderType) {
    const selected = MODEL_PROVIDER_TYPES.find((item) => item.value === providerType)!;
    setForm((current) => {
      const previous = MODEL_PROVIDER_TYPES.find((item) => item.value === current.providerType);
      const replaceName = !current.name.trim() || current.name === previous?.label;
      return { ...current, providerType, baseUrl: selected.baseUrl, name: replaceName ? providerType === "custom" ? "" : selected.label : current.name, model: "" };
    });
    setFormModels([]);
  }

  function close() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormModels([]);
  }

  async function save() {
    setError("");
    if (!form.model) return setError("请先获取模型列表并选择默认模型");
    const response = await fetch("/api/model-providers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form, models: formModels, ...(form.apiKey ? {} : { apiKey: undefined }) } : { ...form, models: formModels }),
    });
    const result = await response.json().catch(() => null) as { provider?: Provider; error?: string } | null;
    if (!response.ok) return setError(result?.error ?? "保存失败");
    if (result?.provider) setProviders((current) => editingId ? current.map((item) => item.id === editingId ? result.provider! : item) : [result.provider!, ...current]);
    message.success(editingId ? "供应商已更新" : "供应商已创建");
    close();
  }

  async function patch(id: string, body: Partial<FormValue>) {
    const response = await fetch("/api/model-providers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    const result = await response.json().catch(() => null) as { provider?: Provider; error?: string } | null;
    if (!response.ok) return setError(result?.error ?? "更新失败");
    if (result?.provider) setProviders((current) => current.map((item) => item.id === id ? result.provider! : item));
  }

  async function discover(provider: Provider) {
    setError("");
    const response = await fetch("/api/model-providers/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: provider.id }) });
    const result = await response.json().catch(() => null) as { models?: string[]; error?: string } | null;
    if (!response.ok) return setError(result?.error ?? "获取模型列表失败");
    if (result?.models) {
      setProviders((current) => current.map((item) => item.id === provider.id ? { ...item, models: result.models! } : item));
      message.success(`已获取 ${result.models.length} 个模型`);
    }
  }

  async function discoverFromForm() {
    setError("");
    if (!form.baseUrl.trim()) return setError("请先填写 Base URL");
    setDiscovering(true);
    try {
      const response = await fetch("/api/model-providers/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId ?? undefined, baseUrl: form.baseUrl, apiKey: form.apiKey || undefined }),
      });
      const result = await response.json().catch(() => null) as { models?: string[]; error?: string } | null;
      if (!response.ok) return setError(result?.error ?? "获取模型列表失败");
      const models = result?.models ?? [];
      setFormModels(models);
      setForm((current) => ({ ...current, model: models.includes(current.model) ? current.model : models[0] ?? "" }));
      if (editingId) setProviders((current) => current.map((item) => item.id === editingId ? { ...item, models } : item));
      message.success(`已获取 ${models.length} 个模型`);
    } finally {
      setDiscovering(false);
    }
  }

  async function remove(provider: Provider) {
    const response = await fetch("/api/model-providers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: provider.id }) });
    if (!response.ok) return setError("删除失败");
    setProviders((current) => current.filter((item) => item.id !== provider.id));
    message.success("供应商已删除");
  }

  return <div className="admin-page"><AdminHeader menuTitle="模型供应商" currentUsername={currentUsername} avatarUrl={avatarUrl} /><section className="admin-content"><div className="admin-toolbar"><p className="admin-description">选择 AI 厂家后会自动填充兼容接口地址，启用后聊天将使用该供应商。</p><Button type="primary" icon={<PlusIcon className="size-4" />} onClick={() => open()}>新增供应商</Button></div>{error && <div className="form-error">{error}</div>}<div className="provider-grid">{providers.map((provider) => <Card key={provider.id} className="provider-card clickable-row" onClick={() => open(provider)} title={<Space>{provider.name}<Tag>{MODEL_PROVIDER_TYPES.find((item) => item.value === provider.providerType)?.label ?? "自定义"}</Tag>{provider.enabled ? <CheckCircle2Icon className="provider-enabled" /> : <XCircleIcon className="provider-disabled" />}</Space>}><p className="provider-url">{provider.baseUrl}</p><Row gutter={[16, 12]}><Col span={12}><small className="admin-secondary-text">默认模型</small>{provider.models.length > 0 ? <Select size="small" className="provider-model-select" value={provider.model} options={provider.models.map((model) => ({ value: model, label: model }))} onClick={(event) => event.stopPropagation()} onChange={(value) => void patch(provider.id, { model: value })} /> : <div>{provider.model}</div>}</Col><Col span={6}><small className="admin-secondary-text">API Key</small><div>{provider.hasApiKey ? "已配置" : "未配置"}</div></Col><Col span={6}><small className="admin-secondary-text">模型数量</small><div>{provider.models.length}</div></Col></Row><div className="provider-divider" /><Space onClick={(event) => event.stopPropagation()}><Button type="link" size="small" onClick={() => void patch(provider.id, { enabled: !provider.enabled })}>{provider.enabled ? "停用" : "启用"}</Button><Button type="link" size="small" icon={<DownloadIcon className="size-3.5" />} onClick={() => void discover(provider)}>获取模型列表</Button><Popconfirm title={`确定删除供应商 ${provider.name}？`} onConfirm={() => void remove(provider)}><Button type="text" danger size="small" icon={<Trash2Icon className="size-3.5" />} /></Popconfirm></Space>{provider.models.length > 0 && <p className="provider-models">{provider.models.slice(0, 12).join("、")}{provider.models.length > 12 ? ` 等 ${provider.models.length} 个模型` : ""}</p>}</Card>)}</div><Drawer title={editingId ? "编辑供应商" : "新增供应商"} open={formOpen} onClose={close} width="clamp(28rem, 42vw, 42rem)" destroyOnHidden footer={<Space style={{ width: "100%", justifyContent: "flex-end" }}><Button onClick={close}>取消</Button><Button type="primary" icon={<PencilIcon className="size-4" />} onClick={() => void save()}>保存配置</Button></Space>}><Form layout="vertical"><Form.Item label="AI 厂家类型" required><Select showSearch optionFilterProp="label" className="w-full" value={form.providerType} options={MODEL_PROVIDER_TYPES.map(({ value, label }) => ({ value, label }))} onChange={selectProviderType} /></Form.Item><Form.Item label="名称"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Form.Item><Form.Item label="Base URL"><Input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} /></Form.Item><Form.Item label="API Key"><Input.Password visibilityToggle={false} autoComplete="new-password" placeholder={editingId ? "留空保留现有 Key" : ""} value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} /></Form.Item><Form.Item><Button block icon={<DownloadIcon className="size-4" />} loading={discovering} onClick={() => void discoverFromForm()}>获取模型列表</Button></Form.Item><Form.Item label="默认模型"><Select showSearch optionFilterProp="label" className="w-full" placeholder="请先获取模型列表" value={form.model || undefined} disabled={formModels.length === 0} options={formModels.map((model) => ({ value: model, label: model }))} onChange={(model) => setForm((current) => ({ ...current, model }))} /></Form.Item><Form.Item label="启用此供应商"><Switch checked={form.enabled} onChange={(enabled) => setForm({ ...form, enabled })} /></Form.Item></Form></Drawer></section></div>;
}
