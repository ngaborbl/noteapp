// Firebase konfiguráció
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
const db = firebase.firestore();
const auth = firebase.auth();

// A Firebase Messaging inicializálása és token kezelés
function initializeMessaging() {
  try {
    const messaging = firebase.messaging();
    
    // Először ellenőrizzük, hogy támogatja-e a böngésző a push notificationt
    if ('Notification' in window) {
      // Engedély kérése és token kezelése
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            console.log('Értesítési engedély megadva');
            
            // Token lekérése - új API használata
            return messaging.getToken({
              vapidKey: "BMClsjpGPsNjgxNlIC6vyY6q5bh2wv9xDCWeAD0bc8JX2l13zAwOXxxJzeQpchTz9YYwEKwH5xQ9LqZO8Vv0rZg"
            });
          } else {
            throw new Error('Értesítési engedély megtagadva');
          }
        })
        .then((token) => {
          if (token) {
            console.log('FCM Token:', token);
            
            // Token mentése a felhasználóhoz az adatbázisban
            if (auth.currentUser) {
              return db.collection('users').doc(auth.currentUser.uid).update({
                fcmToken: token
              });
            }
          }
        })
        .catch((error) => {
          console.error('Hiba a messaging inicializálásakor:', error);
        });
    }
  } catch (error) {
    console.error('Firebase Messaging inicializálási hiba:', error);
  }
}

// Időpont hozzáadásánál és szerkesztésénél
async function sendNotification(userId, appointmentTitle, appointmentTime, notifyBefore) {
  const notificationCount = parseInt(localStorage.getItem('notificationCount') || '1');
  const notificationTime = parseInt(localStorage.getItem('notificationTime') || '30');
  
  try {
    // Értesítések küldése a beállított számban
    for(let i = 0; i < notificationCount; i++) {
      const response = await fetch('https://noteapp-seven-silk.vercel.app/api/sendNotification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          userId,
          appointmentTitle,
          appointmentTime,
          notifyBefore: notificationTime * (i + 1)
        }),
      });

      if (!response.ok) {
        throw new Error(`Hiba történt az értesítés küldése közben: ${response.status}`);
      }

      const data = await response.json();
      console.log(`${i + 1}. értesítés sikeresen beállítva:`, data);
    }
  } catch (error) {
    console.error('Értesítési hiba részletei:', error);
    // Ne állítsuk meg a folyamatot hiba esetén
    console.log('Az időpont mentésre került, de az értesítés beállítása nem sikerült');
  }
}

// Alkalmazás inicializálása
function initApp() {
  console.log("Alkalmazás inicializálása...");
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("Felhasználó bejelentkezve:", user.email);
      showModule('dashboard');
    } else {
      console.log("Nincs bejelentkezett felhasználó");
      showLoginForm();
    }
  });
}

// Modulok megjelenítése
function showModule(moduleId) {
  console.log("Modul megjelenítése:", moduleId);
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = '';

  switch(moduleId) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'notes':
      loadNotes();
      break;
    case 'appointments':
      loadAppointments();
      break;
    case 'settings':
      loadSettings();
      break;
    default:
      contentElement.innerHTML = `<h2>${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}</h2>
                                  <p>Ez a ${moduleId} modul tartalma.</p>`;
  }
}

