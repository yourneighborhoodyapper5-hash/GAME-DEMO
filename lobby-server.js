import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDxPnuGlK2JbDzTDBm-fiOPocbzA8jn2O8",
  authDomain: "game-demo-onlineserver.firebaseapp.com",
  projectId: "game-demo-onlineserver",
  storageBucket: "game-demo-onlineserver.firebasestorage.app",
  messagingSenderId: "940646345208",
  appId: "1:940646345208:web:58bd0f53b5489a59b48e0d"
});

const db = getFirestore(app);
const rooms = collection(db, "rooms");

const cleanRoom = room => ({
  peerId: String(room.peerId),
  name: String(room.name || "REDLINE LOBBY").slice(0, 32),
  mode: String(room.mode || "coop").slice(0, 20),
  map: String(room.map || "RANDOM").slice(0, 32),
  players: Math.max(1, Number(room.players) || 1),
  maxPlayers: Math.min(3, Math.max(1, Number(room.maxPlayers) || 3)),
  updatedAt: Date.now()
});

export async function createRoom(room) {
  if (!room?.peerId) throw new Error("peerId required");

  const data = cleanRoom(room);

  if (data.players > data.maxPlayers) {
    data.players = data.maxPlayers;
  }

  await setDoc(doc(db, "rooms", data.peerId), data);
  return data;
}

export async function updateRoom(peerId, players) {
  if (!peerId) throw new Error("peerId required");

  const room = doc(db, "rooms", peerId);

  await updateDoc(room, {
    players: Math.max(1, Number(players) || 1),
    updatedAt: Date.now()
  });
}

export async function deleteRoom(peerId) {
  if (!peerId) throw new Error("peerId required");

  await deleteDoc(doc(db, "rooms", peerId));
}

export function watchRooms(callback) {
  const cutoff = Date.now() - 15000;

  const activeRooms = query(
    rooms,
    where("updatedAt", ">", cutoff)
  );

  return onSnapshot(
    activeRooms,
    snapshot => {
      const list = snapshot.docs.map(item => item.data());
      callback(list);
    },
    error => {
      console.error("Room listener error:", error);
      callback([]);
    }
  );
}
