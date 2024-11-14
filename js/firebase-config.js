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
    
    // Új Firestore beállítások a persistence warning elkerüléséhez
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      cache: {
        enable: true,
        persistenceEnabled: true,
        synchronizeTabs: true
      }
    });

    // Messaging inicializálása error handling-gel
    let messaging = null;
    if ('Notification' in window) {
      try {
        messaging = firebase.messaging();
      } catch (err) {
        console.warn("Messaging inicializálási hiba:", err.message);
      }
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