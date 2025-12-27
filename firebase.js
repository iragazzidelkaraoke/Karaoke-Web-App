/*import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, goOffline, goOnline } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAbiGcVbznmRf0m-xPlIAtIkAQqMaCVHDk",
  authDomain: "karaoke-live.firebaseapp.com",
  databaseURL: "https://karaoke-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karaoke-live",
  storageBucket: "karaoke-live.firebasestorage.app",
  messagingSenderId: "268291410744",
  appId: "1:268291410744:web:4cb66c45d586510b440fcd"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// ✅ Login anonimo subito dopo init
signInAnonymously(auth)
  .then(() => console.log("🔐 Login anonimo avvenuto"))
  .catch((error) => console.error("❌ Errore login anonimo:", error));

export { database, goOffline, goOnline };
*/

// firebase.js — unica fonte di verità (SDK 11.7.3)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, goOffline, goOnline } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAbiGcVbznmRf0m-xPlIAtIkAQqMaCVHDk",
  authDomain: "karaoke-live.firebaseapp.com",
  databaseURL: "https://karaoke-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karaoke-live",
  storageBucket: "karaoke-live.firebasestorage.app",
  messagingSenderId: "268291410744",
  appId: "1:268291410744:web:4cb66c45d586510b440fcd"
};

// ✅ evita "Firebase App named '[DEFAULT]' already exists"
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getDatabase(app);

// ✅ alias per compatibilità col tuo codice (tu usi "database" per goOffline/goOnline)
export const database = db;

export { goOffline, goOnline };

// ✅ mantiene il comportamento “funzionante” che avevi prima
const auth = getAuth(app);
let anonPromise = null;

export function ensureAnonAuth() {
  if (!anonPromise) {
    anonPromise = signInAnonymously(auth)
      .then(() => console.log("🔐 Login anonimo avvenuto"))
      .catch((error) => {
        console.error("❌ Errore login anonimo:", error);
      });
  }
  return anonPromise;
}

// avvia subito login anonimo
ensureAnonAuth();
