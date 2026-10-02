import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Drivers direccionados por contenido (clave = sha256). `uploadthing` en prod
 * (ADR-024), `fs` en dev. Sin credencial de prod la subida falla explícito.
 */
export type StorageDriver = "fs" | "uploadthing";

export function storageDriver(): StorageDriver {
  const d = process.env.STORAGE_DRIVER ?? "fs";
  return d === "uploadthing" ? "uploadthing" : "fs";
}

function signingSecret(): string {
  const s = process.env.FILE_SIGNING_SECRET ?? "";
  if (!s) throw { code: "CONFIG_ERROR", message: "Falta FILE_SIGNING_SECRET." };
  return s;
}

/** Firma ligada a attachment + empresa + usuario, con expiración UNIX. */
export function signDownload(attachmentId: string, companyId: string, userId: string, exp: number): string {
  return createHmac("sha256", signingSecret()).update(`${attachmentId}.${companyId}.${userId}.${exp}`).digest("hex");
}

export function verifyDownload(sig: string, attachmentId: string, companyId: string, userId: string, exp: number): boolean {
  if (Date.now() / 1000 > exp) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(signDownload(attachmentId, companyId, userId, exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function putBlob(sha256: string, bytes: Buffer, mime: string): Promise<{ key: string }> {
  if (storageDriver() === "uploadthing") {
    const token = process.env.UPLOADTHING_TOKEN;
    if (!token) throw { code: "CONFIG_ERROR", message: "Falta UPLOADTHING_TOKEN." };
    const { UTApi } = await import("uploadthing/server");
    const ut = new UTApi({ token });
    const file = new File([bytes as unknown as BlobPart], sha256, { type: mime });
    const res = await ut.uploadFiles([file]);
    const first = res[0];
    if (!first || (first as { error?: unknown }).error) throw { code: "UPLOAD_FAILED", message: "UploadThing rechazó el archivo." };
    const data = (first as { data?: { key?: string } }).data;
    if (!data?.key) throw { code: "UPLOAD_FAILED", message: "Sin clave de almacenamiento." };
    return { key: data.key };
  }
  const dir = process.env.STORAGE_PATH ?? "./storage";
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, sha256), bytes);
  return { key: `fs:${sha256}` };
}

export async function getBlobUrl(key: string, ttlSeconds = 900): Promise<string> {
  if (key.startsWith("fs:")) throw { code: "CONFIG_ERROR", message: "Los blobs fs se sirven por el handler interno." };
  if (storageDriver() !== "uploadthing") throw { code: "CONFIG_ERROR", message: "Driver no configurado para URL remota." };
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) throw { code: "CONFIG_ERROR", message: "Falta UPLOADTHING_TOKEN." };
  const { UTApi } = await import("uploadthing/server");
  const ut = new UTApi({ token });
  const api = ut as unknown as { getSignedURL?: (k: string, o?: { expiresIn?: number }) => Promise<string> };
  if (typeof api.getSignedURL !== "function") throw { code: "CONFIG_ERROR", message: "SDK sin URL firmada." };
  return api.getSignedURL(key, { expiresIn: ttlSeconds });
}

export function readFsBlob(sha256: string): Buffer | null {
  const p = join(process.env.STORAGE_PATH ?? "./storage", sha256);
  return existsSync(p) ? readFileSync(p) : null;
}
