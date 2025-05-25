// waiting.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
import { database, goOffline, goOnline } from './firebase.js';

let inactivityTimer;
let isConnected = true;

import { registraPresenzaOnline } from "./presenza.js";

registraPresenzaOnline();


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
  inactivityTimer = setTimeout(disconnectAfterInactivity, 10800 * 1000);
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

const userName = sessionStorage.getItem("userName");
const waitingMsg = document.getElementById("waitingMsg");
const cancelBtn = document.getElementById("cancelSlotBtn");

const resRef = ref(db, "reservations");
const configRef = ref(db, "config");

let reservations = [];
let currentIndex = 0;
let annullaLimite = -1;

onValue(resRef, (snapshot) => {
  reservations = snapshot.exists() ? snapshot.val() : [];
  updateStatus();
});

onValue(configRef, (snapshot) => {
  const config = snapshot.val();
  currentIndex = config?.branoCorrente || 0;
  annullaLimite = config?.annullaLimite || 0;
  updateStatus();
});

function updateStatus() {
  const filteredReservations = reservations.filter(r => r && r.name);
  const index = filteredReservations.findIndex(r => r.name === userName);
  const user = index >= 0 ? filteredReservations[index] : undefined;

  if (!user) {
    waitingMsg.innerHTML = "Prenotazione non trovata.<br><em>Verrai reindirizzato alla pagina iniziale tra <span id='countdown'>3</span> secondi...</em>";
    let seconds = 3;
    const countdownSpan = document.getElementById("countdown");
    const countdown = setInterval(() => {
      seconds--;
      countdownSpan.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(countdown);
        window.location.href = "home.html";
        setTimeout(() => {
          sessionStorage.removeItem("userName");
          sessionStorage.removeItem("songToBook");
        }, 100);
      }
    }, 1000);
    return;
  }

  const diff = index - (currentIndex - 1);

  if (diff > 1) {
    waitingMsg.innerHTML = `<strong>Preparati a cantare:</strong> ${user.song}<br>Mancano ${diff} brani al tuo turno.`;
  } else if (diff === 1) {
    waitingMsg.innerHTML = `<strong>Preparati a cantare:</strong> ${user.song}<br>Manca 1 brano al tuo turno.`;
  } else if (diff === 0) {
    waitingMsg.innerHTML = `<strong>Preparati a cantare:</strong> ${user.song}<br>🎤✨ È il tuo turno! ✨`;
  } else {
    waitingMsg.innerHTML = `<strong>Complimenti sei stato un talento a cantare:</strong> ${user.song}<br><em>Adesso verrai reindirizzato alla pagina iniziale tra <span id="countdown">3</span> secondi...</em>`;
    let seconds = 3;
    const countdownSpan = document.getElementById("countdown");
    const countdownInterval = setInterval(() => {
      seconds--;
      countdownSpan.textContent = seconds;
      if (seconds === 0) {
        clearInterval(countdownInterval);
        window.location.href = "home.html";
        setTimeout(() => {
          sessionStorage.removeItem("userName");
          sessionStorage.removeItem("songToBook");
        }, 100);
      }
    }, 1000);
  }
}

cancelBtn.onclick = () => {
  const filtered = reservations.filter(r => r && r.name);
  const index = filtered.findIndex(r => r.name === userName);
  const diff = index - currentIndex;

  if (diff < annullaLimite) {
    alert(`Non puoi annullare la prenotazione: mancano solo ${diff + 1} brani.`);
    return;
  }

  if (!confirm("Vuoi annullare la prenotazione?")) return;

  const originalIndex = reservations.findIndex(r => r && r.name === userName);
  if (originalIndex !== -1) {
    reservations.splice(originalIndex, 1);
    set(resRef, reservations);
    window.location.href = "home.html";
    setTimeout(() => {
      sessionStorage.removeItem("userName");
      sessionStorage.removeItem("songToBook");
    }, 100);
  }
};