const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendAppointmentNotification = functions.firestore
  .document("appointments/{appointmentId}")
  .onCreate((snapshot) => {
    const appointment = snapshot.data();
    const notifyBefore = appointment.notifyBefore; // Értesítési idő előtte (pl. 10 perc)

    if (!notifyBefore) {
      console.log("Nincs megadva értesítési idő.");
      return null;
    }

    const appointmentTime = appointment.date.toDate();
    const notificationTime = new Date(
      appointmentTime.getTime() - notifyBefore * 60000
    ); // Értesítés ideje

    if (notificationTime < new Date()) {
      console.log("Az értesítési idő már elmúlt.");
      return null;
    }

    const payload = {
      notification: {
        title: "Közelgő időpont",
        body: `Ne feledd: ${appointment.title} időpont ${
          appointmentTime.toLocaleString()
        }`
      }
    };

    return admin.firestore()
      .collection("users")
      .doc(appointment.userId)
      .get()
      .then((userDoc) => {
        if (!userDoc.exists) {
          throw new Error("Felhasználó nem található");
        }

        const userToken = userDoc.data().fcmToken;
        if (!userToken) {
          throw new Error("FCM token nem elérhető a felhasználónál");
        }

        return admin.messaging().sendToDevice(userToken, payload);
      })
      .then((response) => {
        console.log("Értesítés sikeresen elküldve:", response);
        return null;
      })
      .catch((error) => {
        console.error("Hiba az értesítés küldésekor:", error);
      });
  });
