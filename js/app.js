// Import ES6 module szintaxissal
// notificationManager már globálisan elérhető a window objektumon keresztül
import { createAppointmentElement, showEditAppointmentModal } from './ui-utils.js';

// Globális notificationManager referencia
const notificationManager = window.notificationManager;

// Az összes globálisan szükséges függvényt exportáljuk
// Megjegyzés: initApp később exportálódik mint async function
export { 
  showLoginForm,
  showRegistrationForm, 
  showForgotPasswordForm,
  handleLogin,
  handleRegistration,
  handleForgotPassword,
  handleLogout,
  togglePasswordVisibility,
  showModule,
  showModal,
  hideModal,
  showConfirmModal,
  editAppointment,
  deleteAppointment,
  showChangeEmailModal,
  showChangePasswordModal,
  handleAccountDelete,
  resetSettings,
  toggleNoteComplete,
  deleteNoteQuick,
  editNoteInline,
  cancelNoteEdit,
  saveNoteEdit,
  deleteAppointmentQuick
};

// Firebase szolgáltatások elérése a globális változókon keresztül
// Ezeket az initApp függvényben inicializáljuk
let auth, db;

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

// Timestamp helper függvény
function getTimestamp() {
  const now = new Date();
  return now.toISOString();
}
  
// Alkalmazás inicializálása
export async function initApp() {
  logDebug("Alkalmazás inicializálása...");
  
  // Firebase szolgáltatások inicializálása
  auth = window.fbAuth;
  db = window.fbDb;
  
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
  window.fbAuth.onAuthStateChanged(async (user) => {
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

// Bejelentkezés kezelése
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me').checked;
  
  logDebug("Bejelentkezés kezdeményezve", { email, rememberMe });
  
  try {
    // Persistence beállítása
    await auth.setPersistence(
      rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
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
      createdAt: window.fbDb.serverTimestamp(),
      lastLogin: window.fbDb.serverTimestamp(),
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

async function handleForgotPassword(e) {
  e.preventDefault();
  
  const email = document.getElementById('reset-email').value;
  
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('Jelszó visszaállító email elküldve', 'success');
    showLoginForm(); // Visszatérés a bejelentkezési oldalra
  } catch (error) {
    logError("Hiba a jelszó visszaállításnál", error);
    let errorMessage = 'Nem sikerült elküldeni a jelszó visszaállító emailt';
    
    switch(error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Nem található felhasználó ezzel az email címmel';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Érvénytelen email cím';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Túl sok próbálkozás. Kérjük próbálja később.';
        break;
    }
    
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
      errorElement.textContent = errorMessage;
    }
  }
}

// Kijelentkezés
async function handleLogout() {
  logDebug("Kijelentkezés kezdeményezve");
  
  try {
    // Értesítések törlése
    notificationManager.clearScheduledNotifications();
    
    // Kijelentkezés
    await auth.signOut();
    
    // UI frissítése
    document.querySelector('nav').style.display = 'none';
    showLoginForm();
    
    logInfo('Sikeres kijelentkezés');
  } catch (error) {
    logError('Hiba a kijelentkezésnél', error);
  }
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

// Modulok megjelenítése
function showModule(moduleId) {
  logDebug("Modul megjelenítése", { moduleId });
  const contentElement = document.getElementById('content');
  cleanupModules();
  contentElement.innerHTML = '';
  
  // Bottom navigation aktív állapot frissítése
  updateBottomNavActive(moduleId);

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

// Bottom navigation aktív állapot frissítése
function updateBottomNavActive(moduleId) {
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  bottomNavItems.forEach(item => {
    if (item.dataset.page === moduleId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function initUserAvatar() {
  const user = auth.currentUser;
  if (!user) {
    logWarn('Nincs bejelentkezett felhasználó az avatar inicializálásakor');
    return;
  }

  const avatarElements = document.querySelectorAll('#user-avatar, .profile-avatar .avatar-preview');
  if (avatarElements.length === 0) {
    logWarn('Avatar elemek nem találhatók');
    return;
  }

  // Felhasználói beállítások lekérése
  db.collection('users').doc(user.uid).get()
    .then(doc => {
      if (!doc.exists) {
        logWarn('Felhasználói dokumentum nem található');
        return;
      }
      
      const userData = doc.data();
      const backgroundColor = userData.avatarColor || '#4CAF50';
      const displayText = user.displayName ? 
        user.displayName.charAt(0).toUpperCase() : 
        '?';

      avatarElements.forEach(element => {
        element.style.backgroundColor = backgroundColor;
        element.textContent = displayText;
      });

      logDebug('Avatar sikeresen inicializálva', {
        backgroundColor,
        displayText
      });
    })
    .catch(error => {
      logError("Hiba az avatar inicializálásakor", error);
    });
}

// Dashboard betöltése - PÁRKAPCSOLATI/CSALÁDI VERZIÓ
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
      
      <!-- Gyors gombok - KÖZPONTOZVA -->
      <div class="quick-actions-center">
        <button onclick="showModule('notes')" class="action-btn-primary">
          + Új jegyzet
        </button>
        <button onclick="showModule('appointments')" class="action-btn-primary">
          + Új időpont
        </button>
      </div>

      <!-- Közös jegyzetek (Todo lista stílus) -->
      <div class="shared-section">
        <div class="section-header-simple">
          <h3>📝 Közös jegyzetek</h3>
          <span class="item-count" id="notes-count">0</span>
        </div>
        <div id="shared-notes-list" class="todo-list"></div>
      </div>

      <!-- Közös időpontok -->
      <div class="shared-section">
        <div class="section-header-simple">
          <h3>📅 Közelgő időpontok</h3>
          <span class="item-count" id="appointments-count">0</span>
        </div>
        <div id="shared-appointments-list" class="appointments-list"></div>
      </div>
    </div>
  `;

  // Jegyzetek és időpontok betöltése
  loadSharedNotes();
  loadSharedAppointments();
  
  logDebug("Dashboard betöltése befejezve");
}

function filterDashboardItems(searchTerm) {
  logDebug("Dashboard elemek szűrése", { searchTerm });

  const notesList = document.getElementById('recent-notes-list');
  const appointmentsList = document.getElementById('upcoming-appointments-list');
  const filter = document.getElementById('dashboard-filter').value;

  if (!notesList || !appointmentsList) {
    logWarn('Lista elemek nem találhatók');
    return;
  }

  const searchLower = searchTerm.toLowerCase();

  // Jegyzetek szűrése
  const notes = notesList.getElementsByTagName('li');
  let visibleNotes = 0;
  
  Array.from(notes).forEach(note => {
    if (note.classList.contains('empty-message')) return;
    
    const content = note.querySelector('.note-content')?.textContent.toLowerCase() || '';
    const shouldShow = (filter === 'all' || filter === 'notes') && 
                      content.includes(searchLower);
    
    if (shouldShow) visibleNotes++;
    note.style.display = shouldShow ? '' : 'none';
  });

  // Időpontok szűrése
  const appointments = appointmentsList.getElementsByTagName('li');
  let visibleAppointments = 0;
  
  Array.from(appointments).forEach(appointment => {
    if (appointment.classList.contains('empty-message')) return;
    
    const title = appointment.querySelector('.appointment-title')?.textContent.toLowerCase() || '';
    const description = appointment.querySelector('.appointment-description')?.textContent.toLowerCase() || '';
    const shouldShow = (filter === 'all' || filter === 'appointments') && 
                      (title.includes(searchLower) || description.includes(searchLower));
    
    if (shouldShow) visibleAppointments++;
    appointment.style.display = shouldShow ? '' : 'none';
  });

  // "Nincs találat" üzenetek kezelése
  updateEmptyState(notesList, visibleNotes, 'Jegyzetek');
  updateEmptyState(appointmentsList, visibleAppointments, 'Időpontok');

  logDebug('Szűrés eredménye', {
    visibleNotes,
    visibleAppointments,
    filter
  });
}

// Segédfüggvény az üres állapot kezeléséhez
function updateEmptyState(container, visibleCount, type) {
  const existingEmpty = container.querySelector('.empty-message');
  
  if (visibleCount === 0) {
    if (!existingEmpty) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'empty-message';
      emptyMessage.innerHTML = `
        <div class="empty-state">
          <img src="/icons/search-empty.png" alt="Nincs találat">
          <p>Nincs találat a ${type.toLowerCase()} között</p>
        </div>
      `;
      container.appendChild(emptyMessage);
    }
  } else if (existingEmpty) {
    existingEmpty.remove();
  }
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
        filterDashboardItems(searchTerm);
      }, 300);
    });
  }

  // Szűrő kezelése
  const filterSelect = document.getElementById('dashboard-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      const searchTerm = searchInput.value.toLowerCase();
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
    .where('date', '>=', firebase.firestore.Timestamp.fromDate(today))
    .where('date', '<', firebase.firestore.Timestamp.fromDate(tomorrow));

  window.statsUnsubscribe.push(
    todayAppointmentsQuery.onSnapshot(snapshot => {
      document.getElementById('today-appointments').textContent = snapshot.size + ' db';
    })
  );

  // Következő időpont követése
  const nextAppointmentQuery = db.collection('appointments')
    .where('date', '>=', firebase.firestore.Timestamp.fromDate(new Date()))
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
    .where('date', '>=', firebase.firestore.Timestamp.fromDate(now))
    .where('date', '<=', firebase.firestore.Timestamp.fromDate(endDate))
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

// Jegyzetek oldal betöltése
function loadNotes() {
  logDebug("Jegyzetek betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <div class="notes-container">
      <div class="section-header">
        <h2>Jegyzetek</h2>
      </div>

      <form id="new-note-form" class="note-form">
        <div class="form-group">
          <textarea id="note-content" 
                    placeholder="Új jegyzet írása..." 
                    required></textarea>
        </div>
        <div class="form-controls">
          <label class="checkbox-container">
            <input type="checkbox" id="note-important">
            <span class="checkbox-label">Fontos</span>
          </label>
          <button type="submit" class="primary-button">
            Jegyzet mentése
          </button>
        </div>
      </form>

      <div id="notes-list" class="notes-grid"></div>
    </div>
  `;

  // Eseménykezelők beállítása
  setupNotesEventHandlers();
  
  // Jegyzetek betöltése
  loadNotesList();
  
  logDebug("Jegyzetek oldal betöltve");
}

// Jegyzetek eseménykezelők beállítása
function setupNotesEventHandlers() {
  // Új jegyzet form
  document.getElementById('new-note-form').addEventListener('submit', handleNewNote);
}
    const filter = e.target.value;
    const searchTerm = searchInput.value.toLowerCase();
    logDebug("Jegyzetek szűrő változott", { filter, searchTerm });
    filterNotes(searchTerm, filter);
  });
}

// Új jegyzet hozzáadása
async function handleNewNote(e) {
  e.preventDefault();
  
  const content = document.getElementById('note-content').value.trim();
  const isImportant = document.getElementById('note-important').checked;
  
  if (!content) return;
  
  logDebug("Új jegyzet létrehozása", { content, isImportant });
  
  try {
    const noteData = {
      content,
      isImportant,
      completed: false,
      timestamp: firebase.firestore.Timestamp.now(),
      lastModified: firebase.firestore.Timestamp.now(),
      userId: auth.currentUser.uid
    };
    
    await db.collection('notes').add(noteData);
    
    // Értesítés küldése
    if (window.simpleNotificationManager && window.simpleNotificationManager.enabled) {
      const userName = auth.currentUser.displayName || 'Valaki';
      window.simpleNotificationManager.notifyNewNote(content, userName);
    }
    
    // Form tisztítása
    document.getElementById('note-content').value = '';
    document.getElementById('note-important').checked = false;
    
    logInfo("Jegyzet sikeresen létrehozva");
  } catch (error) {
    logError("Hiba a jegyzet létrehozásakor", error);
    alert('Nem sikerült létrehozni a jegyzetet');
  }
}

// Jegyzetek lista betöltése
function loadNotesList() {
  const notesList = document.getElementById('notes-list');
  
  if (!notesList) {
    logWarn('Jegyzetek lista elem nem található');
    return;
  }

  if (window.notesUnsubscribe) {
    window.notesUnsubscribe();
  }

  // Lekérdezés csak a felhasználó jegyzetei
  const query = db.collection('notes')
    .where('userId', '==', auth.currentUser.uid)
    .orderBy('timestamp', 'desc');

  window.notesUnsubscribe = query.onSnapshot((snapshot) => {
    const changes = snapshot.docChanges();
    
    changes.forEach(change => {
      const note = change.doc.data();
      const noteId = change.doc.id;
      
      if (change.type === 'added') {
        const noteElement = createNoteElement(noteId, note);
        notesList.insertBefore(noteElement, notesList.firstChild);
      }
      else if (change.type === 'modified') {
        const existingNote = document.querySelector(`[data-note-id="${noteId}"]`);
        if (existingNote) {
          const noteElement = createNoteElement(noteId, note);
          existingNote.replaceWith(noteElement);
        }
      }
      else if (change.type === 'removed') {
        const existingNote = document.querySelector(`[data-note-id="${noteId}"]`);
        if (existingNote) {
          existingNote.remove();
        }
      }
    });

    if (snapshot.empty) {
      notesList.innerHTML = `
        <div class="empty-state">
          <img src="/icons/notes-empty.svg" alt="Nincs jegyzet">
          <p>Még nincsenek jegyzetek</p>
        </div>
      `;
    }
    
    logDebug('Jegyzetek lista frissítve', { 
      changes: changes.map(c => c.type) 
    });
  }, error => {
    logError('Hiba a jegyzetek betöltésekor', error);
    notesList.innerHTML = `
      <div class="error-state">
        <p>Hiba történt a jegyzetek betöltésekor</p>
        <button onclick="loadNotesList()">Újrapróbálkozás</button>
      </div>
    `;
  });
}

// Jegyzet elem létrehozása
function createNoteElement(id, note) {
  const div = document.createElement('div');
  div.className = `note-card ${note.isImportant ? 'important' : ''}`;
  div.setAttribute('data-note-id', id);
  
  div.innerHTML = `
    <div class="note-content">
      <p>${note.content}</p>
    </div>
    <div class="note-meta">
      <span class="note-date">
        ${note.timestamp.toDate().toLocaleString('hu-HU')}
      </span>
      ${note.isImportant ? 
        '<span class="note-badge important">Fontos</span>' : 
        ''}
    </div>
    <div class="note-actions">
      <button onclick="editNote('${id}')" class="edit-button">
        <i class="edit-icon"></i>
      </button>
      <button onclick="deleteNote('${id}')" class="delete-button">
        <i class="delete-icon"></i>
      </button>
    </div>
  `;
  
  return div;
}

// Jegyzet szerkesztése
async function editNote(noteId) {
  logDebug("Jegyzet szerkesztése", { noteId });
  
  try {
    const doc = await db.collection('notes').doc(noteId).get();
    if (!doc.exists) {
      throw new Error('Jegyzet nem található');
    }
    
    const note = doc.data();
    
    // Szerkesztő modál megjelenítése
    showModal({
      title: 'Jegyzet szerkesztése',
      content: `
        <form id="edit-note-form" class="note-form">
          <div class="form-group">
            <textarea id="edit-note-content" required>${note.content}</textarea>
          </div>
          <div class="form-controls">
            <label class="checkbox-container">
              <input type="checkbox" id="edit-note-important" 
                     ${note.isImportant ? 'checked' : ''}>
              <span class="checkbox-label">Fontos</span>
            </label>
          </div>
        </form>
      `,
      buttons: [
        {
          text: 'Mentés',
          type: 'primary',
          onClick: async () => {
            const content = document.getElementById('edit-note-content').value.trim();
            const isImportant = document.getElementById('edit-note-important').checked;
            
            if (!content) return;
            
            try {
              await db.collection('notes').doc(noteId).update({
                content,
                isImportant,
                lastModified: firebase.firestore.Timestamp.now()
              });
              
              logInfo("Jegyzet sikeresen frissítve");
              hideModal();
            } catch (error) {
              logError("Hiba a jegyzet frissítésekor", error);
              alert('Nem sikerült frissíteni a jegyzetet');
            }
          }
        },
        {
          text: 'Mégse',
          type: 'secondary',
          onClick: hideModal
        }
      ]
    });
    
  } catch (error) {
    logError("Hiba a jegyzet szerkesztésekor", error);
    alert('Nem sikerült betölteni a jegyzetet');
  }
}

// Jegyzet törlése
async function deleteNote(noteId) {
  logDebug("Jegyzet törlése", { noteId });
  
  if (!confirm('Biztosan törölni szeretnéd ezt a jegyzetet?')) {
    return;
  }
  
  try {
    await db.collection('notes').doc(noteId).delete();
    logInfo("Jegyzet sikeresen törölve");
  } catch (error) {
    logError("Hiba a jegyzet törlésekor", error);
    alert('Nem sikerült törölni a jegyzetet');
  }
}

// Jegyzetek szűrése
function filterNotes(searchTerm, filter = 'all') {
  const notes = document.querySelectorAll('.note-card');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  notes.forEach(note => {
    const content = note.querySelector('.note-content').textContent.toLowerCase();
    const timestamp = new Date(note.querySelector('.note-date').textContent);
    const isImportant = note.classList.contains('important');
    
    let visible = content.includes(searchTerm);
    
    if (visible && filter !== 'all') {
      switch(filter) {
        case 'recent':
          visible = timestamp >= today;
          break;
        case 'important':
          visible = isImportant;
          break;
      }
    }
    
    note.style.display = visible ? '' : 'none';
  });
}

// Időpontok oldal betöltése
function loadAppointments() {
  logDebug("Időpontok oldal betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <div class="appointments-container">
      <div class="section-header">
        <h2>Időpontok</h2>
      </div>

      <form id="new-appointment-form" class="appointment-form">
        <div class="form-row">
          <div class="form-group">
            <label for="appointment-title">Megnevezés</label>
            <input type="text" 
                   id="appointment-title" 
                   placeholder="Időpont megnevezése"
                   required>
          </div>
          <div class="form-group">
            <label for="appointment-date">Dátum</label>
            <input type="date" 
                   id="appointment-date"
                   min="${new Date().toISOString().split('T')[0]}"
                   required>
          </div>
          <div class="form-group">
            <label for="appointment-time">Időpont</label>
            <input type="time" 
                   id="appointment-time"
                   required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="appointment-description">Leírás</label>
            <textarea id="appointment-description" 
                      placeholder="Időpont részletei (opcionális)"></textarea>
          </div>
          <div class="form-group">
            <label for="appointment-notify">Értesítés</label>
            <select id="appointment-notify">
              <option value="10">10 perccel előtte</option>
              <option value="30">30 perccel előtte</option>
              <option value="60">1 órával előtte</option>
              <option value="1440">1 nappal előtte</option>
              <option value="0">Nincs értesítés</option>
            </select>
          </div>
        </div>
        <div class="form-controls">
          <button type="submit" class="primary-button">
            Időpont mentése
          </button>
        </div>
      </form>

      <div id="appointments-list" class="appointments-grid"></div>
    </div>
  `;

  // Eseménykezelők beállítása
  setupAppointmentsEventHandlers();
  
  // Időpontok betöltése
  loadAppointmentsList();
  
  logDebug("Időpontok oldal betöltve");
}

// Időpontok eseménykezelők beállítása
function setupAppointmentsEventHandlers() {
  // Új időpont form
  document.getElementById('new-appointment-form')
    .addEventListener('submit', handleNewAppointment);
}
  // Szűrés
  document.getElementById('appointments-filter').addEventListener('change', (e) => {
    const filter = e.target.value;
    const searchTerm = searchInput.value.toLowerCase();
    logDebug("Időpontok szűrő változott", { filter, searchTerm });
    filterAppointments(searchTerm, filter);
  });

  // Minimum dátum beállítása
  const dateInput = document.getElementById('appointment-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;
}

// Új időpont hozzáadása
async function handleNewAppointment(e) {
  e.preventDefault();
  
  const title = document.getElementById('appointment-title').value.trim();
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;
  const description = document.getElementById('appointment-description').value.trim();
  const notifyBefore = parseInt(document.getElementById('appointment-notify').value);
  
  if (!title || !date || !time) return;
  
  try {
    const dateTime = new Date(`${date}T${time}`);
    if (isNaN(dateTime.getTime())) {
      throw new Error('Érvénytelen dátum vagy idő');
    }

    logDebug("Új időpont létrehozása", { 
      title, 
      dateTime, 
      notifyBefore 
    });
    
    const appointmentData = {
      title,
      description,
      date: firebase.firestore.Timestamp.fromDate(dateTime),
      notifyBefore,
      timestamp: firebase.firestore.Timestamp.now(),
      userId: auth.currentUser.uid
    };
    
    const docRef = await db.collection('appointments').add(appointmentData);
    
    // Értesítés beállítása - JELENLEG NEM HASZNÁLJUK
    // if (notifyBefore > 0) {
    //   await notificationManager.scheduleAppointmentNotification({
    //     id: docRef.id,
    //     ...appointmentData
    //   });
    // }
    
    // Form tisztítása
    e.target.reset();
    document.getElementById('appointment-date').value = new Date().toISOString().split('T')[0];
    
    logInfo("Időpont sikeresen létrehozva", { id: docRef.id });
  } catch (error) {
    logError("Hiba az időpont létrehozásakor", error);
    alert('Nem sikerült létrehozni az időpontot');
  }
}

// Időpontok lista betöltése
function loadAppointmentsList() {
  const appointmentsList = document.getElementById('appointments-list');
  
  if (!appointmentsList) {
    logWarn('Időpontok lista elem nem található');
    return;
  }

  if (window.appointmentsUnsubscribe) {
    window.appointmentsUnsubscribe();
  }

  // Lekérdezés csak a felhasználó időpontjai
  const query = db.collection('appointments')
    .where('userId', '==', auth.currentUser.uid)
    .orderBy('date', 'asc');

  window.appointmentsUnsubscribe = query.onSnapshot((snapshot) => {
    const changes = snapshot.docChanges();
    
    changes.forEach(change => {
      const appointment = change.doc.data();
      const appointmentId = change.doc.id;
      
      if (change.type === 'added') {
        const appointmentElement = createAppointmentElement(appointmentId, appointment);
        
        // Beszúrás időrendi sorrendben
        let inserted = false;
        const existingAppointments = appointmentsList.children;
        for (let i = 0; i < existingAppointments.length; i++) {
          const existing = existingAppointments[i];
          const existingDate = existing.getAttribute('data-date');
          if (existingDate && appointment.date.toDate() < new Date(existingDate)) {
            appointmentsList.insertBefore(appointmentElement, existing);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          appointmentsList.appendChild(appointmentElement);
        }
      }
      else if (change.type === 'modified') {
        const existingAppointment = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (existingAppointment) {
          const appointmentElement = createAppointmentElement(appointmentId, appointment);
          existingAppointment.replaceWith(appointmentElement);
        }
      }
      else if (change.type === 'removed') {
        const existingAppointment = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (existingAppointment) {
          existingAppointment.remove();
        }
      }
    });

    if (snapshot.empty) {
      appointmentsList.innerHTML = `
        <div class="empty-state">
          <img src="/icons/calendar-empty.svg" alt="Nincs időpont">
          <p>Még nincsenek időpontok</p>
        </div>
      `;
    }
    
    logDebug('Időpontok lista frissítve', { 
      changes: changes.map(c => c.type) 
    });
  }, error => {
    logError('Hiba az időpontok betöltésekor', error);
    appointmentsList.innerHTML = `
      <div class="error-state">
        <p>Hiba történt az időpontok betöltésekor</p>
        <button onclick="loadAppointmentsList()">Újrapróbálkozás</button>
      </div>
    `;
  });
}

// Időpont törlése
async function deleteAppointment(appointmentId) {
  logDebug("Időpont törlése", { appointmentId });
  
  showConfirmModal({
    title: 'Időpont törlése',
    message: 'Biztosan törölni szeretnéd ezt az időpontot?',
    onConfirm: async () => {
      try {
        await db.collection('appointments').doc(appointmentId).delete();
        await notificationManager.cancelNotification(appointmentId);
        logInfo("Időpont sikeresen törölve", { appointmentId });
      } catch (error) {
        logError("Hiba az időpont törlésekor", error);
        alert('Nem sikerült törölni az időpontot');
      }
    }
  });
}

// Időpont szerkesztése
async function editAppointment(appointmentId) {
  try {
    const doc = await db.collection('appointments').doc(appointmentId).get();
    if (!doc.exists) {
      throw new Error('Időpont nem található');
    }
    
    const appointment = doc.data();
    showEditAppointmentModal(appointmentId, appointment); 
    
  } catch (error) {
    logError("Hiba az időpont szerkesztésekor", error);
    alert('Nem sikerült betölteni az időpontot');
  }
}

// Időpontok szűrése
function filterAppointments(searchTerm, filter = 'all') {
  const appointments = document.querySelectorAll('.appointment-card');
  const now = new Date();
  
  appointments.forEach(appointment => {
    const title = appointment.querySelector('.appointment-title').textContent.toLowerCase();
    const description = appointment.querySelector('.appointment-description')?.textContent.toLowerCase() || '';
    const dateStr = appointment.getAttribute('data-date');
    const date = new Date(dateStr);
    
    // Keresési feltétel
    let visible = title.includes(searchTerm) || description.includes(searchTerm);
    
    // Szűrési feltétel
    if (visible && filter !== 'all') {
      const isToday = date.toDateString() === now.toDateString();
      const isPast = date < now;
      
      switch(filter) {
        case 'upcoming':
          visible = !isPast;
          break;
        case 'today':
          visible = isToday;
          break;
        case 'past':
          visible = isPast;
          break;
      }
    }
    
    // Megjelenítés animációval
    if (visible) {
      appointment.classList.remove('hidden');
      appointment.animate([
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], {
        duration: 200,
        easing: 'ease-out'
      });
    } else {
      appointment.classList.add('hidden');
    }
  });

  // "Nincs találat" üzenet kezelése
  const appointmentsList = document.getElementById('appointments-list');
  const visibleAppointments = appointmentsList.querySelectorAll('.appointment-card:not(.hidden)');
  
  if (visibleAppointments.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-state';
    emptyMessage.innerHTML = `
      <img src="/icons/search-empty.png" alt="Nincs találat">
      <p>Nincs a keresésnek megfelelő időpont</p>
    `;
    appointmentsList.appendChild(emptyMessage);
  } else {
    const emptyMessage = appointmentsList.querySelector('.empty-state');
    if (emptyMessage) {
      emptyMessage.remove();
    }
  }
}

// Segéd funkciók modálokhoz
function showModal({ title, content, buttons }) {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-container';
  
  modalContainer.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-content">
        ${content}
      </div>
      <div class="modal-footer">
        ${buttons.map(button => `
          <button class="button ${button.type}">${button.text}</button>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  // Események kezelése
  const modal = modalContainer.querySelector('.modal');
  const closeButton = modal.querySelector('.modal-close');
  const footerButtons = modal.querySelectorAll('.modal-footer button');
  
  closeButton.addEventListener('click', hideModal);
  
  footerButtons.forEach((button, index) => {
    button.addEventListener('click', buttons[index].onClick);
  });
  
  // Animáció
  requestAnimationFrame(() => {
    modalContainer.classList.add('visible');
    modal.classList.add('visible');
  });
}

function hideModal() {
  const modalContainer = document.querySelector('.modal-container');
  if (modalContainer) {
    const modal = modalContainer.querySelector('.modal');
    modalContainer.classList.remove('visible');
    modal.classList.remove('visible');
    
    setTimeout(() => {
      modalContainer.remove();
    }, 300);
  }
}

function showConfirmModal({ title, message, onConfirm }) {
  showModal({
    title,
    content: `<p class="confirm-message">${message}</p>`,
    buttons: [
      {
        text: 'Igen',
        type: 'danger',
        onClick: () => {
          onConfirm();
          hideModal();
        }
      },
      {
        text: 'Nem',
        type: 'secondary',
        onClick: hideModal
      }
    ]
  });
}

// Beállítások oldal betöltése
function loadSettings() {
  logDebug("Beállítások oldal betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <div class="settings-container">
      <div class="section-header">
        <h2>Beállítások</h2>
      </div>

      <form id="settings-form" class="settings-form">
        <div class="settings-group">
          <h3>Megjelenés</h3>
          <div class="form-group">
            <label for="theme-select">Téma</label>
            <select id="theme-select" name="theme">
              <option value="light">Világos</option>
              <option value="dark">Sötét</option>
              <option value="system">Rendszer beállítás követése</option>
            </select>
          </div>
          <div class="form-group">
            <label for="font-size">Betűméret</label>
            <select id="font-size" name="fontSize">
              <option value="small">Kicsi</option>
              <option value="medium">Közepes</option>
              <option value="large">Nagy</option>
            </select>
          </div>
        </div>

        <div class="settings-group">
          <h3>Értesítések</h3>
          <div class="form-group">
            <label for="notifications-enabled">
              <input type="checkbox" 
                     id="notifications-enabled" 
                     name="notificationsEnabled">
              Értesítések engedélyezése
            </label>
          </div>
          <div class="form-group" id="notification-settings" style="display: none;">
            <label for="default-notify-time">Alapértelmezett értesítési idő</label>
            <select id="default-notify-time" name="defaultNotifyTime">
              <option value="10">10 perccel előtte</option>
              <option value="30">30 perccel előtte</option>
              <option value="60">1 órával előtte</option>
              <option value="1440">1 nappal előtte</option>
            </select>
          </div>
        </div>

        <div class="settings-group">
          <h3>Adatok és biztonság</h3>
          <div class="form-group">
            <label for="data-sync">
              <input type="checkbox" 
                     id="data-sync" 
                     name="dataSync">
              Offline adatok szinkronizálása
            </label>
          </div>
          <div class="form-group">
            <label for="auto-logout">Automatikus kijelentkezés</label>
            <select id="auto-logout" name="autoLogout">
              <option value="0">Soha</option>
              <option value="15">15 perc inaktivitás után</option>
              <option value="30">30 perc inaktivitás után</option>
              <option value="60">1 óra inaktivitás után</option>
            </select>
          </div>
        </div>

        <div class="settings-group">
          <h3>Fejlesztői beállítások</h3>
          <div class="form-group">
            <label for="debug-mode">
              <input type="checkbox" 
                     id="debug-mode" 
                     name="debugMode">
              Debug mód engedélyezése
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="primary-button">
            Beállítások mentése
          </button>
          <button type="button" 
                  onclick="resetSettings()" 
                  class="secondary-button">
            Alapértelmezett beállítások
          </button>
        </div>
      </form>
    </div>
  `;

  // Beállítások betöltése és form kitöltése
  loadUserSettings();
  
  // Események kezelése
  setupSettingsEventHandlers();
  
  logDebug("Beállítások oldal betöltve");
}

// Beállítások eseménykezelők
function setupSettingsEventHandlers() {
  const form = document.getElementById('settings-form');
  const notificationsEnabled = document.getElementById('notifications-enabled');
  const notificationSettings = document.getElementById('notification-settings');

  // Értesítések beállítások megjelenítése
  notificationsEnabled.addEventListener('change', (e) => {
    notificationSettings.style.display = e.target.checked ? 'block' : 'none';
    
    if (e.target.checked && Notification.permission !== 'granted') {
      notificationManager.requestPermission();
    }
  });

  // Form mentése
  form.addEventListener('submit', handleSettingsSave);

  // Téma azonnal alkalmazása változtatáskor
  document.getElementById('theme-select').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // Betűméret azonnal alkalmazása
  document.getElementById('font-size').addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-font-size', e.target.value);
  });

  // Debug mód azonnal alkalmazása
  document.getElementById('debug-mode').addEventListener('change', (e) => {
    setDebugMode(e.target.checked);
  });
}

// Felhasználói beállítások betöltése
async function loadUserSettings() {
  try {
    const userId = auth.currentUser.uid;
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      throw new Error('Felhasználói beállítások nem találhatók');
    }

    const settings = doc.data();
    logDebug("Felhasználói beállítások betöltve", settings);

    // Form mezők kitöltése
    document.getElementById('theme-select').value = settings.theme || 'light';
    document.getElementById('font-size').value = settings.fontSize || 'medium';
    document.getElementById('notifications-enabled').checked = settings.notificationsEnabled || false;
    document.getElementById('default-notify-time').value = settings.defaultNotifyTime || '10';
    document.getElementById('data-sync').checked = settings.dataSync || false;
    document.getElementById('auto-logout').value = settings.autoLogout || '0';
    document.getElementById('debug-mode').checked = settings.debugMode || false;

    // Beállítások alkalmazása
    applyTheme(settings.theme);
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
    setDebugMode(settings.debugMode);

    // Értesítések beállítások megjelenítése
    const notificationSettings = document.getElementById('notification-settings');
    notificationSettings.style.display = settings.notificationsEnabled ? 'block' : 'none';

  } catch (error) {
    logError("Hiba a beállítások betöltésekor", error);
    alert('Nem sikerült betölteni a beállításokat');
  }
}

// Beállítások mentése
async function handleSettingsSave(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const settings = {
    theme: formData.get('theme'),
    fontSize: formData.get('fontSize'),
    notificationsEnabled: formData.get('notificationsEnabled') === 'on',
    defaultNotifyTime: formData.get('defaultNotifyTime'),
    dataSync: formData.get('dataSync') === 'on',
    autoLogout: formData.get('autoLogout'),
    debugMode: formData.get('debugMode') === 'on',
    lastModified: firebase.firestore.Timestamp.now()
  };

  try {
    const userId = auth.currentUser.uid;
    await db.collection('users').doc(userId).update(settings);
    
    logInfo("Beállítások sikeresen mentve", settings);
    showToast('Beállítások mentve', 'success');
  } catch (error) {
    logError("Hiba a beállítások mentésekor", error);
    showToast('Nem sikerült menteni a beállításokat', 'error');
  }
}

// Alapértelmezett beállítások visszaállítása
async function resetSettings() {
  if (!confirm('Biztosan visszaállítod az alapértelmezett beállításokat?')) {
    return;
  }

  const defaultSettings = {
    theme: 'light',
    fontSize: 'medium',
    notificationsEnabled: false,
    defaultNotifyTime: '10',
    dataSync: true,
    autoLogout: '0',
    debugMode: false,
    lastModified: firebase.firestore.Timestamp.now()
  };

  try {
    const userId = auth.currentUser.uid;
    await db.collection('users').doc(userId).update(defaultSettings);
    
    // Form újratöltése
    loadUserSettings();
    
    logInfo("Beállítások visszaállítva az alapértelmezettre");
    showToast('Beállítások visszaállítva', 'success');
  } catch (error) {
    logError("Hiba a beállítások visszaállításakor", error);
    showToast('Nem sikerült visszaállítani a beállításokat', 'error');
  }
}

// Profil oldal betöltése
function loadProfile() {
  logDebug("Profil oldal betöltése kezdődik");
  
  const user = auth.currentUser;
  const contentElement = document.getElementById('content');
  
  contentElement.innerHTML = `
    <div class="profile-container">
      <div class="section-header">
        <h2>Profil beállítások</h2>
      </div>

      <div class="profile-content">
        <div class="profile-header">
          <div id="profile-avatar" class="profile-avatar">
            <div class="avatar-preview"></div>
            <button type="button" class="change-avatar-btn">
              <i class="camera-icon"></i>
            </button>
          </div>
          <div class="profile-info">
            <h3>${user.displayName || 'Névtelen felhasználó'}</h3>
            <p>${user.email}</p>
            <p class="profile-meta">
              Regisztráció: ${new Date(user.metadata.creationTime).toLocaleDateString('hu-HU')}
            </p>
          </div>
        </div>

        <form id="profile-form" class="profile-form">
          <div class="form-group">
            <label for="display-name">Megjelenített név</label>
            <input type="text" 
                   id="display-name" 
                   name="displayName"
                   value="${user.displayName || ''}" 
                   placeholder="Add meg a neved"
                   required>
          </div>

          <div class="form-group">
            <label for="avatar-color">Profilszín</label>
            <input type="color" 
                   id="avatar-color" 
                   name="avatarColor"
                   value="#4CAF50">
          </div>

          <div class="form-group">
            <label for="email">Email cím</label>
            <input type="email" 
                   id="email" 
                   value="${user.email}" 
                   disabled>
            <button type="button" 
                    onclick="showChangeEmailModal()" 
                    class="secondary-button">
              Email cím módosítása
            </button>
          </div>

          <div class="form-actions">
            <button type="submit" class="primary-button">
              Profil mentése
            </button>
            <button type="button" 
                    onclick="showChangePasswordModal()" 
                    class="secondary-button">
              Jelszó módosítása
            </button>
          </div>
        </form>

        <div class="danger-zone">
          <h3>Veszélyes zóna</h3>
          <p>Az alábbi műveletek nem visszavonhatók!</p>
          
          <button onclick="handleAccountDelete()" 
                  class="danger-button">
            Fiók törlése
          </button>
        </div>
        
        <!-- Mobil menü gombok (csak mobilon) -->
        <div class="mobile-menu-actions">
          <button onclick="showModule('settings')" 
                  class="secondary-button full-width">
            ⚙️ Beállítások
          </button>
          <button onclick="handleLogout()" 
                  class="secondary-button full-width">
            🚪 Kijelentkezés
          </button>
        </div>
      </div>
    </div>
  `;

  // Profiladatok betöltése
  loadProfileData();
  
  // Események kezelése
  setupProfileEventHandlers();
  
  logDebug("Profil oldal betöltve");
}

// Profil események kezelése
function setupProfileEventHandlers() {
  // Profil form mentése
  document.getElementById('profile-form').addEventListener('submit', handleProfileSave);

  // Avatar szín változás
  document.getElementById('avatar-color').addEventListener('change', (e) => {
    updateAvatarPreview(e.target.value);
  });

  // Avatar előnézet inicializálása
  initializeAvatarPreview();
}

// Profil adatok betöltése
async function loadProfileData() {
  try {
    const userId = auth.currentUser.uid;
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      throw new Error('Felhasználói adatok nem találhatók');
    }

    const userData = doc.data();
    logDebug("Felhasználói adatok betöltve", userData);

    // Avatar szín beállítása
    document.getElementById('avatar-color').value = userData.avatarColor || '#4CAF50';
    updateAvatarPreview(userData.avatarColor);

  } catch (error) {
    logError("Hiba a profiladatok betöltésekor", error);
    showToast('Nem sikerült betölteni a profiladatokat', 'error');
  }
}

// Avatar előnézet inicializálása
function initializeAvatarPreview() {
  const preview = document.querySelector('.avatar-preview');
  const user = auth.currentUser;
  
  if (preview && user) {
    preview.textContent = user.displayName ? 
      user.displayName.charAt(0).toUpperCase() : 
      '?';
  }
}

// Avatar előnézet frissítése
function updateAvatarPreview(color) {
  const preview = document.querySelector('.avatar-preview');
  if (preview) {
    preview.style.backgroundColor = color;
  }
}

// Profil mentése
async function handleProfileSave(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const updates = {
    displayName: formData.get('displayName'),
    avatarColor: formData.get('avatarColor'),
    lastModified: firebase.firestore.Timestamp.now()
  };

  try {
    const user = auth.currentUser;
    
    // Firebase Auth név frissítése
    await user.updateProfile({
      displayName: updates.displayName
    });
    
    // Firestore adatok frissítése
    await db.collection('users').doc(user.uid).update(updates);
    
    logInfo("Profil sikeresen mentve", updates);
    showToast('Profil mentve', 'success');
  } catch (error) {
    logError("Hiba a profil mentésekor", error);
    showToast('Nem sikerült menteni a profilt', 'error');
  }
}

// Email cím módosítása
function showChangeEmailModal() {
  showModal({
    title: 'Email cím módosítása',
    content: `
      <form id="change-email-form" class="auth-form">
        <div class="form-group">
          <label for="new-email">Új email cím</label>
          <input type="email" 
                 id="new-email" 
                 placeholder="pelda@email.com" 
                 required>
        </div>
        <div class="form-group">
          <label for="current-password">Jelenlegi jelszó</label>
          <input type="password" 
                 id="current-password" 
                 placeholder="Jelszó" 
                 required>
        </div>
      </form>
    `,
    buttons: [
      {
        text: 'Módosítás',
        type: 'primary',
        onClick: handleEmailChange
      },
      {
        text: 'Mégse',
        type: 'secondary',
        onClick: hideModal
      }
    ]
  });
}

// Email cím módosítás végrehajtása
async function handleEmailChange() {
  const newEmail = document.getElementById('new-email').value;
  const password = document.getElementById('current-password').value;
  
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email, 
      password
    );
    
    // Újrahitelesítés
    await user.reauthenticateWithCredential(credential);
    
    // Email módosítása
    await user.updateEmail(newEmail);
    
    // Firestore frissítése
    await db.collection('users').doc(user.uid).update({
      email: newEmail,
      lastModified: firebase.firestore.Timestamp.now()
    });
    
    hideModal();
    logInfo("Email cím sikeresen módosítva");
    showToast('Email cím módosítva', 'success');
  } catch (error) {
    logError("Hiba az email cím módosításakor", error);
    let errorMessage = 'Nem sikerült módosítani az email címet';
    
    switch(error.code) {
      case 'auth/wrong-password':
        errorMessage = 'Hibás jelszó';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'Ez az email cím már használatban van';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Érvénytelen email cím';
        break;
    }
    
    showToast(errorMessage, 'error');
  }
}

// Jelszó módosítása
function showChangePasswordModal() {
  showModal({
    title: 'Jelszó módosítása',
    content: `
      <form id="change-password-form" class="auth-form">
        <div class="form-group">
          <label for="current-password">Jelenlegi jelszó</label>
          <input type="password" 
                 id="current-password" 
                 placeholder="Jelenlegi jelszó" 
                 required>
        </div>
        <div class="form-group">
          <label for="new-password">Új jelszó</label>
          <input type="password" 
                 id="new-password" 
                 placeholder="Új jelszó" 
                 required 
                 minlength="6">
        </div>
        <div class="form-group">
          <label for="confirm-password">Új jelszó megerősítése</label>
          <input type="password" 
                 id="confirm-password" 
                 placeholder="Új jelszó újra" 
                 required 
                 minlength="6">
        </div>
      </form>
    `,
    buttons: [
      {
        text: 'Módosítás',
        type: 'primary',
        onClick: handlePasswordChange
      },
      {
        text: 'Mégse',
        type: 'secondary',
        onClick: hideModal
      }
    ]
  });
}

// Jelszó módosítás végrehajtása
async function handlePasswordChange() {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (newPassword !== confirmPassword) {
    showToast('Az új jelszavak nem egyeznek', 'error');
    return;
  }
  
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email, 
      currentPassword
    );
    
    // Újrahitelesítés
    await user.reauthenticateWithCredential(credential);
    
    // Jelszó módosítása
    await user.updatePassword(newPassword);
    
    hideModal();
    logInfo("Jelszó sikeresen módosítva");
    showToast('Jelszó módosítva', 'success');
  } catch (error) {
    logError("Hiba a jelszó módosításakor", error);
    let errorMessage = 'Nem sikerült módosítani a jelszót';
    
    switch(error.code) {
      case 'auth/wrong-password':
        errorMessage = 'Hibás jelenlegi jelszó';
        break;
      case 'auth/weak-password':
        errorMessage = 'Az új jelszó túl gyenge';
        break;
    }
    
    showToast(errorMessage, 'error');
  }
}

// Fiók törlése
function handleAccountDelete() {
  showModal({
    title: 'Fiók törlése',
    content: `
      <div class="warning-message">
        <h4>⚠️ Figyelmeztetés</h4>
        <p>A fiók törlése véglegesen eltávolítja az összes adatodat és nem visszavonható!</p>
        <form id="delete-account-form" class="auth-form">
          <div class="form-group">
            <label for="confirm-password">Jelszó megerősítése</label>
            <input type="password" 
                   id="confirm-password" 
                   placeholder="Add meg a jelszavad" 
                   required>
          </div>
          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" 
                     id="confirm-delete" 
                     required>
              <span>Megértettem, hogy ez a művelet nem visszavonható</span>
            </label>
          </div>
        </form>
      </div>
    `,
    buttons: [
      {
        text: 'Fiók törlése',
        type: 'danger',
        onClick: handleAccountDeleteConfirm
      },
      {
        text: 'Mégse',
        type: 'secondary',
        onClick: hideModal
      }
    ]
  });
}

// Fiók törlés végrehajtása
async function handleAccountDeleteConfirm() {
  const password = document.getElementById('confirm-password').value;
  const isConfirmed = document.getElementById('confirm-delete').checked;
  
  if (!isConfirmed) {
    showToast('Kérlek erősítsd meg a törlési szándékot', 'error');
    return;
  }
  
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email, 
      password
    );
    
    // Újrahitelesítés
    await user.reauthenticateWithCredential(credential);
    
    // Felhasználói adatok törlése
    const batch = db.batch();
    
    // Jegyzetek törlése
    const notesSnapshot = await db.collection('notes')
      .where('userId', '==', user.uid)
      .get();
    notesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Időpontok törlése
    const appointmentsSnapshot = await db.collection('appointments')
      .where('userId', '==', user.uid)
      .get();
    appointmentsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Felhasználói dokumentum törlése
    batch.delete(db.collection('users').doc(user.uid));
    
    await batch.commit();
    
    // Firebase Auth fiók törlése
    await user.delete();
    
    hideModal();
    logInfo("Felhasználói fiók sikeresen törölve");
    showToast('Fiók törölve', 'success');
    
    // Átirányítás a kezdőoldalra
    window.location.reload();
  } catch (error) {
    logError("Hiba a fiók törlésekor", error);
    let errorMessage = 'Nem sikerült törölni a fiókot';
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Hibás jelszó';
    }
    
    showToast(errorMessage, 'error');
  }
}

// Toast üzenet megjelenítése
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Animáció
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  
  // Automatikus eltűnés
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
// ========================================
// KÖZÖS JEGYZETEK ÉS IDŐPONTOK (Dashboard)
// ========================================

// Közös jegyzetek betöltése (Todo lista stílus)
function loadSharedNotes() {
  const notesList = document.getElementById('shared-notes-list');
  if (!notesList) return;
  
  // Firestore listener - MINDEN felhasználó jegyzetét mutatja
  const query = db.collection('notes')
    .orderBy('timestamp', 'desc')
    .limit(10);
  
  query.onSnapshot(snapshot => {
    notesList.innerHTML = '';
    
    if (snapshot.empty) {
      notesList.innerHTML = '<p class="empty-message">Még nincsenek közös jegyzetek</p>';
      document.getElementById('notes-count').textContent = '0';
      return;
    }
    
    document.getElementById('notes-count').textContent = snapshot.size;
    
    snapshot.forEach(doc => {
      const note = { id: doc.id, ...doc.data() };
      notesList.appendChild(createTodoItem(note));
    });
  });
}

// Todo item létrehozása (checkbox-szal)
function createTodoItem(note) {
  const item = document.createElement('div');
  item.className = 'todo-item' + (note.completed ? ' completed' : '');
  item.dataset.id = note.id;
  
  item.innerHTML = `
    <input type="checkbox" 
           class="todo-checkbox" 
           ${note.completed ? 'checked' : ''}
           onchange="toggleNoteComplete('${note.id}', this.checked)">
    <div class="todo-content" onclick="editNoteInline('${note.id}')">
      <div class="todo-text">${escapeHtml(note.content)}</div>
      <div class="todo-meta">
        ${new Date(note.timestamp.toDate()).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
    <button class="todo-delete" onclick="deleteNoteQuick('${note.id}')" title="Törlés">×</button>
  `;
  
  return item;
}

// Jegyzetek kipipálása (elvégezve)
async function toggleNoteComplete(noteId, completed) {
  try {
    await db.collection('notes').doc(noteId).update({
      completed: completed,
      lastModified: firebase.firestore.Timestamp.now()
    });
    logInfo("Jegyzet állapot frissítve", { noteId, completed });
    
    // Értesítés ha kipipálták (csak completed = true esetén)
    if (completed && window.simpleNotificationManager && window.simpleNotificationManager.enabled) {
      // Jegyzet tartalmának lekérése
      const noteDoc = await db.collection('notes').doc(noteId).get();
      if (noteDoc.exists) {
        const noteData = noteDoc.data();
        const userName = auth.currentUser.displayName || 'Valaki';
        window.simpleNotificationManager.notifyNoteCompleted(noteData.content, userName);
      }
    }
  } catch (error) {
    logError("Hiba a jegyzet állapot frissítésekor", error);
  }
}

// Jegyzet gyors törlése
async function deleteNoteQuick(noteId) {
  if (!confirm('Biztosan törölni szeretnéd ezt a jegyzetet?')) return;
  
  try {
    await db.collection('notes').doc(noteId).delete();
    logInfo("Jegyzet törölve", { noteId });
  } catch (error) {
    logError("Hiba a jegyzet törlésekor", error);
  }
}

// Jegyzet inline szerkesztése
function editNoteInline(noteId) {
  const noteElement = document.querySelector(`[data-id="${noteId}"]`);
  if (!noteElement) return;
  
  const contentDiv = noteElement.querySelector('.todo-content');
  const textElement = contentDiv.querySelector('.todo-text');
  const currentText = textElement.textContent;
  
  // Szerkesztő container
  const editContainer = document.createElement('div');
  editContainer.className = 'todo-edit-container';
  
  // Textarea
  const textarea = document.createElement('textarea');
  textarea.value = currentText;
  textarea.className = 'todo-edit-textarea';
  textarea.rows = 3;
  
  // Gombok container
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'todo-edit-buttons';
  
  // Mentés gomb
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Mentés';
  saveBtn.className = 'todo-save-btn';
  saveBtn.onclick = () => saveNoteEdit(noteId, textarea.value, contentDiv, currentText);
  
  // Mégse gomb
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Mégse';
  cancelBtn.className = 'todo-cancel-btn';
  cancelBtn.onclick = () => cancelNoteEdit(contentDiv, currentText);
  
  // Desktop billentyűzet támogatás
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
      e.preventDefault();
      saveBtn.click();
    }
    if (e.key === 'Escape') {
      cancelBtn.click();
    }
  });
  
  // Összerakás
  buttonsDiv.appendChild(saveBtn);
  buttonsDiv.appendChild(cancelBtn);
  editContainer.appendChild(textarea);
  editContainer.appendChild(buttonsDiv);
  
  // Csere és fókusz (kurzor a végére)
  contentDiv.replaceWith(editContainer);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// Szerkesztés megszakítása
function cancelNoteEdit(originalContentDiv, originalText) {
  const editContainer = document.querySelector('.todo-edit-container');
  if (!editContainer) return;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'todo-content';
  contentDiv.onclick = () => editNoteInline(originalContentDiv.parentElement.dataset.id);
  
  const textDiv = document.createElement('div');
  textDiv.className = 'todo-text';
  textDiv.textContent = originalText;
  
  const metaDiv = editContainer.parentElement.querySelector('.todo-meta');
  if (metaDiv) {
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(metaDiv.cloneNode(true));
  } else {
    contentDiv.appendChild(textDiv);
  }
  
  editContainer.replaceWith(contentDiv);
}

// Jegyzet szerkesztés mentése
async function saveNoteEdit(noteId, newText, originalContentDiv, originalText) {
  const trimmedText = newText.trim();
  
  // Üres vagy nem változott -> Mégse
  if (!trimmedText || trimmedText === originalText) {
    cancelNoteEdit(originalContentDiv, originalText);
    return;
  }
  
  try {
    // Firestore frissítés
    await db.collection('notes').doc(noteId).update({
      content: trimmedText,
      lastModified: firebase.firestore.Timestamp.now()
    });
    
    logInfo("Jegyzet frissítve", { noteId });
    
    // Értesítés küldése
    if (window.simpleNotificationManager && window.simpleNotificationManager.enabled) {
      const userName = auth.currentUser.displayName || 'Valaki';
      window.simpleNotificationManager.notifyNoteUpdated(trimmedText, userName);
    }
    
    // Szerkesztő bezárása - a Firestore listener frissíti az UI-t
    const editContainer = document.querySelector('.todo-edit-container');
    if (editContainer) {
      editContainer.remove();
    }
    
  } catch (error) {
    logError("Hiba a jegyzet frissítésekor", error);
    alert('Nem sikerült frissíteni a jegyzetet');
    cancelNoteEdit(originalContentDiv, originalText);
  }
}

// Közös időpontok betöltése
function loadSharedAppointments() {
  const appointmentsList = document.getElementById('shared-appointments-list');
  if (!appointmentsList) return;
  
  const now = new Date();
  const query = db.collection('appointments')
    .where('date', '>=', firebase.firestore.Timestamp.fromDate(now))
    .orderBy('date', 'asc')
    .limit(5);
  
  query.onSnapshot(snapshot => {
    appointmentsList.innerHTML = '';
    
    if (snapshot.empty) {
      appointmentsList.innerHTML = '<p class="empty-message">Nincsenek közelgő időpontok</p>';
      document.getElementById('appointments-count').textContent = '0';
      return;
    }
    
    document.getElementById('appointments-count').textContent = snapshot.size;
    
    snapshot.forEach(doc => {
      const appointment = { id: doc.id, ...doc.data() };
      appointmentsList.appendChild(createAppointmentItem(appointment));
    });
  });
}

// Időpont item létrehozása
function createAppointmentItem(appt) {
  const item = document.createElement('div');
  item.className = 'appointment-item-simple';
  
  const date = appt.date.toDate();
  const dateStr = date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  
  item.innerHTML = `
    <div class="appointment-date-badge">
      <div class="badge-day">${date.getDate()}</div>
      <div class="badge-month">${dateStr.split(' ')[0]}</div>
    </div>
    <div class="appointment-info">
      <div class="appointment-title-simple">${escapeHtml(appt.title)}</div>
      <div class="appointment-time-simple">🕐 ${timeStr}</div>
    </div>
    <div class="appointment-actions">
      <button class="appointment-edit-btn" onclick="editAppointment('${appt.id}')" title="Szerkesztés">✏️</button>
      <button class="appointment-delete-btn" onclick="deleteAppointmentQuick('${appt.id}')" title="Törlés">×</button>
    </div>
  `;
  
  return item;
}

// Gyors jegyzet létrehozás modal
function showCreateNoteModal() {
  const content = prompt('Új jegyzet tartalma:');
  if (!content || !content.trim()) return;
  
  db.collection('notes').add({
    content: content.trim(),
    completed: false,
    timestamp: firebase.firestore.Timestamp.now(),
    lastModified: firebase.firestore.Timestamp.now(),
    userId: auth.currentUser.uid
  }).then(() => {
    logInfo("Gyors jegyzet létrehozva");
  }).catch(error => {
    logError("Hiba a jegyzet létrehozásakor", error);
    alert('Nem sikerült létrehozni a jegyzetet');
  });
}

// Gyors időpont létrehozás modal
function showCreateAppointmentModal() {
  showModule('appointments');
}

// HTML escape segédfüggvény
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// IDŐPONT GYORS TÖRLÉS
// ========================================

// Időpont gyors törlése
async function deleteAppointmentQuick(appointmentId) {
  if (!confirm('Biztosan törölni szeretnéd ezt az időpontot?')) return;
  
  try {
    await db.collection('appointments').doc(appointmentId).delete();
    logInfo("Időpont törölve", { appointmentId });
  } catch (error) {
    logError("Hiba az időpont törlésekor", error);
    alert('Nem sikerült törölni az időpontot');
  }
}
