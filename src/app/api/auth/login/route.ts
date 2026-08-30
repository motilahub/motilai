import { authenticate, createSession, publicUser, sessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = (await request.json()) as { identifier?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }
  if (!body.identifier || !body.password) {
    return NextResponse.json({ error: "请输入用户名或邮箱和密码" }, { status: 400 });
  }
  try {
    const user = await authenticate(body.identifier, body.password);
    if (!user) return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set(sessionCookie(session.token, session.maxAge));
    return response;
  } catch (error) {
    console.error("Login service error", error);
    return NextResponse.json({ error: "登录服务暂时不可用，请稍后重试" }, { status: 503 });
  }
}
