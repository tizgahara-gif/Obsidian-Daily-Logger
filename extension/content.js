let observer;
const send = (messages, options = {}) => new Promise((resolve) => chrome.runtime.sendMessage({ type: options.reconcile ? "RECONCILE_BASELINE" : "CAPTURE_MESSAGES", messages }, (response) => resolve(response)));
let engine;
let readMessages;

async function start() {
  const module = await import(chrome.runtime.getURL("capture-engine.js"));
  readMessages = module.readMessages;
  engine = new module.CaptureEngine({ snapshot: () => readMessages(), send });
  const { capture = module.DEFAULT_CAPTURE } = await chrome.storage.local.get("capture");
  if (!capture.autoCapture || !capture.chatgpt) return;
  await engine.initialize();
  observer = new MutationObserver(() => engine.changed());
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
}

chrome.runtime.onMessage.addListener((request, _sender, respond) => {
  if (request.type === "GET_CURRENT_MESSAGES") { respond({ messages: readMessages ? readMessages().map(({ element, ...m }) => m) : [] }); return; }
});

start().catch((error) => chrome.runtime.sendMessage({ type: "CAPTURE_ERROR", error: error.message }));
