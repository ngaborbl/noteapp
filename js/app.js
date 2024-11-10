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

// Naplózási konfiguráció
const logConfig = {
  isDebugMode: localStorage.getItem('debugMode') === 'true' || window.location.hostname === 'localhost',
  maxDataLength: 1000 // Maximális adat hossz a naplózáshoz
};

// Debug mód beállítása
function setDebugMode(enabled) {
  logConfig.isDebugMode = enabled;
  localStorage.setItem('debugMode', enabled);
}

// Debug üzenetek naplózása
function logDebug(message, data = null) {
  // Egyszerű debug mód ellenőrzés
  const isDebugMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isDebugMode) {
    if (data) {
      console.log(`[Debug] ${message}:`, data);
    } else {
      console.log(`[Debug] ${message}`);
    }
  }
}

// Információs üzenetek naplózása
function logInfo(message, data = null) {
  if (data) {
    console.info(`[Info] ${message}:`, data);
  } else {
    console.info(`[Info] ${message}`);
  }
}

// Figyelmeztető üzenetek naplózása
function logWarn(message, data = null) {
  if (data) {
    console.warn(`[Warn] ${message}:`, data);
  } else {
    console.warn(`[Warn] ${message}`);
  }
}

// Hibaüzenetek naplózása
function logError(message, error = null) {
  if (error) {
    console.error(`[Error] ${message}:`, error);
    // Ha az error egy Error objektum, akkor a stack trace is naplózásra kerül
    if (error.stack) {
      console.error(`Stack trace:`, error.stack);
    }
  } else {
    console.error(`[Error] ${message}`);
  }
}

// Naplózási segédfüggvény nagy adatmennyiséghez
function truncateData(data) {
  if (typeof data === 'string' && data.length > logConfig.maxDataLength) {
    return data.substring(0, logConfig.maxDataLength) + '...';
  }
  return data;
}

// Persistence beállítása
db.enablePersistence()
  .then(() => {
    logInfo("Offline persistence engedélyezve");
  })
  .catch((err) => {
    logError("Persistence hiba", err);
    if (err.code == 'failed-precondition') {
      logWarn("Persistence nem elérhető - több tab nyitva");
    } else if (err.code == 'unimplemented') {
      logWarn("Persistence nem támogatott");
    }
  });

// Alkalmazás inicializálása
function initApp() {
  logDebug("Alkalmazás inicializálása...");
  const navElement = document.querySelector('nav');
  if (navElement) {
    navElement.style.display = 'none';
  }
  
  // Először mutatjuk a login formot
  showLoginForm();
  
  // Majd figyeljük a bejelentkezési státuszt
  auth.onAuthStateChanged((user) => {
    if (user) {
      logInfo("Felhasználó bejelentkezve", { email: user.email });
      if (navElement) {
        navElement.style.display = 'flex';
      }
      showModule('dashboard');
    } else {
      logInfo("Nincs bejelentkezett felhasználó");
      if (navElement) {
        navElement.style.display = 'none';
      }
      showLoginForm();
    }
  });
}

