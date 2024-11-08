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

// FCM inicializálása
async function initializeFirebaseMessaging() {
  try {
    console.log('FCM inicializálás kezdése...');
    
    if (!firebase.messaging.isSupported()) {
      console.log('Az FCM nem támogatott ezen a platformon');
      return;
    }

    const messaging = firebase.messaging();
    console.log('Messaging objektum létrehozva');

    // Az új módszer a Notification API használata
    const permission = await Notification.requestPermission();
    console.log('Értesítési engedély:', permission);

    if (permission === 'granted') {
      try {
        const token = await messaging.getToken();
        console.log('FCM token:', token);
        
        const user = auth.currentUser;
        if (user && token) {
          await db.collection('users').doc(user.uid).set({
            fcmToken: token,
            tokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log('Token mentve a Firestore-ba');
        }
        return token;
      } catch (tokenError) {
        console.error('Hiba a token generálásakor:', tokenError);
        throw tokenError;
      }
    } else {
      console.log('Értesítési engedély megtagadva');
    }
  } catch (error) {
    console.error('Hiba az FCM inicializálásakor:', error);
    throw error;
  }
}

// Böngésző detektálás
function detectBrowser() {
  if ((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) !== -1) {
    return 'opera';
  } else if (navigator.userAgent.indexOf("Chrome") !== -1) {
    return 'chrome';
  } else if (navigator.userAgent.indexOf("Safari") !== -1) {
    return 'safari';
  } else if (navigator.userAgent.indexOf("Firefox") !== -1) {
    return 'firefox';
  } else {
    return 'unknown';
  }
}

// Alternatív értesítés Opera böngészőhöz
function showBrowserNotification(title, body) {
  // Létrehozunk egy fix pozíciójú div-et az értesítéshez
  const notificationDiv = document.createElement('div');
  notificationDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 15px;
    border-radius: 5px;
    z-index: 9999;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    animation: slideIn 0.5s ease-out;
  `;

  notificationDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
    <div>${body}</div>
    <button style="
      margin-top: 10px;
      padding: 5px 10px;
      border: none;
      background: #4CAF50;
      color: white;
      border-radius: 3px;
      cursor: pointer;
    ">Bezárás</button>
  `;

  // CSS animáció hozzáadása
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Bezárás gomb kezelése
  const closeButton = notificationDiv.querySelector('button');
  closeButton.onclick = () => {
    notificationDiv.style.animation = 'slideOut 0.5s ease-in';
    setTimeout(() => notificationDiv.remove(), 500);
  };

  // Automatikus eltűnés 10 másodperc után
  setTimeout(() => {
    if (document.body.contains(notificationDiv)) {
      notificationDiv.style.animation = 'slideOut 0.5s ease-in';
      setTimeout(() => notificationDiv.remove(), 500);
    }
  }, 10000);

  document.body.appendChild(notificationDiv);
}

// Egyszerű értesítési rendszer
function initializeNotifications() {
  console.log('Értesítések inicializálása...');
  
  if (!('Notification' in window)) {
    console.log('A böngésző nem támogatja az értesítéseket');
    return;
  }

  Notification.requestPermission()
    .then(permission => {
      console.log('Értesítési engedély állapota:', permission);
      if (permission === 'granted') {
        console.log('Értesítési engedély megadva');
        setupLocalNotifications();
        
        // Teszteljük az értesítéseket
        setTimeout(() => {
          showLocalNotification(
            '🔔 Teszt értesítés',
            'Az értesítési rendszer működik',
            'test'
          );
        }, 3000);
      }
    })
    .catch(error => {
      console.error('Hiba az értesítési engedély kérésekor:', error);
    });
}

// Helyi értesítések kezelése
function showLocalNotification(title, body, id) {
  console.log('Értesítés indítása:', { title, body, id, browser: detectBrowser() });
  
  if (!('Notification' in window)) {
    console.log('A böngésző nem támogatja az értesítéseket');
    return;
  }

  // Böngésző-specifikus kezelés
  const browserType = detectBrowser();
  if (browserType === 'opera') {
    console.log('Opera böngésző észlelve, alternatív értesítési mód használata');
    showBrowserNotification(title, body);
    return;
  }

  // Ellenőrizzük, hogy volt-e már értesítés erről az időpontról az elmúlt percben
  const lastNotification = localStorage.getItem(`lastNotification_${id}`);
  const now = Date.now();
  if (lastNotification && now - parseInt(lastNotification) < 60000) {
    console.log('Túl gyakori értesítés, kihagyjuk:', id);
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body: body,
        requireInteraction: true,
        tag: `appointment-${id}`,
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200],
        icon: '/icons/calendar.png',
        badge: '/icons/calendar.png'
      });

      // Mentjük az értesítés időpontját
      localStorage.setItem(`lastNotification_${id}`, now.toString());

      notification.onclick = function() {
        console.log('Értesítésre kattintás:', id);
        window.focus();
        this.close();
      };

      notification.onshow = function() {
        console.log('Értesítés megjelenítve:', id);
      };

      console.log('Értesítés sikeresen létrehozva:', id);
      return notification;
    } catch (error) {
      console.error('Értesítési hiba:', error);
      showBrowserNotification(title, body);  // Fallback az egyedi értesítésre
    }
  }
}

