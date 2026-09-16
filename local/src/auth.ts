import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "./config.js";
export async function getAuthToken(): Promise<string> { const dir = path.join(dataRoot(), "config"), file = path.join(dir, "auth-token"); try { return (await readFile(file, "utf8")).trim(); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; await mkdir(dir, { recursive: true }); const token = randomBytes(32).toString("hex"); await writeFile(file, token, { encoding: "utf8", mode: 0o600 }); return token; } }
export function tokenMatches(actual: string | undefined, expected: string): boolean { if (!actual) return false; const a = Buffer.from(actual), b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); }
