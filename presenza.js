// presenza.js
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

import { } from './firebase.js'

export function registraPresenzaOnline() {
  const db = getDatabase();
  const sessionId = sessionStorage.getItem("connId") || (() => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem("connId", id);
    return id;
  })();
  const refConn = ref(db, "liveConnections/" + sessionId);
  set(refConn, {
    ua: navigator.userAgent,
    ts: Date.now()
  });
  onDisconnect(refConn).remove();
}
