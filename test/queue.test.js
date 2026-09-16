import test from "node:test";
import assert from "node:assert/strict";
import { acknowledgeQueue, mergeQueue } from "../extension/queue.js";
const m = (key, content = key) => ({ conversation_id: "a", message_key: key, ordinal: 1, role: "assistant", content });
test("offline queue deduplicates streaming updates", () => assert.deepEqual(mergeQueue([m("x", "partial")], [m("x", "complete")]), [m("x", "complete")]));
test("queue is removed only from the acknowledged snapshot and preserves concurrent arrivals", () => assert.deepEqual(acknowledgeQueue([m("x"), m("y")], [m("x")]), [m("y")]));
