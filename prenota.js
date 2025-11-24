/*Versione Funzionante*/
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


window.onload = function() {
  document.getElementById("userName").focus();
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
  showCustomAlert("Nessun brano selezionato. Torna alla pagina principale.");
//  alert("Nessun brano selezionato. Torna alla pagina principale.");
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





// Verifica se la canzone è già prenotata o sbloccata per errore
Promise.all([get(reservationsRef), get(lockedRef), get(configRef)]).then(
  ([resSnap, lockSnap, configSnap]) => {
    const reservations = resSnap.exists() ? resSnap.val() : [];
    const alreadyReserved = reservations.some((r) => r.song === song);
    const locked = lockSnap.exists();
    maxPrenotazioni = configSnap.exists() ? configSnap.val().maxPrenotazioni || 25 : 25;

    if (!locked || alreadyReserved) {
      showCustomAlert("Il brano non è disponibile.");
      //alert("Il brano non è disponibile.");
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
    showCustomAlert("Qualcuno ha già prenotato con questo nome!😓​ <h4 class='alert-second'>✨Rendi unico il tuo nome in modo che possiamo chiamarti senza fraintendimenti✨ </h4>");
    //alert("Qualcuno ha già prenotato con questo nome!");
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
//countdown Annulla prenotazione

let seconds= 120;
const countdownInterval = setInterval(() => {
      seconds--;
      
      if (seconds === 0) {
        clearInterval(countdownInterval);
        window.location.href = "home.html";
        sessionStorage.removeItem("selectedSong");
        setTimeout(() => {
        
        
        }, 100);
      }
    }, 1000);


/*function checkMaxPrenotazioniLive() {
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
}*/

// dentro prenota.js — funzione checkMaxPrenotazioniLive (sostituisci la logica di redirect esistente)
function checkMaxPrenotazioniLive() {
  const unsubscribe = onValue(reservationsRef, async (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : [];
    // Se non ci sono prenotazioni non c'è problema
    if (data.length < 1) {
      return;
    }

    // Se la lunghezza raggiunge o supera il max conosciuto, confermiamo leggendo la config aggiornata
    if (data.length >= maxPrenotazioni) {
      // recupera valore aggiornato dal DB (evita la race con config onValue)
      try {
        const configSnap = await get(configRef);
        const actualMax = configSnap.exists() ? (configSnap.val().maxPrenotazioni || 25) : 25;

        const currentUserName = sessionStorage.getItem("userName");
        const validData = data.filter(r => r && r.name);
        const alreadyThere = validData.find(r => r.name === currentUserName);

        if (validData.length >= actualMax && !alreadyThere && !window.location.href.includes("editor=true")) {
          // reindirizza con una piccola delay se necessario
          setTimeout(() => {
            window.location.href = "max.html";
          }, 500);
        } else {
          // Se invece non supera il max effettivo non fare nulla (ferma il redirect)
          // e tieni attivo il listener
        }
      } catch (err) {
        console.error("Errore leggendo config per confermare maxPrenotazioni:", err);
        // in caso di errore di rete: preferisco NON reindirizzare gli utenti in modo da non bloccare l'accesso
      }
    }
  });

  return unsubscribe;
}



onValue(configRef, (snapshot) => {
  if (snapshot.exists()) {
    const config = snapshot.val();
    maxPrenotazioni = config.maxPrenotazioni || 25;
  }
});

function showCustomAlert(message, options = {}) {
  const modal = document.getElementById("customAlertModal");
  const msgBox = document.getElementById("customAlertMessage");

  msgBox.innerHTML = message;
  modal.classList.remove("hidden");


  function handleEnterAlert(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      modal.classList.add("hidden");
      if (typeof options.onClose === "function") options.onClose();
      document.removeEventListener("keydown", handleEnterAlert);
    }
  }
document.addEventListener("keydown", handleEnterAlert);


  const buttons = modal.querySelectorAll(".close-alert");
  const shouldShowButtons = options.buttons !== false;

  buttons.forEach(btn => {
    btn.style.display = shouldShowButtons ? "inline-block" : "none";
    btn.onclick = () => {
      modal.classList.add("hidden");
      if (typeof options.onClose === "function") options.onClose();
    };
  });

  document.addEventListener("mousedown", function handleOutsideClick(event) {
    if (
      !modal.classList.contains("hidden") &&
      !modal.querySelector(".modal-content").contains(event.target) &&
      shouldShowButtons
    ) {
      modal.classList.add("hidden");
      if (typeof options.onClose === "function") options.onClose();
      document.removeEventListener("mousedown", handleOutsideClick);
    }
  });
}



checkMaxPrenotazioniLive();

