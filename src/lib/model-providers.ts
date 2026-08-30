import { randomUUID } from "node:crypto";
import { databaseQuery } from "@/lib/auth";
import { getProviderType, type ModelProviderType } from "@/lib/model-provider-types";

export type ModelProvider = {
  id: string;
  name: string;
  providerType: ModelProviderType;
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
    providerType: getProviderType(String(row.provider_type ?? "custom")),
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
    providerType: provider.providerType,
    baseUrl: provider.baseUrl,
    model: provider.model,
    enabled: provider.enabled,
    models: provider.models,
    hasApiKey: Boolean(provider.apiKey),
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

export async function createProvider(input: { name: string; providerType?: ModelProviderType; baseUrl: string; apiKey: string; model: string; enabled?: boolean; models?: string[] }) {
  const name = input.name.trim();
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const model = input.model.trim();
  if (!name || !baseUrl || !model) throw new Error("名称、Base URL 和模型不能为空");
  try { new URL(baseUrl); } catch { throw new Error("Base URL 格式无效"); }
  if (input.enabled) await databaseQuery("UPDATE model_providers SET enabled = FALSE, updated_at = NOW()");
  const result = await databaseQuery("INSERT INTO model_providers (id, name, provider_type, base_url, api_key, model, enabled, models) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [randomUUID(), name, getProviderType(input.providerType), baseUrl, input.apiKey.trim(), model, input.enabled ?? false, JSON.stringify(input.models ?? [])]);
  return rowToProvider(result.rows[0]);
}

export async function updateProvider(id: string, input: { name?: string; providerType?: ModelProviderType; baseUrl?: string; apiKey?: string; model?: string; enabled?: boolean; models?: string[] }) {
  const current = await getProvider(id);
  if (!current) return null;
  const baseUrl = input.baseUrl === undefined ? current.baseUrl : normalizeBaseUrl(input.baseUrl);
  try { new URL(baseUrl); } catch { throw new Error("Base URL 格式无效"); }
  if (input.enabled) await databaseQuery("UPDATE model_providers SET enabled = FALSE, updated_at = NOW() WHERE id <> $1", [id]);
  const result = await databaseQuery("UPDATE model_providers SET name = $2, provider_type = $3, base_url = $4, api_key = $5, model = $6, enabled = $7, models = $8, updated_at = NOW() WHERE id = $1 RETURNING *", [id, input.name?.trim() || current.name, getProviderType(input.providerType ?? current.providerType), baseUrl, input.apiKey === undefined ? current.apiKey : input.apiKey.trim(), input.model?.trim() || current.model, input.enabled ?? current.enabled, JSON.stringify(input.models ?? current.models)]);
  return result.rows[0] ? rowToProvider(result.rows[0]) : null;
}

export async function deleteProvider(id: string) {
  const result = await databaseQuery("DELETE FROM model_providers WHERE id = $1", [id]);
  return result.rowCount === 1;
}

export async function fetchModelList(input: { baseUrl: string; apiKey?: string }) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  try { new URL(baseUrl); } catch { throw new Error("Base URL 格式无效"); }
  const endpoint = baseUrl.endsWith("/models") ? baseUrl : `${baseUrl}/models`;
  const response = await fetch(endpoint, { headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`模型列表请求失败（${response.status}）`);
  const payload = (await response.json()) as { data?: Array<{ id?: string }>; models?: Array<{ id?: string } | string> } | Array<{ id?: string } | string>;
  const items = Array.isArray(payload) ? payload : payload.data ?? payload.models ?? [];
  return [...new Set(items.map((item) => typeof item === "string" ? item : item.id).filter((id): id is string => Boolean(id)))].sort();
}

export async function fetchProviderModels(provider: ModelProvider) {
  const models = await fetchModelList(provider);
  await databaseQuery("UPDATE model_providers SET models = $2, updated_at = NOW() WHERE id = $1", [provider.id, JSON.stringify(models)]);
  return models;
}
