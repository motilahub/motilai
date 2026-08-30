import { getCurrentUser } from "@/lib/auth";
import { fetchModelList, getProvider, updateProvider } from "@/lib/model-providers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const body = (await request.json()) as { id?: string; baseUrl?: string; apiKey?: string };
    const provider = body.id ? await getProvider(body.id) : null;
    if (body.id && !provider) return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    const baseUrl = body.baseUrl?.trim() || provider?.baseUrl;
    if (!baseUrl) return NextResponse.json({ error: "请先填写 Base URL" }, { status: 400 });
    const apiKey = body.apiKey?.trim() || provider?.apiKey || "";
    const models = await fetchModelList({ baseUrl, apiKey });
    if (provider) await updateProvider(provider.id, { models });
    return NextResponse.json({ models });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "获取模型列表失败" }, { status: 502 }); }
}
