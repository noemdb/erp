import { hash, verify } from "@node-rs/argon2";

/** Argon2id (DATABASE.md). Nunca en logs (SECURITY.md). */
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
