// Import ES6 module szintaxissal
import { notificationManager } from './notifications.js';

// Firebase konfiguráció (változatlan)
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

// Alkalmazás inicializálása - frissített verzió
async function initApp() {
  logDebug("Alkalmazás inicializálása...");
  const navElement = document.querySelector('nav');
  if (navElement) {
    navElement.style.display = 'none';
  }
  
  // Értesítések inicializálása
  try {
    await notificationManager.init();
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

// Időpontok oldal betöltése - frissített verzió
function loadAppointments() {
  logDebug("Időpontok oldal betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Időpontok</h2>
    <form id="new-appointment-form">
      <div class="form-group">
        <input type="text" id="appointment-title" placeholder="Időpont címe" required>
      </div>
      <div class="form-group">
        <input type="date" id="appointment-date" required>
      </div>
      <div class="form-group">
        <input type="time" id="appointment-time" required>
      </div>
      <div class="form-group">
        <label for="notify-before">Értesítés időpontja:</label>
        <select id="notify-before" required>
          <option value="5">5 perccel előtte</option>
          <option value="10" selected>10 perccel előtte</option>
          <option value="15">15 perccel előtte</option>
          <option value="30">30 perccel előtte</option>
          <option value="60">1 órával előtte</option>
        </select>
      </div>
      <div class="form-group">
        <textarea id="appointment-description" 
                  placeholder="További részletek (opcionális)" 
                  rows="3"></textarea>
      </div>
      <button type="submit">Időpont hozzáadása</button>
    </form>
    
    <div class="appointments-controls">
      <select id="appointments-filter">
        <option value="upcoming">Közelgő időpontok</option>
        <option value="past">Korábbi időpontok</option>
        <option value="all">Összes időpont</option>
      </select>
    </div>
    
    <ul id="appointments-list"></ul>
  `;
  
  // Eseménykezelők beállítása
  document.getElementById('new-appointment-form').addEventListener('submit', addAppointment);
  document.getElementById('appointments-filter').addEventListener('change', (e) => {
    setupAppointmentsListener(e.target.value);
  });
  
  // Alapértelmezett közelgő időpontok betöltése
  setupAppointmentsListener('upcoming');
  
  logDebug("Időpontok oldal betöltve");
}

// Új időpont hozzáadása - frissített verzió
async function addAppointment(e) {
  e.preventDefault();
  
  const title = document.getElementById('appointment-title').value;
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;
  const notifyBefore = parseInt(document.getElementById('notify-before').value);
  const description = document.getElementById('appointment-description')?.value || '';

  logDebug("Új időpont hozzáadása kezdeményezve", { 
    title, date, time, notifyBefore, description 
  });

  if (!title || !date || !time) {
    alert('Kérlek töltsd ki a kötelező mezőket!');
    return;
  }

  try {
    const dateTime = new Date(date + 'T' + time);
    
    if (isNaN(dateTime.getTime())) {
      throw new Error('Érvénytelen dátum vagy idő formátum');
    }

    const appointmentData = {
      title: title,
      description: description,
      date: firebase.firestore.Timestamp.fromDate(dateTime),
      notifyBefore: notifyBefore,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      lastModified: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('appointments').add(appointmentData);
    
    if (Notification.permission === 'granted') {
      await notificationManager.scheduleAppointmentNotification({
        id: docRef.id,
        ...appointmentData
      });
    }
    
    // Form tisztítása
    document.getElementById('new-appointment-form').reset();
    
    logInfo("Időpont sikeresen létrehozva", { id: docRef.id });
    alert('Időpont sikeresen létrehozva!');
    
  } catch (error) {
    logError('Hiba az időpont létrehozásakor', error);
    alert('Hiba történt az időpont létrehozásakor: ' + error.message);
  }
}

// Időpontok listener beállítása - frissített verzió
function setupAppointmentsListener(filter = 'upcoming') {
  logDebug("Időpontok listener beállítása", { filter });
  
  const appointmentsList = document.getElementById('appointments-list');
  
  if (window.appointmentsUnsubscribe) {
    window.appointmentsUnsubscribe();
  }

  let query = db.collection('appointments');
  const now = new Date();

  switch(filter) {
    case 'upcoming':
      query = query.where('date', '>=', firebase.firestore.Timestamp.fromDate(now));
      break;
    case 'past':
      query = query.where('date', '<', firebase.firestore.Timestamp.fromDate(now));
      break;
  }

  query = query.orderBy('date', filter === 'past' ? 'desc' : 'asc');

  window.appointmentsUnsubscribe = query.onSnapshot((snapshot) => {
    logDebug("Időpontok változás észlelve", {
      filter,
      count: snapshot.size,
      changes: snapshot.docChanges().map(change => change.type)
    });
    
    appointmentsList.innerHTML = '';
    
    if (snapshot.empty) {
      appointmentsList.innerHTML = `<li class="empty-message">
        ${filter === 'upcoming' ? 'Nincsenek közelgő időpontok' :
          filter === 'past' ? 'Nincsenek korábbi időpontok' :
          'Nincsenek időpontok'}
      </li>`;
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

// Időpont elem létrehozása
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

// Beállítások oldal betöltése - frissített verzió
function loadSettings() {
  logDebug("Beállítások oldal betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Beállítások</h2>
    <form id="settings-form">
      <div class="settings-group">
        <h3>Megjelenés</h3>
        <div class="form-group">
          <label for="theme-select">Téma:</label>
          <select id="theme-select">
            <option value="light">Világos</option>
            <option value="dark">Sötét</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3>Értesítések</h3>
        <div class="notification-status">
          Jelenlegi állapot: 
          <span id="notification-status" class="status-badge ${
            Notification.permission === "granted" ? "status-enabled" : "status-disabled"
          }">
            ${Notification.permission === "granted" ? 
              "Engedélyezve" : 
              Notification.permission === "denied" ? 
                "Letiltva" : 
                "Nincs beállítva"}
          </span>
        </div>
        <button type="button" id="enable-notifications" class="secondary-button">
          ${Notification.permission === "granted" ? 
            "Értesítések tiltása" : 
            "Értesítések engedélyezése"}
        </button>
        <p class="settings-help-text">
          ${Notification.permission === "denied" ? 
            "Az értesítések engedélyezéséhez módosítsd a böngésző beállításait" :
            "Engedélyezd az értesítéseket, hogy ne maradj le az időpontjaidról"}
        </p>
      </div>

      <div class="settings-group">
        <h3>Időpontok</h3>
        <div class="form-group">
          <label for="default-notify-time">Alapértelmezett értesítési idő:</label>
          <select id="default-notify-time">
            <option value="5">5 perccel előtte</option>
            <option value="10">10 perccel előtte</option>
            <option value="15">15 perccel előtte</option>
            <option value="30">30 perccel előtte</option>
            <option value="60">1 órával előtte</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3>Alkalmazás</h3>
        <div class="form-group">
          <label for="debug-mode">Debug mód:</label>
          <input type="checkbox" id="debug-mode">
          <span class="help-text">Részletes naplózás a konzolban</span>
        </div>
      </div>

      <div class="button-group">
        <button type="submit" class="primary-button">Beállítások mentése</button>
        <button type="button" id="reset-settings" class="secondary-button">Alapértelmezettek</button>
      </div>
    </form>
  `;
  
  // Form eseménykezelő
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  
  // Értesítések gomb kezelése
  const notificationsButton = document.getElementById('enable-notifications');
  notificationsButton.addEventListener('click', async () => {
    if (Notification.permission === "denied") {
      alert("Az értesítések engedélyezéséhez módosítsd a böngésző beállításait");
      return;
    }

    const isEnabled = await notificationManager.requestPermission();
    updateNotificationUI(isEnabled);
  });

  // Reset gomb kezelése
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
  
  // Jelenlegi beállítások betöltése
  loadCurrentSettings();
  
  logDebug("Beállítások oldal betöltve");
}

// Notification UI frissítése
function updateNotificationUI(isEnabled) {
  const statusElement = document.getElementById('notification-status');
  const notificationsButton = document.getElementById('enable-notifications');
  
  statusElement.textContent = isEnabled ? "Engedélyezve" : "Letiltva";
  statusElement.className = `status-badge ${isEnabled ? "status-enabled" : "status-disabled"}`;
  
  notificationsButton.textContent = isEnabled ? 
    "Értesítések tiltása" : 
    "Értesítések engedélyezése";
}

// Jelenlegi beállítások betöltése
function loadCurrentSettings() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const defaultNotifyTime = localStorage.getItem('defaultNotifyTime') || '10';
  const debugMode = localStorage.getItem('debugMode') === 'true';

  document.getElementById('theme-select').value = currentTheme;
  document.getElementById('default-notify-time').value = defaultNotifyTime;
  document.getElementById('debug-mode').checked = debugMode;
  
  logDebug("Beállítások betöltve", { 
    currentTheme, 
    defaultNotifyTime, 
    debugMode 
  });
}

// Beállítások mentése - frissített verzió
async function saveSettings(e) {
  e.preventDefault();
  
  const theme = document.getElementById('theme-select').value;
  const defaultNotifyTime = document.getElementById('default-notify-time').value;
  const debugMode = document.getElementById('debug-mode').checked;
  
  logDebug("Beállítások mentése", { theme, defaultNotifyTime, debugMode });
  
  try {
    // Beállítások mentése localStorage-ba
    localStorage.setItem('theme', theme);
    localStorage.setItem('defaultNotifyTime', defaultNotifyTime);
    localStorage.setItem('debugMode', debugMode);
    
    // Beállítások alkalmazása
    applyTheme(theme);
    setDebugMode(debugMode);
    
    // Felhasználói beállítások mentése Firestore-ba
    const user = auth.currentUser;
    if (user) {
      await db.collection('users').doc(user.uid).update({
        theme: theme,
        defaultNotifyTime: defaultNotifyTime,
        debugMode: debugMode,
        lastSettingsUpdate: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    logInfo("Beállítások sikeresen mentve");
    alert('Beállítások sikeresen mentve!');
  } catch (error) {
    logError('Hiba a beállítások mentésekor', error);
    alert('Hiba történt a beállítások mentésekor.');
  }
}

// Beállítások visszaállítása alapértelmezettre
function resetSettings() {
  if (confirm('Biztosan visszaállítod az alapértelmezett beállításokat?')) {
    const defaultSettings = {
      theme: 'light',
      defaultNotifyTime: '10',
      debugMode: false
    };
    
    // Beállítások alapértelmezettre állítása
    document.getElementById('theme-select').value = defaultSettings.theme;
    document.getElementById('default-notify-time').value = defaultSettings.defaultNotifyTime;
    document.getElementById('debug-mode').checked = defaultSettings.debugMode;
    
    // Mentés
    const event = new Event('submit');
    document.getElementById('settings-form').dispatchEvent(event);
  }
}

// Profil oldal betöltése - frissített verzió
function loadProfile() {
  logDebug("Profil oldal betöltése kezdődik");
  
  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <h2>Profil beállítások</h2>
    <div class="profile-container">
      <div class="profile-header">
        <div id="avatar-preview" class="avatar-preview"></div>
        <div class="profile-info">
          <h3 id="profile-name">Betöltés...</h3>
          <p id="profile-email">Betöltés...</p>
        </div>
      </div>

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
          <label for="avatar-color">Profilkép színe</label>
          <input type="color" id="avatar-color" value="#4CAF50">
        </div>

        <div class="button-group">
          <button type="submit" class="primary-button">Profil mentése</button>
          <button type="button" onclick="changePassword()" class="secondary-button">
            Jelszó módosítása
          </button>
        </div>
      </form>

      <div class="profile-stats">
        <h3>Statisztikák</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <h4>Jegyzetek száma</h4>
            <div id="user-notes-count">Betöltés...</div>
          </div>
          <div class="stat-card">
            <h4>Időpontok száma</h4>
            <div id="user-appointments-count">Betöltés...</div>
          </div>
          <div class="stat-card">
            <h4>Regisztráció ideje</h4>
            <div id="user-registration-date">Betöltés...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Eseménykezelők beállítása
  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  document.getElementById('avatar-color').addEventListener('input', updateAvatarPreview);
  
  // Adatok betöltése
  loadProfileData();
  loadProfileStats();
  
  logDebug("Profil oldal betöltve");
}

// Avatar előnézet frissítése
function updateAvatarPreview() {
  const color = document.getElementById('avatar-color').value;
  const name = document.getElementById('display-name').value || '?';
  const initials = name.split(' ').map(word => word[0]).join('').toUpperCase();
  
  const avatarPreview = document.getElementById('avatar-preview');
  avatarPreview.style.backgroundColor = color;
  avatarPreview.textContent = initials;
}

// Profil adatok betöltése - frissített verzió
async function loadProfileData() {
  logDebug("Profil adatok betöltése kezdődik");
  
  const user = auth.currentUser;
  if (!user) {
    logWarn("Nincs bejelentkezett felhasználó");
    return;
  }

  try {
    // Felhasználói dokumentum lekérése
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Mezők kitöltése
    document.getElementById('email').value = user.email;
    document.getElementById('display-name').value = user.displayName || '';
    document.getElementById('avatar-color').value = userData.avatarColor || '#4CAF50';
    
    // Header információk frissítése
    document.getElementById('profile-name').textContent = user.displayName || 'Névtelen felhasználó';
    document.getElementById('profile-email').textContent = user.email;
    
    // Avatar előnézet frissítése
    updateAvatarPreview();
    
    logDebug("Profil adatok betöltve", { 
      email: user.email, 
      displayName: user.displayName,
      avatarColor: userData.avatarColor 
    });
  } catch (error) {
    logError('Hiba a profil adatok betöltésekor', error);
    alert('Hiba történt a profil adatok betöltésekor.');
  }
}

// Profil statisztikák betöltése
async function loadProfileStats() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Jegyzetek számának lekérése
    const notesSnapshot = await db.collection('notes')
      .where('userId', '==', user.uid)
      .get();
    
    // Időpontok számának lekérése
    const appointmentsSnapshot = await db.collection('appointments')
      .where('userId', '==', user.uid)
      .get();
    
    // Statisztikák megjelenítése
    document.getElementById('user-notes-count').textContent = notesSnapshot.size;
    document.getElementById('user-appointments-count').textContent = appointmentsSnapshot.size;
    document.getElementById('user-registration-date').textContent = 
      user.metadata.creationTime ? 
      new Date(user.metadata.creationTime).toLocaleDateString('hu-HU') : 
      'Nem elérhető';
    
  } catch (error) {
    logError('Hiba a profil statisztikák betöltésekor', error);
    alert('Hiba történt a statisztikák betöltésekor.');
  }
}

// Profil mentése - frissített verzió
async function saveProfile(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    logWarn("Nincs bejelentkezett felhasználó");
    return;
  }

  const newDisplayName = document.getElementById('display-name').value;
  const avatarColor = document.getElementById('avatar-color').value;
  
  logDebug("Profil mentése kezdeményezve", { newDisplayName, avatarColor });

  try {
    // Firebase Auth profil frissítése
    await user.updateProfile({
      displayName: newDisplayName
    });

    // Firestore user document frissítése
    await db.collection('users').doc(user.uid).update({
      displayName: newDisplayName,
      avatarColor: avatarColor,
      lastProfileUpdate: firebase.firestore.FieldValue.serverTimestamp()
    });

    // UI frissítése
    document.getElementById('profile-name').textContent = newDisplayName;
    updateAvatarPreview();

    logInfo("Profil sikeresen mentve", { 
      userId: user.uid, 
      newDisplayName,
      avatarColor 
    });
    alert('Profil sikeresen mentve!');
  } catch (error) {
    logError('Hiba a profil mentésekor', error);
    alert('Hiba történt a profil mentésekor.');
  }
}

// Dashboard betöltése - frissített verzió
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

// User avatar inicializálása
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

// Bejelentkezés form megjelenítése - frissített verzió
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

// Bejelentkezés kezelése - frissített verzió
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
    
    // Értesítések inicializálása bejelentkezés után
    if (Notification.permission === "default") {
      await notificationManager.requestPermission();
    }
    
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

// Elfelejtett jelszó kezelése
async function handleForgotPassword(e) {
  e.preventDefault();
  
  const email = document.getElementById('reset-email').value;
  const errorElement = document.getElementById('auth-error');
  
  try {
    await auth.sendPasswordResetEmail(email);
    alert('Jelszó visszaállítási email elküldve!');
    showLoginForm();
  } catch (error) {
    logError('Hiba a jelszó visszaállítási email küldésekor', error);
    errorElement.textContent = 'Hiba történt a jelszó visszaállítási email küldésekor';
  }
}

// Kijelentkezés - frissített verzió
async function logout() {
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

// Dashboard események kezelése - frissített verzió
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
      }, 300); // 300ms késleltetés
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
      
      animation.onfinish = () => button.click();
    });
  });

  logDebug("Dashboard események beállítva");
}

