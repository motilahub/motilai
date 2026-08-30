import { randomUUID } from "node:crypto";
import { databaseQuery } from "@/lib/auth";

export type ModelProvider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  models: string[];
  createdAt: string;
  updatedAt: string;
};

function rowToProvider(row: Record<string, unknown>): ModelProvider {
  const models = Array.isArray(row.models) ? row.models.map(String) : [];
  return {
    id: String(row.id),
    name: String(row.name),
    baseUrl: String(row.base_url),
    apiKey: String(row.api_key ?? ""),
    model: String(row.model),
    enabled: Boolean(row.enabled),
    models,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

export function publicProvider(provider: ModelProvider) {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.model,
    enabled: provider.enabled,
    models: provider.models,
    hasApiKey: Boolean(provider.apiKey),
    apiKeyMasked: provider.apiKey ? `${provider.apiKey.slice(0, 4)}${"*".repeat(Math.max(4, provider.apiKey.length - 8))}${provider.apiKey.slice(-4)}` : "",
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export async function listProviders() {
  const result = await databaseQuery("SELECT * FROM model_providers ORDER BY enabled DESC, created_at DESC");
  return result.rows.map(rowToProvider);
}

export async function getProvider(id: string) {
  const result = await databaseQuery("SELECT * FROM model_providers WHERE id = $1", [id]);
  return result.rows[0] ? rowToProvider(result.rows[0]) : null;
}

export async function getActiveProvider() {
  const result = await databaseQuery("SELECT * FROM model_providers WHERE enabled = TRUE ORDER BY updated_at DESC, created_at DESC LIMIT 1");
  return result.rows[0] ? rowToProvider(result.rows[0]) : null;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export async function createProvider(input: { name: string; baseUrl: string; apiKey: string; model: string; enabled?: boolean }) {
  const name = input.name.trim();
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const model = input.model.trim();
  if (!name || !baseUrl || !model) throw new Error("名称、Base URL 和模型不能为空");
  try { new URL(baseUrl); } catch { throw new Error("Base URL 格式无效"); }
  if (input.enabled) await databaseQuery("UPDATE model_providers SET enabled = FALSE, updated_at = NOW()");
  const result = await databaseQuery("INSERT INTO model_providers (id, name, base_url, api_key, model, enabled) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [randomUUID(), name, baseUrl, input.apiKey.trim(), model, input.enabled ?? false]);
  return rowToProvider(result.rows[0]);
}

export async function updateProvider(id: string, input: { name?: string; baseUrl?: string; apiKey?: string; model?: string; enabled?: boolean; models?: string[] }) {
  const current = await getProvider(id);
  if (!current) return null;
  const baseUrl = input.baseUrl === undefined ? current.baseUrl : normalizeBaseUrl(input.baseUrl);
  try { new URL(baseUrl); } catch { throw new Error("Base URL 格式无效"); }
  if (input.enabled) await databaseQuery("UPDATE model_providers SET enabled = FALSE, updated_at = NOW() WHERE id <> $1", [id]);
  const result = await databaseQuery("UPDATE model_providers SET name = $2, base_url = $3, api_key = $4, model = $5, enabled = $6, models = $7, updated_at = NOW() WHERE id = $1 RETURNING *", [id, input.name?.trim() || current.name, baseUrl, input.apiKey === undefined ? current.apiKey : input.apiKey.trim(), input.model?.trim() || current.model, input.enabled ?? current.enabled, JSON.stringify(input.models ?? current.models)]);
  return result.rows[0] ? rowToProvider(result.rows[0]) : null;
}

export async function deleteProvider(id: string) {
  const result = await databaseQuery("DELETE FROM model_providers WHERE id = $1", [id]);
  return result.rowCount === 1;
}

export async function fetchProviderModels(provider: ModelProvider) {
  const endpoint = provider.baseUrl.endsWith("/models") ? provider.baseUrl : `${provider.baseUrl}/models`;
  const response = await fetch(endpoint, { headers: provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`模型列表请求失败（${response.status}）`);
  const payload = (await response.json()) as { data?: Array<{ id?: string }>; models?: Array<{ id?: string } | string> } | Array<{ id?: string } | string>;
  const items = Array.isArray(payload) ? payload : payload.data ?? payload.models ?? [];
  const models = items.map((item) => typeof item === "string" ? item : item.id).filter((id): id is string => Boolean(id)).sort();
  await databaseQuery("UPDATE model_providers SET models = $2, updated_at = NOW() WHERE id = $1", [provider.id, JSON.stringify(models)]);
  return models;
}