// Módosítsuk az értesítések ellenőrzését
async function checkUpcomingAppointments() {
 // Felhasználó ellenőrzése
 const user = auth.currentUser;
 if (!user) {
   console.log('Időpontok ellenőrzése kihagyva: nincs bejelentkezett felhasználó');
   return;
 }

 console.log('Időpontok ellenőrzése kezdődik:', user.email);
 
 // Aktuális idő és beállítások
 const now = new Date();
 const notificationTime = parseInt(localStorage.getItem('notificationTime') || '30');
 const notificationCount = parseInt(localStorage.getItem('notificationCount') || '1');

 try {
   // Időpontok lekérése
   console.log('Közelgő időpontok lekérése a Firestore-ból...');
   const snapshot = await db.collection('appointments')
     .where('userId', '==', user.uid)
     .where('date', '>', now)
     .orderBy('date', 'asc')
     .get();

   if (snapshot.empty) {
     console.log('Nincsenek közelgő időpontok');
     return;
   }

   console.log(`${snapshot.size} időpont található, ellenőrzés kezdése...`);

   // Időpontok feldolgozása
   snapshot.forEach(doc => {
     const appointment = doc.data();
     const appointmentDate = appointment.date.toDate();
     const timeDiff = (appointmentDate - now) / (1000 * 60); // különbség percekben

     // Log az időpont adatairól
     console.log('Időpont vizsgálata:', {
       title: appointment.title,
       date: appointmentDate,
       timeUntil: Math.round(timeDiff) + ' perc'
     });

     // Értesítési időpontok beállítása a felhasználói beállítások alapján
     let notifyAt = [];
     if (notificationCount === 1) {
       notifyAt = [notificationTime];
     } else if (notificationCount === 2) {
       notifyAt = [notificationTime, Math.ceil(notificationTime/2)];
     } else if (notificationCount === 3) {
       notifyAt = [notificationTime, Math.ceil(notificationTime/2), 5];
     }

     // Ellenőrizzük, hogy kell-e értesítést küldeni
     const shouldNotify = notifyAt.some(time => 
       Math.abs(Math.round(timeDiff) - time) < 1
     );

     if (shouldNotify) {
       const minutesText = Math.round(timeDiff);
       const notificationText = `${appointment.title} időpont ${minutesText} perc múlva lesz!`;
       
       console.log('Értesítés küldése:', {
         title: appointment.title,
         timeUntil: minutesText,
         notificationId: doc.id
       });

       // Értesítés küldése
       showLocalNotification(
         '🔔 Közelgő időpont',
         notificationText,
         doc.id  // Az időpont egyedi azonosítója
       ).then(() => {
         console.log('Értesítés sikeresen elküldve:', doc.id);
       }).catch(error => {
         console.error('Hiba az értesítés küldésekor:', error);
       });
     } else {
       console.log('Nincs szükség értesítésre ennél az időpontnál');
     }
   });

   console.log('Időpontok ellenőrzése befejezve');

 } catch (error) {
   console.error('Hiba az időpontok ellenőrzésekor:', error);
   // Részletes hibaüzenet logolása
   if (error.code) {
     console.error('Hiba kód:', error.code);
   }
   if (error.message) {
     console.error('Hiba üzenet:', error.message);
   }
 }
}