// Modulok megjelenítése
function showModule(moduleId) {
  logDebug("Modul megjelenítése", { moduleId });
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
  logDebug("Dashboard betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  const user = auth.currentUser;
  
  if (!user) {
    logWarn("Nincs bejelentkezett felhasználó a dashboard betöltésekor");
    return;
  }

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

  loadDashboardStats();
  loadRecentNotes();
  loadUpcomingAppointments();
  setupDashboardEvents();
  
  logDebug("Dashboard betöltése befejezve");
}

// Dashboard statisztikák betöltése - javított verzió
function loadDashboardStats() {
  // Jegyzetek számának valós idejű követése
  const notesQuery = db.collection('notes');
  notesQuery.onSnapshot(snapshot => {
    document.getElementById('notes-count').textContent = snapshot.size + ' db';
  }, error => {
    logError('Hiba a jegyzetek számának lekérésekor', error);
    document.getElementById('notes-count').textContent = 'Hiba történt';
  });

  // Mai időpontok számának valós idejű követése
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointmentsQuery = db.collection('appointments')
    .where('date', '>=', today)
    .where('date', '<', tomorrow);

  todayAppointmentsQuery.onSnapshot(snapshot => {
    document.getElementById('today-appointments').textContent = snapshot.size + ' db';
  }, error => {
    logError('Hiba a mai időpontok lekérésekor', error);
    document.getElementById('today-appointments').textContent = 'Hiba történt';
  });

  // Következő időpont valós idejű követése
  const nextAppointmentQuery = db.collection('appointments')
    .where('date', '>=', new Date())
    .orderBy('date', 'asc')
    .limit(1);

  nextAppointmentQuery.onSnapshot(snapshot => {
    if (!snapshot.empty) {
      const nextAppointment = snapshot.docs[0].data();
      document.getElementById('next-appointment').textContent = 
        `${nextAppointment.title} - ${nextAppointment.date.toDate().toLocaleString('hu-HU')}`;
    } else {
      document.getElementById('next-appointment').textContent = 'Nincs közelgő időpont';
    }
  }, error => {
    logError('Hiba a következő időpont lekérésekor', error);
    document.getElementById('next-appointment').textContent = 'Hiba történt';
  });
}

// Dashboard események kezelése
function setupDashboardEvents() {
  logDebug("Dashboard események beállítása kezdődik");
  
  // Keresés kezelése
  const searchInput = document.getElementById('dashboard-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      logDebug("Keresés kezdeményezve", { searchTerm });
      filterDashboardItems(searchTerm);
    });
  }

  // Szűrő kezelése
  const filterSelect = document.getElementById('dashboard-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      const searchTerm = document.getElementById('dashboard-search').value.toLowerCase();
      logDebug("Szűrő változott", { 
        filter: filterSelect.value,
        searchTerm 
      });
      filterDashboardItems(searchTerm);
    });
  }

  // Jegyzetek rendezése
  const notesSort = document.getElementById('notes-sort');
  if (notesSort) {
    notesSort.addEventListener('change', () => {
      logDebug("Jegyzetek rendezési sorrend változott", { 
        sortOrder: notesSort.value 
      });
      loadRecentNotes(notesSort.value);
    });
  }

  // Időpontok időtartam választó
  const appointmentsRange = document.getElementById('appointments-range');
  if (appointmentsRange) {
    appointmentsRange.addEventListener('change', () => {
      logDebug("Időpontok időtartam változott", { 
        range: appointmentsRange.value 
      });
      loadUpcomingAppointments(appointmentsRange.value);
    });
  }

  logDebug("Dashboard események beállítva");
}

// Dashboard elemek szűrése
function filterDashboardItems(searchTerm) {
  logDebug("Dashboard elemek szűrése", { searchTerm });
  
  const filter = document.getElementById('dashboard-filter').value;
  let filteredCount = 0;
  
  if (filter === 'all' || filter === 'notes') {
    const noteItems = document.querySelectorAll('#recent-notes-list li');
    noteItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const visible = text.includes(searchTerm);
      item.style.display = visible ? '' : 'none';
      if (visible) filteredCount++;
    });
  }

  if (filter === 'all' || filter === 'appointments') {
    const appointmentItems = document.querySelectorAll('#upcoming-appointments-list li');
    appointmentItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const visible = text.includes(searchTerm);
      item.style.display = visible ? '' : 'none';
      if (visible) filteredCount++;
    });
  }

  logDebug("Szűrés eredménye", { 
    filter,
    searchTerm,
    filteredCount 
  });
}

