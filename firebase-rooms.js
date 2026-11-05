// REDLINE lobby list — Firebase Firestore.
// Only the public lobby list lives here; gameplay is peer-to-peer (PeerJS/WebRTC).
// Version is pinned to a released SDK (13.1.0). A non-existent version 404s and breaks the import.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDxPnuGlK2JbDzTDBm-fiOPocbzA8jn2O8",
  authDomain: "game-demo-onlineserver.firebaseapp.com",
  projectId: "game-demo-onlineserver",
  storageBucket: "game-demo-onlineserver.firebasestorage.app",
  messagingSenderId: "940646345208",
  appId: "1:940646345208:web:58bd0f53b5489a59b48e0d"
});

// Auto-detect long polling so lobbies still work on school/work networks that block WebChannel.
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
const rooms = collection(db, "rooms");

const MAX_PLAYERS = 3;
const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.trunc(Number(v)) || lo));

function cleanRoom(room) {
  const maxPlayers = clampInt(room.maxPlayers ?? MAX_PLAYERS, 1, MAX_PLAYERS);
  return {
    peerId: String(room.peerId),
    name: String(room.name || "REDLINE LOBBY").slice(0, 32),
    mode: String(room.mode || "coop").slice(0, 20),
    map: String(room.map || "RANDOM").slice(0, 32),
    players: clampInt(room.players ?? 1, 1, maxPlayers),
    maxPlayers,
    updatedAt: Date.now()
  };
}

// Last room this tab created. Heartbeats re-write the whole document, so a room
// that was deleted or expired is recreated instead of failing like updateDoc would.
let current = null;

export async function createRoom(room) {
  if (!room?.peerId) throw new Error("peerId required");
  const data = cleanRoom(room);
  current = data;
  await setDoc(doc(db, "rooms", data.peerId), data);
  return data;
}

export async function updateRoom(peerId, players, map) {
  if (!peerId) throw new Error("peerId required");
  if (!current || current.peerId !== peerId) throw new Error("room not registered");
  current = {
    ...current,
    players: clampInt(players, 1, current.maxPlayers),
    map: map ? String(map).slice(0, 32) : current.map,
    updatedAt: Date.now()
  };
  await setDoc(doc(db, "rooms", peerId), current);
}

export async function deleteRoom(peerId) {
  if (!peerId) return;
  if (current && current.peerId === peerId) current = null;
  await deleteDoc(doc(db, "rooms", peerId));
}

// Calls callback(list) with the newest rooms. The game hides stale/full rooms itself.
// Returns an unsubscribe function.
export function watchRooms(callback, onError) {
  const q = query(rooms, orderBy("updatedAt", "desc"), limit(30));
  return onSnapshot(
    q,
    snapshot => callback(snapshot.docs.map(d => d.data())),
    error => {
      console.error("Firestore lobby error:", error);
      if (onError) onError(error);
      else callback([]);
    }
  );
}
