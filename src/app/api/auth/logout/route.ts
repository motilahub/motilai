import { deleteSession, SESSION_COOKIE, clearSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  await deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookie());
  return response;
}
