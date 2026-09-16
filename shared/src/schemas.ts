import { z } from "zod";

export const capturedMessageSchema = z.object({
  message_key: z.string().min(1), ordinal: z.number().int().nonnegative(),
  role: z.enum(["user", "assistant"]), content: z.string().min(1)
});
export const snapshotSchema = z.object({
  schema_version: z.literal(1), captured_at: z.string().datetime({ offset: true }),
  include_baseline: z.boolean().optional().default(false),
  conversation: z.object({ id: z.string().min(1), title: z.string(), url: z.string().url() }),
  messages: z.array(capturedMessageSchema)
});
export const manualNoteSchema = z.object({
  schema_version: z.literal(1), type: z.literal("manual_note"), id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }), content: z.string().trim().min(1).max(20_000)
});
export const configSchema = z.object({
  schemaVersion: z.literal(1), timezone: z.string().min(1),
  server: z.object({ host: z.literal("127.0.0.1"), port: z.number().int().min(1024).max(65535) }),
  obsidian: z.object({ vaultPath: z.string(), dailyNotesDirectory: z.string(), dailyNoteFormat: z.literal("YYYY-MM-DD") }),
  summary: z.object({ provider: z.enum(["openai", "none"]), model: z.string(), autoRun: z.boolean(), runAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), targetDate: z.enum(["today", "yesterday"]), dayBoundaryHour: z.number().int().min(0).max(23), includeSourceLinks: z.boolean() }),
  capture: z.object({ chatgpt: z.boolean(), includeUserMessages: z.boolean(), includeAssistantMessages: z.boolean() })
});
const statusSchema = z.enum(["completed", "in_progress", "planned", "discussed", "suggested", "unknown"]);
export const dailySummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), overview: z.array(z.string()),
  work_items: z.array(z.object({ title: z.string(), status: statusSchema, detail: z.string() })),
  decisions: z.array(z.object({ decision: z.string(), context: z.string() })),
  discussions: z.array(z.object({ topic: z.string(), summary: z.string() })),
  unresolved: z.array(z.object({ item: z.string(), detail: z.string() })),
  next_actions: z.array(z.object({ task: z.string(), source: z.enum(["explicit", "suggested"]) })),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() }))
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export type ManualNote = z.infer<typeof manualNoteSchema>;
export type Config = z.infer<typeof configSchema>;
export type DailySummary = z.infer<typeof dailySummarySchema>;