// Módosítsuk az értesítések időzítését
function setupLocalNotifications() {
  console.log('Értesítések figyelése elindítva');
  
  setInterval(() => {
    if (auth.currentUser) {
      checkUpcomingAppointments();
    }
  }, 30000);
}

// Alkalmazás inicializálása
function initApp() {
 console.log("Alkalmazás inicializálása...");
 const navElement = document.querySelector('nav');
 navElement.style.display = 'none';
 
 // Felhasználó bejelentkezési státusz figyelése
 auth.onAuthStateChanged(async (user) => {
   if (user) {
     // Bejelentkezett állapot
     console.log("Felhasználó bejelentkezve:", user.email);
     navElement.style.display = 'flex';
     
     try {
       // FCM inicializálása és első időpont ellenőrzés
       console.log("FCM inicializálás kezdeményezése...");
       await initializeFirebaseMessaging();
       console.log("FCM inicializálás sikeres, időpontok ellenőrzése kezdődik");
       await checkUpcomingAppointments();
     } catch (error) {
       console.error("Hiba az inicializálás során:", error);
     }

     // Dashboard betöltése
     showModule('dashboard');
     
   } else {
     // Kijelentkezett állapot
     console.log("Nincs bejelentkezett felhasználó");
     navElement.style.display = 'none';
     showLoginForm();
   }
 });

 // Csak akkor indítjuk az időpontok rendszeres ellenőrzését,
 // ha van Service Worker támogatás
 if ('serviceWorker' in navigator) {
   // Service Worker regisztráció
   window.addEventListener('load', async function() {
     try {
       const registration = await navigator.serviceWorker.register('service-worker.js');
       console.log('Service Worker sikeresen regisztrálva:', registration);
       
       // Időpontok rendszeres ellenőrzése
       setInterval(() => {
         if (auth.currentUser) {
           checkUpcomingAppointments();
         } else {
           console.log('Időpont ellenőrzés kihagyva - nincs bejelentkezett felhasználó');
         }
       }, 30000); // 30 másodpercenként
       
     } catch (error) {
       console.error('Service Worker regisztrációs hiba:', error);
     }
   });
 } else {
   console.log('A böngésző nem támogatja a Service Worker-t');
 }
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
    case 'profile':
      loadProfile();
      break;
    default:
      contentElement.innerHTML = `<h2>${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}</h2>
                                  <p>Ez a ${moduleId} modul tartalma.</p>`;
  }
}