// Alkalmazás inicializálása és eseménykezelők beállítása
document.addEventListener('DOMContentLoaded', async () => {
  logDebug("DOM betöltődött, alkalmazás inicializálása kezdődik");
  
  try {
    // Service Worker regisztrálása
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      logInfo('Service Worker sikeresen regisztrálva', registration);
    }

    // Offline/Online állapot kezelése
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Értesítések inicializálása
    await notificationManager.init();

    // Alkalmazás inicializálása
    await initApp();

    // Navigációs események beállítása
    setupNavigation();

    // Téma betöltése
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Debug mód beállítása
    const debugMode = localStorage.getItem('debugMode') === 'true';
    setDebugMode(debugMode);

    // PWA telepítés kezelése
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

// Navigáció beállítása
function setupNavigation() {
  const menuItems = document.querySelectorAll('nav a');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleId = item.id.replace('-menu', '');
      
      // Aktív menüpont jelölése
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');
      
      // Modul betöltése animációval
      const content = document.getElementById('content');
      content.style.opacity = '0';
      
      setTimeout(() => {
        showModule(moduleId);
        content.style.opacity = '1';
      }, 200);
    });
  });

  // Kijelentkezés gomb kezelése
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

// Online/Offline állapot kezelése
function handleOnlineStatus(event) {
  const isOnline = event.type === 'online';
  
  logDebug(`Alkalmazás ${isOnline ? 'online' : 'offline'} módba váltott`);
  
  // Státusz jelzés megjelenítése
  showStatusMessage(
    isOnline ? 'Kapcsolódva' : 'Nincs internetkapcsolat',
    isOnline ? 'success' : 'warning'
  );

  // Firestore persistence kezelése
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

// PWA telepítés kezelése
function setupPWAInstall() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Telepítés gomb megjelenítése
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

// Státusz üzenet megjelenítése
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

// Státusz konténer létrehozása
function createStatusContainer() {
  const container = document.createElement('div');
  container.id = 'status-container';
  document.body.appendChild(container);
  return container;
}

// Hiba üzenet megjelenítése
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

// Alkalmazás verzió kiírása
logInfo("NoteApp v1.88 betöltve", { 
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development'
});

// Exportálás ha szükséges
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    notificationManager,
    initApp,
    loadDashboard,
    setupDashboardEvents
  };
}