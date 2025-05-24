// token.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

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

export async function getTokenAttivo() {
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

export async function verificaToken(tokenUtente) {
  try {
    const snapshot = await get(ref(db, 'serata'));
    if (!snapshot.exists()) {
      console.error("Nessuna serata trovata nel DB.");
      return false;
    }

    const datiSerata = snapshot.val();
    const tokenAttivo = datiSerata.token;
    const serataAttiva = datiSerata.attiva;

    if (!serataAttiva) {
      return false;
    }

    if (!tokenUtente) {
      return false;
    }

    if (tokenUtente !== tokenAttivo) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Errore nella verifica del token:", error);
    return false;
  }
}
