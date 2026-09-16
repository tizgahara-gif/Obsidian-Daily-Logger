import { createHash } from "node:crypto";

export const CLASSIFICATIONS = new Set(["baseline", "active", "manual_import"]);

export function identity(message) {
  return `${message.conversation_id}\u0000${message.message_key}\u0000${message.ordinal}\u0000${message.role}`;
}

export function activityDate(detectedAt, { timezone = "Asia/Tokyo", dayBoundaryHour = 0 } = {}) {
  const instant = new Date(detectedAt);
  if (Number.isNaN(instant.valueOf())) throw new Error("detected_at must be an ISO date");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"
  }).formatToParts(instant).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  let date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  if (Number(parts.hour) < dayBoundaryHour) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function normalizeMessage(input, settings, previous) {
  if (!input.conversation_id || !input.message_key || !["user", "assistant"].includes(input.role)) {
    throw new Error("conversation_id, message_key, and a supported role are required");
  }
  if (!CLASSIFICATIONS.has(input.activity_classification)) throw new Error("invalid activity_classification");
  const now = input.detected_at || new Date().toISOString();
  const classification = previous?.activity_classification || input.activity_classification;
  const result = {
    conversation_id: input.conversation_id,
    conversation_title: input.conversation_title || previous?.conversation_title || "Untitled",
    message_key: input.message_key,
    ordinal: Number(input.ordinal), role: input.role, content: String(input.content || ""),
    activity_classification: classification,
    detected_at: previous?.detected_at || now,
    updated_at: now
  };
  if (classification === "active") result.activity_date = previous?.activity_date || activityDate(now, settings);
  if (classification === "manual_import") {
    result.target_date = input.target_date || previous?.target_date;
    result.imported_at = input.imported_at || previous?.imported_at || now;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.target_date || "")) throw new Error("manual_import requires target_date");
  }
  return result;
}

export class LoggerStore {
  constructor(data = {}, settings = {}) {
    this.settings = { timezone: "Asia/Tokyo", dayBoundaryHour: 0, ...settings };
    this.messages = new Map((data.messages || []).map((m) => [identity(m), m]));
    this.notes = data.notes || [];
  }
  reconcile(messages) {
    return messages.map((m) => ({ ...m, known: this.messages.has(identity(m)) }));
  }
  upsert(messages) {
    const accepted = [];
    for (const input of messages) {
      const key = identity(input), previous = this.messages.get(key);
      const value = normalizeMessage(input, this.settings, previous);
      this.messages.set(key, value); accepted.push({ key, classification: value.activity_classification });
    }
    return accepted;
  }
  recover(messages, targetDate, importedAt = new Date().toISOString()) {
    const unknown = messages.filter((m) => !this.messages.has(identity(m)));
    return this.upsert(unknown.map((m) => ({ ...m, activity_classification: "manual_import", target_date: targetDate, imported_at: importedAt })));
  }
  addNote(content, detectedAt = new Date().toISOString()) {
    const note = { id: createHash("sha256").update(`${detectedAt}\0${content}`).digest("hex"), content, detected_at: detectedAt, activity_date: activityDate(detectedAt, this.settings), activity_classification: "manual_note" };
    this.notes.push(note); return note;
  }
  daily(date) {
    const messages = [...this.messages.values()].filter((m) =>
      (m.activity_classification === "active" && m.activity_date === date) ||
      (m.activity_classification === "manual_import" && m.target_date === date));
    return { messages, notes: this.notes.filter((n) => n.activity_date === date) };
  }
  stats(date) {
    const daily = this.daily(date).messages;
    return { conversations: new Set(daily.map((m) => m.conversation_id)).size, messages: daily.length,
      last_recorded_at: daily.map((m) => m.updated_at).sort().at(-1) || null };
  }
  serialize() { return { messages: [...this.messages.values()], notes: this.notes }; }
}
