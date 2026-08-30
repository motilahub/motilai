import { getCurrentUser } from "@/lib/auth";
import { fetchProviderModels, getProvider } from "@/lib/model-providers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "缺少供应商 ID" }, { status: 400 });
    const provider = await getProvider(id);
    if (!provider) return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    return NextResponse.json({ models: await fetchProviderModels(provider) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "获取模型列表失败" }, { status: 502 }); }
}
