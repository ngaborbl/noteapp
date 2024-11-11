// Import ES6 module szintaxissal
import { notificationManager } from './notification.js';

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
  isDebugMode: localStorage.getItem('debugMode') === 'true' || 
               window.location.hostname === 'localhost' || 
               window.location.hostname.includes('vercel.app'),
  maxDataLength: 1000
};

// Debug mód beállítása
function setDebugMode(enabled) {
  logConfig.isDebugMode = enabled;
  localStorage.setItem('debugMode', enabled);
}

// Naplózási funkciók
function logDebug(message, data = null) {
  if (logConfig.isDebugMode) {
    if (data) {
      console.debug(`[Debug] ${message}:`, data);
    } else {
      console.debug(`[Debug] ${message}`);
    }
  }
}

function logInfo(message, data = null) {
  if (data) {
    console.info(`[Info] ${message}:`, data);
  } else {
    console.info(`[Info] ${message}`);
  }
}

function logWarn(message, data = null) {
  if (data) {
    console.warn(`[Warn] ${message}:`, data);
  } else {
    console.warn(`[Warn] ${message}`);
  }
}

function logError(message, error = null) {
  if (error) {
    console.error(`[Error] ${message}:`, error);
    if (error.stack) {
      console.error(`Stack trace:`, error.stack);
    }
  } else {
    console.error(`[Error] ${message}`);
  }
}

// Segédfüggvények
function applyTheme(theme) {
  document.body.className = theme;
  logDebug("Téma alkalmazva", { theme });
}

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
async function initApp() {
  logDebug("Alkalmazás inicializálása...");
  const navElement = document.querySelector('nav');
  if (navElement) {
    navElement.style.display = 'none';
  }
  
  // Értesítések inicializálása
  try {
    await notificationManager.initialize();
    logInfo("Értesítési rendszer inicializálva");
  } catch (error) {
    logError("Hiba az értesítési rendszer inicializálásakor", error);
  }
  
  // Először mutatjuk a login formot
  showLoginForm();
  
  // Majd figyeljük a bejelentkezési státuszt
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      logInfo("Felhasználó bejelentkezve", { email: user.email });
      
      // Értesítési engedély kérése bejelentkezéskor
      if (Notification.permission === "default") {
        const granted = await notificationManager.requestPermission();
        logInfo("Értesítési engedély kérése", { granted });
      }
      
      if (navElement) {
        navElement.style.display = 'flex';
      }
      
      // Meglévő időpontok értesítéseinek beállítása
      setupExistingAppointmentNotifications();
      
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

// Bejelentkezési űrlap megjelenítése
function showLoginForm() {
  logDebug("Bejelentkező űrlap megjelenítése");
  
  const contentElement = document.getElementById('content');
  if (!contentElement) {
    logError('Content elem nem található');
    return;
  }
  
  contentElement.innerHTML = `
    <div class="auth-container">
      <div class="auth-box">
        <div class="auth-header">
          <img src="/icons/icon-192.png" alt="NoteApp Logo" class="auth-logo">
          <h2>NoteApp Bejelentkezés</h2>
        </div>
        
        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label for="login-email">Email cím</label>
            <input type="email" 
                   id="login-email" 
                   placeholder="pelda@email.com" 
                   required
                   autocomplete="email">
          </div>
          
          <div class="form-group">
            <label for="login-password">Jelszó</label>
            <div class="password-input-container">
              <input type="password" 
                     id="login-password" 
                     placeholder="Jelszó" 
                     required
                     autocomplete="current-password">
              <button type="button" 
                      class="toggle-password"
                      onclick="togglePasswordVisibility('login-password')">
                👁
              </button>
            </div>
          </div>

          <div class="form-group remember-me">
            <input type="checkbox" id="remember-me">
            <label for="remember-me">Emlékezz rám</label>
          </div>

          <button type="submit" class="auth-button">Bejelentkezés</button>
        </form>

        <div class="auth-links">
          <button onclick="showForgotPasswordForm()" class="text-button">
            Elfelejtett jelszó?
          </button>
          <button onclick="showRegistrationForm()" class="text-button">
            Regisztráció
          </button>
        </div>

        <div id="auth-error" class="auth-error"></div>
      </div>
    </div>
  `;

  // Login form eseménykezelő
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
  
  // "Emlékezz rám" állapot visszaállítása
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  document.getElementById('remember-me').checked = rememberMe;
  
  logDebug("Bejelentkező űrlap megjelenítve");
}

// Jelszó láthatóság kapcsolása
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const button = input.nextElementSibling;
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🔒';
  } else {
    input.type = 'password';
    button.textContent = '👁';
  }
}

