// app-init.js

// Service Worker regisztráció
window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker regisztrálva:', registration);
    } catch (error) {
      console.error('Service Worker hiba:', error);
    }
  }
});

// Az app.js-ből importáljuk az összes exportált függvényt
import { 
  initApp,
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
} from './app.js';

// Globális függvények exportálása a window objektumra
window.initApp = initApp;  // FONTOS: Ez kell hogy a firebase-config.js meghívhassa
window.showLoginForm = showLoginForm;
window.showRegistrationForm = showRegistrationForm;
window.showForgotPasswordForm = showForgotPasswordForm;
window.handleLogin = handleLogin;
window.handleRegistration = handleRegistration;
window.handleForgotPassword = handleForgotPassword;
window.handleLogout = handleLogout;
window.togglePasswordVisibility = togglePasswordVisibility;
window.showModule = showModule;
window.showModal = showModal;
window.hideModal = hideModal;
window.showConfirmModal = showConfirmModal;
window.editAppointment = editAppointment;
window.deleteAppointment = deleteAppointment;
window.showChangeEmailModal = showChangeEmailModal;
window.showChangePasswordModal = showChangePasswordModal;
window.handleAccountDelete = handleAccountDelete;
window.resetSettings = resetSettings;
window.toggleNoteComplete = toggleNoteComplete;
window.deleteNoteQuick = deleteNoteQuick;
window.editNoteInline = editNoteInline;
window.cancelNoteEdit = cancelNoteEdit;
window.saveNoteEdit = saveNoteEdit;
window.deleteAppointmentQuick = deleteAppointmentQuick;

// Navigation események kezelése
document.querySelectorAll('.nav-item').forEach(navItem => {
  navItem.addEventListener('click', (e) => {
    e.preventDefault();
    const moduleId = e.currentTarget.id.replace('-menu', '');
    showModule(moduleId);
  });
});

// Eseménykezelők regisztrálása
document.addEventListener('DOMContentLoaded', () => {
  // Kijelentkezés gomb
  const logoutButton = document.getElementById('logout-menu');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
  
  // Bottom Navigation események (mobil)
  setupBottomNavigation();
});

// Bottom Navigation inicializálása
function setupBottomNavigation() {
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  
  bottomNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const page = e.currentTarget.dataset.page;
      
      // Aktív állapot kezelése
      bottomNavItems.forEach(navItem => navItem.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      // Oldal betöltése
      if (window.showModule) {
        window.showModule(page);
      }
    });
  });
  
  // Alapértelmezett aktív oldal beállítása (dashboard)
  const dashboardItem = document.querySelector('[data-page="dashboard"]');
  if (dashboardItem) {
    dashboardItem.classList.add('active');
  }
}

// Debug mód kezelése
const isDebugMode = localStorage.getItem('debugMode') === 'true' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname.includes('vercel.app');

if (isDebugMode) {
  console.log('Debug mód aktív');
  window.debugMode = true;
}

// PWA telepítés kezelése
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  // Megakadályozzuk az automatikus megjelenítést
  // és eltároljuk későbbi manuális használatra
  e.preventDefault();
  deferredPrompt = e;
  window.deferredInstallPrompt = e;
  console.log('PWA telepítési prompt késleltetve - manuálisan megjeleníthető');
});

// Offline/Online állapot kezelése
window.addEventListener('online', () => {
  console.log('Az alkalmazás online módba váltott');
  document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
  console.log('Az alkalmazás offline módba váltott');
  document.body.classList.add('offline');
});