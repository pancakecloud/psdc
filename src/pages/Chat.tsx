import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ensureChat, listenMessages, listenUserChats, sendMessage } from '../services/chat';
import type { ChatMessage, ChatSummary } from '../services/chat';

export default function ChatPage() {
  const { user } = useAuth();
  const { uid: startUid } = useParams();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load recent chats
  useEffect(() => {
    if (!user) return;
    const unsub = listenUserChats(user.uid, setChats);
    return () => unsub();
  }, [user]);

  // Start chat from route param
  useEffect(() => {
    (async () => {
      if (!user || !startUid) return;
      const id = await ensureChat(user.uid, startUid);
      setActiveChatId(id);
    })();
  }, [user, startUid]);

  // Listen messages for active chat
  useEffect(() => {
    if (!activeChatId) return;
    const unsub = listenMessages(activeChatId, setMessages);
    return () => unsub();
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const activeSummary = useMemo(() => chats.find(c => c.chatId === activeChatId) || null, [chats, activeChatId]);

  async function onSend() {
    if (!user || !activeSummary || !input.trim()) return;
    const to = activeSummary.otherUserId;
    await sendMessage(activeSummary.chatId, user.uid, to, input.trim());
    setInput('');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100vh - 0px)' }}>
      {/* Left: recent chats */}
      <aside className="card" style={{ padding: 12, borderRight: '1px solid var(--color-border)', overflow: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Recent</h3>
        <div className="stack">
          {chats.map((c) => (
            <button key={c.chatId} className="card" style={{ textAlign: 'left', padding: 10, border: activeChatId === c.chatId ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }} onClick={() => setActiveChatId(c.chatId)}>
              <div style={{ fontWeight: 600 }}>{c.otherUserId}</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{c.lastText || '—'}</div>
            </button>
          ))}
          {!chats.length && <div className="info">No recent chats.</div>}
        </div>
      </aside>

      {/* Right: chat pane */}
      <section style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
        <div className="row" style={{ padding: 12, borderBottom: '1px solid var(--color-border)' }}>
          <strong>{activeSummary ? activeSummary.otherUserId : 'Select a chat'}</strong>
        </div>
        <div style={{ padding: 12, overflow: 'auto' }}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.from === user?.uid ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div className="card" style={{ padding: 8, background: m.from === user?.uid ? 'var(--color-primary)' : 'var(--color-surface)', color: m.from === user?.uid ? '#fff' : 'inherit' }}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--color-border)' }}>
          <div className="row">
            <input className="input" placeholder="Type a message" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSend(); }} />
            <button className="btn" onClick={onSend} disabled={!activeSummary || !input.trim()}>Send</button>
          </div>
        </div>
      </section>
    </div>
  );
}

