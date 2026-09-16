let candidates = [];
const send = (message) => chrome.runtime.sendMessage(message);
const date = document.querySelector("#date"), preview = document.querySelector("#preview"), total = document.querySelector("#total"), users = document.querySelector("#users"), assistants = document.querySelector("#assistants"), items = document.querySelector("#items"), importButton = document.querySelector("#import"), feedback = document.querySelector("#feedback"), auto = document.querySelector("#auto");
date.value = new Date().toISOString().slice(0, 10);
async function currentMessages() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("chatgpt.com") && !tab?.url?.includes("chat.openai.com")) throw new Error("ChatGPTの会話タブを選択してください");
  return (await chrome.tabs.sendMessage(tab.id, { type: "GET_CURRENT_MESSAGES" })).messages;
}
preview.addEventListener("click", async () => { try { const messages = await currentMessages(); const result = await send({ type: "RECOVERY_PREVIEW", messages }); if (result.error) throw new Error(result.error); candidates = result.messages.filter((m) => !m.known).map(({ known, ...m }) => m); users.textContent = candidates.filter((m) => m.role === "user").length; assistants.textContent = candidates.filter((m) => m.role === "assistant").length; total.textContent = candidates.length; items.textContent = candidates.map((m) => `${m.role}: ${m.content.slice(0, 100)}`).join("\n"); importButton.disabled = !candidates.length; feedback.textContent = ""; } catch (e) { feedback.textContent = e.message; } });
importButton.addEventListener("click", async () => { if (!date.value) return; const result = await send({ type: "RECOVER", messages: candidates, target_date: date.value }); if (result.error) return feedback.textContent = result.error; feedback.textContent = `${result.accepted.length}件を${date.value}へ取り込みました`; candidates = []; importButton.disabled = true; });
chrome.storage.local.get("capture").then(({ capture = {} }) => auto.checked = capture.autoCapture !== false);
auto.addEventListener("change", async () => { const { capture = {} } = await chrome.storage.local.get("capture"); await chrome.storage.local.set({ capture: { ...capture, autoCapture: auto.checked }, captureState: auto.checked ? "initializing" : "paused" }); });
