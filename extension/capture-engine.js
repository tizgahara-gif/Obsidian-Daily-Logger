export const DEFAULT_CAPTURE = { chatgpt: true, autoCapture: true, captureUserMessages: true, captureAssistantMessages: true };

export function conversationId(url = location.href) {
  const match = new URL(url).pathname.match(/\/c\/([^/?#]+)/);
  return match?.[1] || `new:${new URL(url).pathname}`;
}

export function messageKey(element, ordinal, role, conversation) {
  const explicit = element.getAttribute("data-message-id") || element.closest("[data-message-id]")?.getAttribute("data-message-id");
  return explicit || `${conversation}:${ordinal}:${role}`;
}

export function readMessages(root = document, url = location.href) {
  const conversation = conversationId(url);
  const nodes = [...root.querySelectorAll("[data-message-author-role]")];
  return nodes.map((element, ordinal) => {
    const role = element.getAttribute("data-message-author-role");
    return { element, conversation_id: conversation, conversation_title: document.title.replace(/\s*[-–]\s*ChatGPT.*$/, ""),
      message_key: messageKey(element, ordinal, role, conversation), ordinal, role, content: element.innerText?.trim() || element.textContent?.trim() || "" };
  }).filter((m) => ["user", "assistant"].includes(m.role));
}

export class CaptureEngine {
  constructor({ snapshot, send, now = () => new Date().toISOString(), debounceMs = 700 }) {
    this.snapshot = snapshot; this.send = send; this.now = now; this.debounceMs = debounceMs;
    this.conversation = null; this.initialKeys = new Set(); this.lastContent = new Map(); this.timers = new Map(); this.started = false;
  }
  async initialize() {
    const messages = this.snapshot();
    this.conversation = messages[0]?.conversation_id || conversationId();
    this.initialKeys = new Set(messages.map((m) => m.message_key));
    this.lastContent = new Map(messages.map((m) => [m.message_key, m.content]));
    await this.send(messages.map((m) => this.clean(m, "baseline")), { reconcile: true });
    this.started = true;
  }
  clean(message, classification) {
    const { element, ...plain } = message;
    return { ...plain, activity_classification: classification, detected_at: this.now() };
  }
  changed() {
    if (!this.started) return;
    const messages = this.snapshot();
    const nextConversation = messages[0]?.conversation_id || conversationId();
    if (nextConversation !== this.conversation) return this.navigate();
    for (const message of messages) {
      if (this.lastContent.get(message.message_key) === message.content) continue;
      this.lastContent.set(message.message_key, message.content);
      const classification = this.initialKeys.has(message.message_key) ? "baseline" : "active";
      clearTimeout(this.timers.get(message.message_key));
      this.timers.set(message.message_key, setTimeout(() => {
        this.send([this.clean(message, classification)]);
        this.timers.delete(message.message_key);
      }, this.debounceMs));
    }
  }
  async navigate() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear(); this.started = false;
    await this.initialize();
  }
  stop() { for (const timer of this.timers.values()) clearTimeout(timer); this.timers.clear(); this.started = false; }
}