// Közelgő időpontok betöltése - valós idejű verzió
function loadUpcomingAppointments(range = 'week') {
  logDebug("Időpontok betöltése kezdődik", { range });
  
  const appointmentsList = document.getElementById('upcoming-appointments-list');
  const now = new Date();
  let endDate = new Date();

  switch(range) {
    case 'today':
      endDate.setHours(23, 59, 59, 999);
      logDebug("Mai időpontok lekérése", { endDate });
      break;
    case 'week':
      endDate.setDate(endDate.getDate() + 7);
      logDebug("Heti időpontok lekérése", { endDate });
      break;
    case 'month':
      endDate.setMonth(endDate.getMonth() + 1);
      logDebug("Havi időpontok lekérése", { endDate });
      break;
  }

  // Korábbi listener eltávolítása ha létezik
  if (window.appointmentsUnsubscribe) {
    logDebug("Korábbi időpont listener eltávolítása");
    window.appointmentsUnsubscribe();
  }

  // Valós idejű query létrehozása
  const query = db.collection('appointments')
    .where('date', '>=', now)
    .where('date', '<=', endDate)
    .orderBy('date', 'asc')
    .limit(5);

  // Valós idejű listener beállítása
  window.appointmentsUnsubscribe = query.onSnapshot((snapshot) => {
    logDebug("Időpontok változás észlelve", { 
      count: snapshot.size,
      changes: snapshot.docChanges().map(change => change.type)
    });
    
    appointmentsList.innerHTML = '';
    if (snapshot.empty) {
      appointmentsList.innerHTML = '<li class="empty-message">Nincsenek közelgő időpontok</li>';
      return;
    }

    snapshot.forEach(doc => {
      const appointment = doc.data();
      const li = document.createElement('li');
      li.setAttribute('data-appointment-id', doc.id);
      
      li.innerHTML = `
        <div class="appointment-title">${appointment.title}</div>
        <div class="appointment-date">
          ${appointment.date.toDate().toLocaleString('hu-HU')}
        </div>
        <div class="appointment-creator">
        </div>
      `;
      appointmentsList.appendChild(li);
    });
  }, (error) => {
    logError('Hiba az időpontok valós idejű követésekor', error);
    appointmentsList.innerHTML = '<li class="error-message">Hiba történt az időpontok betöltésekor</li>';
  });
}

// Legutóbbi jegyzetek betöltése
function loadRecentNotes(sortOrder = 'newest') {
  const notesList = document.getElementById('recent-notes-list');
  
  if (!notesList) {
    logDebug('Jegyzetek lista elem nem található');
    return;
  }

  if (window.notesUnsubscribe) {
    logDebug('Korábbi jegyzet listener eltávolítása');
    window.notesUnsubscribe();
  }

  const query = db.collection('notes')
    .orderBy('timestamp', sortOrder === 'newest' ? 'desc' : 'asc')
    .limit(5);

  window.notesUnsubscribe = query.onSnapshot((snapshot) => {
    notesList.innerHTML = '';
    
    if (snapshot.empty) {
      notesList.innerHTML = '<li class="empty-message">Nincsenek jegyzetek</li>';
      return;
    }

    snapshot.forEach(doc => {
      const note = doc.data();
      const li = document.createElement('li');
      li.setAttribute('data-note-id', doc.id);
      
      li.innerHTML = `
        <div class="note-content">
          ${note.content}
        </div>
        <div class="note-date">
          ${note.timestamp ? note.timestamp.toDate().toLocaleString('hu-HU') : 'Dátum nélkül'}
        </div>
      `;

      // Lista elem hozzáadása a megfelelő pozícióba - csak egyszer
      sortOrder === 'newest' ? 
        notesList.insertBefore(li, notesList.firstChild) : 
        notesList.appendChild(li);
    });

    logDebug('Jegyzetek betöltve', {
      sortOrder,
      count: snapshot.size,
      firstNote: snapshot.docs[0]?.data()?.content
    });
  }, (error) => {
    console.error('Hiba a jegyzetek valós idejű követésekor:', error);
    notesList.innerHTML = '<li class="error-message">Hiba történt a jegyzetek betöltésekor</li>';
  });
}

