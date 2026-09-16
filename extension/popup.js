const send = (message) => chrome.runtime.sendMessage(message);
const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const conversations = document.querySelector("#conversations"), messages = document.querySelector("#messages"), last = document.querySelector("#last"), feedback = document.querySelector("#feedback");
async function refresh() {
  const [{ captureState = "initializing", pendingQueue = [], lastError }, stats] = await Promise.all([chrome.storage.local.get(["captureState", "pendingQueue", "lastError"]), send({ type: "GET_STATS", date: localDate() })]);
  const labels = { initializing: "● 初期化中", recording: "● 自動記録中", offline_queue: pendingQueue.length ? `△ 保存待ち ${pendingQueue.length}件` : "○ Local Service停止", paused: "○ 一時停止中", error: "× エラー" };
  document.querySelector("#status").textContent = labels[captureState] || (lastError ? "× エラー" : "● 初期化中");
  document.body.dataset.state = captureState;
  if (!stats?.error) { conversations.textContent = stats.conversations; messages.textContent = stats.messages; last.textContent = stats.last_recorded_at ? new Date(stats.last_recorded_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "まだありません"; }
}
document.querySelector("#add").addEventListener("click", async () => { const input = document.querySelector("#memo"); if (!input.value.trim()) return; const result = await send({ type: "ADD_NOTE", content: input.value.trim() }); feedback.textContent = result?.error || "追加しました"; if (!result?.error) input.value = ""; });
document.querySelector("#daily").addEventListener("click", () => chrome.tabs.create({ url: `http://127.0.0.1:27123/v1/daily?date=${localDate()}` }));
refresh();