// Bejelentkezés kezelése
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me').checked;
  
  logDebug("Bejelentkezés kezdeményezve", { email, rememberMe });
  
  try {
    // Persistence beállítása
    await firebase.auth().setPersistence(
      rememberMe ? 
        firebase.auth.Auth.Persistence.LOCAL : 
        firebase.auth.Auth.Persistence.SESSION
    );
    
    // Bejelentkezés
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    
    // "Emlékezz rám" beállítás mentése
    localStorage.setItem('rememberMe', rememberMe);
    
    // Utolsó bejelentkezés frissítése Firestore-ban
    await db.collection('users').doc(userCredential.user.uid).update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });

    logInfo("Sikeres bejelentkezés", { 
      userId: userCredential.user.uid,
      email: userCredential.user.email 
    });
    
  } catch (error) {
    logError("Bejelentkezési hiba", error);
    
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
      switch(error.code) {
        case 'auth/user-not-found':
          errorElement.textContent = 'Nem létezik felhasználó ezzel az email címmel';
          break;
        case 'auth/wrong-password':
          errorElement.textContent = 'Hibás jelszó';
          break;
        case 'auth/too-many-requests':
          errorElement.textContent = 'Túl sok sikertelen próbálkozás. Próbáld újra később.';
          break;
        default:
          errorElement.textContent = 'Hiba történt a bejelentkezés során';
      }
    }
  }
}

// Elfelejtett jelszó űrlap megjelenítése
function showForgotPasswordForm() {
  const contentElement = document.getElementById('content');
  
  contentElement.innerHTML = `
    <div class="auth-container">
      <div class="auth-box">
        <div class="auth-header">
          <h2>Jelszó visszaállítása</h2>
        </div>
        
        <form id="forgot-password-form" class="auth-form">
          <div class="form-group">
            <label for="reset-email">Email cím</label>
            <input type="email" 
                   id="reset-email" 
                   placeholder="pelda@email.com" 
                   required
                   autocomplete="email">
          </div>

          <button type="submit" class="auth-button">
            Jelszó visszaállítása
          </button>
          
          <button type="button" 
                  onclick="showLoginForm()" 
                  class="secondary-button">
            Vissza a bejelentkezéshez
          </button>
        </form>

        <div id="auth-error" class="auth-error"></div>
      </div>
    </div>
  `;

  document.getElementById('forgot-password-form')
    .addEventListener('submit', handleForgotPassword);
}

// Regisztráció űrlap megjelenítése
function showRegistrationForm() {
  const contentElement = document.getElementById('content');
  
  contentElement.innerHTML = `
    <div class="auth-container">
      <div class="auth-box">
        <div class="auth-header">
          <h2>Regisztráció</h2>
        </div>
        
        <form id="registration-form" class="auth-form">
          <div class="form-group">
            <label for="register-name">Név</label>
            <input type="text" 
                   id="register-name" 
                   placeholder="Teljes név"
                   required>
          </div>

          <div class="form-group">
            <label for="register-email">Email cím</label>
            <input type="email" 
                   id="register-email" 
                   placeholder="pelda@email.com" 
                   required
                   autocomplete="email">
          </div>
          
          <div class="form-group">
            <label for="register-password">Jelszó</label>
            <div class="password-input-container">
              <input type="password" 
                     id="register-password" 
                     placeholder="Jelszó" 
                     required
                     minlength="6">
              <button type="button" 
                      class="toggle-password"
                      onclick="togglePasswordVisibility('register-password')">
                👁
              </button>
            </div>
          </div>

          <button type="submit" class="auth-button">
            Regisztráció
          </button>
          
          <button type="button" 
                  onclick="showLoginForm()" 
                  class="secondary-button">
            Vissza a bejelentkezéshez
          </button>
        </form>

        <div id="auth-error" class="auth-error"></div>
      </div>
    </div>
  `;

  document.getElementById('registration-form')
    .addEventListener('submit', handleRegistration);
}

