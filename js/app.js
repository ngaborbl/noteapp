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

// Alkalmazás inicializálása
function initApp() {
  console.log("Alkalmazás inicializálása...");
  const navElement = document.querySelector('nav');
  navElement.style.display = 'none';
  
  // Felhasználó bejelentkezési státusz figyelése
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Bejelentkezett állapot
      console.log("Felhasználó bejelentkezve:", user.email);
      navElement.style.display = 'flex';
      showModule('dashboard');
    } else {
      // Kijelentkezett állapot
      console.log("Nincs bejelentkezett felhasználó");
      navElement.style.display = 'none';
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
    case 'profile':
      loadProfile();
      break;
    default:
      contentElement.innerHTML = `<h2>${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}</h2>
                                <p>Ez a ${moduleId} modul tartalma.</p>`;
  }
}

// Dashboard betöltése
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

// Dashboard statisztikák betöltése - javított verzió
// Dashboard statisztikák betöltése - valós idejű verzió
function loadDashboardStats() {
  // Jegyzetek számának valós idejű követése
  const notesQuery = db.collection('notes');
  notesQuery.onSnapshot(snapshot => {
    document.getElementById('notes-count').textContent = snapshot.size + ' db';
  }, error => {
    console.error('Hiba a jegyzetek számának lekérésekor:', error);
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
    console.error('Hiba a mai időpontok lekérésekor:', error);
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
    console.error('Hiba a következő időpont lekérésekor:', error);
    document.getElementById('next-appointment').textContent = 'Hiba történt';
  });
}

// Dashboard események kezelése
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

// Dashboard elemek szűrése
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

// Közelgő időpontok betöltése - valós idejű verzió
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

  // Korábbi listener eltávolítása ha létezik
  if (window.appointmentsUnsubscribe) {
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
    console.log("Időpontok változás észlelve, darabszám:", snapshot.size);
    
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
          Létrehozta: ${appointment.userId || 'ismeretlen'}
        </div>
      `;
      appointmentsList.appendChild(li);
    });
  }, (error) => {
    console.error('Hiba az időpontok valós idejű követésekor:', error);
    appointmentsList.innerHTML = '<li class="error-message">Hiba történt az időpontok betöltésekor</li>';
  });
}

// Legutóbbi jegyzetek betöltése
function loadRecentNotes(sortOrder = 'newest') {
  console.log("Valós idejű jegyzet figyelés inicializálása...");
  const notesList = document.getElementById('recent-notes-list');
  
  if (!notesList) {
    console.error('Jegyzetek lista elem nem található');
    return;
  }

  // Korábbi listener eltávolítása ha létezik
  if (window.notesUnsubscribe) {
    window.notesUnsubscribe();
  }

  // Query létrehozása
  const query = db.collection('notes')
    .orderBy('timestamp', sortOrder === 'newest' ? 'desc' : 'asc')
    .limit(5);

  // Valós idejű listener beállítása
  window.notesUnsubscribe = query.onSnapshot((snapshot) => {
    console.log("Jegyzetek változás észlelve, darabszám:", snapshot.size);
    
    // Lista törlése frissítés előtt
    notesList.innerHTML = '';
    
    // Ha nincs jegyzet
    if (snapshot.empty) {
      notesList.innerHTML = '<li class="empty-message">Nincsenek jegyzetek</li>';
      return;
    }

    snapshot.forEach(doc => {
      const note = doc.data();
      const li = document.createElement('li');
      li.setAttribute('data-note-id', doc.id);
      
      // Jegyzet HTML létrehozása
      li.innerHTML = `
        <div class="note-content">
          ${note.content}
        </div>
        <div class="note-info">
          <small>Létrehozta: ${note.userId || 'ismeretlen'}</small>
          <div class="note-date">
            ${note.timestamp ? note.timestamp.toDate().toLocaleString('hu-HU') : 'Dátum nélkül'}
          </div>
        </div>
      `;

      // Lista elem hozzáadása/frissítése
      if (sortOrder === 'newest') {
        notesList.insertBefore(li, notesList.firstChild);
      } else {
        notesList.appendChild(li);
      }
    });
  }, (error) => {
    console.error('Hiba a jegyzetek valós idejű követésekor:', error);
    notesList.innerHTML = '<li class="error-message">Hiba történt a jegyzetek betöltésekor</li>';
  });
}

// Jegyzetek oldal betöltése
function loadNotes() {
  console.log("Jegyzetek betöltése kezdődik...");
  
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
  
  // Korábbi listener eltávolítása ha létezik
  if (window.mainNotesUnsubscribe) {
    window.mainNotesUnsubscribe();
  }

  // Valós idejű query létrehozása
  const query = db.collection('notes')
    .orderBy('timestamp', 'desc');

  // Valós idejű listener beállítása
  window.mainNotesUnsubscribe = query.onSnapshot((snapshot) => {
    console.log("Jegyzetek változás észlelve, darabszám:", snapshot.size);
    
    notesList.innerHTML = '';
    
    if (snapshot.empty) {
      notesList.innerHTML = '<li>Nincsenek jegyzetek</li>';
      return;
    }

    snapshot.forEach(doc => {
      const note = doc.data();
      const li = document.createElement('li');
      li.setAttribute('data-note-id', doc.id);
      
      li.innerHTML = `
        <div class="note-content">
          <strong>Tartalom:</strong> ${note.content}<br>
          <small>Létrehozta: ${note.userId || 'ismeretlen'}</small>
          <div class="note-date">
            ${note.timestamp ? note.timestamp.toDate().toLocaleString('hu-HU') : 'Dátum nélkül'}
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
    console.error('Hiba a jegyzetek valós idejű követésekor:', error);
    notesList.innerHTML = '<li class="error-message">Hiba történt a jegyzetek betöltésekor</li>';
  });
}

