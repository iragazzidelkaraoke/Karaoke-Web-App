


// IMPORTA Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, update} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";

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




// CONFIGURAZIONE
const firebaseConfig = {
  apiKey: "AIzaSyAbiGcVbznmRf0m-xPlIAtIkAQqMaCVHDk",
  authDomain: "karaoke-live.firebaseapp.com",
  databaseURL: "https://karaoke-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karaoke-live",
  storageBucket: "karaoke-live.firebasestorage.app",
  messagingSenderId: "268291410744",
  appId: "1:268291410744:web:4cb66c45d586510b440fcd"
};

// INIZIALIZZA FIREBASE
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
//const isEditor = window.location.href.includes("editor=true");

let maxPrenotazioniDaDb = 25;
let prenotazioniDaDb = [];

function generaTokenCasuale() {
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

document.getElementById("generaToken").addEventListener("click", () => {
  const conferma = confirm("Sei sicuro di voler generare un nuovo token?\nTutti gli utenti con il vecchio token perderanno l'accesso.");

  if (!conferma) return;

  const nuovoToken = generaTokenCasuale();

  set(ref(db, 'serata'), {
    attiva: true,
    token: nuovoToken
  })
    .then(() => {
      alert("Nuovo token generato: " + nuovoToken);
    })
    .catch((error) => {
      console.error("Errore nell'aggiornamento del token:", error);
    });
});


// Prima controlla subito se superato il limite
Promise.all([
  get(ref(db, "config")),
  get(ref(db, "reservations"))
]).then(([configSnap, reservationsSnap]) => {
  if (configSnap.exists()) {
    maxPrenotazioniDaDb = configSnap.val().maxPrenotazioni || 25;
  }

  if (reservationsSnap.exists()) {
    prenotazioniDaDb = reservationsSnap.val();
  }


  // ✅ SOLO se NON è stato fatto il redirect:
  document.body.style.visibility = "visible";  
});

// REFERENZE AI DATI
const songsRef = ref(db, 'songs');
const reservationsRef = ref(db, 'reservations');
const configRef = ref(db, 'config');


let maxPrenotazioni = 25;
let prenotazioni = [];
let canzoni = [];
let selectedSong = null;
let editorMode = false;
let branoCorrente = 0;
let currentUserName = null;
let bloccaRender = false;


document.addEventListener("DOMContentLoaded", () => {






  //implemento di firebase

  
  




  const loginEditor = document.getElementById("cogEditor");

  //const reservationForm = document.getElementById("reservationForm");
  const songSection = document.getElementById("songSection");
  
  //const cancelReservation = document.getElementById("cancelReservation");
  const infoSection = document.getElementById("infoSection");
  const frontSign = document.getElementById("prenotaLaTuaCanzone");
  //const maxReached = document.getElementById("maxReached");

  const waitingSection = document.getElementById("waitingSection");
  const waitingMsg = document.getElementById("waitingMsg");
  const cancelSlotBtn = document.getElementById("cancelSlotBtn");

 
  const newSongInput = document.getElementById("newSongInput");
  const addSongBtn = document.getElementById("addSongBtn");
  const editableSongList = document.getElementById("editableSongList");
  const resetBtn = document.getElementById("resetBtn");
  const downloadCSVBtn = document.getElementById("downloadCSVBtn");

  const currentSongInput = document.getElementById("currentSongInput");
  const nextSongBtn = document.getElementById("nextSongBtn");
  const prevSongBtn = document.getElementById("prevSongBtn");
  const annullaLimiteInput = document.getElementById("annullaLimite");
  const maxPrenotazioniInput = document.getElementById("maxPrenotazioniInput");
  const editorTableBody = document.querySelector("#editorTable tbody");
  const revealBtn = document.getElementById("revealEditBtn");
  const hideBtn = document.getElementById("hideEditBtn");
  const editableTable = document.getElementById("editableTableReveal");
  

  //cost search and filter bar
  const searchBar = document.getElementById("filterBars");

  







 




  // DATI DA FIREBASE


onValue(songsRef, (snapshot) => {
  canzoni = snapshot.exists() ? snapshot.val() : [];
  renderEditorList();
});
     
     


onValue(reservationsRef, snapshot => {
  prenotazioni = [];

  if (snapshot.exists()) {
    snapshot.forEach(child => {
      const data = child.val();
      prenotazioni.push({
        id: child.key,        // 👈 aggiungiamo l'id Firebase
        name: data.name,
        song: data.song
      });
    });
  }

  renderEditorList();   // ✅ aggiorna la tabella
  updateWaitingMsg();
});


     
     onValue(configRef, snapshot => {
  if (snapshot.exists()) {
    const config = snapshot.val();
    maxPrenotazioni = config.maxPrenotazioni || 25;
    branoCorrente = config.branoCorrente || 0;
    annullaLimiteInput.value = config.annullaLimite || 0;
    maxPrenotazioniInput.value = maxPrenotazioni;
    updateCurrentSongIndexDisplay();
    updateWaitingMsg();
  }
});


      maxPrenotazioniInput.addEventListener("change", save);
  annullaLimiteInput.addEventListener("change", save);




 

  function updateCurrentSongIndexDisplay() {
    currentSongInput.value = branoCorrente;
  }


function save() {
  const annullaLimite = parseInt(annullaLimiteInput.value) || 0;
  maxPrenotazioni = parseInt(maxPrenotazioniInput.value) || 25;
  set(ref(db, "songs"), canzoni);
  set(ref(db, "reservations"), prenotazioni);
  set(ref(db, "config"), {
    maxPrenotazioni,
    branoCorrente,
    annullaLimite
  });
  
}









  function renderEditorList() {
    editableSongList.innerHTML = "";

    // Ordina le canzoni: prenotate prima, non prenotate dopo
    const prenotate = prenotazioni.map(p => p.song);
    const nonPrenotate = canzoni.filter(song => !prenotate.includes(song));
    //canzoni = prenotate.concat(nonPrenotate).filter((v, i, a) => a.indexOf(v) === i);
    canzoni = [...new Set(prenotate.concat(nonPrenotate))];


    canzoni.forEach((song, index) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${index + 1}.</strong> ${song}`;
      editableSongList.appendChild(li);
    });

    renderEditorTable();
    updateCurrentSongIndexDisplay();
  }

function renderEditorTable() {
  editorTableBody.innerHTML = "";
  canzoni.forEach((song, index) => {
    const row = document.createElement('tr');

    const indexCell = document.createElement("td");
    indexCell.textContent = index + 1;

    const songCell = document.createElement("td");
    songCell.textContent = song;

    const userCell = document.createElement("td");
    const user = prenotazioni.find(p => p.song === song);
    userCell.textContent = user ? user.name : "";

    const actionCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.textContent = "☰";
    editBtn.classList.add("btn", "btn-secondary");
    editBtn.style.padding = "2px 8px";
    editBtn.addEventListener("click", () => {
      apriMenuModifica(index, song, user ? user.name : null);
    });
    actionCell.appendChild(editBtn);

    row.appendChild(indexCell);
    row.appendChild(songCell);
    row.appendChild(userCell);
    row.appendChild(actionCell);

    editorTableBody.appendChild(row);
  });
}


function apriMenuModifica(index, branoCorrente, utenteCorrente) {
  const popup = document.getElementById("popupModal");
  const popupEditName = document.getElementById("popupEditName");

  const popupSongNameInput = document.getElementById("popupSongName");
  const popupSaveNameBtn = document.getElementById("popupSaveName");
  const popupCancelReservationBtn = document.getElementById("popupCancelReservation");
  const popupRemoveSongBtn = document.getElementById("popupRemoveSong");
  const popupCloseBtn = document.getElementById("popupClose");

  // Mostra il popup
  popup.classList.remove("hidden");
  // Mostra la sezione modifica nome e nasconde quella con i bottoni
  popupEditName.classList.remove("hidden");


  popupSongNameInput.value = branoCorrente;

  // Pulisci eventuali vecchi event listener per evitare duplicazioni
  popupSaveNameBtn.onclick = null;
  popupCancelReservationBtn.onclick = null;
  popupRemoveSongBtn.onclick = null;
  popupCloseBtn.onclick = null;

  // Salva nuovo nome
  popupSaveNameBtn.onclick = () => {
    const nuovoNome = popupSongNameInput.value.trim();
    if (nuovoNome && nuovoNome !== branoCorrente) {
      canzoni[index] = nuovoNome;

      const prenotazione = prenotazioni.find(p => p.song === branoCorrente);
      if (prenotazione) {
        prenotazione.song = nuovoNome;
        update(ref(db, `reservations/${prenotazione.id}`), { song: nuovoNome });
      }

      save();
      renderEditorList();
    }
    popup.classList.add("hidden");
  };


  // Annulla solo prenotazione
popupCancelReservationBtn.onclick = () => {
  const prenotazioneDaAnnullare = prenotazioni.find(p => p.song === branoCorrente);

  if (prenotazioneDaAnnullare) {
    // Rimuove dal database Firebase
    remove(ref(db, `reservations/${prenotazioneDaAnnullare.id}`))
      .then(() => {
        // Rimuove dall'array locale
        prenotazioni = prenotazioni.filter(p => p.id !== prenotazioneDaAnnullare.id);
        // Aggiorna la tabella editor
        renderEditorList();
      })
      .catch(error => {
        console.error("Errore durante la rimozione della prenotazione:", error);
      });
  }

  // Chiudi il popup
  popup.classList.add("hidden");
};


  // Rimuovi brano e prenotazione
  popupRemoveSongBtn.onclick = () => {
    const prenotazioneDaRimuovere = prenotazioni.find(p => p.song === branoCorrente);
    if (prenotazioneDaRimuovere) {
      remove(ref(db, `reservations/${prenotazioneDaRimuovere.id}`));
      prenotazioni.splice(prenotazioni.indexOf(prenotazioneDaRimuovere), 1);
    }
    canzoni.splice(index, 1);
    save();
    renderEditorList();
    popup.classList.add("hidden");
  };

  // Chiudi popup
  popupCloseBtn.onclick = () => {
    popup.classList.add("hidden");
  };
}





 
  addSongBtn.addEventListener("click", () => {
    const newSong = newSongInput.value.trim();
    if (newSong && !canzoni.includes(newSong)) {
      canzoni.push(newSong);
      save();
      newSongInput.value = "";
    }
  });

resetBtn.addEventListener("click", () => {
  const conferma = confirm("Sei sicuro di voler resettare tutte le prenotazioni?");
  if (conferma) {
    prenotazioni = [];
    branoCorrente = 0;
    remove(ref(db, "lockedSongs"))
      .then(() => {
        console.log("Brani bloccati rimossi con successo.");
      })
      .catch((error) => {
        console.error("Errore durante la rimozione dei brani bloccati:", error);
      });
    save();
    alert("Prenotazioni resettate.");
  }
});

  downloadCSVBtn.addEventListener("click", () => {
    const rows = [["Nome", "Brano"]];
    prenotazioni.forEach(p => rows.push([p.name, p.song]));
    const csvContent = "\uFEFF" + rows.map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prenotazioni.csv";
    a.click();
    URL.revokeObjectURL(url);
    
  });

new Sortable(editableSongList, {
  animation: 150,
  onEnd: () => {
    const updated = Array.from(editableSongList.children).map(li => {
      const raw = li.textContent.trim();
      return raw.replace(/^\d+\.\s*/, ""); // Rimuove l’indice numerico
    });
    canzoni = updated;
    save();                    // Salva sul database
    renderEditorList();        // 🔁 Rendi subito visibile l’aggiornamento
  }
});

  nextSongBtn.addEventListener("click", () => {
    branoCorrente++;
    save();
  });

  prevSongBtn.addEventListener("click", () => {
    if (branoCorrente > 0) branoCorrente--;
    save();
  });

  currentSongInput.addEventListener("change", () => {
    const val = parseInt(currentSongInput.value);
    if (!isNaN(val) && val >= 0) {
      branoCorrente = val;
      save();
    }
  });




  let currentUserName = null;
function showWaitingSection(userName) {
  currentUserName = userName;
  updateWaitingMsg();
  frontSign.classList.add("hidden");
  searchBar.classList.add("hidden");
 // reservationForm.classList.add("hidden");
  songSection.classList.add("hidden");
  //maxReached.classList.add("hidden");
  infoSection.classList.add("hidden");
  waitingSection.classList.remove("hidden");
  history.pushState({ waiting: true }, "", "");

window.onpopstate = function(event) {
  if (event.state && event.state.waiting) {
    const conferma = confirm("Sei sicuro di voler uscire dalla pagina di attesa? Potresti perdere gli aggiornamentila tua prenotazione.");
    if (!conferma) {
      history.pushState({ waiting: true }, "", "");
    } else {
      location.reload();
    }
  }
};

window.addEventListener("beforeunload", (e) => {
  if (waitingSection && !waitingSection.classList.contains("hidden")) {
    e.preventDefault();
    e.returnValue = "Stai per uscire dalla pagina. Potresti perdere la tua prenotazione.";
  }
});


}
function updateWaitingMsg() {
  if (!currentUserName) return;

  const user = prenotazioni.find(p => p.name === currentUserName);
  const pos = prenotazioni.findIndex(p => p.name === currentUserName);
  const diff = pos - branoCorrente;

  if (!user) return;

  const song = user.song;
  waitingMsg.innerHTML = `<strong>Preparati a cantare:</strong> ${song}<br>`;

  if (diff > 1) {
    waitingMsg.innerHTML += `Mancano ${diff} brani al tuo turno.`;
  } else if (diff === 1) {
    waitingMsg.innerHTML += `Manca 1 brano al tuo turno. Preparati!`;
  } else if (diff === 0) {
    waitingMsg.innerHTML += `✨ È il tuo turno! ✨`;
  } else {
    waitingMsg.innerHTML += `Hai già cantato!`;
    setTimeout(() => location.reload(), 3000);
  }

  // GESTIONE CANCELLAZIONE SLOT
  cancelSlotBtn.disabled = false;
  cancelSlotBtn.classList.remove("btn-disabled");

  cancelSlotBtn.onclick = () => {
    const annullaLimite = parseInt(annullaLimiteInput.value) || 0;

    if (diff < annullaLimite) {
      alert(`Non puoi annullare la prenotazione: mancano solo ${diff} brani.`);
      return;
    }

    const conferma = confirm("Sei sicuro di voler annullare la tua prenotazione?");
    if (!conferma) return;

    const i = prenotazioni.findIndex(p => p.name === currentUserName);
    if (i >= 0) {
      const songToRestore = prenotazioni[i].song;
      prenotazioni.splice(i, 1);
      save();

      // Rimetti il brano in fondo alla lista
      const indexToMove = canzoni.findIndex(c => c === songToRestore);
      if (indexToMove > -1) {
        const song = canzoni.splice(indexToMove, 1)[0];
        canzoni.push(song);
      }

      waitingSection.classList.add("hidden");
      location.reload();
    }
  };
}

  revealBtn.addEventListener("click", () => {
      editableTable.classList.remove("hidden");
      hideBtn.classList.remove("hidden");
      revealBtn.classList.add("hidden");
    });

    hideBtn.addEventListener("click", () => {
      editableTable.classList.add("hidden");
      hideBtn.classList.add("hidden");
      revealBtn.classList.remove("hidden");
    });
  


  
  annullaLimiteInput.addEventListener("change", () => {
      save(); // ogni volta che l’input cambia, salva la nuova config
    });
});