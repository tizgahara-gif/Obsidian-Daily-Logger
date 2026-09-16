export const queueKey = (message) => `${message.conversation_id}\0${message.message_key}\0${message.ordinal}\0${message.role}`;

export function mergeQueue(current, incoming) {
  const merged = new Map(current.map((message) => [queueKey(message), message]));
  for (const message of incoming) merged.set(queueKey(message), message);
  return [...merged.values()];
}

export function acknowledgeQueue(current, acknowledgedSnapshot) {
  const sent = new Set(acknowledgedSnapshot.map(queueKey));
  return current.filter((message) => !sent.has(queueKey(message)));
}
