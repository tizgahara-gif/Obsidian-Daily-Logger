import test from "node:test";
import assert from "node:assert/strict";
import { LoggerStore, activityDate } from "../service/core.js";

const msg = (key, classification = "baseline", extra = {}) => ({ conversation_id: "conversation-a", message_key: key, ordinal: Number(key.slice(1)), role: Number(key.slice(1)) % 2 ? "user" : "assistant", content: key, activity_classification: classification, detected_at: "2026-09-16T10:00:00Z", ...extra });

test("initial messages remain baseline and later user/assistant messages are daily activity", () => {
  const store = new LoggerStore();
  store.upsert(Array.from({ length: 10 }, (_, i) => msg(`m${i}`)));
  store.upsert([msg("m11", "active"), msg("m12", "active")]);
  assert.equal([...store.messages.values()].filter((m) => m.activity_classification === "baseline").length, 10);
  assert.deepEqual(store.daily("2026-09-16").messages.map((m) => m.message_key), ["m11", "m12"]);
});

test("reload and another tab update canonical content without duplicating or reclassifying", () => {
  const store = new LoggerStore();
  store.upsert([msg("m1", "active")]);
  store.upsert([msg("m1", "baseline", { content: "stream completed" })]);
  assert.equal(store.messages.size, 1);
  assert.equal(store.messages.values().next().value.activity_classification, "active");
  assert.equal(store.messages.values().next().value.content, "stream completed");
});

test("reconciliation distinguishes canonical known messages", () => {
  const store = new LoggerStore(); store.upsert([msg("m1")]);
  assert.deepEqual(store.reconcile([msg("m1"), msg("m2")]).map((m) => m.known), [true, false]);
});

test("recovery imports only unknown messages with audit fields into selected date", () => {
  const store = new LoggerStore(); store.upsert([msg("m1")]);
  store.recover([msg("m1"), msg("m2")], "2026-09-14", "2026-09-16T23:00:00+09:00");
  const imported = store.daily("2026-09-14").messages;
  assert.equal(imported.length, 1); assert.equal(imported[0].activity_classification, "manual_import");
  assert.equal(imported[0].target_date, "2026-09-14"); assert.equal(imported[0].imported_at, "2026-09-16T23:00:00+09:00");
});

test("activity date is calculated service-side using timezone and day boundary", () => {
  assert.equal(activityDate("2026-09-16T18:00:00Z", { timezone: "Asia/Tokyo", dayBoundaryHour: 4 }), "2026-09-16");
  assert.equal(activityDate("2026-09-16T20:00:00Z", { timezone: "Asia/Tokyo", dayBoundaryHour: 4 }), "2026-09-17");
});
