
/*Versione Funzionante*/

// IMPORTA Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
import { database, goOffline, goOnline } from './firebase.js';

//import { verificaToken } from './token.js';

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


window.addEventListener("mousemove", resetInactivityTimer);
window.addEventListener("mousedown", resetInactivityTimer);
window.addEventListener("keypress", resetInactivityTimer);
window.addEventListener("touchmove", resetInactivityTimer);


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
const lockedSongsRef = ref(db, "lockedSongs");
let lockedSongs = {};
const isEditor = window.location.href.includes("editor=true");

let maxPrenotazioniDaDb = 25;
let prenotazioniDaDb = [];
let configLoaded = false;





async function verificaToken() {
  try {
    const snapshot = await get(ref(db, 'serata'));

    if (!snapshot.exists()) {
      window.location.replace("accesso_negato.html");

      return;
    }

    const datiSerata = snapshot.val();
    const tokenAttivo = datiSerata.token;
    const serataAttiva = datiSerata.attiva;

    if (!serataAttiva) {
      window.location.replace("accesso_negato.html");

      return;
    }

    const tokenUtente = sessionStorage.getItem("tokenSerata");

    if (!tokenUtente || tokenUtente !== tokenAttivo) {
      window.location.replace("accesso_negato.html");

      return;
    }

    console.log("Accesso valido alla home.");
    // Qui puoi continuare con altre logiche di home.html

  } catch (error) {
    console.error("Errore nella verifica del token:", error);
    window.location.replace("accesso_negato.html");

  }
}

window.addEventListener("load", verificaToken);







// Prima controlla subito se superato il limite
Promise.all([
  get(ref(db, "config")),
  get(ref(db, "reservations"))
]).then(([configSnap, reservationsSnap]) => {
  if (configSnap.exists()) {
    maxPrenotazioniDaDb = configSnap.val().maxPrenotazioni || 25;
  }
  maxPrenotazioni = maxPrenotazioniDaDb; // <-- FONDAMENTALE
  //configLoaded = true;                   // <-- FONDAMENTALE


  if (reservationsSnap.exists()) {
    prenotazioniDaDb = reservationsSnap.val();
  }

// Se è superato e non è editor → redirect (conteggio reale, ignora buchi)
const raw = reservationsSnap.exists() ? reservationsSnap.val() : [];
const prenCount = Array.isArray(raw)
  ? raw.filter(r => r && r.name && r.song).length
  : Object.values(raw || {}).filter(r => r && r.name && r.song).length;

if (prenCount >= maxPrenotazioniDaDb && !isEditor) {
  window.location.href = "max.html";
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
let unsubscribeMaxPren = null;
let canzoni = [];
let selectedSong = null;
let editorMode = false;
let branoCorrente = 0;
let bloccaRender = false;
  let currentUserName = null;


document.addEventListener("DOMContentLoaded", () => {


// Crea dinamicamente banner per prenotazione attiva
const reservationBox = document.getElementById("existingReservationBox");
const reservationInfo = document.getElementById("reservationInfo");
const returnBtn = document.getElementById("returnToWaitingBtn");







  //implemento di firebase

  
  




  const loginEditor = document.getElementById("cogEditor");

  //const reservationForm = document.getElementById("reservationForm");
  const songSection = document.getElementById("songSection");
  const songList = document.getElementById("songList");
  //const cancelReservation = document.getElementById("cancelReservation");
  const infoSection = document.getElementById("infoSection");
  const frontSign = document.getElementById("prenotaLaTuaCanzone");
  //const maxReached = document.getElementById("maxReached");

  const waitingSection = document.getElementById("waitingSection");
  const waitingMsg = document.getElementById("waitingMsg");
  const cancelSlotBtn = document.getElementById("cancelSlotBtn");

  const editorPanel = document.getElementById("editorPanel");
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

 //cost search and filter bar
  const searchBar = document.getElementById("filterBars");
  const searchInput = document.getElementById("searchInput");
  //const sortSelect = document.getElementById("sortSelect");
  

const dropdown = document.getElementById("customDropdown");
const dropdownBtn = document.getElementById("dropdownButton");
const dropdownMenu = document.getElementById("dropdownMenu");

let sortValueWrapper = { value: "title" }; // meglio usare nome diverso

dropdownBtn.addEventListener("click", () => {
  dropdown.classList.toggle("open");
});

dropdownMenu.querySelectorAll("li").forEach((item) => {
  item.addEventListener("click", () => {
    const selected = item.getAttribute("data-value");
    sortValueWrapper.value = selected;
    dropdownBtn.textContent = item.textContent + " ▾";
    dropdown.classList.remove("open");
    renderSongs();
  });
});

document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target)) {
    dropdown.classList.remove("open");
  }
});



  //let reservations = JSON.parse(sessionStorage.getItem("reservations")) || {};
 



  // DATI DA FIREBASE


onValue(songsRef, snapshot => {
  if (snapshot.exists()) {
    const val = snapshot.val();
    const arr = Array.isArray(val) ? val : Object.values(val || {});
    canzoni = arr.filter(s => typeof s === "string" && s.trim().length > 0);
  } else {
    canzoni = [
      "Wonderwall - Oasis",
      "Zombie - The Cranberries",
      "Bohemian Rhapsody - Queen",
      "Azzurro - Adriano Celentano"
    ];
    set(songsRef, canzoni);
  }
  renderSongs();
});

     


onValue(reservationsRef, snapshot => {
  const val = snapshot.exists() ? snapshot.val() : [];
  prenotazioni = Array.isArray(val) ? val : Object.values(val || {});
  renderSongs();
  updateWaitingMsg();
  updatePostiCounter();
  updateReservationBanner();
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
    updateReservationBanner();

        configLoaded = true;
    renderSongs();

  }
});


