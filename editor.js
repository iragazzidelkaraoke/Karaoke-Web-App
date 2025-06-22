


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

function showCustomConfirm(message, onConfirm) {
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
    }
  }
document.addEventListener("keydown", handleEnterConfirm);


  document.querySelectorAll(".close-confirm").forEach(btn => {
    btn.onclick = () => {
      modal.classList.add("hidden");
    };
  });

  yesBtn.onclick = () => {
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm();
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
  //const addSongBtn = document.getElementById("addSongBtn");
  const editableSongList = document.getElementById("editableSongList");
  const resetBtn = document.getElementById("resetBtn");
  const downloadExcelBtn = document.getElementById("downloadCSVBtn");

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

// Chiudi modale con X o Annulla
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
  if (!canzoni.includes(nuovoBrano)) {
    canzoni.push(nuovoBrano);
    save(); // Salva dove necessario (Firebase o locale)
    renderEditorList?.(); // Se hai una funzione per aggiornare la lista
  }

  addSongModal.classList.add("hidden");
});




 




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
    renderEditorList();
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

/*function renderEditorTable() {
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
}*/

function renderEditorTable() {
  const scalettaLista = document.getElementById("scalettaLista");
  if (!scalettaLista) return;
  scalettaLista.innerHTML = "";

  canzoni.forEach((song, index) => {
    const li = document.createElement("li");

    // ➜ nome completo (se esiste)
    const pren = prenotazioni.find(p => p.song === song);
    const fullName = pren ? pren.name : "";

    // ➜ nome da mostrare (prima parola + … se >1 parola)
    let displayName = fullName;
    if (fullName && fullName.trim().includes(" ")) {
      displayName = fullName.trim().split(" ")[0] + "…";
    }

    li.innerHTML = `
      <div class="svg-edit" style="display:flex;flex-direction:column;">
        <span><strong>${index + 1}.</strong> <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16.5c0 1.3807-1.1193 2.5-2.5 2.5C8.11929 19 7 17.8807 7 16.5S8.11929 14 9.5 14c1.3807 0 2.5 1.1193 2.5 2.5Zm0 0V5c2.5 0 6 2.5 4.5 7"/>
</svg>
 ${song}</span>
        ${fullName ? `<span class="utente-troncato"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
</svg> ${displayName}</span>` : ""}
      </div>
    `;

    // classi di stato
    if (branoCorrente > 0 && index === branoCorrente - 1) li.classList.add("playing");
    else if (index < branoCorrente - 1) li.classList.add("suonati");

    // clicca per editare
    li.addEventListener("click", () => {
      apriMenuModifica(index, song, fullName || null);   // ⬅️ passiamo il nome completo
    });

    scalettaLista.appendChild(li);
  });

  scrollToCurrentSong();
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


new Sortable(editableSongList, {
  animation: 150,
  delay: 500,
  delayOnTouchOnly: true,

  onChoose: (evt) => {
    evt.item.classList.add("drag-ready");

    // Vibrazione su dispositivi che la supportano
    if (window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  },


  ghostClass: "drag-ghost",

  onEnd: (evt) => {
    const updated = Array.from(editableSongList.children).map(li => {
      const raw = li.textContent.trim();
      return raw.replace(/^\d+\.\s*/, "");
    });
    canzoni = updated;
    save();
    renderEditorList();
  }
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

      // Aggiorna il contatore grafico in alto
function updatePostiCounter() {
  const el = document.getElementById("postiCounter");
  if (!el) return;
  el.textContent = `Posti prenotati: ${prenotazioni.length} / ${maxPrenotazioni}`;
}

});