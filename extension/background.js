import { DEFAULT_CAPTURE } from "./capture-engine.js";
import { acknowledgeQueue, mergeQueue } from "./queue.js";

const BASE = "http://127.0.0.1:27123";
const get = (keys) => chrome.storage.local.get(keys);
const set = (value) => chrome.storage.local.set(value);

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { "content-type": "application/json", ...options.headers } });
  if (!response.ok) throw new Error(`Local Service ${response.status}`);
  return response.json();
}
async function setState(captureState, extra = {}) { await set({ captureState, ...extra }); }
async function enqueue(messages) {
  const { pendingQueue = [] } = await get("pendingQueue");
  await set({ pendingQueue: mergeQueue(pendingQueue, messages) }); await setState("offline_queue");
}
async function postMessages(messages) {
  const batch_id = crypto.randomUUID();
  const result = await request("/v1/messages", { method: "POST", body: JSON.stringify({ batch_id, messages }) });
  if (result.ack !== batch_id) throw new Error("invalid ACK");
  return result;
}
export async function flushQueue() {
  const { pendingQueue = [] } = await get("pendingQueue");
  if (!pendingQueue.length) { await request("/health"); await setState("recording", { lastError: null }); return; }
  await postMessages(pendingQueue);
  const latest = (await get("pendingQueue")).pendingQueue || [];
  await set({ pendingQueue: acknowledgeQueue(latest, pendingQueue) });
  await setState("recording", { lastRecordedAt: new Date().toISOString(), lastError: null });
}
async function capture(messages) {
  try { await postMessages(messages); await setState("recording", { lastRecordedAt: new Date().toISOString(), lastError: null }); }
  catch (error) { await enqueue(messages); await set({ lastError: error.message }); }
}
async function reconcileBaseline(messages) {
  try {
    const result = await request("/v1/reconcile", { method: "POST", body: JSON.stringify({ messages }) });
    const unknown = result.messages.filter((m) => !m.known).map(({ known, ...m }) => m);
    if (unknown.length) await capture(unknown);
    await flushQueue(); return result;
  } catch (error) { await enqueue(messages); await set({ lastError: error.message }); return { offline: true }; }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await get("capture");
  await set({ capture: { ...DEFAULT_CAPTURE, ...(current.capture || {}) }, captureState: "initializing", pendingQueue: (await get("pendingQueue")).pendingQueue || [] });
  chrome.alarms.create("service-retry", { periodInMinutes: 1 }); flushQueue().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create("service-retry", { periodInMinutes: 1 }); flushQueue().catch(() => {}); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === "service-retry") flushQueue().catch(async (e) => setState("offline_queue", { lastError: e.message })); });
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  const run = async () => {
    if (message.type === "CAPTURE_MESSAGES") return capture(message.messages);
    if (message.type === "RECONCILE_BASELINE") return reconcileBaseline(message.messages);
    if (message.type === "CAPTURE_ERROR") return setState("error", { lastError: message.error });
    if (message.type === "ADD_NOTE") return request("/v1/notes", { method: "POST", body: JSON.stringify({ content: message.content }) });
    if (message.type === "GET_STATS") return request(`/v1/stats?date=${encodeURIComponent(message.date)}`);
    if (message.type === "RECOVERY_PREVIEW") return request("/v1/reconcile", { method: "POST", body: JSON.stringify({ messages: message.messages }) });
    if (message.type === "RECOVER") return request("/v1/recovery", { method: "POST", body: JSON.stringify(message) });
  };
  run().then(respond).catch(async (e) => { await set({ lastError: e.message }); respond({ error: e.message }); }); return true;
});