// Dashboard betöltése
function loadDashboard() {
  const contentElement = document.getElementById('content');
  const user = auth.currentUser;
  
  contentElement.innerHTML = `
    <!-- User Info Section -->
    <div class="user-welcome-section">
      <div class="user-info">
        <h2>${user.displayName || 'Felhasználó'}</h2>
        <p>${user.email}</p>
      </div>
    </div>
    
    <!-- Statisztikai kártyák -->
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Jegyzetek száma</h4>
        <div id="notes-count">Betöltés...</div>
      </div>
      <div class="stat-card">
        <h4>Mai időpontok</h4>
        <div id="today-appointments">Betöltés...</div>
      </div>
      <div class="stat-card">
        <h4>Következő időpont</h4>
        <div id="next-appointment">Betöltés...</div>
      </div>
    </div>

    <!-- Keresés és szűrés -->
    <div class="dashboard-controls">
      <input type="text" id="dashboard-search" placeholder="Keresés jegyzetek és időpontok között...">
      <select id="dashboard-filter">
        <option value="all">Minden elem</option>
        <option value="notes">Csak jegyzetek</option>
        <option value="appointments">Csak időpontok</option>
      </select>
    </div>

    <div class="dashboard-grid">
      <!-- Jegyzetek szekció -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3>Legutóbbi Jegyzetek</h3>
          <select id="notes-sort">
            <option value="newest">Legújabb elől</option>
            <option value="oldest">Legrégebbi elől</option>
          </select>
        </div>
        <ul id="recent-notes-list"></ul>
        <button onclick="showModule('notes')" class="view-all-btn">Összes jegyzet</button>
      </div>

      <!-- Időpontok szekció -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3>Közelgő Időpontok</h3>
          <select id="appointments-range">
            <option value="today">Mai nap</option>
            <option value="week">Következő 7 nap</option>
            <option value="month">Következő 30 nap</option>
          </select>
        </div>
        <ul id="upcoming-appointments-list"></ul>
        <button onclick="showModule('appointments')" class="view-all-btn">Összes időpont</button>
      </div>
    </div>
  `;

  // Statisztikák betöltése
  loadDashboardStats();
  
  // Jegyzetek és időpontok betöltése
  loadRecentNotes();
  loadUpcomingAppointments();

  // Események kezelése
  setupDashboardEvents();
}

function loadDashboardStats() {
  // Jegyzetek számának lekérése
  db.collection('notes').where('userId', '==', auth.currentUser.uid).get()
    .then(snapshot => {
      document.getElementById('notes-count').textContent = snapshot.size + ' db';
    })
    .catch(error => {
      console.error('Hiba a jegyzetek számának lekérésekor:', error);
      document.getElementById('notes-count').textContent = 'Hiba történt';
    });

  // Mai időpontok számának lekérése
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  db.collection('appointments')
    .where('userId', '==', auth.currentUser.uid)
    .where('date', '>=', today)
    .where('date', '<', tomorrow)
    .get()
    .then(snapshot => {
      document.getElementById('today-appointments').textContent = snapshot.size + ' db';
    })
    .catch(error => {
      console.error('Hiba a mai időpontok lekérésekor:', error);
      document.getElementById('today-appointments').textContent = 'Hiba történt';
    });

  // Következő időpont lekérése
  db.collection('appointments')
    .where('userId', '==', auth.currentUser.uid)
    .where('date', '>=', new Date())
    .orderBy('date')
    .limit(1)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const nextAppointment = snapshot.docs[0].data();
        document.getElementById('next-appointment').textContent = 
          `${nextAppointment.title} - ${nextAppointment.date.toDate().toLocaleString('hu-HU')}`;
      } else {
        document.getElementById('next-appointment').textContent = 'Nincs közelgő időpont';
      }
    })
    .catch(error => {
      console.error('Hiba a következő időpont lekérésekor:', error);
      document.getElementById('next-appointment').textContent = 'Hiba történt';
    });
}

function setupDashboardEvents() {
  // Keresés kezelése
  const searchInput = document.getElementById('dashboard-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterDashboardItems(searchTerm);
    });
  }

  // Szűrő kezelése
  const filterSelect = document.getElementById('dashboard-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      const searchTerm = document.getElementById('dashboard-search').value.toLowerCase();
      filterDashboardItems(searchTerm);
    });
  }

  // Jegyzetek rendezése
  const notesSort = document.getElementById('notes-sort');
  if (notesSort) {
    notesSort.addEventListener('change', () => {
      loadRecentNotes(notesSort.value);
    });
  }

  // Időpontok időtartam választó
  const appointmentsRange = document.getElementById('appointments-range');
  if (appointmentsRange) {
    appointmentsRange.addEventListener('change', () => {
      loadUpcomingAppointments(appointmentsRange.value);
    });
  }
}

function filterDashboardItems(searchTerm) {
  const filter = document.getElementById('dashboard-filter').value;
  
  if (filter === 'all' || filter === 'notes') {
    const noteItems = document.querySelectorAll('#recent-notes-list li');
    noteItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  }

  if (filter === 'all' || filter === 'appointments') {
    const appointmentItems = document.querySelectorAll('#upcoming-appointments-list li');
    appointmentItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  }
}

