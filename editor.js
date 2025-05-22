
//script.js

// IMPORTA Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";



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

 //cost search and filter bar
  const searchBar = document.getElementById("filterBars");







  //let reservations = JSON.parse(localStorage.getItem("reservations")) || {};
 




  // DATI DA FIREBASE


onValue(songsRef, (snapshot) => {
  canzoni = snapshot.exists() ? snapshot.val() : [];
  renderEditorList();
});
     
     


onValue(reservationsRef, snapshot => {
  prenotazioni = snapshot.exists() ? snapshot.val() : [];
  renderEditorList();   // ✅ Aggiungi questa riga per aggiornare l'ordine
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

    const removeCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "X";
    removeBtn.classList.add("btn", "btn-secondary");
    removeBtn.style.padding = "2px 8px";
    removeBtn.addEventListener("click", () => {
      if (confirm(`Rimuovere "${song}" dalla scaletta?`)) {
        canzoni.splice(index, 1);
        save();
        renderEditorList();
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
    }
  });

resetBtn.addEventListener("click", () => {
  const conferma = confirm("Sei sicuro di voler resettare tutte le prenotazioni?");
  if (conferma) {
    prenotazioni = [];
    branoCorrente = 0;
    save();
    waitingSection.classList.add("hidden");
    alert("Prenotazioni resettate.");
  }
});

  downloadCSVBtn.addEventListener("click", () => {
    const rows = [["Nome", "Brano"]];
    prenotazioni.forEach(p => rows.push([p.name, p.song]));
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


  
  annullaLimiteInput.addEventListener("change", () => {
      save(); // ogni volta che l’input cambia, salva la nuova config
    });
});