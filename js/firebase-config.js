// Konfiguráció
const firebaseConfig = {
  apiKey: "AIzaSyBsQMs29I_kwN5idgcyAdz0etWfv7ymyz8",
  authDomain: "noteapp-5c98e.firebaseapp.com",
  projectId: "noteapp-5c98e",
  storageBucket: "noteapp-5c98e.appspot.com",
  messagingSenderId: "10607490745",
  appId: "1:10607490745:web:5cdff4c9c5e78d7c798d68",
  measurementId: "G-3NSSJ1FT7S"
};

// Firebase inicializálása előtt beállítjuk a persistence-t
const initializeFirebase = async () => {
  try {
    // Firebase inicializálása
    firebase.initializeApp(firebaseConfig);

    // Persistence beállítása
    const db = firebase.firestore();
    
    // Firebase beállítások
    const settings = {
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    };
    db.settings(settings);

    try {
      await db.enableIndexedDbPersistence();
      console.log("Offline persistence sikeresen engedélyezve");
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn("Persistence nem engedélyezhető több megnyitott tab esetén");
      } else if (err.code === 'unimplemented') {
        console.warn("A böngésző nem támogatja a persistence funkciót");
      }
    }

    // Globális változók beállítása
    window.fbDb = db;
    window.fbAuth = firebase.auth();
    window.fbMessaging = firebase.messaging();

    console.log("Firebase sikeresen inicializálva");
    return true;
  } catch (error) {
    console.error("Hiba a Firebase inicializálásakor:", error);
    return false;
  }
};

// Firebase inicializálása és alkalmazás indítása
initializeFirebase().then(success => {
  if (success) {
    // Itt indíthatjuk az alkalmazást
    if (typeof initApp === 'function') {
      initApp();
    }
  } else {
    console.error("Az alkalmazás nem tudott elindulni a Firebase inicializálási hiba miatt");
  }
});