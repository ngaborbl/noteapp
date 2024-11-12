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

// Firebase inicializálása
firebase.initializeApp(firebaseConfig);

// Szolgáltatások inicializálása
window.fbDb = firebase.firestore();
window.fbAuth = firebase.auth();
window.fbMessaging = firebase.messaging();

// Persistence beállítása
window.fbDb.enablePersistence()
  .then(() => {
    console.log("Offline persistence engedélyezve");
  })
  .catch((err) => {
    console.error("Persistence hiba", err);
  });