// Dashboard betöltése
function loadDashboard() {
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Dashboard</h2>
    <div class="dashboard-grid">
      <div class="dashboard-card">
        <h3>Legutóbbi Jegyzetek</h3>
        <ul id="recent-notes-list"></ul>
      </div>
      <div class="dashboard-card">
        <h3>Közelgő Időpontok</h3>
        <ul id="upcoming-appointments-list"></ul>
      </div>
    </div>
  `;
  loadRecentNotes();
  loadUpcomingAppointments();
}

function loadRecentNotes() {
  const notesList = document.getElementById('recent-notes-list');
  db.collection('notes').orderBy('timestamp', 'desc').limit(5).get()
    .then(snapshot => {
      notesList.innerHTML = '';
      snapshot.forEach(doc => {
        const note = doc.data();
        const li = document.createElement('li');
        li.textContent = note.content;
        notesList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Hiba a jegyzetek betöltésekor:', error);
    });
}

function loadUpcomingAppointments() {
  const appointmentsList = document.getElementById('upcoming-appointments-list');
  const now = new Date();
  db.collection('appointments').where('date', '>', now).orderBy('date').limit(5).get()
    .then(snapshot => {
      appointmentsList.innerHTML = '';
      snapshot.forEach(doc => {
        const appointment = doc.data();
        const li = document.createElement('li');
        li.textContent = `${appointment.title} - ${appointment.date.toDate().toLocaleString()}`;
        appointmentsList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Hiba az időpontok betöltésekor:', error);
    });
}

// Jegyzetek betöltése
function loadNotes() {
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Jegyzetek</h2>
    <form id="new-note-form">
      <input type="text" id="new-note" placeholder="Új jegyzet" required>
      <button type="submit">Hozzáadás</button>
    </form>
    <ul id="notes-list"></ul>
  `;
  document.getElementById('new-note-form').addEventListener('submit', addNote);
  
  const notesList = document.getElementById('notes-list');
  db.collection('notes').orderBy('timestamp', 'desc').get()
    .then(snapshot => {
      notesList.innerHTML = '';
      snapshot.forEach(doc => {
        const note = doc.data();
        const li = document.createElement('li');
        li.innerHTML = `
          ${note.content}
          <button onclick="editNote('${doc.id}')">Szerkesztés</button>
          <button onclick="deleteNote('${doc.id}')">Törlés</button>
        `;
        notesList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Hiba a jegyzetek betöltésekor:', error);
    });
}

// Új jegyzet hozzáadása
function addNote(e) {
  e.preventDefault();
  const newNoteInput = document.getElementById('new-note');
  const newNoteContent = newNoteInput.value;
  if (newNoteContent) {
    db.collection('notes').add({
      content: newNoteContent,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      newNoteInput.value = '';
      loadNotes();
    })
    .catch(error => {
      console.error('Hiba a jegyzet hozzáadásakor:', error);
    });
  }
}

// Jegyzet szerkesztése
function editNote(noteId) {
  const newContent = prompt('Új tartalom:');
  if (newContent) {
    db.collection('notes').doc(noteId).update({
      content: newContent,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      loadNotes();
    })
    .catch(error => {
      console.error('Hiba a jegyzet szerkesztésekor:', error);
    });
  }
}

// Jegyzet törlése
function deleteNote(noteId) {
  if (confirm('Biztosan törlöd ezt a jegyzetet?')) {
    db.collection('notes').doc(noteId).delete()
    .then(() => {
      loadNotes();
    })
    .catch(error => {
      console.error('Hiba a jegyzet törlésekor:', error);
    });
  }
}

// Új időpont hozzáadása vátozás
function addAppointment(e) {
  e.preventDefault();
  console.log('Időpont hozzáadás kezdeményezve');
  
  const title = document.getElementById('appointment-title').value;
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;

  console.log('Bevitt adatok:', { title, date, time });

  if (title && date && time) {
    try {
      const dateTime = new Date(date + 'T' + time);
      console.log('Létrehozott dátum objektum:', dateTime);
      
      // Ellenőrizzük, hogy érvényes dátum-e
      if (isNaN(dateTime.getTime())) {
        throw new Error('Érvénytelen dátum vagy idő formátum');
      }

      const timestamp = firebase.firestore.Timestamp.fromDate(dateTime);
      console.log('Firestore timestamp létrehozva:', timestamp);
      
      console.log('Dokumentum létrehozása kezdeményezve a Firestore-ban');
      db.collection('appointments').add({
        title: title,
        date: timestamp,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: auth.currentUser.uid // Adjuk hozzá a felhasználó ID-t is
      })
      .then((docRef) => {
        console.log('Időpont sikeresen hozzáadva, dokumentum ID:', docRef.id);
        
        // Értesítés küldése
        if (auth.currentUser) {
          console.log('Értesítés küldése kezdeményezve');
          const userId = auth.currentUser.uid;
          return sendNotification(userId, title, dateTime.toISOString(), 30);
        }
      })
      .then(() => {
        console.log('Értesítés sikeresen elküldve');
        
        // Form tisztítása
        document.getElementById('appointment-title').value = '';
        document.getElementById('appointment-date').value = '';
        document.getElementById('appointment-time').value = '';
        
        // Lista újratöltése
        loadAppointments();
        
        // Felhasználói visszajelzés
        alert('Időpont sikeresen létrehozva!');
      })
      .catch(error => {
        console.error('Hiba az időpont mentésekor:', error);
        alert('Hiba történt az időpont mentésekor: ' + error.message);
      });
    } catch (error) {
      console.error('Hiba a dátum feldolgozásakor:', error);
      alert('Érvénytelen dátum vagy idő formátum');
    }
  } else {
    console.log('Hiányzó adatok:', { title, date, time });
    alert('Kérlek töltsd ki az összes mezőt!');
  }
}

function loadAppointments() {
  console.log('Időpontok betöltése kezdeményezve');
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Időpontok</h2>
    <form id="new-appointment-form">
      <input type="text" id="appointment-title" placeholder="Időpont címe" required>
      <input type="date" id="appointment-date" required>
      <input type="time" id="appointment-time" required>
      <button type="submit">Időpont hozzáadása</button>
    </form>
    <ul id="appointments-list"></ul>
  `;
  document.getElementById('new-appointment-form').addEventListener('submit', addAppointment);
  
  const appointmentsList = document.getElementById('appointments-list');
  console.log('Időpontok lekérése a Firestore-ból...');
  
  db.collection('appointments')
    .orderBy('date', 'asc')
    .get()
    .then(snapshot => {
      console.log('Firestore válasz megérkezett, dokumentumok száma:', snapshot.size);
      appointmentsList.innerHTML = '';
      snapshot.forEach(doc => {
        const appointment = doc.data();
        const li = document.createElement('li');
        
        // Dátum biztonságos kezelése
        let dateString = 'Érvénytelen dátum';
        try {
          if (appointment.date) {
            let date;
            if (appointment.date.toDate) {
              // Ha Firestore Timestamp
              date = appointment.date.toDate();
            } else if (appointment.date.seconds) {
              // Ha timestamp objektum
              date = new Date(appointment.date.seconds * 1000);
            } else if (typeof appointment.date === 'string') {
              // Ha string
              date = new Date(appointment.date);
            } else {
              // Ha egyéb formátum
              date = new Date(appointment.date);
            }
            
            dateString = date.toLocaleString('hu-HU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (error) {
          console.error('Hiba a dátum feldolgozásakor:', error, appointment.date);
        }

        li.innerHTML = `
          <div class="appointment-content">
            <strong>${appointment.title}</strong> - ${dateString}
          </div>
          <div class="appointment-actions">
            <button onclick="editAppointment('${doc.id}')">Szerkesztés</button>
            <button onclick="deleteAppointment('${doc.id}')">Törlés</button>
          </div>
        `;
        appointmentsList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Hiba az időpontok betöltésekor:', error);
      appointmentsList.innerHTML = '<li class="error">Hiba történt az időpontok betöltésekor.</li>';
    });
}

// Időpont szerkesztése
function editAppointment(appointmentId) {
  db.collection('appointments').doc(appointmentId).get()
    .then(doc => {
      const appointment = doc.data();
      let currentDate, currentTime;
      
      try {
        const date = appointment.date.toDate();
        currentDate = date.toISOString().split('T')[0];
        currentTime = date.toTimeString().slice(0, 5);
      } catch (error) {
        console.error('Hiba a dátum konvertálásakor:', error);
        currentDate = new Date().toISOString().split('T')[0];
        currentTime = new Date().toTimeString().slice(0, 5);
      }

      const newTitle = prompt('Új cím:', appointment.title);
      const newDate = prompt('Új dátum (ÉÉÉÉ-HH-NN):', currentDate);
      const newTime = prompt('Új idő (ÓÓ:PP):', currentTime);

      if (newTitle && newDate && newTime) {
        try {
          const newDateTime = new Date(newDate + 'T' + newTime);
          
          // Ellenőrizzük, hogy érvényes dátum-e
          if (isNaN(newDateTime.getTime())) {
            throw new Error('Érvénytelen dátum vagy idő formátum');
          }

          const newTimestamp = firebase.firestore.Timestamp.fromDate(newDateTime);
          
          db.collection('appointments').doc(appointmentId).update({
            title: newTitle,
            date: newTimestamp,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          })
          .then(() => {
            console.log('Időpont sikeresen frissítve');
            
            // Értesítés frissítése
            if (auth.currentUser) {
              const userId = auth.currentUser.uid;
              sendNotification(userId, newTitle, newDateTime.toISOString(), 30)
                .catch(error => {
                  console.error('Hiba az értesítés frissítésekor:', error);
                });
            }
            
            loadAppointments();
          })
          .catch(error => {
            console.error('Hiba az időpont frissítésekor:', error);
            alert('Hiba történt az időpont frissítésekor: ' + error.message);
          });
        } catch (error) {
          console.error('Hiba a dátum feldolgozásakor:', error);
          alert('Érvénytelen dátum vagy idő formátum');
        }
      }
    })
    .catch(error => {
      console.error('Hiba az időpont lekérdezésekor:', error);
      alert('Hiba történt az időpont betöltésekor');
    });
}

// Időpont törlése
function deleteAppointment(appointmentId) {
  if (confirm('Biztosan törölni szeretnéd ezt az időpontot?')) {
    db.collection('appointments').doc(appointmentId).delete()
    .then(() => {
      loadAppointments();
    })
    .catch(error => {
      console.error('Hiba az időpont törlésekor:', error);
    });
  }
}

// Beállítások betöltése
function loadSettings() {
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Beállítások</h2>
    <form id="settings-form">
      <div class="settings-group">
        <label for="theme-select">Téma:</label>
        <select id="theme-select">
          <option value="light">Világos</option>
          <option value="dark">Sötét</option>
        </select>
      </div>
      
      <div class="settings-group">
        <label for="notification-time">Értesítés küldése az időpont előtt:</label>
        <select id="notification-time">
          <option value="15">15 perc</option>
          <option value="30">30 perc</option>
          <option value="60">1 óra</option>
        </select>
      </div>
      
      <div class="settings-group">
        <label for="notification-count">Értesítések száma:</label>
        <select id="notification-count">
          <option value="1">1 értesítés</option>
          <option value="2">2 értesítés</option>
          <option value="3">3 értesítés</option>
        </select>
      </div>
      
      <button type="submit">Mentés</button>
    </form>
  `;
  
  // Események kezelése
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  
  // Jelenlegi beállítások betöltése
  const currentTheme = localStorage.getItem('theme') || 'light';
  const notificationTime = localStorage.getItem('notificationTime') || '30';
  const notificationCount = localStorage.getItem('notificationCount') || '1';
  
  document.getElementById('theme-select').value = currentTheme;
  document.getElementById('notification-time').value = notificationTime;
  document.getElementById('notification-count').value = notificationCount;
}

// Beállítások mentése
function saveSettings(e) {
  e.preventDefault();
  const theme = document.getElementById('theme-select').value;
  const notificationTime = document.getElementById('notification-time').value;
  const notificationCount = document.getElementById('notification-count').value;
  
  // Beállítások mentése
  localStorage.setItem('theme', theme);
  localStorage.setItem('notificationTime', notificationTime);
  localStorage.setItem('notificationCount', notificationCount);
  
  // Téma alkalmazása
  applyTheme(theme);
  
  alert('Beállítások sikeresen mentve!');
}

// Téma alkalmazása
function applyTheme(theme) {
  document.body.className = theme;
}

// Bejelentkező űrlap megjelenítése
function showLoginForm() {
  const contentElement = document.getElementById('content');
  if (!contentElement) {
    console.error('Content element not found');
    return;
  }
  
  contentElement.innerHTML = `
    <h2>Bejelentkezés</h2>
    <form id="login-form">
      <input type="email" id="login-email" placeholder="Email cím" required>
      <input type="password" id="login-password" placeholder="Jelszó" required>
      <button type="submit">Bejelentkezés</button>
    </form>
  `;
  document.getElementById('login-form').addEventListener('submit', login);
}

// Bejelentkezés
function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Sikeres bejelentkezés");
    })
    .catch((error) => {
      console.error("Bejelentkezési hiba:", error.message);
      alert('Bejelentkezési hiba: ' + error.message);
    });
}

// Kijelentkezés
function logout() {
  auth.signOut().then(() => {
    console.log('Kijelentkezés sikeres');
    showLoginForm();
  }).catch((error) => {
    console.error('Hiba a kijelentkezésnél:', error);
  });
}

// Eseményfigyelők hozzáadása
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM betöltődött, eseményfigyelők hozzáadása...");
  initApp();

  const menuItems = document.querySelectorAll('nav a');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleId = item.id.replace('-menu', '');
      showModule(moduleId);
    });
  });

  // Kijelentkezés gomb eseménykezelője
  const logoutButton = document.getElementById('logout-menu');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Messaging inicializálása
  initializeMessaging();

  // Téma betöltése és alkalmazása
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  // Service worker regisztráció
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js')
        .then(function(registration) {
          console.log('Service Worker regisztrálva:', registration);
        })
        .catch(function(error) {
          console.error('Service Worker regisztrációs hiba:', error);
        });
    });
  }
});

console.log("app.js betöltve és feldolgozva");