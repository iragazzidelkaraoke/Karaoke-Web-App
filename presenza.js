// js/presenza.js
import { database, auth } from './firebase.js';
import { ref, onValue, set, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    const userStatusRef = ref(database, '/status/' + uid);
    const isOffline = { state: 'offline', last_changed: serverTimestamp() };
    const isOnline = { state: 'online', last_changed: serverTimestamp() };
    const connectedRef = ref(database, '.info/connected');

    onValue(connectedRef, (snap) => {
      if (snap.val() === false) return;
      onDisconnect(userStatusRef).set(isOffline).then(() => {
        set(userStatusRef, isOnline);
      });
    });
  }
});

// Conta quanti utenti sono online
const utentiOnlineRef = ref(database, '/status/');
onValue(utentiOnlineRef, (snapshot) => {
  const users = snapshot.val();
  const count = Object.values(users || {}).filter(u => u.state === 'online').length;
  const counter = document.getElementById('online-counter');
  if (counter) counter.textContent = count;
});
