import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import L from 'leaflet';
import { PinDoc, PinLabel, createPin, deletePin, favoritePin, listFavorites, listMyPins, listenAllPins, unfavoritePin } from '../services/pins';

export default function MapPage() {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [pins, setPins] = useState<PinDoc[]>([]);
  const [myPins, setMyPins] = useState<PinDoc[]>([]);
  const [favorites, setFavorites] = useState<PinDoc[]>([]);
  const [addingLabel, setAddingLabel] = useState<PinLabel>('shop');
  const [hoverPinId, setHoverPinId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([20.5937, 78.9629], 5); // India center-ish default
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    mapRef.current = map;

    // Add click to create pin
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (!user) return;
      const { lat, lng } = e.latlng;
      await createPin(user.uid, lat, lng, addingLabel);
    });
  }, [addingLabel, user]);

  // Listen to all pins
  useEffect(() => {
    const unsub = listenAllPins(setPins);
    return () => unsub();
  }, []);

  // My pins and favorites
  useEffect(() => {
    let cancelled = false;
    async function fetchLists() {
      if (!user) return;
      const [mine, favs] = await Promise.all([
        listMyPins(user.uid),
        listFavorites(user.uid)
      ]);
      if (!cancelled) {
        setMyPins(mine);
        setFavorites(favs);
      }
    }
    fetchLists();
    return () => { cancelled = true; };
  }, [user, pins.length]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;

    // Add or update
    for (const p of pins) {
      if (!existing[p.id]) {
        const m = L.marker([p.lat, p.lng]);
        m.addTo(map);
        m.on('mouseover', () => setHoverPinId(p.id));
        m.on('mouseout', () => setHoverPinId((id) => (id === p.id ? null : id)));
        markersRef.current[p.id] = m;
      } else {
        existing[p.id].setLatLng([p.lat, p.lng]);
      }
    }
    // Remove stale
    for (const id in existing) {
      if (!pins.find((p) => p.id === id)) {
        existing[id].remove();
        delete existing[id];
      }
    }
  }, [pins]);

  const hoverPin = useMemo(() => pins.find((p) => p.id === hoverPinId) || null, [pins, hoverPinId]);
  const isFav = (id: string) => !!favorites.find((f) => f.id === id);

  async function onToggleFavorite(p: PinDoc) {
    if (!user) return;
    if (isFav(p.id)) await unfavoritePin(user.uid, p.id);
    else await favoritePin(user.uid, p);
    const favs = await listFavorites(user.uid);
    setFavorites(favs);
  }

  async function onDeletePin(id: string) {
    if (!user) return;
    await deletePin(id, user.uid);
    const mine = await listMyPins(user.uid);
    setMyPins(mine);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: 'calc(100vh - 0px)' }}>
      <div ref={containerRef} />
      <aside className="card" style={{ borderLeft: '1px solid var(--color-border)', padding: 12, overflow: 'auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Add pin</h3>
          <select className="input" style={{ maxWidth: 140 }} value={addingLabel} onChange={e => setAddingLabel(e.target.value as PinLabel)}>
            <option value="shop">Shop</option>
            <option value="service">Service</option>
          </select>
        </div>
        <div className="stack" style={{ marginBottom: 16 }}>
          <div className="info">Click on the map to add a {addingLabel} pin.</div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <h3 style={{ margin: '8px 0' }}>My pins</h3>
          <div className="stack">
            {myPins.map((p) => (
              <div key={p.id} className="card" style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{p.label} • {p.lat.toFixed(4)},{p.lng.toFixed(4)}</div>
                <button className="btn ghost" onClick={() => onDeletePin(p.id)}>Delete</button>
              </div>
            ))}
            {!myPins.length && <div className="info">No pins yet.</div>}
          </div>
        </div>

        <div>
          <h3 style={{ margin: '8px 0' }}>My favourites</h3>
          <div className="stack">
            {favorites.map((p) => (
              <div key={p.id} className="card" style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{p.label} • {p.lat.toFixed(4)},{p.lng.toFixed(4)}</div>
                <button className="btn ghost" onClick={() => onToggleFavorite(p)}>Unsave</button>
              </div>
            ))}
            {!favorites.length && <div className="info">No favourites yet.</div>}
          </div>
        </div>
      </aside>

      {/* Hover info bubble */}
      {hoverPin && (
        <div style={{ position: 'fixed', right: 340, top: 16, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{hoverPin.label.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Pinned by: {hoverPin.userId}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Coords: {hoverPin.lat.toFixed(4)}, {hoverPin.lng.toFixed(4)}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => onToggleFavorite(hoverPin)}>{isFav(hoverPin.id) ? 'Unsave' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