function updateReservationBanner() {
  const userName = sessionStorage.getItem("userName");
  if (!userName) return;

const prenRaw = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
const filtered = prenRaw.filter(r => r && r.name);
  const index = filtered.findIndex(r => r.name === userName);
  if (index === -1) return;

  const user = filtered[index];
  const diff = index - (branoCorrente - 1);

  if (diff > 1) {
    reservationInfo.innerHTML = `Hai già prenotato: <br> <strong>${user.song}</strong>. <div class='quanto-manca'><h4>Mancano ${diff} brani al tuo turno.</h4></div>`;
    reservationBox.classList.remove("hidden");
  } else if (diff === 0) {
    reservationInfo.innerHTML = `Preparati a cantare: <br> <strong>${user.song}</strong>! <div class='quanto-manca'><h4>🎤✨ È il tuo turno! ✨</h4></div>`;
    reservationBox.classList.remove("hidden");
  } else if (diff === 1) {
    reservationInfo.innerHTML = `Hai già prenotato: <br> <strong>${user.song}</strong>. <div class='quanto-manca'><h4>Manca ${diff} brano al tuo turno.</h4></div>`;
    reservationBox.classList.remove("hidden")
  } else {
    reservationInfo.innerHTML = `Hai già cantato: <br> <strong>${user.song}</strong>. Grazie per la tua esibizione! 🎤`;
    reservationBox.classList.remove("hidden");
    returnBtn.classList.add("hidden")
    // Nasconde il banner dopo 5 secondi
    setTimeout(() => {
      reservationBox.classList.add("hidden");
    }, 5000);
  }

  returnBtn.onclick = () => {
    window.location.href = "waiting.html";
  };
}




function checkMaxPrenotazioniLive() {
  return onValue(reservationsRef, (snapshot) => {
    if (!configLoaded) return;

const raw = snapshot.exists() ? snapshot.val() : [];
const count = Array.isArray(raw)
  ? raw.filter(r => r && r.name && r.song).length
  : Object.values(raw || {}).filter(r => r && r.name && r.song).length;

    // debug utilissimo
    console.log("HOME CHECK MAX", { count, maxPrenotazioni, configLoaded });

    if (count < maxPrenotazioni) return;

    const currentUserName = sessionStorage.getItem("userName");

    // se vuoi evitare redirect per chi è già in lista:
    const data = snapshot.val() || [];
    const validData = Array.isArray(data)
      ? data.filter(r => r && r.name)
      : Object.values(data).filter(r => r && r.name);

    const alreadyThere = currentUserName
      ? validData.some(r => r.name === currentUserName)
      : false;

      if (alreadyThere && typeof unsubscribeMaxPren === "function") {
  unsubscribeMaxPren();
  unsubscribeMaxPren = null;
}


    if (!alreadyThere && !window.location.href.includes("editor=true")) {
      setTimeout(() => (window.location.href = "max.html"), 200);
    }
  });
}



  function saveConfigOnly() {
  const annullaLimite = parseInt(annullaLimiteInput.value) || 0;
  maxPrenotazioni = parseInt(maxPrenotazioniInput.value) || 25;

  set(configRef, { maxPrenotazioni, branoCorrente, annullaLimite });
}


onValue(lockedSongsRef, (snapshot) => {
  lockedSongs = snapshot.exists() ? snapshot.val() : {};
  renderSongs(); // aggiorna i bottoni
});


maxPrenotazioniInput.addEventListener("change", saveConfigOnly);
annullaLimiteInput.addEventListener("change", saveConfigOnly);





 

  function updateCurrentSongIndexDisplay() {
    currentSongInput.value = branoCorrente;
  }




