import { getCurrentUser } from "@/lib/auth";
import { createProvider, deleteProvider, listProviders, publicProvider, updateProvider } from "@/lib/model-providers";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权访问" }, { status: 403 });
  try { return NextResponse.json({ providers: (await listProviders()).map(publicProvider) }); }
  catch (error) { console.error("List providers error", error); return NextResponse.json({ error: "加载模型供应商失败" }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const body = (await request.json()) as { name?: string; baseUrl?: string; apiKey?: string; model?: string; enabled?: boolean; models?: string[] };
    if (!body.name || !body.baseUrl || !body.model) return NextResponse.json({ error: "名称、Base URL 和模型不能为空" }, { status: 400 });
    return NextResponse.json({ provider: publicProvider(await createProvider({ name: body.name, baseUrl: body.baseUrl, apiKey: body.apiKey ?? "", model: body.model, enabled: body.enabled, models: body.models })) }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创建供应商失败" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const body = (await request.json()) as { id?: string; name?: string; baseUrl?: string; apiKey?: string; model?: string; enabled?: boolean; models?: string[] };
    if (!body.id) return NextResponse.json({ error: "缺少供应商 ID" }, { status: 400 });
    const provider = await updateProvider(body.id, body);
    if (!provider) return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    return NextResponse.json({ provider: publicProvider(provider) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "更新供应商失败" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "缺少供应商 ID" }, { status: 400 });
    if (!(await deleteProvider(id))) return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "删除供应商失败" }, { status: 400 }); }
}