// Jegyzetek oldal betöltése
function loadNotes() {
  logDebug("Jegyzetek betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Közös Jegyzetek</h2>
    <form id="new-note-form">
      <input type="text" id="new-note" placeholder="Új jegyzet" required>
      <button type="submit">Hozzáadás</button>
    </form>
    <div class="notes-controls">
      <select id="notes-sort">
        <option value="newest">Legújabb elöl</option>
        <option value="oldest">Legrégebbi elöl</option>
      </select>
    </div>
    <ul id="notes-list"></ul>
  `;
  
  document.getElementById('new-note-form').addEventListener('submit', addNote);
  document.getElementById('notes-sort').addEventListener('change', (e) => {
    const sortOrder = e.target.value;
    setupNotesListener(sortOrder);
  });
  
  setupNotesListener('newest');
  logDebug("Jegyzetek oldal betöltve");
}

// Új funkció a jegyzetek valós idejű követésére
function setupNotesListener(sortOrder = 'newest') {
  logDebug("Jegyzetek listener beállítása", { sortOrder });
  const notesList = document.getElementById('notes-list');
  
  if (window.notesUnsubscribe) {
    logDebug("Korábbi jegyzetek listener eltávolítása");
    window.notesUnsubscribe();
  }

  const query = db.collection('notes')
    .orderBy('timestamp', sortOrder === 'newest' ? 'desc' : 'asc');

  window.notesUnsubscribe = query.onSnapshot((snapshot) => {
    logDebug("Jegyzetek változás észlelve", {
      count: snapshot.size,
      changes: snapshot.docChanges().map(change => change.type)
    });
    
    notesList.innerHTML = '';
    
    if (snapshot.empty) {
      notesList.innerHTML = '<li class="empty-message">Nincsenek jegyzetek</li>';
      return;
    }

    snapshot.forEach(doc => {
      const note = doc.data();
      const li = document.createElement('li');
      li.setAttribute('data-note-id', doc.id);
      
      const date = note.timestamp ? note.timestamp.toDate().toLocaleString('hu-HU') : 'Dátum nélkül';
      
      li.innerHTML = `
        <div class="note-content">
          <div class="note-text">${note.content}</div>
          <div class="note-metadata">
            <span class="note-date">Létrehozva: ${date}</span>
          </div>
        </div>
        <div class="note-actions">
          <button onclick="editNote('${doc.id}')" class="edit-btn">Szerkesztés</button>
          <button onclick="deleteNote('${doc.id}')" class="delete-btn">Törlés</button>
        </div>
      `;
      
      notesList.appendChild(li);
    });
  }, (error) => {
    logError('Hiba a jegyzetek követésekor', error);
    notesList.innerHTML = '<li class="error-message">Hiba történt a jegyzetek betöltésekor</li>';
  });
}

// Új jegyzet hozzáadása
function addNote(e) {
  e.preventDefault();
  const newNoteInput = document.getElementById('new-note');
  const newNoteContent = newNoteInput.value;
  logDebug("Új jegyzet létrehozása kezdeményezve", { content: newNoteContent });
  
  if (newNoteContent) {
    const noteData = {
      content: newNoteContent,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      lastModified: firebase.firestore.FieldValue.serverTimestamp()
      // userId eltávolítva
    };
    
    db.collection('notes').add(noteData)
      .then((docRef) => {
        logInfo("Jegyzet sikeresen létrehozva", { id: docRef.id });
        newNoteInput.value = '';
      })
      .catch(error => {
        logError('Hiba a jegyzet hozzáadásakor', error);
      });
  }
}

// Jegyzet szerkesztése
function editNote(noteId) {
  logDebug("Jegyzet szerkesztése kezdeményezve", { noteId });
  
  db.collection('notes').doc(noteId).get()
    .then(doc => {
      if (doc.exists) {
        const note = doc.data();
        const li = document.querySelector(`[data-note-id="${noteId}"]`);
        const originalContent = note.content;
        
        li.innerHTML = `
          <form class="edit-note-form">
            <input type="text" class="edit-note-input" value="${originalContent}" required>
            <button type="submit" class="save-note">Mentés</button>
            <button type="button" class="cancel-edit">Mégse</button>
          </form>
        `;

        const form = li.querySelector('.edit-note-form');
        const input = li.querySelector('.edit-note-input');
        const cancelButton = li.querySelector('.cancel-edit');

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const newContent = input.value.trim();
          
          if (newContent && newContent !== originalContent) {
            logDebug("Jegyzet mentése", { noteId, newContent });
            
            db.collection('notes').doc(noteId).update({
              content: newContent,
              lastModified: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
              logInfo("Jegyzet sikeresen frissítve", { noteId });
            })
            .catch(error => {
              logError('Hiba a jegyzet szerkesztésekor', error);
              alert('Hiba történt a jegyzet mentésekor.');
            });
          }
        });

        cancelButton.addEventListener('click', () => {
          logDebug("Jegyzet szerkesztés megszakítva", { noteId });
          // A listener automatikusan visszaállítja az eredeti megjelenítést
        });

        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    })
    .catch(error => {
      logError('Hiba a jegyzet betöltésekor', error);
      alert('Hiba történt a jegyzet betöltésekor.');
    });
}

// Jegyzet törlése
function deleteNote(noteId) {
  if (confirm('Biztosan törlöd ezt a jegyzetet?')) {
    logDebug("Jegyzet törlés kezdeményezve", { noteId });
    
    db.collection('notes').doc(noteId).delete()
      .then(() => {
        logInfo("Jegyzet sikeresen törölve", { noteId });
      })
      .catch(error => {
        logError('Hiba a jegyzet törlésekor', error);
      });
  }
}

// Időpontok oldal betöltése
function loadAppointments() {
  logDebug("Időpontok oldal betöltése kezdődik");
  
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
  
  if (window.mainAppointmentsUnsubscribe) {
    logDebug("Korábbi időpontok listener eltávolítása");
    window.mainAppointmentsUnsubscribe();
  }

  // Valós idejű query létrehozása
  const query = db.collection('appointments')
    .where('date', '>=', new Date())
    .orderBy('date', 'asc');

  window.mainAppointmentsUnsubscribe = query.onSnapshot(snapshot => {
    logDebug("Időpontok változás észlelve", { 
      count: snapshot.size, 
      changes: snapshot.docChanges().map(change => change.type) 
    });
    
    appointmentsList.innerHTML = '';
    
    if (snapshot.empty) {
      appointmentsList.innerHTML = '<li class="empty-message">Nincsenek időpontok</li>';
      return;
    }

    snapshot.forEach(doc => {
      const appointment = doc.data();
      const li = document.createElement('li');
      li.setAttribute('data-appointment-id', doc.id);
      
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
        logError('Hiba a dátum feldolgozásakor', error);
      }

      li.innerHTML = `
        <div class="appointment-content">
          <div class="appointment-title">
            <strong>${appointment.title}</strong>
          </div>
          <div class="appointment-details">
            <div class="appointment-date">${dateString}</div>
          </div>
        </div>
        <div class="appointment-actions">
          <button onclick="editAppointment('${doc.id}')" class="edit-btn">Szerkesztés</button>
          <button onclick="deleteAppointment('${doc.id}')" class="delete-btn">Törlés</button>
        </div>
      `;
      appointmentsList.appendChild(li);
    });
  }, (error) => {
    logError('Hiba az időpontok valós idejű követésekor', error);
    appointmentsList.innerHTML = '<li class="error-message">Hiba történt az időpontok betöltésekor</li>';
  });

  logDebug("Időpontok oldal betöltve");
}

// Cleanup függvény a modulváltáshoz
function cleanupModules() {
  logDebug("Cleanup kezdése");
  
  // Listener-ek eltávolítása
  const listeners = [
    'notesUnsubscribe',
    'mainNotesUnsubscribe',
    'appointmentsUnsubscribe',
    'mainAppointmentsUnsubscribe'
  ];

  listeners.forEach(listener => {
    if (window[listener]) {
      logDebug(`${listener} eltávolítása`);
      window[listener]();
      window[listener] = null;
    }
  });

  // Statisztika listener-ek eltávolítása
  if (window.statsUnsubscribe) {
    window.statsUnsubscribe.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Hiba a statisztika listener eltávolításakor:", error);
      }
    });
    window.statsUnsubscribe = [];
  }

  // Cache kezelés - biztonságosabb megközelítés
  try {
    // Csak az aktív lekérdezéseket állítjuk le
    db.disableNetwork().then(() => {
      return db.enableNetwork();
    }).catch(err => {
      console.error("Hálózati újracsatlakozási hiba:", err);
    });
  } catch (error) {
    console.error("Cleanup hiba:", error);
  }
}

// Optimalizált modul váltás
function showModule(moduleId) {
  // Előző modul cleanup
  cleanupModules();
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = '';

  // Azonnali modul betöltés a késleltetés eltávolításával
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

// Optimalizált naplózási funkció
function logDebug(message, data = null) {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(`[Debug] ${message}:`, data);
    } else {
      console.log(`[Debug] ${message}`);
    }
  }
}

// Módosított loadDashboardStats eleje
function loadDashboardStats() {
  // Listener-ek tárolása
  window.statsUnsubscribe = [];

  // Jegyzetek számának valós idejű követése - nincs szűrés
  const notesQuery = db.collection('notes');
  window.statsUnsubscribe.push(
    notesQuery.onSnapshot(snapshot => {
      document.getElementById('notes-count').textContent = snapshot.size + ' db';
    })
  );

  // Mai időpontok számának valós idejű követése - nincs userId szűrés
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointmentsQuery = db.collection('appointments')
    .where('date', '>=', today)
    .where('date', '<', tomorrow);

  window.statsUnsubscribe.push(
    todayAppointmentsQuery.onSnapshot(snapshot => {
      document.getElementById('today-appointments').textContent = snapshot.size + ' db';
    })
  );

  // Következő időpont - nincs userId szűrés
  const nextAppointmentQuery = db.collection('appointments')
    .where('date', '>=', new Date())
    .orderBy('date', 'asc')
    .limit(1);

  window.statsUnsubscribe.push(
    nextAppointmentQuery.onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const nextAppointment = snapshot.docs[0].data();
        document.getElementById('next-appointment').textContent = 
          `${nextAppointment.title} - ${nextAppointment.date.toDate().toLocaleString('hu-HU')}`;
      } else {
        document.getElementById('next-appointment').textContent = 'Nincs közelgő időpont';
      }
    })
  );
}

// Új időpont hozzáadása
function addAppointment(e) {
  e.preventDefault();
  
  const title = document.getElementById('appointment-title').value;
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;
  const description = document.getElementById('appointment-description')?.value || '';

  logDebug("Új időpont hozzáadása kezdeményezve", { title, date, time, description });

  if (title && date && time) {
    try {
      const dateTime = new Date(date + 'T' + time);
      
      if (isNaN(dateTime.getTime())) {
        throw new Error('Érvénytelen dátum vagy idő formátum');
      }

      const appointmentData = {
        title: title,
        description: description,
        date: firebase.firestore.Timestamp.fromDate(dateTime),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        lastModified: firebase.firestore.FieldValue.serverTimestamp()
        // userId eltávolítva
      };
      
      db.collection('appointments').add(appointmentData)
        .then((docRef) => {
          logInfo("Időpont sikeresen létrehozva", { id: docRef.id });
          document.getElementById('appointment-title').value = '';
          document.getElementById('appointment-date').value = '';
          document.getElementById('appointment-time').value = '';
          if (document.getElementById('appointment-description')) {
            document.getElementById('appointment-description').value = '';
          }
        })
        .catch(error => {
          logError('Hiba az időpont mentésekor', error);
          alert('Hiba történt az időpont mentésekor: ' + error.message);
        });
    } catch (error) {
      logError('Hiba a dátum feldolgozásakor', error);
      alert('Érvénytelen dátum vagy idő formátum');
    }
  } else {
    logWarn('Hiányzó kötelező mezők', { title, date, time });
    alert('Kérlek töltsd ki az összes kötelező mezőt!');
  }
}

// Időpont szerkesztése
function editAppointment(appointmentId) {
  logDebug("Időpont szerkesztése kezdeményezve", { appointmentId });
  
  db.collection('appointments').doc(appointmentId).get()
    .then(doc => {
      const appointment = doc.data();
      let currentDate, currentTime;
      
      try {
        const date = appointment.date.toDate();
        currentDate = date.toISOString().split('T')[0];
        currentTime = date.toTimeString().slice(0, 5);
        logDebug("Időpont adatok betöltve", { currentDate, currentTime });
      } catch (error) {
        logError('Hiba a dátum konvertálásakor', error);
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
          
          logDebug("Időpont frissítése", { 
            appointmentId, 
            newTitle, 
            newDate: newDateTime 
          });

          db.collection('appointments').doc(appointmentId).update({
            title: newTitle,
            date: newTimestamp,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
          })
          .then(() => {
            logInfo("Időpont sikeresen frissítve", { appointmentId });
          })
          .catch(error => {
            logError('Hiba az időpont frissítésekor', error);
            alert('Hiba történt az időpont frissítésekor: ' + error.message);
          });
        } catch (error) {
          logError('Hiba a dátum feldolgozásakor', error);
          alert('Érvénytelen dátum vagy idő formátum');
        }
      } else {
        logDebug("Időpont szerkesztés megszakítva", { appointmentId });
      }
    })
    .catch(error => {
      logError('Hiba az időpont lekérdezésekor', error);
      alert('Hiba történt az időpont betöltésekor');
    });
}

// Időpont törlése
function deleteAppointment(appointmentId) {
  if (confirm('Biztosan törölni szeretnéd ezt az időpontot?')) {
    logDebug("Időpont törlés kezdeményezve", { appointmentId });
    
    db.collection('appointments').doc(appointmentId).delete()
      .then(() => {
        logInfo("Időpont sikeresen törölve", { appointmentId });
      })
      .catch(error => {
        logError('Hiba az időpont törlésekor', error);
      });
  }
}

// Beállítások oldal betöltése
function loadSettings() {
  logDebug("Beállítások oldal betöltése kezdődik");
  
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
      <button type="submit">Mentés</button>
    </form>
  `;
  
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  
  // Jelenlegi beállítások betöltése
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.getElementById('theme-select').value = currentTheme;
  
  logDebug("Beállítások oldal betöltve", { currentTheme });
}

// Beállítások mentése
function saveSettings(e) {
  e.preventDefault();
  const theme = document.getElementById('theme-select').value;
  
  logDebug("Beállítások mentése", { theme });
  
  try {
    // Beállítások mentése
    localStorage.setItem('theme', theme);
    
    // Téma alkalmazása
    applyTheme(theme);
    
    logInfo("Beállítások sikeresen mentve", { theme });
    alert('Beállítások sikeresen mentve!');
  } catch (error) {
    logError('Hiba a beállítások mentésekor', error);
    alert('Hiba történt a beállítások mentésekor.');
  }
}

// Téma alkalmazása
function applyTheme(theme) {
  logDebug("Téma alkalmazása", { theme });
  document.body.className = theme;
}

// Profil oldal betöltése
function loadProfile() {
  logDebug("Profil oldal betöltése kezdődik");
  
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

        <div class="button-group">
          <button type="submit" class="primary-button">Mentés</button>
          <button type="button" onclick="changePassword()" class="secondary-button">Jelszó módosítása</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  loadProfileData();
  
  logDebug("Profil oldal betöltve");
}

// Profil adatok betöltése
function loadProfileData() {
  logDebug("Profil adatok betöltése kezdődik");
  
  const user = auth.currentUser;
  if (!user) {
    logWarn("Nincs bejelentkezett felhasználó");
    return;
  }

  try {
    document.getElementById('email').value = user.email;
    document.getElementById('display-name').value = user.displayName || '';
    
    logDebug("Profil adatok betöltve", { 
      email: user.email, 
      displayName: user.displayName 
    });
  } catch (error) {
    logError('Hiba a profil adatok betöltésekor', error);
  }
}

// Profil mentése
async function saveProfile(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    logWarn("Nincs bejelentkezett felhasználó");
    return;
  }

  const newDisplayName = document.getElementById('display-name').value;
  logDebug("Profil mentése kezdeményezve", { newDisplayName });

  try {
    await user.updateProfile({
      displayName: newDisplayName
    });

    logInfo("Profil sikeresen mentve", { 
      userId: user.uid, 
      newDisplayName 
    });
    alert('Profil sikeresen mentve!');
  } catch (error) {
    logError('Hiba a profil mentésekor', error);
    alert('Hiba történt a profil mentésekor.');
  }
}

