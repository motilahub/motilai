import { createUser, deleteUser, getCurrentUser, listUsers, publicUser, updateUser, type UserRole, type UserType } from "@/lib/auth";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权访问" }, { status: 403 });
  try { return NextResponse.json({ users: (await listUsers()).map(publicUser) }); }
  catch (error) { console.error("List users error", error); return NextResponse.json({ error: "加载用户失败" }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const body = (await request.json()) as { username?: string; email?: string; password?: string; displayName?: string; phone?: string; avatarUrl?: string; userType?: UserType; role?: UserRole; disabled?: boolean };
    if (!body.username || !body.email || !body.password) return NextResponse.json({ error: "用户名、邮箱和密码不能为空" }, { status: 400 });
    const user = await createUser({ username: body.username, email: body.email, password: body.password, displayName: body.displayName, phone: body.phone, avatarUrl: body.avatarUrl, userType: body.userType, role: body.role, disabled: body.disabled });
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建用户失败";
    return NextResponse.json({ error: message }, { status: message.includes("已存在") || message.includes("需要") || message.includes("有效") || message.includes("无效") ? 400 : 503 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const body = (await request.json()) as { id?: string; username?: string; email?: string; displayName?: string; phone?: string; avatarUrl?: string; userType?: UserType; role?: UserRole; disabled?: boolean };
    if (!body.id || (body.role !== undefined && !["admin", "user"].includes(body.role)) || (body.userType !== undefined && !["user", "staff", "customer", "service"].includes(body.userType))) return NextResponse.json({ error: "无效的用户信息" }, { status: 400 });
    const user = await updateUser(body.id, body);
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新用户失败";
    return NextResponse.json({ error: message }, { status: message.includes("不可") || message.includes("已存在") || message.includes("有效") || message.includes("无效") ? 400 : 503 });
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权操作" }, { status: 403 });
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) return NextResponse.json({ error: "缺少用户 UUID" }, { status: 400 });
    if (!(await deleteUser(body.id))) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除用户失败" }, { status: 400 });
  }
}