function save() {
  const annullaLimite = parseInt(annullaLimiteInput.value) || 0;
  maxPrenotazioni = parseInt(maxPrenotazioniInput.value) || 25;

  if (editorMode || isEditor) {
    set(songsRef, canzoni);
    set(reservationsRef, prenotazioni);
  }

  set(configRef, { maxPrenotazioni, branoCorrente, annullaLimite });
}





// Search & Filter 
function renderSongs() {
  try {
    console.log("renderSongs()", {
      canzoniType: typeof canzoni,
      canzoniIsArray: Array.isArray(canzoni),
      prenType: typeof prenotazioni,
      prenIsArray: Array.isArray(prenotazioni),
      maxPrenotazioni,
      configLoaded,
      editorMode
    });

    if (!songList) return;

    // Se la config non è pronta, non renderizzare (evita stati "mezzi")
    if (!configLoaded) {
      songList.innerHTML = "";
      return;
    }

    // Normalizza songs: array di stringhe valide
    const songsRaw = Array.isArray(canzoni) ? canzoni : Object.values(canzoni || {});
    const safeSongs = songsRaw
      .filter(s => typeof s === "string" && s.trim().length > 0);

    // Normalizza prenotazioni: array di oggetti validi
    const prenRaw = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
    const validPrenotazioni = prenRaw
      .filter(p => p && typeof p.song === "string" && p.song.trim().length > 0 && typeof p.name === "string");

    const prenCount = validPrenotazioni.length;

    // Search (robusto anche se searchInput non è definito)
    const searchEl = document.getElementById("searchInput");
    const search = (searchEl?.value || "").toLowerCase();

    const sortValue = (sortValueWrapper?.value || "title");

    // Modalità editor
    if (editorMode) {
      infoSection?.classList.add("hidden");
      frontSign?.classList.add("hidden");
      songSection?.classList.add("hidden");
      waitingSection?.classList.add("hidden");
      editorPanel?.classList.remove("hidden");
      renderEditorList();
      return;
    } else {
      infoSection?.classList.remove("hidden");
      editorPanel?.classList.add("hidden");
    }

    // Se max raggiunto, manda a max.html SOLO se non è editor e l'utente non è già dentro la lista
    const sessionUserName = sessionStorage.getItem("userName");
    const nameToCheck = currentUserName || sessionUserName;

    const alreadyThere = nameToCheck
      ? validPrenotazioni.some(p => p.name === nameToCheck)
      : false;


    if (prenCount >= maxPrenotazioni && !isEditor && !alreadyThere) {
      window.location.href = "max.html";
      return;
    }

    // UI show
    songSection?.classList.remove("hidden");
    frontSign?.classList.remove("hidden");

    // Ora possiamo svuotare e renderizzare
    songList.innerHTML = "";

    // Sorting robusto (non crasha se manca " - ")
    const sorted = [...safeSongs].sort((a, b) => {
      const [aTitle, aArtist] = String(a).split(" - ");
      const [bTitle, bArtist] = String(b).split(" - ");

      if (sortValue === "title") return (aTitle || "").localeCompare(bTitle || "");
      if (sortValue === "artist") return (aArtist || "").localeCompare(bArtist || "");
      return 0;
    });

    let shown = 0;

    for (const song of sorted) {
      const songStr = String(song);

      if (!songStr.toLowerCase().includes(search)) continue;

      const prenotato = validPrenotazioni.find(p => p.song === songStr);
      const isLocked = !!(lockedSongs && lockedSongs[songStr]);

      if (sortValue === "free" && (prenotato || isLocked)) continue;

      shown++;

      const li = document.createElement("li");
      li.textContent = songStr;

      const button = document.createElement("button");

      if (prenotato || isLocked) {
        button.textContent = prenotato ? "Prenotato" : "In attesa...";
        button.disabled = true;
        button.classList.add("btn-secondary");
      } else {
        button.textContent = "Prenota";
        button.classList.add("btn");
        button.addEventListener("click", () => {
          set(ref(db, "lockedSongs/" + songStr), true).then(() => {
            sessionStorage.setItem("selectedSong", songStr);
            window.location.href = "prenota.html";
          });
        });
      }

      li.appendChild(button);
      songList.appendChild(li);
    }

    if (shown === 0) {
      const li = document.createElement("li");
      li.innerHTML = `
        Il brano che cerchi non è in scaletta?<br>
        <button onclick="window.location.href='richieste.html'">Richiedi Ora</button>
      `;
      songList.appendChild(li);
    }
  } catch (e) {
    console.error("❌ renderSongs CRASH", e);
  }
}



