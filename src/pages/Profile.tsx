import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { toPng } from 'html-to-image';
import { listFavorites, listMyPins } from '../services/pins';
import type { PinDoc } from '../services/pins';
import { motion, AnimatePresence } from 'motion/react';

type UserProfile = {
  uid: string;
  name: string;
  nickname: string;
  institute: string;
  location: string;
  bloodGroup: string;
  bio?: string;
  aesthetic?: string;
  doorKnobUrl?: string | null;
  doorKnobPreset?: string | null;
  styles?: string[]; // e.g., ["Style1", "Style2", ...]
  clothing?: Array<{ url: string; kind: 'top' | 'bottom' }>;
  createdAt?: any;
};

export default function Profile() {
  const { uid: paramUid } = useParams();
  const { user } = useAuth();
  const viewingUid = paramUid || user?.uid || '';
  const isMe = user?.uid === viewingUid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPins, setMyPins] = useState<PinDoc[]>([]);
  const [favorites, setFavorites] = useState<PinDoc[]>([]);

  const idCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      if (!viewingUid) return;
      const snap = await getDoc(doc(db, 'users', viewingUid));
      if (!cancelled) {
        setProfile(snap.exists() ? ({ uid: viewingUid, ...(snap.data() as any) }) : null);
        setLoading(false);
      }
    }
    fetchProfile();
    return () => { cancelled = true; };
  }, [viewingUid]);

  useEffect(() => {
    let cancelled = false;
    async function fetchActivity() {
      if (!viewingUid) return;
      const [pins, favs] = await Promise.all([
        listMyPins(viewingUid),
        isMe && user ? listFavorites(user.uid) : Promise.resolve([] as PinDoc[])
      ]);
      if (!cancelled) {
        setMyPins(pins);
        setFavorites(favs);
      }
    }
    fetchActivity();
    return () => { cancelled = true; };
  }, [viewingUid, isMe, user]);

  const createdDate = useMemo(() => {
    if (!profile?.createdAt) return '';
    try {
      const d = profile.createdAt.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt);
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  }, [profile?.createdAt]);

  async function downloadHanger() {
    if (!idCardRef.current) return;
    const dataUrl = await toPng(idCardRef.current, { width: 1200, height: 900, pixelRatio: 2 }); // 4:3
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `hanger_${profile?.uid || 'user'}.png`;
    a.click();
  }

  if (loading) return null;
  if (!profile) return (
    <div className="container" style={{ padding: 24 }}>
      <div className="error">Profile not found.</div>
    </div>
  );

  if (!isMe) {
    // OTHER USER LAYOUT: 20% - 60% - 20% with marquees and center card without name + Knock overlay
    const clothes = profile.clothing || [];
    const leftItems = clothes.filter((_, i) => i % 2 === 0);
    const rightItems = clothes.filter((_, i) => i % 2 === 1);
    const [chatOpen, setChatOpen] = useState(false);

    const MarqueeCol = ({ items, direction }: { items: { url: string; kind: 'top'|'bottom' }[]; direction: 'up'|'down' }) => {
      const dur = Math.max(10, items.length * 4);
      const translateFrom = direction === 'up' ? '100%' : '-100%';
      const translateTo = direction === 'up' ? '-100%' : '100%';
      return (
        <div style={{ overflow: 'hidden', height: '100%' }}>
          <motion.div
            style={{ display: 'grid', gap: 12 }}
            animate={{ y: [translateFrom, translateTo] }}
            transition={{ duration: dur, repeat: Infinity, ease: 'linear' }}
          >
            {[...items, ...items].map((c, idx) => (
              <div key={idx} className="card" style={{ padding: 6 }}>
                <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={c.url} alt={c.kind} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      );
    };

    return (
      <div className="container" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', gap: 12, height: 'calc(100vh - 120px)' }}>
          <MarqueeCol items={leftItems} direction="down" />

          <div className="card" style={{ position: 'relative', padding: 16, overflow: 'hidden' }}>
            {/* Center ID card (without name) */}
            <div className="card" style={{ background: '#faef5c', borderColor: '#e3d94a', padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">UserID</div>
                    <div>{profile.uid}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Educational institute</div>
                    <div>{profile.institute}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Blood group</div>
                    <div>{profile.bloodGroup}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Style</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {(profile.styles || ['Style1','Style2','Style3','Style4']).slice(0,4).map((s, i) => (
                        <div key={i}>{s}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="label">Registered</div>
                    <div>{createdDate}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: '100%', aspectRatio: '1 / 1', border: '2px dashed #16a34a', background: '#eaffea', display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: '60%', aspectRatio: '1 / 1', borderRadius: '50%', overflow: 'hidden', background: '#fff' }}>
                      {profile.doorKnobUrl ? (
                        <img src={profile.doorKnobUrl} alt="door knob" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--color-muted)' }}>No avatar</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', placeItems: 'center', marginTop: 12 }}>
                <button className="btn" onClick={() => setChatOpen(true)}>Knock</button>
              </div>
            </div>

            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}
                >
                  <div className="row" style={{ justifyContent: 'space-between', padding: 8, borderBottom: '1px solid var(--color-border)' }}>
                    <strong>Chat</strong>
                    <div className="row" style={{ gap: 8 }}>
                      <a className="btn ghost" href={`/chat/${profile.uid}`}>Open full</a>
                      <button className="btn" onClick={() => setChatOpen(false)}>Close</button>
                    </div>
                  </div>
                  <div style={{ padding: 12, overflow: 'auto' }}>
                    <div className="info">Start chatting with this user…</div>
                  </div>
                  <div style={{ padding: 8, borderTop: '1px solid var(--color-border)' }}>
                    <input className="input" placeholder="Type a message…" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <MarqueeCol items={rightItems} direction="up" />
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16 }}>
        {/* USER DETAILS 75% */}
        <section>
          {/* ID Card + Download */}
          <div className="row" style={{ alignItems: 'stretch', marginBottom: 16 }}>
            <div ref={idCardRef} className="card" style={{ flex: 1, background: '#faef5c', borderColor: '#e3d94a', padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                {/* Left - labels and values */}
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">UserID</div>
                    <div>{profile.uid}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Name</div>
                    <div>{profile.name}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Educational institute</div>
                    <div>{profile.institute}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Blood group</div>
                    <div>{profile.bloodGroup}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Nickname</div>
                    <div>{profile.nickname}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="label">Style</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {(profile.styles || ['Style1','Style2','Style3','Style4']).slice(0,4).map((s, i) => (
                        <div key={i}>{s}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="label">Registered</div>
                    <div>{createdDate}</div>
                  </div>
                </div>

                {/* Right - dashed square with green border and door knob avatar */}
                <div style={{ display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: '100%', aspectRatio: '1 / 1', border: '2px dashed #16a34a', background: '#eaffea', display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: '60%', aspectRatio: '1 / 1', borderRadius: '50%', overflow: 'hidden', background: '#fff' }}>
                      {profile.doorKnobUrl ? (
                        <img src={profile.doorKnobUrl} alt="door knob" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--color-muted)' }}>No avatar</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', placeItems: 'center' }}>
              <button className="btn" onClick={downloadHanger}>Download Hanger</button>
            </div>
          </div>

          {/* Closet - 2 column grid */}
          <div>
            <h3 style={{ marginTop: 0 }}>Closet</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(profile.clothing || []).map((c, idx) => (
                <div key={idx} className="card" style={{ padding: 8, display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12 }}>
                  <div style={{ width: 96, aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden' }}>
                    <img src={c.url} alt={c.kind} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div className="label">Type</div>
                    <div style={{ marginBottom: 6 }}>{c.kind}</div>
                    <div className="label">Description</div>
                    <div>{profile.bio || '—'}</div>
                  </div>
                </div>
              ))}
              {(!profile.clothing || profile.clothing.length === 0) && <div className="info">No clothing uploaded yet.</div>}
            </div>
          </div>
        </section>

        {/* ACTIVITY 25% */}
        <aside className="card" style={{ padding: 12, display: 'grid', gridTemplateRows: '1fr 1fr', gap: 8 }}>
          {/* Pinned locations */}
          <div>
            <h3 style={{ marginTop: 0 }}>Pinned locations</h3>
            <div className="stack" style={{ maxHeight: 240, overflow: 'auto' }}>
              {myPins.map((p) => (
                <div key={p.id} className="card" style={{ padding: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{p.label} • {p.lat.toFixed(3)},{p.lng.toFixed(3)}</div>
                </div>
              ))}
              {!myPins.length && <div className="info">No pinned locations.</div>}
            </div>
          </div>

          {/* Chats placeholder with search + open full page */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Chats</h3>
              <a className="btn ghost" href="/chat">Open full</a>
            </div>
            <input className="input" placeholder="Search users to chat" />
            <div className="stack" style={{ marginTop: 8 }}>
              <div className="info">You havent knocked anyone's doors</div>
            </div>
          </div>

          {/* Favourites under activity top? The spec places favourites in Activity. Add below. */}
          <div style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 12 }}>Favourite pins</h3>
            <div className="stack" style={{ maxHeight: 160, overflow: 'auto' }}>
              {favorites.map((p) => (
                <div key={p.id} className="card" style={{ padding: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{p.label} • {p.lat.toFixed(3)},{p.lng.toFixed(3)}</div>
                </div>
              ))}
              {!favorites.length && <div className="info">No favourites yet.</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

