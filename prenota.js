import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";

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

const song = localStorage.getItem("selectedSong");

if (!song) {
  alert("Nessun brano selezionato. Torna alla pagina principale.");
  window.location.href = "index.html";
}

const songTitle = document.getElementById("songTitle");
const bookingForm = document.getElementById("bookingForm");
const cancelBtn = document.getElementById("cancelBtn");

const reservationsRef = ref(db, "reservations");
const lockedRef = ref(db, "lockedSongs/" + song);
const configRef = ref(db, "config");

let maxPrenotazioni = 25;

document.getElementById("songTitle").textContent = " " + song;

// Verifica se la canzone è già prenotata o sbloccata per errore
Promise.all([get(reservationsRef), get(lockedRef), get(configRef)]).then(
  ([resSnap, lockSnap, configSnap]) => {
    const reservations = resSnap.exists() ? resSnap.val() : [];
    const alreadyReserved = reservations.some((r) => r.song === song);
    const locked = lockSnap.exists();
    maxPrenotazioni = configSnap.exists() ? configSnap.val().maxPrenotazioni || 25 : 25;

    if (!locked || alreadyReserved) {
      alert("Il brano non è disponibile.");
      window.location.href = "index.html";
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

  if (reservations.find((r) => r.name === name)) {
    alert("Qualcuno ha già prenotato con questo nome!");
    return;
  }

  reservations.push({ name, song });

  
  await set(reservationsRef, reservations);
await remove(lockedRef);

localStorage.setItem("userName", name);

// Delay di 5 secondi prima del redirect a waiting
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
    localStorage.removeItem("selectedSong");
    window.location.href = "index.html";
  });
});


function checkMaxPrenotazioniLive() {
  const unsubscribe = onValue(reservationsRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : [];
    if (data.length >= maxPrenotazioni) {
      // ⚠️ Se è già stato prenotato da questo utente, NON reindirizzare
      const currentUserName = localStorage.getItem("userName");
      const alreadyThere = data.find(r => r.name === currentUserName);
      if (!alreadyThere && !window.location.href.includes("editor=true")) {
        setTimeout(() => {
          window.location.href = "max.html";
        }, 500);
        
      } else {
        unsubscribe(); // 🛑 Disattiva il listener dopo la prenotazione
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

