import http from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { LoggerStore, activityDate } from "./core.js";

const port = Number(process.env.DAILY_LOGGER_PORT || 27123);
const file = resolve(process.env.DAILY_LOGGER_DATA || ".daily-logger/state.json");
const settings = { timezone: process.env.DAILY_LOGGER_TIMEZONE || "Asia/Tokyo", dayBoundaryHour: Number(process.env.DAILY_LOGGER_DAY_BOUNDARY || 0) };
let initial = {};
try { initial = JSON.parse(await readFile(file, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const store = new LoggerStore(initial, settings);
let writes = Promise.resolve();
function persist() {
  writes = writes.then(async () => { await mkdir(dirname(file), { recursive: true }); const temp = `${file}.tmp`; await writeFile(temp, JSON.stringify(store.serialize(), null, 2)); await rename(temp, file); });
  return writes;
}
function json(res, status, body) { res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" }); res.end(JSON.stringify(body)); }
async function body(req) { let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 2_000_000) throw new Error("body too large"); } return raw ? JSON.parse(raw) : {}; }

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, version: "1.1.0" });
    if (req.method === "POST" && url.pathname === "/v1/reconcile") return json(res, 200, { messages: store.reconcile((await body(req)).messages || []) });
    if (req.method === "POST" && url.pathname === "/v1/messages") { const payload = await body(req); const ack = store.upsert(payload.messages || []); await persist(); return json(res, 200, { ack: payload.batch_id, accepted: ack }); }
    if (req.method === "POST" && url.pathname === "/v1/recovery") { const p = await body(req); const accepted = store.recover(p.messages || [], p.target_date); await persist(); return json(res, 200, { accepted }); }
    if (req.method === "POST" && url.pathname === "/v1/notes") { const note = store.addNote((await body(req)).content); await persist(); return json(res, 201, note); }
    if (req.method === "GET" && url.pathname === "/v1/daily") return json(res, 200, store.daily(url.searchParams.get("date")));
    if (req.method === "GET" && url.pathname === "/v1/stats") return json(res, 200, store.stats(url.searchParams.get("date") || activityDate(new Date(), settings)));
    return json(res, 404, { error: "not found" });
  } catch (error) { return json(res, 400, { error: error.message }); }
});
server.listen(port, "127.0.0.1", () => console.log(`Daily Logger service listening on http://127.0.0.1:${port}`));
