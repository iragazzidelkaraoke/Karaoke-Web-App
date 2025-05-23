
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";


import { database, goOffline, goOnline } from './firebase.js';

let inactivityTimer;
let isConnected = true;

function disconnectAfterInactivity() {
  if (isConnected) {
    console.log("⛔ Utente inattivo: disconnessione da Firebase");
    goOffline(database);
    isConnected = false;
  }
}

function reconnectOnActivity() {
  if (!isConnected) {
    console.log("✅ Utente attivo: riconnessione a Firebase");
    goOnline(database);
    isConnected = true;
  }
}

function resetInactivityTimer() {
  reconnectOnActivity();
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(disconnectAfterInactivity, 10800 * 1000); // 3 ore
}



// Eventi che resettano il timer
window.addEventListener("mousemove", resetInactivityTimer);
window.addEventListener("mousedown", resetInactivityTimer);
window.addEventListener("keypress", resetInactivityTimer);
window.addEventListener("touchmove", resetInactivityTimer);

// Avvia il timer al primo caricamento
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

const userName = localStorage.getItem("userName");
const waitingMsg = document.getElementById("waitingMsg");
const cancelBtn = document.getElementById("cancelSlotBtn");

const resRef = ref(db, "reservations");
const configRef = ref(db, "config");

let reservations = [];
let currentIndex = 0;
let annullaLimite = 0;


async function getTokenAttivo() {
  try {
    const snapshot = await get(ref(db, 'serata/token'));
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.warn("Nessun token attivo trovato.");
      return null;
    }
  } catch (error) {
    console.error("Errore nel recupero del token:", error);
    return null;
  }
}

function verificaToken() {
  const tokenUtente = localStorage.getItem("tokenSerata");

  get(ref(db, 'serata')).then((snapshot) => {
    if (snapshot.exists()) {
      const datiSerata = snapshot.val();
      const tokenAttivo = datiSerata.token;
      const serataAttiva = datiSerata.attiva;

      if (!serataAttiva) {
        alert("Serata non attiva. Riprova più tardi.");
        window.location.href = "accesso_negato.html";
        return;
      }

      if (!tokenUtente) {
        // Primo accesso: salva il token
        localStorage.setItem("tokenSerata", tokenAttivo);
      } else if (tokenUtente !== tokenAttivo) {
        // Token vecchio → accesso negato
        alert("Accesso negato: token scaduto.");
        window.location.href = "accesso_negato.html";
        return;
      }

      // Accesso consentito
      console.log("Accesso valido con token:", tokenAttivo);

    } else {
      console.error("Nessuna serata trovata nel DB.");
    }
  }).catch((error) => {
    console.error("Errore nel controllo del token:", error);
  });
}

window.addEventListener("load", verificaToken);

getTokenAttivo().then(tokenAttivo => {
  localStorage.setItem('tokenSerata', tokenAttivo);
  // Prosegui con il caricamento della pagina
});


onValue(resRef, (snapshot) => {
  reservations = snapshot.exists() ? snapshot.val() : [];
  updateStatus();
});

onValue(configRef, (snapshot) => {
  const config = snapshot.val();
  currentIndex = config?.branoCorrente || 0;
  annullaLimite = config?.annullaLimite || 0; // ✅ AGGIUNTO
  updateStatus();
});

function updateStatus() {
  const index = reservations.findIndex(r => r.name === userName);
  const user = reservations.find(r => r.name === userName);

  //  Caso 1: Prenotazione non trovata
  if (!user) {
    waitingMsg.innerHTML = "Prenotazione non trovata.<br><em>Verrai reindirizzato alla pagina iniziale tra <span id='countdown'>3</span> secondi...</em>";

    let seconds = 3;
    const countdownSpan = document.getElementById("countdown");

    const countdown = setInterval(() => {
      seconds--;
      countdownSpan.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(countdown);
        localStorage.removeItem("userName");
        localStorage.removeItem("songToBook");
        window.location.href = "index.html";
      }
    }, 1000);

    return;
  }

  // ✅ Caso 2: Prenotazione valida
  const diff = index - (currentIndex - 1);


  if (diff > 1) {
    waitingMsg.innerHTML = "<strong>Preparati a cantare:</strong> " + user.song + "<br>";
    waitingMsg.innerHTML += `Mancano ${diff} brani al tuo turno.`;
  } else if (diff === 1) {
    waitingMsg.innerHTML = "<strong>Preparati a cantare:</strong> " + user.song + "<br>";
    waitingMsg.innerHTML += "Manca 1 brano al tuo turno.";
  } else if (diff === 0) {
    waitingMsg.innerHTML = "<strong>Preparati a cantare:</strong> " + user.song + "<br>";
    waitingMsg.innerHTML += "🎤✨ È il tuo turno! ✨";
  } else {
    // ✅ Caso 3: Hai già cantato
    waitingMsg.innerHTML = "<strong>Complimenti sei stato un talento a cantare:</strong> " + user.song + "<br>";
    let seconds = 3;
    waitingMsg.innerHTML += `<em>Adesso verrai reindirizzato alla pagina iniziale tra <span id="countdown">${seconds}</span> secondi...</em>`;

    const countdownSpan = document.getElementById("countdown");
    const countdownInterval = setInterval(() => {
      seconds--;
      countdownSpan.textContent = seconds;
      if (seconds === 0) {
        clearInterval(countdownInterval);
        localStorage.removeItem("userName");
        localStorage.removeItem("songToBook");  
        window.location.href = "index.html";
      }
    }, 1000);
  }
}


cancelBtn.onclick = () => {
  const index = reservations.findIndex(r => r.name === userName);
  const diff = index - currentIndex;

  if (diff < annullaLimite) {
    alert(`Non puoi annullare la prenotazione: mancano solo ${diff} brani.`);
    return;
  }

  if (!confirm("Vuoi annullare la prenotazione?")) return;

  if (index !== -1) {
    reservations.splice(index, 1);
    set(resRef, reservations);
    localStorage.removeItem("userName");
    localStorage.removeItem("songToBook");
    window.location.href = "index.html";
  }
};
