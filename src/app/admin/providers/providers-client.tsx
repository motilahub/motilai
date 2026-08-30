"use client";

import { App, Button, Card, Col, Divider, Drawer, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Switch, Tag, Tooltip } from "antd";
import { CheckCircle2Icon, DownloadIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon, XCircleIcon } from "lucide-react";
import { MODEL_PROVIDER_TYPES, type ModelProviderType } from "@/lib/model-provider-types";
import { DEFAULT_MODEL_PROVIDER_SETTINGS, type ModelProviderSettings } from "@/lib/model-provider-settings";
import { useEffect, useState } from "react";
import { AdminHeader } from "../admin-shell";

type Provider = { id: string; name: string; providerType: ModelProviderType; baseUrl: string; model: string; enabled: boolean; models: string[]; hasApiKey: boolean; settings: ModelProviderSettings };
type FormValue = { name: string; providerType: ModelProviderType; baseUrl: string; apiKey: string; model: string; enabled: boolean; settings: ModelProviderSettings; stopSequencesText: string };

function createEmptyForm(): FormValue {
  return { name: "OpenAI", providerType: "openai", baseUrl: "https://api.openai.com/v1", apiKey: "", model: "", enabled: false, settings: { ...DEFAULT_MODEL_PROVIDER_SETTINGS }, stopSequencesText: "" };
}

