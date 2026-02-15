# Changelog - NoteApp PWA

## [v1.92] - 2026-02-14

### 🎉 Új funkció: Párkapcsolati/Családi Dashboard

#### Dashboard Teljes Átalakítása
- **Használati eset:** Közös bevásárlólista + Közös időpont emlékeztető
- **Cél:** Gyors hozzáférés mobilon, azonnal látható jegyzetek/időpontok

#### Törölve (felesleges elemek):
- ❌ Felhasználó info kártya (név, utolsó belépés)
- ❌ Statisztikai kártyák
- ❌ Keresés és szűrés
- ❌ Horizontális scroll

#### Új funkciók:
- ✅ **Központi gyors gombok**: + Új jegyzet | + Új időpont
- ✅ **Todo lista stílus jegyzetek**:
  - Checkbox kipipálás (elvégezve állapot)
  - Gyors törlés (piros X gomb)
  - Inline szerkesztés (később)
  - Real-time sync (mindketten látják)
- ✅ **Kompakt időpont megjelenítés**:
  - Dátum badge (nap + hónap)
  - Idő megjelenítés
  - Szerkesztés gomb (✏️)
  - Csak közelgő időpontok

#### Mobil Optimalizálás
- ~70% magasság csökkenés a dashboard tetején
- Jegyzetek AZONNAL láthatók görgetés nélkül
- Touch-friendly nagy gombok (48px+)
- Modern, tiszta dizájn

#### Adatmodell Változások
- `notes` collection: új `completed: boolean` mező

#### Fejlesztői Változások
- `js/app.js`: Új dashboard funkciók (+171 sor)
  - `loadSharedNotes()` - közös jegyzetek betöltése
  - `createTodoItem()` - todo item HTML
  - `toggleNoteComplete()` - kipipálás
  - `deleteNoteQuick()` - gyors törlés
  - `loadSharedAppointments()` - közös időpontok
  - `createAppointmentItem()` - időpont HTML
- `css/style.css`: Új dashboard stílusok (+259 sor)
  - Todo lista stílusok
  - Dátum badge stílusok
  - Mobil optimalizációk

### 📄 Dokumentáció
- **FAMILY_DASHBOARD.md**: Teljes használati útmutató

---

## [v1.91] - 2026-02-14

### 🎉 Új funkció: Bottom Navigation (Mobil-first)

#### Bottom Navigation Bar
- **Mobilra optimalizált** alsó navigációs sáv iOS/Android stílusban
- 4 fő menüpont: Dashboard (🏠), Jegyzetek (📝), Időpontok (📅), Profil (👤)
- Aktív állapot vizuális kiemelése
- Smooth animációk és ripple effect
- iOS Safe Area támogatás (notch)
- Material Design specifikáció követése
- Touch-friendly (min 44x44px célpontok)

#### Responsive Design
- Mobil (< 768px): Bottom navigation
- Tablet/Desktop (> 768px): Top navigation (eredeti)
- Footer elrejtése mobilon

#### UI Fejlesztések
- **Admin menü eltávolítva** (nincs implementálva, felesleges)
- Profil oldalon mobil extra gombok:
  - ⚙️ Beállítások
  - 🚪 Kijelentkezés
- Main tartalom padding optimalizálva bottom nav-hoz

#### Fejlesztői Változások
- `css/style.css`: +180 sor (bottom nav styles)
- `js/app-init.js`: `setupBottomNavigation()` függvény
- `js/app.js`: `updateBottomNavActive()` függvény
- `index.html`: Bottom nav HTML struktúra

### 📄 Dokumentáció
- **BOTTOM_NAV.md**: Részletes implementációs dokumentáció

---

## [v1.90] - 2026-02-14

### 🔧 Javítások (Bug Fixes)

#### Firebase Timestamp API javítás
- **Kritikus hiba javítva**: Jegyzetek és időpontok létrehozása működik
- `window.fbDb.Timestamp` → `firebase.firestore.Timestamp` (15 hely)
- Python script automatikus csere használatával

#### Hiányzó ikon fájlok
- `icons/notes-empty.svg` létrehozva
- `icons/calendar-empty.svg` létrehozva
- Hivatkozások frissítve `.png` → `.svg`

### 📄 Dokumentáció
- **TIMESTAMP_FIX.md**: Timestamp javítás dokumentáció

---

## [v1.89] - 2026-02-14

### 🔧 Javítások (Bug Fixes)

#### Firebase verzió egységesítés
- `firebase-messaging-sw.js`: 9.0.0 → 10.8.0

#### Firestore Persistence
- Elavult `db.settings()` lecserélve `enablePersistence()` API-ra
- Persistence warning megszüntetve
- Jobb error handling

#### Firebase Cloud Messaging
- Messaging inicializálás javítva null-check-kel
- FCM token beszerzés jobb hibakezeléssel
- Az app működik értesítések nélkül is

#### Module Loading
- `notifications.js`: ES6 export → globális window objektum
- `app.js`: Import eltávolítva, globális referencia
- `index.html`: notifications.js script tag hozzáadva

#### Manifest.json
- `gcm_sender_id` javítva (10607490745)

### 📄 Dokumentáció
- **JAVITASOK.md**: Részletes hibajavítási dokumentáció
- **CHANGELOG.md**: Verzió történet
- **README.md**: Projekt áttekintés

---

## [v1.88] - 2024 (Előző verzió)

### Jellemzők
- Firebase Authentication
- Firestore adatbázis
- Jegyzetek CRUD
- Időpontok kezelése
- PWA funkcionalitás
- Offline működés
- Push értesítések (FCM)

### Ismert problémák
- ❌ FCM token beszerzési hibák → **v1.89-ben javítva**
- ❌ Firebase persistence figyelmeztetések → **v1.89-ben javítva**
- ❌ Module loading problémák → **v1.89-ben javítva**
- ❌ Timestamp API hibák → **v1.90-ben javítva**
- ❌ Nincs mobil optimalizálás → **v1.91-ben javítva**

---

## 🎯 Roadmap (Tervezett)

### Rövid távú (v1.92 - v1.95)
- [ ] Swipe gestures jegyzetek/időpontok törlésére
- [ ] Pull-to-refresh listák frissítéséhez
- [ ] Haptic feedback mobil interakciókhoz
- [ ] Loading states finomhangolása
- [ ] Touch target méretek optimalizálása

### Közép távú (v2.0)
- [ ] Dark mode implementálása
- [ ] Firebase SDK frissítés legújabb verzióra
- [ ] TypeScript migráció
- [ ] Unit tesztek írása (Jest)
- [ ] CI/CD pipeline beállítása

### Hosszú távú (v2.x)
- [ ] Több nyelv támogatása (i18n)
- [ ] Képek támogatása jegyzetekben
- [ ] Megosztási funkciók
- [ ] Collaborative editing
- [ ] Export/Import funkciók (JSON, PDF)
- [ ] Voice input jegyzetek/időpontokhoz
- [ ] Naptár integráció (Google Calendar)
- [ ] Widget support (iOS/Android)

---

**Készítve ❤️-tel, Claude segítségével**