//sortSelect.addEventListener("change", renderSongs);
searchInput?.addEventListener("input", renderSongs);




  function renderEditorList() {
    editableSongList.innerHTML = "";

    // Ordina le canzoni: prenotate prima, non prenotate dopo
const prenArr = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
const prenotate = prenArr.filter(p => p && p.song).map(p => p.song);
    const nonPrenotate = canzoni.filter(song => !prenotate.includes(song));
    canzoni = prenotate.concat(nonPrenotate).filter((v, i, a) => a.indexOf(v) === i);

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
  const prenArr = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
  canzoni.forEach((song, index) => {
    const row = document.createElement('tr');

    const indexCell = document.createElement("td");
    indexCell.textContent = index + 1;

    const songCell = document.createElement("td");
    songCell.textContent = song;

    const userCell = document.createElement("td");
    const user = prenArr.find(p => p && p.song === song);
    userCell.textContent = user ? user.name : "";

    const removeCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "X";
    removeBtn.classList.add("btn", "btn-secondary");
    removeBtn.style.padding = "2px 8px";
    removeBtn.addEventListener("click", () => {
      if (confirm(`Rimuovere "${song}" dalla scaletta?`)) {
        canzoni.splice(index, 1);
        save();
        renderSongs();
      }
    });
    removeCell.appendChild(removeBtn);

    row.appendChild(indexCell);
    row.appendChild(songCell);
    row.appendChild(userCell);
    row.appendChild(removeCell);

    editorTableBody.appendChild(row);
  });
}

 
  addSongBtn.addEventListener("click", () => {
    const newSong = newSongInput.value.trim();
    if (newSong && !canzoni.includes(newSong)) {
      canzoni.push(newSong);
      save();
      newSongInput.value = "";
      renderSongs();
    }
  });

  downloadCSVBtn.addEventListener("click", () => {
    const prenArr = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
    const rows = [["Nome", "Brano"]];
    prenArr.filter(p => p && p.name && p.song).forEach(p => rows.push([p.name, p.song]));
    const csvContent = rows.map(r => r.join(",")).join("\n");
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
        return raw.replace(/^\d+\.\s*/, ""); // rimuove index numerico
      });
      canzoni = updated;
      renderSongs();
    }
  });

  nextSongBtn.addEventListener("click", () => {
    branoCorrente++;
    save();
    renderSongs();
  });

  prevSongBtn.addEventListener("click", () => {
    if (branoCorrente > 0) branoCorrente--;
    save();
    renderSongs();
  });

  currentSongInput.addEventListener("change", () => {
    const val = parseInt(currentSongInput.value);
    if (!isNaN(val) && val >= 0) {
      branoCorrente = val;
      save();
      renderSongs();
    }
  });




function showWaitingSection(userName) {
  currentUserName = userName;
  updateWaitingMsg();
  frontSign.classList.add("hidden");
  searchBar?.classList.add("hidden");
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

const prenRaw = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
const user = prenRaw.find(p => p && p.name === currentUserName);
const pos = prenRaw.findIndex(p => p && p.name === currentUserName);
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

    const prenArr = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
    const i = prenArr.findIndex(p => p && p.name === currentUserName);

    if (i >= 0) {
      const songToRestore = prenArr[i].song;

      // rimuovi dalla lista "prenArr"
      prenArr.splice(i, 1);

      // mantieni prenotazioni coerente
      prenotazioni = prenArr;

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




    





  loginEditor.addEventListener("click", () => {
  window.location.href = "home.html?editor=true";
  });
  
  
 

  
  document.body.style.visibility = "visible";

  renderSongs();

  // Aggiorna il contatore grafico in alto
function updatePostiCounter() {
  const el = document.getElementById("postiCounter");
  if (!el) return;

  const prenRaw = Array.isArray(prenotazioni) ? prenotazioni : Object.values(prenotazioni || {});
  const realCount = prenRaw.filter(p => p && p.name && p.song).length;

  el.textContent = `Posti prenotati: ${realCount} / ${maxPrenotazioni}`;
}

setTimeout(() => {
  const lockedSongsSnapshot = ref(db, "lockedSongs");
  get(lockedSongsSnapshot).then(snapshot => {
    if (snapshot.exists()) {
      const locked = snapshot.val();
      const updates = {};

      // Rimuovi tutti i brani bloccati
      Object.keys(locked).forEach(song => {
        updates["lockedSongs/" + song] = null;
      });

      // Applica la rimozione solo se ci sono canzoni da sbloccare
      if (Object.keys(updates).length > 0) {
        update(ref(db), updates)
          .then(() => {
            console.log(" Brani sbloccati automaticamente dopo 140 secondi.");
          })
          .catch((err) => {
            console.error("Errore nello sblocco automatico:", err);
          });
      }
    }
  });
}, 140000); // 140 secondi

  
unsubscribeMaxPren = checkMaxPrenotazioniLive();
  
  
});