export function ProvidersClient({ currentUsername, avatarUrl }: { currentUsername: string; avatarUrl?: string }) {
  const { message } = App.useApp();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState<FormValue>(createEmptyForm);
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
    setForm(provider ? {
      name: provider.name,
      providerType: provider.providerType,
      baseUrl: provider.baseUrl,
      apiKey: "",
      model: provider.model,
      enabled: provider.enabled,
      settings: { ...DEFAULT_MODEL_PROVIDER_SETTINGS, ...provider.settings },
      stopSequencesText: provider.settings.stopSequences.join("\n"),
    } : createEmptyForm());
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

  function setSetting<K extends keyof ModelProviderSettings>(key: K, value: ModelProviderSettings[K]) {
    setForm((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  function resetSettings() {
    setForm((current) => ({ ...current, settings: { ...DEFAULT_MODEL_PROVIDER_SETTINGS }, stopSequencesText: "" }));
  }

  function close() {
    setFormOpen(false);
    setEditingId(null);
    setForm(createEmptyForm());
    setFormModels([]);
  }

  async function save() {
    setError("");
    if (!form.model) return setError("请先获取模型列表并选择默认模型");
    const settings = { ...form.settings, stopSequences: form.stopSequencesText.split(/[\n,，]/u).map((item) => item.trim()).filter(Boolean) };
    const payload = { name: form.name, providerType: form.providerType, baseUrl: form.baseUrl, apiKey: form.apiKey, model: form.model, enabled: form.enabled, settings, models: formModels };
    const response = await fetch("/api/model-providers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload, ...(form.apiKey ? {} : { apiKey: undefined }) } : payload),
    });
    const result = await response.json().catch(() => null) as { provider?: Provider; error?: string } | null;
    if (!response.ok) return setError(result?.error ?? "保存失败");
    if (result?.provider) setProviders((current) => editingId ? current.map((item) => item.id === editingId ? result.provider! : item) : [result.provider!, ...current]);
    message.success(editingId ? "供应商已更新" : "供应商已创建");
    close();
  }

  async function patch(id: string, body: { model?: string; enabled?: boolean }) {
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
      const response = await fetch("/api/model-providers/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId ?? undefined, baseUrl: form.baseUrl, apiKey: form.apiKey || undefined }) });
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

  return <div className="admin-page"><AdminHeader menuTitle="模型供应商" currentUsername={currentUsername} avatarUrl={avatarUrl} /><section className="admin-content"><div className="admin-toolbar"><p className="admin-description">集中配置模型连接、生成参数和运行能力；启用后聊天会使用该供应商的完整配置。</p><Button type="primary" icon={<PlusIcon className="size-4" />} onClick={() => open()}>新增供应商</Button></div>{error && <div className="form-error">{error}</div>}<div className="provider-grid">{providers.map((provider) => <Card key={provider.id} className="provider-card clickable-row" onClick={() => open(provider)} title={<Space wrap>{provider.name}<Tag>{MODEL_PROVIDER_TYPES.find((item) => item.value === provider.providerType)?.label ?? "自定义"}</Tag>{provider.enabled ? <CheckCircle2Icon className="provider-enabled" /> : <XCircleIcon className="provider-disabled" />}</Space>}><p className="provider-url">{provider.baseUrl}</p><Row gutter={[16, 12]}><Col span={12}><small className="admin-secondary-text">默认模型</small>{provider.models.length > 0 ? <Select size="small" className="provider-model-select" value={provider.model} options={provider.models.map((model) => ({ value: model, label: model }))} onClick={(event) => event.stopPropagation()} onChange={(value) => void patch(provider.id, { model: value })} /> : <div>{provider.model}</div>}</Col><Col span={6}><small className="admin-secondary-text">API Key</small><div>{provider.hasApiKey ? "已配置" : "未配置"}</div></Col><Col span={6}><small className="admin-secondary-text">响应模式</small><div>{provider.settings.streaming ? "流式" : "一次性"}</div></Col></Row><div className="provider-parameter-tags"><Tag>温度 {provider.settings.temperature ?? "默认"}</Tag><Tag>Top P {provider.settings.topP ?? "默认"}</Tag><Tag>Top K {provider.settings.topK ?? "默认"}</Tag><Tag>最大 Token {provider.settings.maxOutputTokens ?? "默认"}</Tag></div><div className="provider-divider" /><Space wrap onClick={(event) => event.stopPropagation()}><Button type="link" size="small" onClick={() => void patch(provider.id, { enabled: !provider.enabled })}>{provider.enabled ? "停用" : "启用"}</Button><Button type="link" size="small" icon={<DownloadIcon className="size-3.5" />} onClick={() => void discover(provider)}>获取模型列表</Button><Popconfirm title={`确定删除供应商 ${provider.name}？`} onConfirm={() => void remove(provider)}><Button type="text" danger size="small" icon={<Trash2Icon className="size-3.5" />} /></Popconfirm></Space></Card>)}</div><ProviderDrawer form={form} formModels={formModels} editingId={editingId} formOpen={formOpen} discovering={discovering} error={error} setForm={setForm} selectProviderType={selectProviderType} setSetting={setSetting} resetSettings={resetSettings} discoverFromForm={discoverFromForm} close={close} save={save} /></section></div>;
}

type DrawerProps = {
  form: FormValue;
  formModels: string[];
  editingId: string | null;
  formOpen: boolean;
  discovering: boolean;
  error: string;
  setForm: React.Dispatch<React.SetStateAction<FormValue>>;
  selectProviderType: (value: ModelProviderType) => void;
  setSetting: <K extends keyof ModelProviderSettings>(key: K, value: ModelProviderSettings[K]) => void;
  resetSettings: () => void;
  discoverFromForm: () => Promise<void>;
  close: () => void;
  save: () => Promise<void>;
};

function ProviderDrawer({ form, formModels, editingId, formOpen, discovering, error, setForm, selectProviderType, setSetting, resetSettings, discoverFromForm, close, save }: DrawerProps) {
  return <Drawer className="provider-settings-drawer" title={editingId ? "编辑供应商" : "新增供应商"} open={formOpen} onClose={close} width="clamp(38rem, 58vw, 56rem)" destroyOnHidden footer={<Space style={{ width: "100%", justifyContent: "space-between" }}><Button icon={<RotateCcwIcon className="size-4" />} onClick={resetSettings}>恢复参数默认值</Button><Space><Button onClick={close}>取消</Button><Button type="primary" icon={<PencilIcon className="size-4" />} onClick={() => void save()}>保存配置</Button></Space></Space>}><Form layout="vertical"><SectionHeading title="基础连接" description="厂家、接口凭据和默认聊天模型。" /><Row gutter={16}><Col xs={24} md={12}><Form.Item label="AI 厂家类型" required><Select showSearch optionFilterProp="label" className="w-full" value={form.providerType} options={MODEL_PROVIDER_TYPES.map(({ value, label }) => ({ value, label }))} onChange={selectProviderType} /></Form.Item></Col><Col xs={24} md={12}><Form.Item label="配置名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Form.Item></Col><Col span={24}><Form.Item label="Base URL" required><Input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} /></Form.Item></Col><Col xs={24} md={16}><Form.Item label="API Key"><Input.Password visibilityToggle={false} autoComplete="new-password" placeholder={editingId ? "留空保留现有 Key" : "输入供应商 API Key"} value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} /></Form.Item></Col><Col xs={24} md={8}><Form.Item label="模型发现"><Button block icon={<DownloadIcon className="size-4" />} loading={discovering} onClick={() => void discoverFromForm()}>获取模型列表</Button></Form.Item></Col><Col xs={24} md={16}><Form.Item label="默认模型" required><Select showSearch optionFilterProp="label" className="w-full" placeholder="请先获取模型列表" value={form.model || undefined} disabled={formModels.length === 0} options={formModels.map((model) => ({ value: model, label: model }))} onChange={(model) => setForm((current) => ({ ...current, model }))} /></Form.Item></Col><Col xs={24} md={8}><Form.Item label="供应商状态"><Space><Switch checked={form.enabled} onChange={(enabled) => setForm({ ...form, enabled })} /><span>{form.enabled ? "启用" : "停用"}</span></Space></Form.Item></Col></Row><Divider /><SectionHeading title="生成参数" description="参考 Dify 的参数规则；留空表示使用模型默认值。通常只需调整温度或 Top P 之一。" /><Row gutter={16}><ParameterNumber label="温度" tip="随机性，值越高输出越发散" value={form.settings.temperature} min={0} max={2} step={0.1} onChange={(value) => setSetting("temperature", value)} /><ParameterNumber label="Top P" tip="核采样概率质量" value={form.settings.topP} min={0} max={1} step={0.05} onChange={(value) => setSetting("topP", value)} /><ParameterNumber label="Top K" tip="仅从概率最高的 K 个候选中采样，部分兼容接口支持" value={form.settings.topK} min={1} max={1000} step={1} onChange={(value) => setSetting("topK", value)} /><ParameterNumber label="最大输出 Token" tip="单次回复最多生成的 Token 数" value={form.settings.maxOutputTokens} min={1} max={131072} step={1} onChange={(value) => setSetting("maxOutputTokens", value)} /><ParameterNumber label="频率惩罚" tip="降低词语反复出现的概率" value={form.settings.frequencyPenalty} min={-2} max={2} step={0.1} onChange={(value) => setSetting("frequencyPenalty", value)} /><ParameterNumber label="存在惩罚" tip="鼓励模型讨论新主题" value={form.settings.presencePenalty} min={-2} max={2} step={0.1} onChange={(value) => setSetting("presencePenalty", value)} /><ParameterNumber label="随机种子" tip="供应商支持时可提升结果可复现性" value={form.settings.seed} min={0} max={2147483647} step={1} onChange={(value) => setSetting("seed", value)} /><ParameterNumber label="上下文窗口" tip="模型标称上下文容量，用于配置记录和运维参考" value={form.settings.contextWindow} min={1024} max={10000000} step={1024} onChange={(value) => setSetting("contextWindow", value)} /><Col span={24}><Form.Item label={<Tooltip title="每行或逗号分隔，最多 8 个">停止词</Tooltip>}><Input.TextArea rows={3} placeholder={"例如：\nEND\n###"} value={form.stopSequencesText} onChange={(event) => setForm({ ...form, stopSequencesText: event.target.value })} /></Form.Item></Col></Row><Divider /><SectionHeading title="运行与能力" description="参考 WeKnora 的运行配置，用于控制响应方式、容错和能力声明。" /><Row gutter={16}><Col xs={24} md={8}><Form.Item label="流式响应"><Space><Switch checked={form.settings.streaming} onChange={(value) => setSetting("streaming", value)} /><span>{form.settings.streaming ? "逐步输出" : "一次性输出"}</span></Space></Form.Item></Col><Col xs={24} md={8}><Form.Item label="视觉能力"><Space><Switch checked={form.settings.supportsVision} onChange={(value) => setSetting("supportsVision", value)} /><span>支持图片</span></Space></Form.Item></Col><Col xs={24} md={8}><Form.Item label="工具调用"><Space><Switch checked={form.settings.supportsTools} onChange={(value) => setSetting("supportsTools", value)} /><span>发送工具</span></Space></Form.Item></Col><ParameterNumber label="请求超时（毫秒）" tip="整次模型请求的最长等待时间" value={form.settings.requestTimeoutMs} min={5000} max={300000} step={1000} required onChange={(value) => value != null && setSetting("requestTimeoutMs", value)} /><ParameterNumber label="最大重试次数" tip="可重试错误的自动重试上限" value={form.settings.maxRetries} min={0} max={5} step={1} required onChange={(value) => value != null && setSetting("maxRetries", value)} /></Row></Form>{error && <div className="form-error" role="alert">{error}</div>}</Drawer>;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="provider-section-heading"><h3>{title}</h3><p>{description}</p></div>;
}

function ParameterNumber({ label, tip, value, min, max, step, required = false, onChange }: { label: string; tip: string; value: number | null; min: number; max: number; step: number; required?: boolean; onChange: (value: number | null) => void }) {
  return <Col xs={24} md={12}><Form.Item label={<Tooltip title={tip}>{label}</Tooltip>}><InputNumber className="w-full" value={value} min={min} max={max} step={step} placeholder={required ? undefined : "使用模型默认值"} onChange={(next) => onChange(next == null ? null : Number(next))} /></Form.Item></Col>;
}
