import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { configSchema, type Config } from "../../shared/src/schemas.js";

export function dataRoot(): string { return process.env.ODL_DATA_DIR || path.join(process.env.LOCALAPPDATA || path.join(process.env.HOME || ".", ".local", "share"), "ObsidianDailyLogger"); }
export const defaultConfig: Config = { schemaVersion: 1, timezone: "Asia/Tokyo", server: { host: "127.0.0.1", port: 8765 }, obsidian: { vaultPath: "", dailyNotesDirectory: "Daily", dailyNoteFormat: "YYYY-MM-DD" }, summary: { provider: "openai", model: "", autoRun: true, runAt: "00:05", targetDate: "yesterday", dayBoundaryHour: 0, includeSourceLinks: true }, capture: { chatgpt: true, includeUserMessages: true, includeAssistantMessages: true } };
export async function loadConfig(): Promise<Config> {
  const file = path.join(dataRoot(), "config", "config.json");
  try { return configSchema.parse(JSON.parse(await readFile(file, "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`CONFIG_ERROR: ${(error as Error).message}`); await saveConfig(defaultConfig); return structuredClone(defaultConfig); }
}
export async function saveConfig(value: unknown): Promise<Config> { const config = configSchema.parse(value); const dir = path.join(dataRoot(), "config"); await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, "config.json"), JSON.stringify(config, null, 2), "utf8"); return config; }
