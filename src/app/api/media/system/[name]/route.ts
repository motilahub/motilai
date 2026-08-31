import { databaseQuery } from "@/lib/auth";
import { imageBufferFromDataUri } from "@/lib/image-thumbnails";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const highResolution = name.endsWith("-64");
  const baseName = highResolution ? name.slice(0, -3) : name;
  const key = baseName === "logo" ? `logoUrl${highResolution ? "64" : ""}` : baseName === "favicon" ? `faviconUrl${highResolution ? "64" : ""}` : null;
  if (!key) return new NextResponse("Not found", { status: 404 });
  const result = await databaseQuery<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", [key]);
  const value = result.rows[0]?.value;
  if (!value) return new NextResponse("Not found", { status: 404 });
  try {
    return new NextResponse(imageBufferFromDataUri(value), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch { return new NextResponse("Not found", { status: 404 }); }
}