// Új jegyzet hozzáadása
function addNote(e) {
  e.preventDefault();
  const newNoteInput = document.getElementById('new-note');
  const newNoteContent = newNoteInput.value;
  console.log("Új jegyzet létrehozása:", newNoteContent);
  
  if (newNoteContent) {
    const noteData = {
      content: newNoteContent,
      userId: auth.currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('notes').add(noteData)
      .then((docRef) => {
        console.log("Jegyzet sikeresen létrehozva, ID:", docRef.id);
        newNoteInput.value = '';
        // A loadNotes() hívás eltávolítva, mert a listener kezeli
      })
      .catch(error => {
        console.error('Hiba a jegyzet hozzáadásakor:', error);
      });
  }
}

// Jegyzet szerkesztése
function editNote(noteId) {
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
            db.collection('notes').doc(noteId).update({
              content: newContent,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .catch(error => {
              console.error('Hiba a jegyzet szerkesztésekor:', error);
              alert('Hiba történt a jegyzet mentésekor.');
            });
          } else {
            // Visszaállítjuk az eredeti megjelenítést
            const note = doc.data();
            li.innerHTML = `
              <div class="note-content">
                <strong>Tartalom:</strong> ${note.content}<br>
                <small>Létrehozta: ${note.userId || 'ismeretlen'}</small>
                <div class="note-date">
                  ${note.timestamp ? note.timestamp.toDate().toLocaleString('hu-HU') : 'Dátum nélkül'}
                </div>
              </div>
              <div class="note-actions">
                <button onclick="editNote('${doc.id}')" class="edit-btn">Szerkesztés</button>
                <button onclick="deleteNote('${doc.id}')" class="delete-btn">Törlés</button>
              </div>
            `;
          }
        });

        cancelButton.addEventListener('click', () => {
          // Visszaállítjuk az eredeti megjelenítést
          const note = doc.data();
          li.innerHTML = `
            <div class="note-content">
              <strong>Tartalom:</strong> ${note.content}<br>
              <small>Létrehozta: ${note.userId || 'ismeretlen'}</small>
              <div class="note-date">
                ${note.timestamp ? note.timestamp.toDate().toLocaleString('hu-HU') : 'Dátum nélkül'}
              </div>
            </div>
            <div class="note-actions">
              <button onclick="editNote('${doc.id}')" class="edit-btn">Szerkesztés</button>
              <button onclick="deleteNote('${doc.id}')" class="delete-btn">Törlés</button>
            </div>
          `;
        });

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
      .catch(error => {
        console.error('Hiba a jegyzet törlésekor:', error);
      });
  }
}