function loadRecentNotes(sortOrder = 'newest') {
  const notesList = document.getElementById('recent-notes-list');
  const query = db.collection('notes')
    .where('userId', '==', auth.currentUser.uid)
    .orderBy('timestamp', sortOrder === 'newest' ? 'desc' : 'asc')
    .limit(5);

  query.get()
    .then(snapshot => {
      notesList.innerHTML = '';
      if (snapshot.empty) {
        notesList.innerHTML = '<li class="empty-message">Nincsenek jegyzetek</li>';
        return;
      }
      
      snapshot.forEach(doc => {
        const note = doc.data();
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="note-content">
            ${note.content}
          </div>
          <div class="note-date">
            ${note.timestamp ? note.timestamp.toDate().toLocaleString('hu-HU') : 'Dátum nélkül'}
          </div>
        `;
        notesList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Hiba a jegyzetek betöltésekor:', error);
      notesList.innerHTML = '<li class="error-message">Hiba történt a jegyzetek betöltésekor</li>';
    });
}

function loadUpcomingAppointments(range = 'week') {
  const appointmentsList = document.getElementById('upcoming-appointments-list');
  const now = new Date();
  let endDate = new Date();

  switch(range) {
    case 'today':
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'month':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
  }

  const query = db.collection('appointments')
    .where('userId', '==', auth.currentUser.uid)
    .where('date', '>=', now)
    .where('date', '<=', endDate)
    .orderBy('date', 'asc')
    .limit(5);

  query.get()
    .then(snapshot => {
      appointmentsList.innerHTML = '';
      if (snapshot.empty) {
        appointmentsList.innerHTML = '<li class="empty-message">Nincsenek közelgő időpontok</li>';
        return;
      }

      snapshot.forEach(doc => {
        const appointment = doc.data();
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="appointment-title">${appointment.title}</div>
          <div class="appointment-date">
            ${appointment.date.toDate().toLocaleString('hu-HU')}
          </div>
        `;
        appointmentsList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Hiba az időpontok betöltésekor:', error);
      appointmentsList.innerHTML = '<li class="error-message">Hiba történt az időpontok betöltésekor</li>';
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
  db.collection('notes')
    .where('userId', '==', auth.currentUser.uid)
    .orderBy('timestamp', 'desc')
    .get()
    .then(snapshot => {
      notesList.innerHTML = '';
      snapshot.forEach(doc => {
        const note = doc.data();
        const li = document.createElement('li');
        li.setAttribute('data-note-id', doc.id); // Azonosító hozzáadása
        li.id = doc.id; // ID hozzáadása a könnyebb lekéréshez
        li.innerHTML = `
          <span class="note-content">${note.content}</span>
          <div class="note-actions">
            <button onclick="editNote('${doc.id}')">Szerkesztés</button>
            <button onclick="deleteNote('${doc.id}')">Törlés</button>
          </div>
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
      userId: auth.currentUser.uid,
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
  // Először lekérjük a jegyzet jelenlegi tartalmát
  db.collection('notes').doc(noteId).get()
    .then(doc => {
      if (doc.exists) {
        const note = doc.data();
        // Létrehozunk egy szerkesztő űrlapot az aktuális tartalommal
        const li = document.getElementById(noteId) || document.querySelector(`[data-note-id="${noteId}"]`);
        const originalContent = note.content;
        
        // Űrlap létrehozása
        li.innerHTML = `
          <form class="edit-note-form">
            <input type="text" class="edit-note-input" value="${originalContent}" required>
            <button type="submit" class="save-note">Mentés</button>
            <button type="button" class="cancel-edit">Mégse</button>
          </form>
        `;

        // Űrlap események kezelése
        const form = li.querySelector('.edit-note-form');
        const input = li.querySelector('.edit-note-input');
        const cancelButton = li.querySelector('.cancel-edit');

        // Mentés gomb eseménykezelő
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const newContent = input.value.trim();
          
          if (newContent && newContent !== originalContent) {
            db.collection('notes').doc(noteId).update({
              content: newContent,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
              loadNotes(); // Lista újratöltése
            })
            .catch(error => {
              console.error('Hiba a jegyzet szerkesztésekor:', error);
              alert('Hiba történt a jegyzet mentésekor.');
            });
          } else {
            loadNotes(); // Ha nem változott, csak újratöltjük
          }
        });

        // Mégse gomb eseménykezelő
        cancelButton.addEventListener('click', () => {
          loadNotes(); // Visszatöltjük az eredeti listát
        });

        // Input mezőre fókuszálás és a kurzor a szöveg végére
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    })
    .catch(error => {
      console.error('Hiba a jegyzet betöltésekor:', error);
      alert('Hiba történt a jegyzet betöltésekor.');
    });
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

// Időpontok betöltése
function loadAppointments() {
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
  const now = new Date();
  
  db.collection('appointments')
    .where('userId', '==', auth.currentUser.uid)
    .orderBy('date', 'asc')
    .get()
    .then(snapshot => {
      appointmentsList.innerHTML = '';
      snapshot.forEach(doc => {
        const appointment = doc.data();
        const li = document.createElement('li');
        
        // Dátum biztonságos kezelése
        let dateString = 'Érvénytelen dátum';
        try {
          if (appointment.date) {
            const date = appointment.date.toDate();
            dateString = date.toLocaleString('hu-HU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (error) {
          console.error('Hiba a dátum feldolgozásakor:', error);
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

// Új időpont hozzáadása
function addAppointment(e) {
  e.preventDefault();
  console.log('Időpont hozzáadás kezdeményezve');
  
  const title = document.getElementById('appointment-title').value;
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;

  if (title && date && time) {
    try {
      const dateTime = new Date(date + 'T' + time);
      
      if (isNaN(dateTime.getTime())) {
        throw new Error('Érvénytelen dátum vagy idő formátum');
      }

      const timestamp = firebase.firestore.Timestamp.fromDate(dateTime);
      
      db.collection('appointments').add({
        title: title,
        date: timestamp,
        userId: auth.currentUser.uid,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then((docRef) => {
        console.log('Időpont sikeresen hozzáadva');
      
        // Azonnali értesítés az időpont létrehozásáról
        showLocalNotification(
          'Új időpont létrehozva',
          `${title} időpont létrehozva: ${dateTime.toLocaleString('hu-HU')}`,
          docRef.id  // Az új időpont ID-ja
        );
        
        // Form tisztítása
        document.getElementById('appointment-title').value = '';
        document.getElementById('appointment-date').value = '';
        document.getElementById('appointment-time').value = '';
        
        // Lista újratöltése
        loadAppointments();
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
    alert('Kérlek töltsd ki az összes mezőt!');
  }
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
            showLocalNotification(
              'Időpont módosítva',
              `${newTitle} - ${newDateTime.toLocaleString('hu-HU')}`,
              appointmentId  // A módosított időpont ID-ja
            );
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

// Profil betöltése
function loadProfile() {
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Profil beállítások</h2>
    <div class="profile-container">
      <form id="profile-form" class="profile-section">
        <div class="form-group">
          <label for="display-name">Megjelenített név</label>
          <input type="text" id="display-name" required>
        </div>

        <div class="form-group">
          <label for="email">Email cím</label>
          <input type="email" id="email" disabled>
        </div>

        <div class="form-group">
          <label>Értesítési beállítások</label>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" id="email-notifications">
              Email értesítések
            </label>
            <label>
              <input type="checkbox" id="push-notifications">
              Push értesítések
            </label>
          </div>
        </div>

        <div class="button-group">
          <button type="submit" class="primary-button">Mentés</button>
          <button type="button" onclick="changePassword()" class="secondary-button">Jelszó módosítása</button>
        </div>
      </form>

      <div class="profile-section">
        <h3>Fiók információk</h3>
        <div class="info-grid">
          <div class="info-item">
            <span>Regisztráció dátuma</span>
            <span id="registration-date">-</span>
          </div>
          <div class="info-item">
            <span>Jegyzetek száma</span>
            <span id="notes-count">-</span>
          </div>
          <div class="info-item">
            <span>Időpontok száma</span>
            <span id="appointments-count">-</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  loadProfileData();
}

// Profil adatok betöltése
async function loadProfileData() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Alapadatok betöltése
    document.getElementById('email').value = user.email;
    document.getElementById('display-name').value = user.displayName || '';
    
    // Avatar betöltése/generálása
    const avatarPreview = document.getElementById('avatar-preview');
    if (user.photoURL) {
      avatarPreview.style.backgroundImage = `url(${user.photoURL})`;
      avatarPreview.innerHTML = '';
    } else {
      // Kezdőbetű megjelenítése
      const initial = (user.displayName || user.email[0]).charAt(0).toUpperCase();
      avatarPreview.innerHTML = initial;
    }

    // Felhasználói adatok lekérése Firestore-ból
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      document.getElementById('phone').value = userData.phone || '';
      document.getElementById('email-notifications').checked = userData.emailNotifications || false;
      document.getElementById('push-notifications').checked = userData.pushNotifications || false;
      
      // Regisztráció dátuma
      const regDate = user.metadata.creationTime;
      document.getElementById('registration-date').textContent = 
        new Date(regDate).toLocaleDateString('hu-HU');
    }

    // Statisztikák betöltése
    const notesSnapshot = await db.collection('notes')
      .where('userId', '==', user.uid)
      .get();
    document.getElementById('notes-count').textContent = notesSnapshot.size;

    const appointmentsSnapshot = await db.collection('appointments')
      .where('userId', '==', user.uid)
      .get();
    document.getElementById('appointments-count').textContent = appointmentsSnapshot.size;

  } catch (error) {
    console.error('Hiba a profil betöltésekor:', error);
    alert('Hiba történt a profil adatok betöltésekor.');
  }
}

// Profil mentése
async function saveProfile(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Felhasználónév frissítése
    const newDisplayName = document.getElementById('display-name').value;
    await user.updateProfile({
      displayName: newDisplayName
    });

    // Felhasználói adatok mentése Firestore-ba
    await db.collection('users').doc(user.uid).set({
      phone: document.getElementById('phone').value,
      emailNotifications: document.getElementById('email-notifications').checked,
      pushNotifications: document.getElementById('push-notifications').checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    alert('Profil sikeresen mentve!');
  } catch (error) {
    console.error('Hiba a profil mentésekor:', error);
    alert('Hiba történt a profil mentésekor.');
  }
}

// Avatar feltöltés kezelése
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const user = auth.currentUser;
    if (!user) return;

    // Avatar előnézet frissítése
    const reader = new FileReader();
    reader.onload = function(e) {
      const avatarPreview = document.getElementById('avatar-preview');
      avatarPreview.style.backgroundImage = `url(${e.target.result})`;
      avatarPreview.innerHTML = '';
    };
    reader.readAsDataURL(file);

    // TODO: Ide jöhet a fájl feltöltése Firebase Storage-ba
    alert('A profilkép feltöltés funkció még fejlesztés alatt áll.');

  } catch (error) {
    console.error('Hiba a profilkép feltöltésekor:', error);
    alert('Hiba történt a profilkép feltöltésekor.');
  }
}

// Jelszó módosítás
function changePassword() {
  const email = auth.currentUser.email;
  
  auth.sendPasswordResetEmail(email)
    .then(() => {
      alert('Jelszó módosítási link elküldve az email címedre!');
    })
    .catch((error) => {
      console.error('Hiba a jelszó módosítási email küldésekor:', error);
      alert('Hiba történt a jelszó módosítási email küldésekor.');
    });
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
    // Menüsor elrejtése
    document.querySelector('nav').style.display = 'none';
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

  // Értesítések inicializálása
  initializeNotifications();

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

console.log("app.js betöltve és feldolgozva - v1.2 - force cache clear " + new Date().toISOString());