// Regisztráció kezelése
async function handleRegistration(e) {
  e.preventDefault();
  
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  logDebug("Regisztráció kezdeményezve", { email, name });
  
  try {
    // Felhasználó létrehozása
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    // Felhasználói név beállítása
    await userCredential.user.updateProfile({
      displayName: name
    });

    // Felhasználói dokumentum létrehozása
    await db.collection('users').doc(userCredential.user.uid).set({
      displayName: name,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      avatarColor: '#4CAF50',
      theme: 'light',
      defaultNotifyTime: '10',
      debugMode: false
    });

    logInfo("Sikeres regisztráció", { 
      userId: userCredential.user.uid,
      email: email,
      name: name
    });
    
  } catch (error) {
    logError("Regisztrációs hiba", error);
    
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
      switch(error.code) {
        case 'auth/email-already-in-use':
          errorElement.textContent = 'Ez az email cím már használatban van';
          break;
        case 'auth/invalid-email':
          errorElement.textContent = 'Érvénytelen email cím';
          break;
        case 'auth/weak-password':
          errorElement.textContent = 'A jelszó túl gyenge';
          break;
        default:
          errorElement.textContent = 'Hiba történt a regisztráció során';
      }
    }
  }
}

// Modulok megjelenítése
function showModule(moduleId) {
  logDebug("Modul megjelenítése", { moduleId });
  const contentElement = document.getElementById('content');
  cleanupModules();
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
        logError("Hiba a statisztika listener eltávolításakor:", error);
      }
    });
    window.statsUnsubscribe = [];
  }

  // Cache kezelés
  try {
    db.disableNetwork().then(() => {
      return db.enableNetwork();
    }).catch(err => {
      logError("Hálózati újracsatlakozási hiba:", err);
    });
  } catch (error) {
    logError("Cleanup hiba:", error);
  }
}

