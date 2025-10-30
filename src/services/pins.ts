import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase/client';

export type PinLabel = 'shop' | 'service';
export type PinDoc = {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  label: PinLabel;
  createdAt?: any;
};

const pinsCol = collection(db, 'pins');

export async function createPin(userId: string, lat: number, lng: number, label: PinLabel) {
  const ref = await addDoc(pinsCol, { userId, lat, lng, label, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deletePin(pinId: string, userId: string) {
  const d = doc(db, 'pins', pinId);
  const snap = await getDoc(d);
  if (!snap.exists()) return;
  const data = snap.data() as any;
  if (data.userId !== userId) throw new Error('Not authorized');
  await deleteDoc(d);
}

export function listenAllPins(cb: (pins: PinDoc[]) => void) {
  const q = query(pinsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: PinDoc[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
    cb(list);
  });
}

export async function listMyPins(userId: string): Promise<PinDoc[]> {
  const q = query(pinsCol, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

// Favorites are stored under users/{uid}/favoritePins/{pinId}
export function favoriteDoc(userId: string, pinId: string) {
  return doc(db, 'users', userId, 'favoritePins', pinId);
}

export async function favoritePin(userId: string, pin: PinDoc) {
  await setDoc(favoriteDoc(userId, pin.id), {
    pinId: pin.id,
    lat: pin.lat,
    lng: pin.lng,
    label: pin.label,
    ownerId: pin.userId,
    createdAt: serverTimestamp(),
  });
}

export async function unfavoritePin(userId: string, pinId: string) {
  await deleteDoc(favoriteDoc(userId, pinId));
}

export async function listFavorites(userId: string): Promise<PinDoc[]> {
  const favsCol = collection(db, 'users', userId, 'favoritePins');
  const snap = await getDocs(favsCol);
  return snap.docs.map((d) => ({
    id: (d.data() as any).pinId,
    userId: (d.data() as any).ownerId,
    lat: (d.data() as any).lat,
    lng: (d.data() as any).lng,
    label: (d.data() as any).label,
  }));
}

