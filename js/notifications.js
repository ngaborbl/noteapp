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
}