// Dashboard betöltése
function loadDashboard() {
  logDebug("Dashboard betöltése kezdődik");
  
  const user = auth.currentUser;
  if (!user) {
    logWarn("Nincs bejelentkezett felhasználó a dashboard betöltésekor");
    return;
  }

  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <div class="dashboard-container">
      <!-- User Welcome Section -->
      <div class="user-welcome-section">
        <div class="user-info">
          <div id="user-avatar" class="user-avatar"></div>
          <div class="user-details">
            <h2>${user.displayName || 'Üdvözlünk!'}</h2>
            <p class="last-login">Utolsó bejelentkezés: ${
              user.metadata.lastSignInTime ? 
              new Date(user.metadata.lastSignInTime).toLocaleString('hu-HU') : 
              'Nem elérhető'
            }</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button onclick="showModule('notes')" class="action-button">
          <i class="note-icon"></i>
          Új jegyzet
        </button>
        <button onclick="showModule('appointments')" class="action-button">
          <i class="calendar-icon"></i>
          Új időpont
        </button>
        <button onclick="showModule('settings')" class="action-button">
          <i class="settings-icon"></i>
          Beállítások
        </button>
      </div>
      
      <!-- Statisztikai kártyák -->
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Jegyzetek száma</h4>
          <div id="notes-count">Betöltés...</div>
          <div class="stat-trend" id="notes-trend"></div>
        </div>
        <div class="stat-card">
          <h4>Mai időpontok</h4>
          <div id="today-appointments">Betöltés...</div>
          <div class="stat-trend" id="appointments-trend"></div>
        </div>
        <div class="stat-card">
          <h4>Következő időpont</h4>
          <div id="next-appointment">Betöltés...</div>
        </div>
      </div>

      <!-- Keresés és szűrés -->
      <div class="dashboard-controls">
        <div class="search-box">
          <input type="text" 
                 id="dashboard-search" 
                 placeholder="Keresés jegyzetek és időpontok között..."
                 autocomplete="off">
          <button class="clear-search" id="clear-search">×</button>
        </div>
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
          <ul id="recent-notes-list" class="animated-list"></ul>
          <button onclick="showModule('notes')" class="view-all-btn">
            Összes jegyzet
          </button>
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
          <ul id="upcoming-appointments-list" class="animated-list"></ul>
          <button onclick="showModule('appointments')" class="view-all-btn">
            Összes időpont
          </button>
        </div>
      </div>
    </div>
  `;

  // User avatar inicializálása
  initUserAvatar();
  
  // Keresés törlő gomb kezelése
  document.getElementById('clear-search').addEventListener('click', () => {
    document.getElementById('dashboard-search').value = '';
    filterDashboardItems('');
  });

  // Dashboard komponensek betöltése
  loadDashboardStats();
  loadRecentNotes();
  loadUpcomingAppointments();
  setupDashboardEvents();
  
  logDebug("Dashboard betöltése befejezve");
}

// Dashboard események kezelése
function setupDashboardEvents() {
  logDebug("Dashboard események beállítása kezdődik");
  
  // Keresés kezelése debounce-szal
  const searchInput = document.getElementById('dashboard-search');
  let searchTimeout;
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const searchTerm = e.target.value.toLowerCase();
      
      searchTimeout = setTimeout(() => {
        logDebug("Keresés kezdeményezve", { searchTerm });
        filterDashboardItems(searchTerm);
      }, 300);
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

  // Gyors műveletek gombok
  const quickActionButtons = document.querySelectorAll('.quick-actions button');
  quickActionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const animation = button.animate([
        { transform: 'scale(0.95)' },
        { transform: 'scale(1)' }
      ], {
        duration: 200,
        easing: 'ease-out'
      });
    });
  });

  logDebug("Dashboard események beállítva");
}

// Meglévő időpontok értesítéseinek beállítása
async function setupExistingAppointmentNotifications() {
  if (Notification.permission !== 'granted') return;

  const now = new Date();
  const query = db.collection('appointments')
    .where('date', '>', firebase.firestore.Timestamp.fromDate(now))
    .orderBy('date', 'asc');

  try {
    const snapshot = await query.get();
    snapshot.forEach(doc => {
      const appointment = {
        id: doc.id,
        ...doc.data()
      };
      notificationManager.scheduleAppointmentNotification(appointment);
    });
    logInfo('Meglévő időpontok értesítései beállítva', { count: snapshot.size });
  } catch (error) {
    logError('Hiba a meglévő időpontok értesítéseinek beállításakor', error);
  }
}

// Dashboard statisztikák betöltése
function loadDashboardStats() {
  window.statsUnsubscribe = [];

  // Jegyzetek számának követése
  const notesQuery = db.collection('notes');
  window.statsUnsubscribe.push(
    notesQuery.onSnapshot(snapshot => {
      document.getElementById('notes-count').textContent = snapshot.size + ' db';
    })
  );

  // Mai időpontok követése
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

  // Következő időpont követése
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

// Jegyzetek betöltése
function loadRecentNotes(sortOrder = 'newest') {
  const notesList = document.getElementById('recent-notes-list');
  
  if (!notesList) {
    logDebug('Jegyzetek lista elem nem található');
    return;
  }

  if (window.notesUnsubscribe) {
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

      sortOrder === 'newest' ? 
        notesList.insertBefore(li, notesList.firstChild) : 
        notesList.appendChild(li);
    });

    logDebug('Jegyzetek betöltve', {
      sortOrder,
      count: snapshot.size
    });
  });
}

// Közelgő időpontok betöltése
function loadUpcomingAppointments(range = 'week') {
  logDebug("Időpontok betöltése kezdődik", { range });
  
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

  if (window.appointmentsUnsubscribe) {
    window.appointmentsUnsubscribe();
  }

  const query = db.collection('appointments')
    .where('date', '>=', now)
    .where('date', '<=', endDate)
    .orderBy('date', 'asc')
    .limit(5);

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
      const li = createAppointmentElement(doc.id, appointment);
      appointmentsList.appendChild(li);
    });
  }, (error) => {
    logError('Hiba az időpontok követésekor', error);
    appointmentsList.innerHTML = '<li class="error-message">Hiba történt az időpontok betöltésekor</li>';
  });
}

// UI elemek létrehozása
function createAppointmentElement(id, appointment) {
  const li = document.createElement('li');
  li.setAttribute('data-appointment-id', id);
  
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
        ${appointment.description ? 
          `<div class="appointment-description">${appointment.description}</div>` : 
          ''}
      </div>
      ${appointment.notifyBefore ? 
        `<div class="appointment-notification">
          Értesítés: ${appointment.notifyBefore} perccel előtte
        </div>` : 
        ''}
    </div>
    <div class="appointment-actions">
      <button onclick="editAppointment('${id}')" class="edit-btn">
        Szerkesztés
      </button>
      <button onclick="deleteAppointment('${id}')" class="delete-btn">
        Törlés
      </button>
    </div>
  `;
  
  return li;
}