// Jelszó módosítás
function changePassword() {
  logDebug("Jelszó módosítás kezdeményezve");
  
  const email = auth.currentUser.email;
  if (!email) {
    logWarn("Nincs bejelentkezett felhasználó email címe");
    return;
  }
  
  auth.sendPasswordResetEmail(email)
    .then(() => {
      logInfo("Jelszó módosítási email elküldve", { email });
      alert('Jelszó módosítási link elküldve az email címedre!');
    })
    .catch((error) => {
      logError('Hiba a jelszó módosítási email küldésekor', error);
      alert('Hiba történt a jelszó módosítási email küldésekor.');
    });
}

// Téma alkalmazása
function applyTheme(theme) {
  document.body.className = theme;
}

// Bejelentkező űrlap megjelenítése
function showLoginForm() {
  logDebug("Bejelentkező űrlap megjelenítése");
  
  const contentElement = document.getElementById('content');
  if (!contentElement) {
    logError('Content elem nem található');
    return;
  }
  
  contentElement.innerHTML = `
    <div class="login-container">
      <h2>NoteApp bejelentkezés</h2>
      <form id="login-form" class="login-form">
        <div class="form-group">
          <label for="login-email">Email cím</label>
          <input type="email" id="login-email" placeholder="Email cím" required>
        </div>
        <div class="form-group">
          <label for="login-password">Jelszó</label>
          <input type="password" id="login-password" placeholder="Jelszó" required>
        </div>
        <button type="submit" class="login-button">Bejelentkezés</button>
      </form>
    </div>
  `;

  // Login form eseménykezelő
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', login);
  }
  
  logDebug("Bejelentkező űrlap megjelenítve");
}

