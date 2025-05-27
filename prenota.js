import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";


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
  inactivityTimer = setTimeout(disconnectAfterInactivity, 1080 * 1000); // 30 min
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

const isEditor = window.location.href.includes("editor=true");

const song = sessionStorage.getItem("selectedSong");

if (!song) {
  alert("Nessun brano selezionato. Torna alla pagina principale.");
  window.location.href = "home.html";
}

const songTitle = document.getElementById("songTitle");
const bookingForm = document.getElementById("bookingForm");
const cancelBtn = document.getElementById("cancelBtn");

const reservationsRef = ref(db, "reservations");
const lockedRef = ref(db, "lockedSongs/" + song);
const configRef = ref(db, "config");

let maxPrenotazioni = 25;

document.getElementById("songTitle").textContent = " " + song;


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
  const tokenUtente = sessionStorage.getItem("tokenSerata");

  get(ref(db, 'serata')).then((snapshot) => {
    if (snapshot.exists()) {
      const datiSerata = snapshot.val();
      const tokenAttivo = datiSerata.token;
      const serataAttiva = datiSerata.attiva;

      if (!serataAttiva) {
        window.location.href = "accesso_negato.html";
        return;
      }

      if (!tokenUtente) {
        // Primo accesso: salva il token
        sessionStorage.setItem("tokenSerata", tokenAttivo);
      } else if (tokenUtente !== tokenAttivo) {
        // Token vecchio → accesso negato
        
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
  sessionStorage.setItem('tokenSerata', tokenAttivo);
  // Prosegui con il caricamento della pagina
});




// Verifica se la canzone è già prenotata o sbloccata per errore
Promise.all([get(reservationsRef), get(lockedRef), get(configRef)]).then(
  ([resSnap, lockSnap, configSnap]) => {
    const reservations = resSnap.exists() ? resSnap.val() : [];
    const alreadyReserved = reservations.some((r) => r.song === song);
    const locked = lockSnap.exists();
    maxPrenotazioni = configSnap.exists() ? configSnap.val().maxPrenotazioni || 25 : 25;

    if (!locked || alreadyReserved) {
      alert("Il brano non è disponibile.");
      window.location.href = "home.html";
    }

    // Se superato limite prenotazioni
    if (reservations.length >= maxPrenotazioni && !isEditor) {
      window.location.href = "max.html";
    }
  }
);

// Gestione invio prenotazione
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("userName").value.trim();
  if (!name) return;

  const snapshot = await get(reservationsRef);
  const reservations = snapshot.exists() ? snapshot.val() : [];

const validReservations = reservations.filter(r => r && r.name);
if (validReservations.find(r => r.name === name)) {
    alert("Qualcuno ha già prenotato con questo nome!");
    return;
  }

  reservations.push({ name, song });

  
  await set(reservationsRef, reservations);
await remove(lockedRef);

sessionStorage.setItem("userName", name);


setTimeout(() => {
  window.location.href = "waiting.html";
}, 0);



});

// Sblocco automatico su chiusura pagina
window.addEventListener("beforeunload", () => {
  remove(lockedRef);
});

// Tasto Annulla prenotazione
cancelBtn?.addEventListener("click", () => {
  remove(lockedRef).then(() => {
    sessionStorage.removeItem("selectedSong");
    window.location.href = "home.html";
  });
});


function checkMaxPrenotazioniLive() {
  const unsubscribe = onValue(reservationsRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : [];
    if (data.length >= maxPrenotazioni) {
      //  Se è già stato prenotato da questo utente, NON reindirizzare
      const currentUserName = sessionStorage.getItem("userName");
const validData = data.filter(r => r && r.name);
const alreadyThere = validData.find(r => r.name === currentUserName);
      if (!alreadyThere && !window.location.href.includes("editor=true")) {
        setTimeout(() => {
          window.location.href = "max.html";
        }, 500);
        
      } else {
        unsubscribe(); //  Disattiva il listener dopo la prenotazione
      }
    }
  });
}


onValue(configRef, (snapshot) => {
  if (snapshot.exists()) {
    const config = snapshot.val();
    maxPrenotazioni = config.maxPrenotazioni || 25;
  }
});



checkMaxPrenotazioniLive();

