import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

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

function cleanRoom(room) {
  const maxPlayers = Math.min(
    3,
    Math.max(1, Number(room.maxPlayers) || 3)
  );

  return {
    peerId: String(room.peerId),
    name: String(room.name || "REDLINE LOBBY").slice(0, 32),
    mode: String(room.mode || "coop").slice(0, 20),
    map: String(room.map || "RANDOM").slice(0, 32),
    players: Math.min(
      maxPlayers,
      Math.max(1, Number(room.players) || 1)
    ),
    maxPlayers,
    updatedAt: Date.now()
  };
}

export async function createRoom(room) {
  if (!room?.peerId) {
    throw new Error("peerId required");
  }

  const data = cleanRoom(room);

  await setDoc(doc(db, "rooms", data.peerId), data);

  return data;
}

export async function updateRoom(peerId, players) {
  if (!peerId) {
    throw new Error("peerId required");
  }

  await updateDoc(doc(db, "rooms", peerId), {
    players: Math.max(1, Math.min(3, Number(players) || 1)),
    updatedAt: Date.now()
  });
}

export async function deleteRoom(peerId) {
  if (!peerId) return;

  await deleteDoc(doc(db, "rooms", peerId));
}

export function watchRooms(callback) {
  return onSnapshot(
    rooms,
    snapshot => {
      const now = Date.now();

      const list = snapshot.docs
        .map(item => item.data())
        .filter(room =>
          now - Number(room.updatedAt || 0) <= 15000
        );

      callback(list);
    },
    error => {
      console.error("Firestore lobby error:", error);
      callback([]);
    }
  );
}
