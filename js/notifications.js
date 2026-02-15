// notifications.js
class NotificationManager {
    constructor() {
        this.swRegistration = null;
        this.initialized = false;
        this.pendingNotifications = new Map();
        this.retryAttempts = 3;
        this.vapidKey = "knDCQxYIDpfB9UONeHF2E_VIUup6XTH__TkBIIvz31w";
        this.messaging = null; // Később inicializáljuk
        this.db = null;
        this.auth = null;
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            // Referenciák beállítása
            this.messaging = window.fbMessaging;
            this.db = window.fbDb;
            this.auth = window.fbAuth;

            if (!("Notification" in window)) {
                console.warn("This browser does not support notifications");
                return false;
            }

            if (!("serviceWorker" in navigator)) {
                console.warn("Service Worker not supported");
                return false;
            }

            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
            console.log("Service Worker registered successfully");

            // Initialize Firebase Messaging csak ha elérhető
            if (this.messaging) {
                try {
                    const token = await this.messaging.getToken({
                        vapidKey: this.vapidKey,
                        serviceWorkerRegistration: this.swRegistration
                    });
                    
                    if (token) {
                        console.log("FCM token beszerzése sikeres:", token);
                        await this.updateUserFCMToken(token);
                    } else {
                        console.warn("FCM token beszerzése sikertelen - nincs engedély");
                    }
                } catch (error) {
                    console.error("Failed to get FCM token:", error);
                    // Az alkalmazás tovább működhet értesítések nélkül is
                }
            } else {
                console.warn("Firebase Messaging nem elérhető - értesítések korlátozottak");
            }

            this.initialized = true;
            return true;

        } catch (error) {
            console.error("Failed to initialize NotificationManager:", error);
            return false;
        }
    }

    async requestPermission() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === "granted") {
                const user = this.auth.currentUser;
                if (user) {
                    await this.db.collection('users').doc(user.uid).update({
                        notificationsEnabled: true,
                        lastNotificationUpdate: this.db.FieldValue.serverTimestamp()
                    });
                }
                return true;
            }
            return false;

        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return false;
        }
    }

    async scheduleNotification(appointment) {
        if (!this.initialized || Notification.permission !== "granted") {
            return false;
        }

        try {
            const now = new Date();
            const appointmentTime = appointment.date.toDate();
            const notifyBefore = appointment.notifyBefore || 10; // Default 10 minutes
            const notificationTime = new Date(appointmentTime.getTime() - (notifyBefore * 60000));

            if (notificationTime <= now) {
                return false;
            }

            const timeoutId = setTimeout(async () => {
                await this.showNotification({
                    title: "Közelgő időpont",
                    body: `${appointment.title} időpontod ${appointmentTime.toLocaleTimeString('hu-HU')}-kor lesz.`,
                    tag: `appointment-${appointment.id}`,
                    data: {
                        appointmentId: appointment.id,
                        url: '/appointments'
                    }
                });
                this.pendingNotifications.delete(appointment.id);
            }, notificationTime.getTime() - now.getTime());

            this.pendingNotifications.set(appointment.id, {
                timeoutId,
                appointment,
                notificationTime
            });

            return true;

        } catch (error) {
            console.error("Error scheduling notification:", error);
            return false;
        }
    }

    async showNotification(options) {
        if (!this.initialized || Notification.permission !== "granted") {
            return false;
        }

        try {
            await this.swRegistration.showNotification(options.title, {
                body: options.body,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-48.png',
                vibrate: [200, 100, 200],
                tag: options.tag,
                requireInteraction: true,
                actions: [
                    {
                        action: 'open',
                        title: 'Megnyitás'
                    },
                    {
                        action: 'dismiss',
                        title: 'Bezárás'
                    }
                ],
                data: {
                    url: options.data?.url || '/',
                    timestamp: Date.now(),
                    ...options.data
                },
                ...options
            });

            return true;

        } catch (error) {
            console.error("Error showing notification:", error);
            return false;
        }
    }

    async updateUserFCMToken(token) {
        try {
            const user = this.auth.currentUser;
            if (user) {
                await this.db.collection('users').doc(user.uid).update({
                    fcmToken: token,
                    lastTokenUpdate: this.db.FieldValue.serverTimestamp()
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error updating FCM token:", error);
            return false;
        }
    }

    clearScheduledNotifications() {
        for (const [id, data] of this.pendingNotifications) {
            clearTimeout(data.timeoutId);
        }
        this.pendingNotifications.clear();
    }

    async cancelNotification(appointmentId) {
        const pendingNotification = this.pendingNotifications.get(appointmentId);
        if (pendingNotification) {
            clearTimeout(pendingNotification.timeoutId);
            this.pendingNotifications.delete(appointmentId);
            return true;
        }
        return false;
    }
}

// Globális példány létrehozása (nem ES6 module export)
if (typeof window !== 'undefined') {
    window.notificationManager = new NotificationManager();
}

// Export csak ha támogatott (backwards compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationManager };
}// ========================================
// EGYSZERŰ PUSH ÉRTESÍTÉSEK (Web Notifications API)
// ========================================

class SimpleNotificationManager {
  constructor() {
    this.permission = 'default';
    this.enabled = false;
  }

  // Inicializálás
  async init() {
    console.log('🔔 Értesítések inicializálása...');
    
    if (!('Notification' in window)) {
      console.warn('❌ Böngésző nem támogatja az értesítéseket');
      return false;
    }

    // Service Worker ellenőrzés
    if (!('serviceWorker' in navigator)) {
      console.warn('❌ Service Worker nem támogatott');
      return false;
    }

    // Regisztráció
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker regisztrálva');
      this.registration = registration;
    } catch (error) {
      console.error('❌ Service Worker regisztráció hiba:', error);
      return false;
    }

    // Engedély ellenőrzése
    this.permission = Notification.permission;
    this.enabled = this.permission === 'granted';
    
    console.log(`🔔 Értesítés engedély: ${this.permission}`);
    return true;
  }

  // Engedély kérése
  async requestPermission() {
    if (this.permission === 'granted') {
      console.log('✅ Értesítés engedély már megadva');
      return true;
    }

    try {
      this.permission = await Notification.requestPermission();
      this.enabled = this.permission === 'granted';
      
      if (this.enabled) {
        console.log('✅ Értesítés engedély megadva');
        // Teszt értesítés
        this.showNotification('NoteApp PWA', {
          body: 'Értesítések sikeresen engedélyezve! 🎉',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'welcome'
        });
        return true;
      } else {
        console.warn('❌ Értesítés engedély megtagadva');
        return false;
      }
    } catch (error) {
      console.error('❌ Engedély kérés hiba:', error);
      return false;
    }
  }

  // Egyszerű értesítés megjelenítése
  showNotification(title, options = {}) {
    if (!this.enabled) {
      console.warn('⚠️ Értesítések nincsenek engedélyezve');
      return;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    };

    if (this.registration && this.registration.showNotification) {
      // Service Worker értesítés (jobb mobilon)
      this.registration.showNotification(title, defaultOptions);
    } else {
      // Fallback
      new Notification(title, defaultOptions);
    }
  }

  // Jegyzet értesítés (új jegyzet létrehozva)
  notifyNewNote(noteContent, userName) {
    this.showNotification('📝 Új jegyzet', {
      body: `${userName}: ${noteContent.substring(0, 100)}`,
      tag: 'new-note',
      data: { type: 'note' }
    });
  }

  // Jegyzet módosítás értesítés
  notifyNoteUpdated(noteContent, userName) {
    this.showNotification('✏️ Jegyzet módosítva', {
      body: `${userName}: ${noteContent.substring(0, 100)}`,
      tag: 'note-updated',
      data: { type: 'note' }
    });
  }

  // Jegyzet kipipálás értesítés
  notifyNoteCompleted(noteContent, userName) {
    this.showNotification('✅ Jegyzet elvégezve', {
      body: `${userName}: ${noteContent.substring(0, 100)}`,
      tag: 'note-completed',
      data: { type: 'note' }
    });
  }

  // Időpont értesítés
  notifyAppointment(title, minutesBefore) {
    const timeText = minutesBefore === 0 ? 'Most!' : 
                     minutesBefore < 60 ? `${minutesBefore} perc múlva` :
                     `${Math.floor(minutesBefore / 60)} óra múlva`;
    
    this.showNotification(`📅 ${title}`, {
      body: `Időpont: ${timeText}`,
      tag: 'appointment',
      requireInteraction: true, // Ne tűnjön el automatikusan
      data: { type: 'appointment' }
    });
  }

  // Időpont figyelő indítása
  startAppointmentMonitoring() {
    console.log('⏰ Időpont figyelő indítása...');
    
    // Ellenőrzés minden percben
    setInterval(() => {
      this.checkUpcomingAppointments();
    }, 60000); // 60 másodperc

    // Első ellenőrzés azonnal
    this.checkUpcomingAppointments();
  }

  // Közelgő időpontok ellenőrzése
  async checkUpcomingAppointments() {
    if (!this.enabled || !window.fbDb || !window.fbAuth) return;

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const snapshot = await window.fbDb.collection('appointments')
        .where('date', '>=', firebase.firestore.Timestamp.fromDate(now))
        .where('date', '<=', firebase.firestore.Timestamp.fromDate(in24Hours))
        .get();

      snapshot.forEach(doc => {
        const appt = doc.data();
        const apptDate = appt.date.toDate();
        const minutesUntil = Math.floor((apptDate - now) / 60000);
        const notifyBefore = appt.notifyBefore || 30;

        // Értesítés időpontja
        const shouldNotify = minutesUntil <= notifyBefore && minutesUntil >= 0;
        
        // Ellenőrzés hogy már küldtünk-e értesítést
        const notificationKey = `notified_${doc.id}_${notifyBefore}`;
        const alreadyNotified = localStorage.getItem(notificationKey);

        if (shouldNotify && !alreadyNotified) {
          console.log(`🔔 Időpont értesítés: ${appt.title} (${minutesUntil} perc múlva)`);
          this.notifyAppointment(appt.title, minutesUntil);
          
          // Jelölés hogy értesítettünk
          localStorage.setItem(notificationKey, 'true');
          
          // Automatikus törlés 2 óra után
          setTimeout(() => {
            localStorage.removeItem(notificationKey);
          }, 2 * 60 * 60 * 1000);
        }
      });
    } catch (error) {
      console.error('❌ Időpont ellenőrzés hiba:', error);
    }
  }
}

// Globális példány
window.simpleNotificationManager = new SimpleNotificationManager();

// Auto-inicializálás amikor Firebase készen áll
window.addEventListener('load', async () => {
  // Várunk amíg Firebase inicializálódik
  const waitForFirebase = setInterval(() => {
    if (window.fbDb && window.fbAuth) {
      clearInterval(waitForFirebase);
      
      window.simpleNotificationManager.init().then(success => {
        if (success) {
          console.log('✅ SimpleNotificationManager inicializálva');
          
          // Automatikus engedély kérés (csak ha még nem döntött)
          if (Notification.permission === 'default') {
            setTimeout(() => {
              window.simpleNotificationManager.requestPermission().then(granted => {
                if (granted) {
                  // Időpont figyelő indítása
                  window.simpleNotificationManager.startAppointmentMonitoring();
                }
              });
            }, 2000); // 2 mp késleltetés hogy ne legyen zavaró
          } else if (Notification.permission === 'granted') {
            // Már van engedély, indítjuk a figyelőt
            window.simpleNotificationManager.startAppointmentMonitoring();
          }
        }
      });
    }
  }, 100);
});
