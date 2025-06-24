


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

function showCustomConfirm(message, onConfirm, onCancel = () => {}) {
  const modal = document.getElementById("customConfirmModal");
  const msgBox = document.getElementById("customConfirmMessage");
  const yesBtn = document.getElementById("confirmYesBtn");

  msgBox.innerHTML = message;
  modal.classList.remove("hidden");

  function handleEnterConfirm(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      modal.classList.add("hidden");
      if (typeof onConfirm === "function") onConfirm();
      document.removeEventListener("keydown", handleEnterConfirm);
    } else if (e.key === "Escape") {
      e.preventDefault();
      modal.classList.add("hidden");
      if (typeof onCancel === "function") onCancel();
      document.removeEventListener("keydown", handleEnterConfirm);
    }
  }

  document.addEventListener("keydown", handleEnterConfirm);

  document.querySelectorAll(".close-confirm").forEach(btn => {
    btn.onclick = () => {
      modal.classList.add("hidden");
      if (typeof onCancel === "function") onCancel();
      document.removeEventListener("keydown", handleEnterConfirm);
    };
  });

  yesBtn.onclick = () => {
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm();
    document.removeEventListener("keydown", handleEnterConfirm);
  };
}


function generaTokenCasuale() {
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

document.getElementById("generaToken").addEventListener("click", () => {
  showCustomConfirm(
    "Sei sicuro di voler generare un nuovo token?<br><small>Tutti gli utenti con il vecchio token perderanno l'accesso.</small>",
    () => {
      const nuovoToken = generaTokenCasuale();

      set(ref(db, 'serata'), {
        attiva: true,
        token: nuovoToken
      })
        .then(() => {
          showCustomAlert("Nuovo token generato:<br><strong>" + nuovoToken + "</strong>");
          new BroadcastChannel('token_channel').postMessage({ tipo: 'nuovo_token' });
        })
        .catch((error) => {
          console.error("Errore nell'aggiornamento del token:", error);
          showCustomAlert("Errore durante la generazione del token.");
        });
    }
  );
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
let hiddenSongs = []
let selectedSong = null;
let editorMode = false;
let branoCorrente = 0;
let branoCorrenteInModifica = null;
let currentUserName = null;
let bloccaRender = false;
let mostraSoloNascosti = false;



document.addEventListener("DOMContentLoaded", () => {






  //implemento di firebase
  const loginEditor = document.getElementById("cogEditor");
  const songSection = document.getElementById("songSection");
  const infoSection = document.getElementById("infoSection");
  const frontSign = document.getElementById("prenotaLaTuaCanzone");
  const waitingSection = document.getElementById("waitingSection");
  const waitingMsg = document.getElementById("waitingMsg");
  const cancelSlotBtn = document.getElementById("cancelSlotBtn");
  const newSongInput = document.getElementById("newSongInput");
  const resetBtn = document.getElementById("resetBtn");
  const downloadExcelBtn = document.getElementById("downloadCSVBtn");
  const currentSongInput = document.getElementById("currentSongInput");
  const nextSongBtn = document.getElementById("nextSongBtn");
  const prevSongBtn = document.getElementById("prevSongBtn");
  const annullaLimiteInput = document.getElementById("annullaLimite");
  const maxPrenotazioniInput = document.getElementById("maxPrenotazioniInput");
  const searchBar = document.getElementById("filterBars");
  const toggleHiddenBtn = document.getElementById("toggleHiddenBtn");



const addSongBtn = document.getElementById("addSongBtn");
const addSongModal = document.getElementById("addSongModal");
const confirmAddSongBtn = document.getElementById("confirmAddSongBtn");
const songTitleInput = document.getElementById("songTitleInput");
const songArtistInput = document.getElementById("songArtistInput");

// Mostra il modale quando si clicca sul +
addSongBtn.addEventListener("click", () => {
  songTitleInput.value = "";
  songArtistInput.value = "";
  addSongModal.classList.remove("hidden");
  songTitleInput.focus();
});

// Chiudi modale con .btn
document.querySelectorAll(".close-add").forEach(btn => {
  btn.addEventListener("click", () => {
    addSongModal.classList.add("hidden");
  });
});

// Conferma inserimento canzone
confirmAddSongBtn.addEventListener("click", () => {
  const titolo = songTitleInput.value.trim();
  const artista = songArtistInput.value.trim();

  if (!titolo || !artista) {
    showCustomAlert("Inserisci sia il titolo che l'artista.");
    return;
  }

  const nuovoBrano = `${titolo} - ${artista}`;


  const duplicato = canzoni.includes(nuovoBrano) || hiddenSongs.includes(nuovoBrano);
if (!duplicato) {
  canzoni.push(nuovoBrano);
  save();
  renderEditorTable();
}


  if (!canzoni.includes(nuovoBrano)) {
    canzoni.push(nuovoBrano);
    save(); // Salva dove necessario (Firebase o locale)
    renderEditorTable?.(); // Se hai una funzione per aggiornare la lista
  }

  addSongModal.classList.add("hidden");
});


toggleHiddenBtn.addEventListener("click", () => {
  mostraSoloNascosti = !mostraSoloNascosti;
  renderEditorTable();

  toggleHiddenBtn.innerHTML = mostraSoloNascosti
    ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
         stroke-width="1.5" stroke="currentColor" class="size-6">
         <path stroke-linecap="round" stroke-linejoin="round"
          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
         <path stroke-linecap="round" stroke-linejoin="round"
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
         stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774" />
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>`;
});

 




  // DATI DA FIREBASE


onValue(songsRef, (snapshot) => {
  canzoni = snapshot.exists() ? snapshot.val() : [];
  renderEditorTable();
});


onValue(ref(db, "hiddenSongs"), snapshot => {
  const data = snapshot.val();
  hiddenSongs = data ? Object.values(data) : [];
  renderEditorTable();
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

  renderEditorTable();   // ✅ aggiorna la tabella
  updateWaitingMsg();
  updatePostiCounter();
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
    updatePostiCounter();
    renderEditorTable();
    scrollToCurrentSong();
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

    set(ref(db, "editor/lastSave"), Date.now());
  
}




// DRAG & DROP SCORRETTO PER BRANI PRENOTATI

let sortableInstance;

function initScalettaDrag() {
  const el = document.getElementById("scalettaLista");
  if (!el) {
    console.warn("⚠️ Elemento scalettaLista non trovato");
    return;
  }

  console.log("✅ Inizializzo SortableJS");

  if (window.sortableInstance) {
    window.sortableInstance.destroy();
  }

  window.sortableInstance = new Sortable(el, {
    animation: 150,
    delay: 500,
    delayOnTouchOnly: false,
    fallbackTolerance: 5,
    fallbackOnBody: true,
    touchStartThreshold: 5,
    forceFallback: true,
    ghostClass: "drag-ghost",
    chosenClass: "sortable-chosen",

   onEnd: (evt) => {
  const fromIndex = evt.oldIndex;
  const toIndex = evt.newIndex;

  if (fromIndex === toIndex) return;

  const songMoved = canzoni[fromIndex];
  const isPrenotato = prenotazioni.some(p => p.song === songMoved);

  const moveSong = () => {
    // 🔁 Aggiorna array canzoni
    const updated = [...canzoni];
    updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, songMoved);
    canzoni = updated;

    // ✅ Salva nuova lista su Firebase
    set(ref(db, "songs"), canzoni);

    // ✅ Se il brano è prenotato, aggiorna posizione in reservations[]
    const reservationIndex = prenotazioni.findIndex(p => p.song === songMoved);
    if (reservationIndex !== -1) {
      const updatedReservations = [...prenotazioni];
      const [resMoved] = updatedReservations.splice(reservationIndex, 1);

      // Calcolo nuova posizione relativa tra prenotati
      const prenSongs = updated.filter(song =>
        updatedReservations.some(p => p.song === song)
      );

      // Trova dove inserirlo nella nuova posizione prenotata
      let newResIndex = 0;
      for (let i = 0; i < updated.length; i++) {
        if (updated[i] === songMoved) break;
        if (updatedReservations.find(p => p.song === updated[i])) {
          newResIndex++;
        }
      }

      updatedReservations.splice(newResIndex, 0, resMoved);

      // 🔁 Salva reservations aggiornate su Firebase
      set(ref(db, "reservations"), updatedReservations);
      prenotazioni = updatedReservations; // aggiorna lo stato locale
    }

    // 🔁 Re-render della scaletta aggiornata
    renderEditorTable();
  };

  if (isPrenotato) {
    showCustomConfirm(
      `Il brano "<strong>${songMoved}</strong>" è prenotato.<br>Sei sicuro di volerlo spostare?`,
      moveSong,
      () => renderEditorTable()
    );
  } else {
    moveSong();
  }
}

  });
}



//Scaletta Completa
function renderEditorTable() {
  const scalettaLista = document.getElementById("scalettaLista");
  const nascostiContainer = document.getElementById("nascostiContainer");
  const scalettaNascosta = document.getElementById("scalettaNascosta");

  if (!scalettaLista || !scalettaNascosta) return;

  scalettaLista.innerHTML = "";
  scalettaNascosta.innerHTML = "";

  // 🔁 Mostra solo brani nascosti
  if (mostraSoloNascosti) {
    nascostiContainer.classList.remove("hidden");

    hiddenSongs.forEach(song => {
      const li = document.createElement("li");
      li.classList.add("hidden-song");

      li.innerHTML = `
        <div class="hidden-songs-grid">
          <span style="opacity: 0.6; font-style: italic;">${song}</span>
          <button class="btn btn-small show-btn" title="Rendi visibile">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5
                c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0
                8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228
                3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243
                m4.242 4.242L9.88 9.88"/>
            </svg>
          </button>
        </div>
      `;
      li.querySelector(".show-btn").onclick = () => moveToVisible(song);
      scalettaNascosta.appendChild(li);
    });

    scalettaLista.classList.add("hidden");
    return;
  }

  // ✅ Mostra scaletta normale
  nascostiContainer.classList.add("hidden");
  scalettaLista.classList.remove("hidden");

  // ✅ ORDINA canzoni con prenotate in cima (ordine prenotazioni)
  const prenotate = prenotazioni.map(p => p.song).filter((s, i, a) => a.indexOf(s) === i);
  const nonPrenotate = canzoni.filter(song => !prenotate.includes(song));
  const scalettaOrdinata = [...prenotate, ...nonPrenotate];
  canzoni = scalettaOrdinata; // aggiorna lo stato globale

  scalettaOrdinata.forEach((song, index) => {
    const li = document.createElement("li");

    const pren = prenotazioni.find(p => p.song === song);
    const fullName = pren ? pren.name : "";

    let displayName = fullName;
    if (fullName && fullName.trim().includes(" ")) {
      displayName = fullName.trim().split(" ")[0] + "…";
    }

    li.innerHTML = `
      <div class="svg-edit" style="display:flex;flex-direction:column;">
        <span><strong>${index + 1}.</strong>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 16.5c0 1.3807-1.1193 2.5-2.5 2.5C8.11929 19 7 17.8807 7 16.5S8.11929 14 9.5 14c1.3807 0 2.5 1.1193 2.5 2.5Zm0 0V5c2.5 0 6 2.5 4.5 7"/>
          </svg>
          ${song}
        </span>
        ${fullName ? `<span class="utente-troncato">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0
              3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1
              12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"/>
          </svg> ${displayName}
        </span>` : ""}
      </div>
    `;

    if (branoCorrente > 0 && index === branoCorrente - 1) li.classList.add("playing");
    else if (index < branoCorrente - 1) li.classList.add("suonati");

    li.addEventListener("click", () => {
      apriMenuModifica(index, song, fullName || null);
    });

    scalettaLista.appendChild(li);
  });

  scrollToCurrentSong();
  updateCurrentSongIndexDisplay();
  initScalettaDrag();
}




function scrollToCurrentSong() {
  const list = document.getElementById("scalettaLista");
  const wrapper = document.getElementById("scalettaWrapper");
  if (!list || !wrapper) return;

  const items = list.children;
  if (branoCorrente === 0 || branoCorrente - 1 >= items.length) return;

  const currentEl = items[branoCorrente - 1];

  if (currentEl) {
    const wrapperRect = wrapper.getBoundingClientRect();
    const itemRect = currentEl.getBoundingClientRect();
    const scrollOffset = (itemRect.top + wrapper.scrollTop) - wrapperRect.top - (wrapper.clientHeight / 2) + (currentEl.offsetHeight / 2);

    wrapper.scrollTo({
      top: scrollOffset,
      behavior: 'smooth'
    });
  }
}


function moveToHidden(song) {
  const index = canzoni.indexOf(song);
  if (index !== -1) {
    canzoni.splice(index, 1);
    hiddenSongs.push(song);

    set(ref(db, "songs"), canzoni);
    set(ref(db, "hiddenSongs"), hiddenSongs);

    renderEditorTable();
  }
}

function moveToVisible(song) {
  const index = hiddenSongs.indexOf(song);
  if (index !== -1) {
    hiddenSongs.splice(index, 1);
    canzoni.push(song);

    set(ref(db, "songs"), canzoni);
    set(ref(db, "hiddenSongs"), hiddenSongs);

    renderEditorTable();
  }
}



function apriMenuModifica(index, branoCorrente, utenteCorrente) {
  const popup = document.getElementById("popupModal");
  const popupEditName = document.getElementById("popupEditName");

  const popupSongNameInput = document.getElementById("popupSongName");
  const popupSaveNameBtn = document.getElementById("popupSaveName");
  const popupCancelReservationBtn = document.getElementById("popupCancelReservation");
  const popupRemoveSongBtn = document.getElementById("popupRemoveSong");
  const popupCloseBtn = document.getElementById("popupClose");
  const label = document.getElementById("popupPrenotatoDa");

  // Mostra il popup
  popup.classList.remove("hidden");
  // Mostra la sezione modifica nome e nasconde quella con i bottoni
  popupEditName.classList.remove("hidden");

  label.textContent = utenteCorrente ? `Prenotato da: ${utenteCorrente}` : "Nessun prenotato";


  popupSongNameInput.value = branoCorrente;

  // Pulisci eventuali vecchi event listener per evitare duplicazioni
  popupSaveNameBtn.onclick = null;
  popupCancelReservationBtn.onclick = null;
  popupRemoveSongBtn.onclick = null;
  popupCloseBtn.onclick = null;
  const toggleVisibilityBtn = document.getElementById("toggleVisibilityBtn");
  toggleVisibilityBtn.onclick = null;

  const èNascosto = hiddenSongs.some(s => s.trim() === branoCorrente.trim());
 toggleVisibilityBtn.innerHTML = èNascosto ? `
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>
 <span>Rendi visibile</span>`
  : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
</svg>
 <span>Nascondi brano</span>`;

  toggleVisibilityBtn.style.display = "inline-flex"; // Assicurati sia visibile

  toggleVisibilityBtn.onclick = async () => {
  const èNascosto = hiddenSongs.some(s => s.trim() === branoCorrente.trim());

  if (èNascosto) {
    // Sposta in visibili
    hiddenSongs = hiddenSongs.filter(s => s.trim() !== branoCorrente.trim());
    canzoni.push(branoCorrente);
  } else {
    canzoni = canzoni.filter(s => s.trim() !== branoCorrente.trim());
    hiddenSongs.push(branoCorrente);
  }

  // Aggiorna Firebase correttamente
  await Promise.all([
    set(ref(db, "songs"), canzoni),
    set(ref(db, "hiddenSongs"), hiddenSongs)
  ]);

  // Aggiorna UI
  toggleVisibilityBtn.innerHTML = èNascosto ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
</svg>
 <span>Nascondi brano</span>` : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>
 <span>Rendi visibile</span>`;
  renderEditorTable();
};




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
      renderEditorTable();
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
        renderEditorTable();
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
    renderEditorTable();
    popup.classList.add("hidden");
  };

  // Chiudi popup
  popupCloseBtn.onclick = () => {
    popup.classList.add("hidden");
  };

  popup.addEventListener("click", (e) => {
  if (e.target === popup) popup.classList.add("hidden");
});
}





 
  /*addSongBtn.addEventListener("click", () => {
    const newSong = newSongInput.value.trim();
    if (newSong && !canzoni.includes(newSong)) {
      canzoni.push(newSong);
      save();
      newSongInput.value = "";
    }
  });*/

resetBtn.addEventListener("click", () => {
  showCustomConfirm(
    "Sei sicuro di voler resettare tutte le prenotazioni e le richieste?",
    () => {
      prenotazioni = [];
      branoCorrente = 0;

      Promise.all([
        remove(ref(db, "lockedSongs")),
        remove(ref(db, "richieste"))
      ])
        .then(() => {
          console.log("Prenotazioni e richieste resettate.");
          save();
          showCustomAlert("Prenotazioni e richieste resettate con successo.");
        })
        .catch((error) => {
          console.error("Errore durante il reset:", error);
          showCustomAlert("Errore durante il reset.");
        });
    }
  );
});



downloadExcelBtn.addEventListener("click", async () => {
  const workbook = new ExcelJS.Workbook();
  const oggi = new Date().toISOString().slice(0, 10);
  const filename = `report_serata_${oggi}.xlsx`;

  // 🎨 Aggiungi foglio prenotazioni
  const wsPrenotazioni = workbook.addWorksheet("Prenotazioni", { properties: { tabColor: { argb: 'FFCCE5FF' } } });
  wsPrenotazioni.columns = [
    { header: "Nome", key: "nome", width: 30 },
    { header: "Brano", key: "brano", width: 40 }
  ];
  prenotazioni.forEach(p => wsPrenotazioni.addRow({ nome: p.name, brano: p.song }));

  wsPrenotazioni.getRow(1).eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE5FF' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // 🎨 Aggiungi foglio richieste
  const wsRichieste = workbook.addWorksheet("Richieste", { properties: { tabColor: { argb: 'FFFFE599' } } });
  wsRichieste.columns = [
    { header: "Titolo", key: "titolo", width: 30 },
    { header: "Artista", key: "artista", width: 30 },
    { header: "Conteggio", key: "conteggio", width: 15 }
  ];

  const snapshot = await get(ref(db, 'richieste'));
  const richieste = snapshot.val();
  if (richieste) {
    Object.values(richieste).forEach(r => {
      wsRichieste.addRow({
        titolo: r.titolo,
        artista: r.artista,
        conteggio: r.count || 1
      });
    });
  }

  wsRichieste.getRow(1).eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE599' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });





  // 📥 Scarica
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});





  nextSongBtn.addEventListener("click", () => {
    branoCorrente++;
    save();
    renderEditorTable();
    scrollToCurrentSong();
  });

  prevSongBtn.addEventListener("click", () => {
    if (branoCorrente > 0) branoCorrente--;
    save();
    renderEditorTable();
    scrollToCurrentSong();
  });

  currentSongInput.addEventListener("change", () => {
    const val = parseInt(currentSongInput.value);
    if (!isNaN(val) && val >= 0) {
      branoCorrente = val;
      save();
      renderEditorTable();
      scrollToCurrentSong();
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




  
  annullaLimiteInput.addEventListener("change", () => {
      save(); // ogni volta che l’input cambia, salva la nuova config
    });

      // Aggiorna il contatore grafico in alto
function updatePostiCounter() {
  const el = document.getElementById("postiCounter");
  if (!el) return;
  el.textContent = `Posti prenotati: ${prenotazioni.length} / ${maxPrenotazioni}`;
}

});

document.getElementById("searchSetlist").addEventListener("input", function () {
  const query = this.value.toLowerCase();
  document.querySelectorAll("#scalettaLista li").forEach(li => {
    const text = li.textContent.toLowerCase();
    li.style.display = text.includes(query) ? "flex" : "none";
  });
});

