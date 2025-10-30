import { child, get, getDatabase, onValue, push, ref, set, update } from 'firebase/database';
import { rtdb } from '../firebase/client';

export type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  createdAt: number; // ms epoch
};

export type ChatSummary = {
  chatId: string;
  otherUserId: string;
  lastText?: string;
  lastTs?: number;
};

function chatIdFor(u1: string, u2: string) {
  return [u1, u2].sort().join('_');
}

export async function ensureChat(currentUid: string, otherUid: string): Promise<string> {
  const chatId = chatIdFor(currentUid, otherUid);
  const chatRef = ref(rtdb, `chats/${chatId}`);
  const snap = await get(chatRef);
  if (!snap.exists()) {
    await set(chatRef, { createdAt: Date.now(), users: { [currentUid]: true, [otherUid]: true } });
  }
  // index under userChats
  const updates: Record<string, any> = {};
  updates[`userChats/${currentUid}/${chatId}`] = { chatId, otherUserId: otherUid, updatedAt: Date.now() };
  updates[`userChats/${otherUid}/${chatId}`] = { chatId, otherUserId: currentUid, updatedAt: Date.now() };
  await update(ref(rtdb), updates);
  return chatId;
}

export function listenUserChats(uid: string, cb: (chats: ChatSummary[]) => void) {
  const userChatsRef = ref(rtdb, `userChats/${uid}`);
  return onValue(userChatsRef, (snap) => {
    const val = snap.val() || {};
    const list: ChatSummary[] = Object.values(val);
    list.sort((a, b) => (b.lastTs || b.updatedAt || 0) - (a.lastTs || a.updatedAt || 0));
    cb(list);
  });
}

export function listenMessages(chatId: string, cb: (messages: ChatMessage[]) => void) {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  return onValue(messagesRef, (snap) => {
    const val = snap.val() || {};
    const list: ChatMessage[] = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
    list.sort((a, b) => a.createdAt - b.createdAt);
    cb(list);
  });
}

export async function sendMessage(chatId: string, from: string, to: string, text: string) {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const msgRef = push(messagesRef);
  const msg: Omit<ChatMessage, 'id'> = { from, to, text, createdAt: Date.now() } as any;
  await set(msgRef, msg);
  const summaryUpdates: Record<string, any> = {};
  summaryUpdates[`userChats/${from}/${chatId}/lastText`] = text;
  summaryUpdates[`userChats/${from}/${chatId}/lastTs`] = msg.createdAt;
  summaryUpdates[`userChats/${to}/${chatId}/lastText`] = text;
  summaryUpdates[`userChats/${to}/${chatId}/lastTs`] = msg.createdAt;
  summaryUpdates[`userChats/${from}/${chatId}/updatedAt`] = msg.createdAt;
  summaryUpdates[`userChats/${to}/${chatId}/updatedAt`] = msg.createdAt;
  await update(ref(rtdb), summaryUpdates);
}

