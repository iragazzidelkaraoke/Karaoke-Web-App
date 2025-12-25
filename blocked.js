/* Prenotazioni in attesa di sblocco blocco */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
import { database, goOffline, goOnline } from './firebase.js';

import {
  normalizeBlocks,
  getEffectiveCap,
  getSongsRemainingToUnlock,
  countValidReservations,
  tryAutoUnlock,
} from './blocks.js';

let inactivityTimer;
let isConnected = true;

function disconnectAfterInactivity() {
  if (isConnected) {
    goOffline(database);
    isConnected = false;
  }
}

function reconnectOnActivity() {
  if (!isConnected) {
    goOnline(database);
    isConnected = true;
  }
}

function resetInactivityTimer() {
  reconnectOnActivity();
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(disconnectAfterInactivity, 60 * 1000);
}

window.addEventListener("mousemove", resetInactivityTimer);
window.addEventListener("mousedown", resetInactivityTimer);
window.addEventListener("keypress", resetInactivityTimer);
window.addEventListener("touchmove", resetInactivityTimer);
resetInactivityTimer();

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
const db = getDatabase(app);

const configRef = ref(db, "config");
const reservationsRef = ref(db, "reservations");

const waitingText = document.getElementById("waitingText");
const countdownText = document.getElementById("countdownText");
const stateText = document.getElementById("stateText");

let config = null;
let reservationsRaw = null;

function render() {
  if (!config || reservationsRaw === null) return;

  const blocks = normalizeBlocks(config);
  const totalMax = blocks.totalMax;
  const cap = getEffectiveCap(config);
  const count = countValidReservations(reservationsRaw);

  // Se la logica blocchi non è attiva, questa pagina non ha senso.
  if (!blocks.enabled) {
    window.location.replace("max.html");
    return;
  }

  // Se siamo all'ultimo blocco (cap == totalMax), la pagina corretta è max.html
  if (cap >= totalMax && count >= cap) {
    window.location.replace("max.html");
    return;
  }

  // Se si è liberato un posto (cancellazione) o è aumentato il cap, torna in home.
  if (count < cap) {
    stateText.innerHTML = "<em><strong>✨ Nuovi posti aperti! Reindirizzamento...</strong></em>";
    setTimeout(() => window.location.replace("home.html"), 1500);
    return;
  }

  // Auto-unlock: se siamo arrivati alla soglia, prova a sbloccare.
  const threshold = blocks.currentCap - blocks.unlockAhead;
  const branoCorrente = Number.parseInt(config.branoCorrente || 0, 10);
  if (blocks.currentCap < totalMax && branoCorrente >= threshold) {
    // Transaction-safe
    tryAutoUnlock(configRef).catch(() => {});
  }

  // Countdown (mancano N brani all'apertura)
  const remaining = getSongsRemainingToUnlock(config);
  waitingText.textContent = "Prenotazioni momentaneamente chiuse, si apriranno nuovi posti a breve.";
  countdownText.innerHTML = `<strong>Mancano ${remaining} brani</strong> all'apertura di nuovi posti.`;
  stateText.textContent = "";
}

onValue(configRef, (snap) => {
  config = snap.exists() ? snap.val() : null;
  render();
});

onValue(reservationsRef, (snap) => {
  reservationsRaw = snap.exists() ? snap.val() : [];
  render();
});
