import { changeUserPassword, getCurrentUser, publicUser, setUserPassword } from "@/lib/auth";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const body = (await request.json()) as { id?: string; action?: "change" | "reset"; currentPassword?: string; newPassword?: string };
    const targetId = body.id ?? currentUser.id;
    if (body.action === "change" || (!body.action && targetId === currentUser.id)) {
      if (targetId !== currentUser.id || !body.currentPassword || !body.newPassword) return NextResponse.json({ error: "请完整填写密码信息" }, { status: 400 });
      const user = await changeUserPassword(currentUser.id, body.currentPassword, body.newPassword);
      return NextResponse.json({ user: user ? publicUser(user) : null });
    }
    if (currentUser.role !== "admin") return NextResponse.json({ error: "无权重置其他用户密码" }, { status: 403 });
    const password = body.newPassword?.trim() || randomBytes(9).toString("base64url");
    const user = await setUserPassword(targetId, password);
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    return NextResponse.json({ user: publicUser(user), temporaryPassword: password });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "密码操作失败" }, { status: 400 });
  }
}
