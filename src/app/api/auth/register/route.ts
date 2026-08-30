import { createSession, createUser, publicUser, sessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; email?: string; password?: string };
    if (!body.username || !body.email || !body.password) {
      return NextResponse.json({ error: "请完整填写注册信息" }, { status: 400 });
    }
    const user = await createUser({ username: body.username, email: body.email, password: body.password });
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set(sessionCookie(session.token, session.maxAge));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "注册失败" }, { status: 400 });
  }
}
