import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbiGcVbznmRf0m-xPlIAtIkAQqMaCVHDk",
  authDomain: "karaoke-live.firebaseapp.com",
  databaseURL: "https://karaoke-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karaoke-live",
  storageBucket: "karaoke-live.firebasestorage.app",
  messagingSenderId: "268291410744",
  appId: "1:268291410744:web:4cb66c45d586510b440fcd"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Esegui l'autenticazione anonima
signInAnonymously(auth)
  .catch((error) => {
    console.error("Errore durante l'autenticazione anonima:", error);
    window.location.replace("accesso_negato.html");
  });

// Osserva lo stato di autenticazione
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Utente autenticato anonimamente:", user.uid);
    verificaTokenEReindirizza();
  } else {
    console.warn("Utente non autenticato.");
    window.location.replace("accesso_negato.html");
  }
});

// Funzione principale per la verifica e redirezione
async function verificaTokenEReindirizza() {
  try {
    const snapshot = await get(ref(db, 'serata'));

    if (!snapshot.exists()) {
      console.error("Nessuna serata trovata.");
      window.location.replace("accesso_negato.html");
      return;
    }

    const datiSerata = snapshot.val();
    const tokenAttivo = datiSerata.token;
    const serataAttiva = datiSerata.attiva;

    if (!serataAttiva) {
      console.warn("Serata non attiva.");
      window.location.replace("accesso_negato.html");
      return;
    }

    const tokenUtente = sessionStorage.getItem("tokenSerata");

    // Primo accesso: salva il token
    if (!tokenUtente) {
      sessionStorage.setItem("tokenSerata", tokenAttivo);
      window.location.replace("home.html");
      return;
    }

    // Token non valido → accesso negato
    if (tokenUtente !== tokenAttivo) {
      console.warn("Token non valido.");
      window.location.replace("accesso_negato.html");
      return;
    }

    // Accesso valido → vai a home
    console.log("Accesso valido.");
    window.location.href = "home.html";

  } catch (error) {
    console.error("Errore nella verifica del token:", error);
    window.location.replace("accesso_negato.html");
  }
}
