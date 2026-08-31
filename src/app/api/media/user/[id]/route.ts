import { databaseQuery } from "@/lib/auth";
import { imageBufferFromDataUri } from "@/lib/image-thumbnails";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const highResolution = new URL(request.url).searchParams.get("size") === "64";
  const result = await databaseQuery<{ value: string }>(`SELECT ${highResolution ? "avatar_url_64" : "avatar_url"} AS value FROM users WHERE id = $1`, [id]);
  const value = result.rows[0]?.value;
  if (!value) return new NextResponse("Not found", { status: 404 });
  try {
    return new NextResponse(imageBufferFromDataUri(value), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" } });
  } catch { return new NextResponse("Not found", { status: 404 }); }
}
