// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyBsQMs29I_kwN5idgcyAdz0etWfv7ymyz8",
  authDomain: "noteapp-5c98e.firebaseapp.com",
  projectId: "noteapp-5c98e",
  storageBucket: "noteapp-5c98e.appspot.com",
  messagingSenderId: "10607490745",
  appId: "1:10607490745:web:5cdff4c9c5e78d7c798d68",
  measurementId: "G-3NSSJ1FT7S"
};

const initializeFirebase = async () => {
  try {
    // Firebase inicializálása
    const app = firebase.initializeApp(firebaseConfig);
    
    // Auth és Firestore inicializálása
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Firestore offline persistence engedélyezése (új szintaxis Firebase v10-hez)
    try {
      await db.enablePersistence({
        synchronizeTabs: true
      });
      console.log("Firestore persistence engedélyezve");
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn("Firestore persistence: több tab nyitva");
      } else if (err.code === 'unimplemented') {
        console.warn("Firestore persistence: böngésző nem támogatja");
      } else {
        console.warn("Firestore persistence hiba:", err);
      }
    }

    // Messaging inicializálása jobb error handling-gel
    let messaging = null;
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        messaging = firebase.messaging();
        console.log("Firebase Messaging inicializálva");
      } catch (err) {
        console.warn("Messaging inicializálási hiba:", err.message);
        // Ez nem kritikus hiba, az app működhet értesítések nélkül is
      }
    } else {
      console.warn("Értesítések nem támogatottak ebben a böngészőben");
    }

    // Globális változók beállítása
    Object.assign(window, {
      fbApp: app,
      fbDb: db,
      fbAuth: auth,
      fbMessaging: messaging
    });

    console.log("Firebase sikeresen inicializálva");
    return true;

  } catch (error) {
    console.error("Firebase inicializálási hiba:", error);
    return false;
  }
};

// Alkalmazás indítása jobb error handling-gel
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!await initializeFirebase()) {
      throw new Error("Firebase inicializálás sikertelen");
    }
    
    if (typeof window.initApp !== 'function') {
      throw new Error("initApp függvény nem található");
    }
    
    await window.initApp();
    
  } catch (error) {
    console.error("Alkalmazás indítási hiba:", error.message);
    // Itt lehetne valami felhasználóbarát hibaüzenetet megjeleníteni
    document.body.innerHTML = `
      <div class="error-container">
        <h1>Hiba történt</h1>
        <p>Az alkalmazás nem tudott elindulni. Kérjük, próbálja újra később.</p>
      </div>
    `;
  }
});