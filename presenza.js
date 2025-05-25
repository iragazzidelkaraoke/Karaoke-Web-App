// presenza.js

import { database, auth } from './firebase.js';
import { ref, onValue, onDisconnect, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const uid = user.uid;
  const userStatusRef = ref(database, `/presence/${uid}`);

  const isOffline = {
    state: "offline",
    last_changed: serverTimestamp(),
  };

  const isOnline = {
    state: "online",
    last_changed: serverTimestamp(),
  };

  const connectedRef = ref(database, ".info/connected");
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) return;

    onDisconnect(userStatusRef).set(isOffline).then(() => {
      set(userStatusRef, isOnline);
    });
  });
});