// Bejelentkezés
function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  logDebug("Bejelentkezés kezdeményezve", { email });
  
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      logInfo("Sikeres bejelentkezés", { 
        userId: userCredential.user.uid,
        email: userCredential.user.email 
      });
    })
    .catch((error) => {
      logError("Bejelentkezési hiba", error);
      alert('Bejelentkezési hiba: ' + error.message);
    });
}

// Kijelentkezés
function logout() {
  logDebug("Kijelentkezés kezdeményezve");
  
  auth.signOut()
    .then(() => {
      logInfo('Sikeres kijelentkezés');
      document.querySelector('nav').style.display = 'none';
      showLoginForm();
    })
    .catch((error) => {
      logError('Hiba a kijelentkezésnél', error);
    });
}

// Eseményfigyelők hozzáadása
document.addEventListener('DOMContentLoaded', () => {
  logDebug("DOM betöltődött, alkalmazás inicializálása kezdődik");
  
  initApp();

  const menuItems = document.querySelectorAll('nav a');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleId = item.id.replace('-menu', '');
      logDebug("Menüpont kiválasztva", { moduleId });
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

  // Téma betöltése és alkalmazása
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
  
  logDebug("Alkalmazás inicializálása befejezve", { 
    theme: savedTheme 
  });
}); // Ez a záró kapocs hiányzott

// Ez a logInfo hívás a DOMContentLoaded eseménykezelőn kívül marad
logInfo("app.js betöltve és feldolgozva", { timestamp: new Date().toISOString() });

//Version 1.87