// Státusz és hiba kezelés
function showStatusMessage(message, type = 'info') {
  const statusContainer = document.getElementById('status-container') || 
    createStatusContainer();

  const statusElement = document.createElement('div');
  statusElement.className = `status-message ${type}`;
  statusElement.textContent = message;

  statusContainer.appendChild(statusElement);

  setTimeout(() => {
    statusElement.style.opacity = '0';
    setTimeout(() => statusElement.remove(), 300);
  }, 3000);
}

function createStatusContainer() {
  const container = document.createElement('div');
  container.id = 'status-container';
  document.body.appendChild(container);
  return container;
}

function showErrorMessage(message) {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message';
  errorContainer.innerHTML = `
    <div class="error-content">
      <h3>Hiba történt</h3>
      <p>${message}</p>
      <button onclick="this.parentElement.remove()">Bezárás</button>
    </div>
  `;
  document.body.appendChild(errorContainer);
}

// Online/Offline állapot kezelése
function handleOnlineStatus(event) {
  const isOnline = event.type === 'online';
  
  logDebug(`Alkalmazás ${isOnline ? 'online' : 'offline'} módba váltott`);
  
  showStatusMessage(
    isOnline ? 'Kapcsolódva' : 'Nincs internetkapcsolat',
    isOnline ? 'success' : 'warning'
  );

  if (isOnline) {
    db.enableNetwork()
      .then(() => logDebug('Hálózati kapcsolat visszaállítva'))
      .catch(error => logError('Hiba a hálózati kapcsolat visszaállításakor', error));
  } else {
    db.disableNetwork()
      .then(() => logDebug('Hálózati kapcsolat letiltva'))
      .catch(error => logError('Hiba a hálózati kapcsolat letiltásakor', error));
  }
}

// User avatar kezelése
async function initUserAvatar() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const avatarColor = userData.avatarColor || '#4CAF50';
    
    const avatarElement = document.getElementById('user-avatar');
    if (avatarElement) {
      const initials = (user.displayName || 'U')
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();
      
      avatarElement.style.backgroundColor = avatarColor;
      avatarElement.textContent = initials;
    }
  } catch (error) {
    logError('Hiba az avatar inicializálásakor', error);
  }
}

// Navigáció kezelése
function setupNavigation() {
  const menuItems = document.querySelectorAll('nav a');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleId = item.id.replace('-menu', '');
      
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');
      
      const content = document.getElementById('content');
      content.style.opacity = '0';
      
      setTimeout(() => {
        showModule(moduleId);
        content.style.opacity = '1';
      }, 200);
    });
  });

  const logoutButton = document.getElementById('logout-menu');
  if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Biztosan kijelentkezel?')) {
        await logout();
      }
    });
  }
}

// PWA telepítés kezelése
function setupPWAInstall() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const installButton = document.createElement('button');
    installButton.className = 'install-button';
    installButton.innerHTML = `
      <i class="download-icon"></i>
      Telepítés
    `;
    
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      logDebug('PWA telepítési válasz', { outcome });
      deferredPrompt = null;
      installButton.remove();
    });

    document.querySelector('nav').appendChild(installButton);
  });
}

// Alkalmazás inicializálása és eseménykezelők beállítása
document.addEventListener('DOMContentLoaded', async () => {
  logDebug("DOM betöltődött, alkalmazás inicializálása kezdődik");
  
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      logInfo('Service Worker sikeresen regisztrálva', registration);
    }

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    await notificationManager.initialize();
    await initApp();
    setupNavigation();

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    const debugMode = localStorage.getItem('debugMode') === 'true';
    setDebugMode(debugMode);

    setupPWAInstall();

    logDebug("Alkalmazás inicializálása befejezve", {
      theme: savedTheme,
      debugMode
    });
  } catch (error) {
    logError('Hiba az alkalmazás inicializálásakor', error);
    showErrorMessage('Hiba történt az alkalmazás betöltésekor');
  }
});

// Export
export {
  notificationManager,
  initApp,
  loadDashboard,
  setupDashboardEvents
};

// Timestamp helper függvény
function getTimestamp() {
  const now = new Date();
  return now.toISOString();
}

// Verzió információ
logInfo("NoteApp v1.88 betöltve", { 
  timestamp: new Date().toISOString(),
  environment: self.location.hostname === 'localhost' ? 'development' : 'production'
});