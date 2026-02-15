# 📝 NoteApp PWA

> Modern jegyzetelő és időpontkezelő alkalmazás Progressive Web App technológiával

![Version](https://img.shields.io/badge/version-1.89-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-10.8.0-orange.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-green.svg)

---

## ✨ Funkciók

### 🔐 Autentikáció
- Biztonságos regisztráció és bejelentkezés
- Email-jelszó alapú hitelesítés
- Jelszó visszaállítás
- Profil kezelés

### 📒 Jegyzetek
- Jegyzetek létrehozása, szerkesztése, törlése
- Valós idejű szinkronizáció
- Offline működés
- Automatikus mentés

### 📅 Időpontok
- Időpont létrehozása értesítéssel
- Rugalmas értesítési időpontok
- Naptár nézet
- Emlékeztető funkció

### 🔔 Értesítések
- Push értesítések Firebase Cloud Messaging használatával
- Offline értesítés tárolás
- Testreszabható értesítési preferenciák

### 💾 Offline működés
- Service Worker alapú cache
- IndexedDB adattárolás
- Automatikus szinkronizáció online mód visszatérésekor

### 🎨 Progressive Web App
- Telepíthető mobilra és desktopra
- Native app élmény
- Gyors betöltés
- Reszponzív design

---

## 🚀 Gyors kezdés

### Előfeltételek
- Webszerver (Python, Node.js http-server, vagy hasonló)
- Modern böngésző (Chrome, Firefox, Edge, Safari)

### Telepítés

1. **Könyvtár megnyitása:**
```bash
cd D:\noteapp-pwa
```

2. **Lokális szerver indítása:**

**Python 3 használatával:**
```bash
python -m http.server 8000
```

**Node.js http-server használatával:**
```bash
npm install -g http-server
http-server -p 8000
```

3. **Böngészőben megnyitás:**
```
http://localhost:8000
```

4. **PWA telepítése (opcionális):**
   - Chrome: Címsáv jobb oldalán lévő "Telepítés" gombra kattintás
   - Mobilon: "Hozzáadás a kezdőképernyőhöz"

---

## 🏗️ Projekt felépítés

```
noteapp-pwa/
├── index.html                    # Fő HTML fájl
├── manifest.json                 # PWA manifest
├── service-worker.js             # Service Worker
├── firebase-messaging-sw.js      # Firebase Messaging SW
│
├── css/
│   └── style.css                 # Főbb stílusok
│
├── js/
│   ├── app.js                    # Fő alkalmazás logika
│   ├── app-init.js               # Inicializálás
│   ├── firebase-config.js        # Firebase konfiguráció
│   ├── notifications.js          # Értesítések kezelése
│   └── ui-utils.js               # UI segédfüggvények
│
├── icons/                        # Alkalmazás ikonok
├── fonts/                        # Egyedi betűtípusok
│
└── functions/                    # Firebase Cloud Functions
    ├── index.js
    └── package.json
```

---

## 🔧 Konfiguráció

### Firebase beállítások
A `js/firebase-config.js` fájlban található a Firebase projekt konfigurációja:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "noteapp-5c98e.firebaseapp.com",
  projectId: "noteapp-5c98e",
  storageBucket: "noteapp-5c98e.appspot.com",
  messagingSenderId: "10607490745",
  appId: "...",
  measurementId: "..."
};
```

### Service Worker
- **Cache név:** `noteapp-cache-v1`
- **Cache stratégia:** Cache first, fallback to network
- **Offline fallback:** Alapértelmezett offline tartalom

---

## 📱 Támogatott platformok

### Desktop
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

### Mobil
- ✅ Chrome Android
- ✅ Safari iOS
- ✅ Samsung Internet
- ✅ Firefox Android

---

## 🧪 Tesztelés

### Console ellenőrzés
1. F12 / Developer Tools megnyitása
2. **Console tab:** Hibaüzenetek, logok
3. **Application tab:** 
   - Service Workers státusz
   - Cache tartalom
   - Manifest beállítások
   - IndexedDB adatok

### PWA audit
```bash
# Lighthouse futtatása
lighthouse http://localhost:8000 --view
```

### Funkcionális tesztek
- [ ] Regisztráció működik
- [ ] Bejelentkezés működik
- [ ] Jegyzetek CRUD működik
- [ ] Időpontok CRUD működik
- [ ] Értesítések működnek
- [ ] Offline mód működik

---

## 📚 Technológiák

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Firebase (Authentication, Firestore, Cloud Messaging)
- **PWA:** Service Workers, Cache API, Web App Manifest
- **Offline:** IndexedDB, localStorage
- **Értesítések:** Web Notifications API, Firebase Cloud Messaging

---

## 🐛 Hibakeresés

### Gyakori problémák

**1. Service Worker nem regisztrálódik**
- Ellenőrizd hogy HTTPS-en vagy localhost-on futtatod
- Cache törölése és újrapróbálkozás
- Console hibaüzenetek ellenőrzése

**2. Értesítések nem működnek**
- Böngésző értesítési engedélyek ellenőrzése
- Firebase projekt beállítások ellenőrzése
- VAPID kulcs helyessége

**3. Firebase kapcsolati problémák**
- Firebase projekt aktív-e
- API kulcsok helyességének ellenőrzése
- Firewall/proxy beállítások

**További segítség:** Nézd meg a `JAVITASOK.md` fájlt!

---

## 📝 Changelog

Az összes változás listája a [CHANGELOG.md](CHANGELOG.md) fájlban található.

### Legújabb verzió - v1.89 (2026-02-14)
- ✅ Firebase verzió konfliktus javítva
- ✅ Firestore persistence warning kijavítva
- ✅ FCM inicializálás javítva
- ✅ Module loading problémák megoldva
- ✅ Manifest gcm_sender_id javítva

---

## 🤝 Közreműködés

Jelenlegi fejlesztő: **Nagy Gábor**

---

## 📄 Licenc

Ez egy privát projekt.

---

## 🔗 Hasznos linkek

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Készítve ❤️-tel, Claude segítségével**
