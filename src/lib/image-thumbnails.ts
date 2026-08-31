import sharp from "sharp";

const DATA_URI_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

export function isDataImage(value: string) {
  return DATA_URI_PATTERN.test(value.trim());
}

function decodeDataImage(value: string) {
  const match = DATA_URI_PATTERN.exec(value.trim());
  if (!match) throw new Error("图片格式无效");
  return Buffer.from(match[2], "base64");
}

function toDataUri(buffer: Buffer) {
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

async function createWebp(input: Buffer, size: number, quality: number) {
  return sharp(input).resize(size, size, { fit: "cover", position: "centre" }).webp({ quality, effort: 4 }).toBuffer();
}

export async function createImageThumbnails(value: string) {
  const input = decodeDataImage(value);
  if (input.length > 2 * 1024 * 1024) throw new Error("图片不能超过 2 MB");
  let small = await createWebp(input, 32, 72);
  for (const quality of [64, 56, 48, 40, 32, 24]) {
    if (small.length <= 10 * 1024) break;
    small = await createWebp(input, 32, quality);
  }
  if (small.length > 10 * 1024) throw new Error("图片无法压缩到 10 KB 以内");
  const medium = await createWebp(input, 64, 72);
  return { small: toDataUri(small), medium: toDataUri(medium) };
}

export function imageBufferFromDataUri(value: string) {
  return decodeDataImage(value);
}
