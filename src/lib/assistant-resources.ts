import { randomUUID } from "node:crypto";
import { databaseQuery } from "@/lib/auth";

export type ResourceKind = "agent" | "knowledge" | "tool";
export type AssistantResource = { id: string; kind: ResourceKind; name: string; description: string; enabled: boolean; config: Record<string, unknown>; createdAt: string; updatedAt: string };

function rowToResource(row: Record<string, unknown>): AssistantResource {
  const config = row.config && typeof row.config === "object" && !Array.isArray(row.config) ? row.config as Record<string, unknown> : {};
  return { id: String(row.id), kind: row.kind as ResourceKind, name: String(row.name), description: String(row.description ?? ""), enabled: Boolean(row.enabled), config, createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString() };
}

export async function listAssistantResources(options: { kind?: ResourceKind; enabledOnly?: boolean } = {}) {
  const values: unknown[] = []; const conditions: string[] = [];
  if (options.kind) { values.push(options.kind); conditions.push(`kind = $${values.length}`); }
  if (options.enabledOnly) conditions.push("enabled = TRUE");
  const result = await databaseQuery(`SELECT * FROM assistant_resources ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY kind, created_at`, values);
  return result.rows.map(rowToResource);
}

export async function getAssistantResource(id: string) { const result = await databaseQuery("SELECT * FROM assistant_resources WHERE id = $1", [id]); return result.rows[0] ? rowToResource(result.rows[0]) : null; }

export async function createAssistantResource(input: { kind: ResourceKind; name: string; description?: string; enabled?: boolean; config?: Record<string, unknown> }) {
  validateInput(input.kind, input.name);
  const result = await databaseQuery("INSERT INTO assistant_resources (id, kind, name, description, enabled, config) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *", [randomUUID(), input.kind, input.name.trim(), input.description?.trim() ?? "", input.enabled ?? true, JSON.stringify(input.config ?? {})]);
  return rowToResource(result.rows[0]);
}

export async function updateAssistantResource(id: string, input: Partial<{ kind: ResourceKind; name: string; description: string; enabled: boolean; config: Record<string, unknown> }>) {
  const current = await getAssistantResource(id); if (!current) return null;
  const kind = input.kind ?? current.kind; const name = input.name?.trim() ?? current.name;
  validateInput(kind, name);
  const result = await databaseQuery("UPDATE assistant_resources SET kind = $2, name = $3, description = $4, enabled = $5, config = $6::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *", [id, kind, name, input.description?.trim() ?? current.description, input.enabled ?? current.enabled, JSON.stringify(input.config ?? current.config)]);
  return result.rows[0] ? rowToResource(result.rows[0]) : null;
}

export async function deleteAssistantResource(id: string) { const result = await databaseQuery("DELETE FROM assistant_resources WHERE id = $1", [id]); return (result.rowCount ?? 0) > 0; }

function validateInput(kind: ResourceKind, name: string) { if (!["agent", "knowledge", "tool"].includes(kind)) throw new Error("无效的资源类型"); if (!name.trim()) throw new Error("名称不能为空"); if (name.trim().length > 80) throw new Error("名称不能超过 80 个字符"); }
