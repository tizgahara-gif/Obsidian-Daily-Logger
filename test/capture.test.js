import test from "node:test";
import assert from "node:assert/strict";
import { CaptureEngine } from "../extension/capture-engine.js";

const m = (key, role = "user", conversation_id = "a") => ({ conversation_id, message_key: key, ordinal: Number(key.replace(/\D/g, "")) || 0, role, content: key });
const wait = () => new Promise((resolve) => setTimeout(resolve, 8));

test("new conversation needs zero extension operations and captures both roles as active", async () => {
  let snapshot = []; const sent = [];
  const engine = new CaptureEngine({ snapshot: () => snapshot, send: async (messages) => sent.push(...messages), debounceMs: 1 });
  global.location = new URL("https://chatgpt.com/"); await engine.initialize();
  snapshot = [m("m1", "user", "new:/"), m("m2", "assistant", "new:/")]; engine.changed(); await wait();
  assert.deepEqual(sent.map((x) => x.activity_classification), ["active", "active"]); engine.stop();
});

test("existing conversation baseline then PC continuation active", async () => {
  let snapshot = Array.from({ length: 10 }, (_, i) => m(`m${i + 1}`, i % 2 ? "assistant" : "user")); const sent = [];
  const engine = new CaptureEngine({ snapshot: () => snapshot, send: async (messages) => sent.push(...messages), debounceMs: 1 });
  await engine.initialize(); snapshot = [...snapshot, m("m11"), m("m12", "assistant")]; engine.changed(); await wait();
  assert.equal(sent.filter((x) => x.activity_classification === "baseline").length, 10);
  assert.equal(sent.filter((x) => x.activity_classification === "active").length, 2); engine.stop();
});

test("assistant streaming is debounced into one canonical update", async () => {
  let snapshot = []; const sent = [];
  const engine = new CaptureEngine({ snapshot: () => snapshot, send: async (messages) => sent.push(...messages), debounceMs: 3 }); await engine.initialize();
  snapshot = [m("m2", "assistant", "new:/")]; engine.changed(); snapshot[0].content = "complete"; engine.changed(); await wait();
  assert.equal(sent.length, 1); assert.equal(sent[0].content, "complete"); engine.stop();
});
