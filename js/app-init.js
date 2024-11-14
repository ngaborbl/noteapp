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
  resetSettings
} from './app.js';

// Globális függvények exportálása a window objektumra
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
});

// Debug mód kezelése
const isDebugMode = localStorage.getItem('debugMode') === 'true' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname.includes('vercel.app');

if (isDebugMode) {
  console.log('Debug mód aktív');
  window.debugMode = true;
}

// PWA telepítés kezelése
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  window.deferredInstallPrompt = e;
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