/*Versione Funzionante*/
import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";

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

const connectionsRef = ref(db, 'connections');
const connectedRef = ref(db, ".info/connected");

const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
const userRef = ref(db, `connections/${uniqueId}`);

onValue(connectedRef, (snap) => {
  if (snap.val() === true) {
    set(userRef, true);
    onDisconnect(userRef).remove();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const counterElement = document.getElementById('online-counter');

  onValue(connectionsRef, (snap) => {
    const data = snap.val();
    const count = data ? Object.keys(data).length : 0;

    if (counterElement) {
      counterElement.innerText = count;
    }
  });
});