// Időpontok oldal betöltése
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
  
  // Korábbi listener eltávolítása ha létezik
  if (window.mainAppointmentsUnsubscribe) {
    window.mainAppointmentsUnsubscribe();
  }

  // Valós idejű query létrehozása - eltávolítva a userId szűrés
  const query = db.collection('appointments')
    .where('date', '>=', new Date())
    .orderBy('date', 'asc');

  // Valós idejű listener beállítása
  window.mainAppointmentsUnsubscribe = query.onSnapshot(snapshot => {
    console.log("Időpontok változás észlelve, darabszám:", snapshot.size);
    
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
        console.error('Hiba a dátum feldolgozásakor:', error);
      }

      li.innerHTML = `
        <div class="appointment-content">
          <div class="appointment-title">
            <strong>${appointment.title}</strong>
          </div>
          <div class="appointment-details">
            <div class="appointment-date">${dateString}</div>
            <small>Létrehozta: ${appointment.userId || 'ismeretlen'}</small>
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
    console.error('Hiba az időpontok valós idejű követésekor:', error);
    appointmentsList.innerHTML = '<li class="error-message">Hiba történt az időpontok betöltésekor</li>';
  });
}

// Cleanup függvény a modulváltáshoz
function cleanupModules() {
  // Jegyzetek listener-ek eltávolítása
  if (window.notesUnsubscribe) {
    window.notesUnsubscribe();
    window.notesUnsubscribe = null;
  }
  if (window.mainNotesUnsubscribe) {
    window.mainNotesUnsubscribe();
    window.mainNotesUnsubscribe = null;
  }
  
  // Időpontok listener-ek eltávolítása
  if (window.appointmentsUnsubscribe) {
    window.appointmentsUnsubscribe();
    window.appointmentsUnsubscribe = null;
  }
  if (window.mainAppointmentsUnsubscribe) {
    window.mainAppointmentsUnsubscribe();
    window.mainAppointmentsUnsubscribe = null;
  }

  // Statisztika listener-ek eltávolítása
  if (window.statsUnsubscribe) {
    window.statsUnsubscribe.forEach(unsubscribe => unsubscribe());
    window.statsUnsubscribe = [];
  }
}

// Módosított loadDashboardStats eleje
function loadDashboardStats() {
  // Listener-ek tárolása
  window.statsUnsubscribe = [];

  // Jegyzetek számának valós idejű követése
  const notesQuery = db.collection('notes');
  window.statsUnsubscribe.push(
    notesQuery.onSnapshot(snapshot => {
      document.getElementById('notes-count').textContent = snapshot.size + ' db';
    }, error => {
      console.error('Hiba a jegyzetek számának lekérésekor:', error);
      document.getElementById('notes-count').textContent = 'Hiba történt';
    })
  );

  // Mai időpontok számának valós idejű követése
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
    }, error => {
      console.error('Hiba a mai időpontok lekérésekor:', error);
      document.getElementById('today-appointments').textContent = 'Hiba történt';
    })
  );

  // Következő időpont valós idejű követése
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
    }, error => {
      console.error('Hiba a következő időpont lekérésekor:', error);
      document.getElementById('next-appointment').textContent = 'Hiba történt';
    })
  );
}

// Új időpont hozzáadása
function addAppointment(e) {
  e.preventDefault();
  
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
      .then(() => {
        console.log('Időpont sikeresen hozzáadva');
        
        // Form tisztítása
        document.getElementById('appointment-title').value = '';
        document.getElementById('appointment-date').value = '';
        document.getElementById('appointment-time').value = '';
        // A loadAppointments() hívás eltávolítva, mert a listener kezeli
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
            // A loadAppointments() hívás eltávolítva, mert a listener kezeli
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
      .catch(error => {
        console.error('Hiba az időpont törlésekor:', error);
      });
  }
}

// Beállítások oldal betöltése
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
      <button type="submit">Mentés</button>
    </form>
  `;
  
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  
  // Jelenlegi beállítások betöltése
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.getElementById('theme-select').value = currentTheme;
}

// Beállítások mentése
function saveSettings(e) {
  e.preventDefault();
  const theme = document.getElementById('theme-select').value;
  
  // Beállítások mentése
  localStorage.setItem('theme', theme);
  
  // Téma alkalmazása
  applyTheme(theme);
  
  alert('Beállítások sikeresen mentve!');
}

// Profil oldal betöltése
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

        <div class="button-group">
          <button type="submit" class="primary-button">Mentés</button>
          <button type="button" onclick="changePassword()" class="secondary-button">Jelszó módosítása</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  loadProfileData();
}

// Profil adatok betöltése
function loadProfileData() {
  const user = auth.currentUser;
  if (!user) return;

  document.getElementById('email').value = user.email;
  document.getElementById('display-name').value = user.displayName || '';
}

// Profil mentése
async function saveProfile(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  try {
    const newDisplayName = document.getElementById('display-name').value;
    await user.updateProfile({
      displayName: newDisplayName
    });

    alert('Profil sikeresen mentve!');
  } catch (error) {
    console.error('Hiba a profil mentésekor:', error);
    alert('Hiba történt a profil mentésekor.');
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

  // Téma betöltése és alkalmazása
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
});

console.log("app.js betöltve és feldolgozva " + new Date().toISOString());