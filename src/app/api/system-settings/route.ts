import { getCurrentUser } from "@/lib/auth";
import { getSystemSettings, updateSystemSettings } from "@/lib/system-settings";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try { return NextResponse.json({ settings: await getSystemSettings() }); }
  catch (error) { console.error("Get system settings error", error); return NextResponse.json({ error: "读取系统配置失败" }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const body = (await request.json()) as Partial<{ title: string; logoUrl: string; faviconUrl: string; description: string }>;
    if (body.title !== undefined && !body.title.trim()) return NextResponse.json({ error: "系统标题不能为空" }, { status: 400 });
    return NextResponse.json({ settings: await updateSystemSettings(body) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "保存系统配置失败" }, { status: 400 }); }
}
