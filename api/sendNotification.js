// api/sendNotification.js
import admin from "firebase-admin";

// Inicializáljuk a Firebase Admin SDK-t
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, appointmentTitle, appointmentTime, notifyBefore } = req.body;

  if (!userId || !appointmentTitle || !appointmentTime || notifyBefore == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const appointmentDate = new Date(appointmentTime);
  const notificationTime = new Date(
    appointmentDate.getTime() - notifyBefore * 60000
  );

  if (notificationTime < new Date()) {
    return res.status(400).json({ error: "Notification time is in the past" });
  }

  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userToken = userDoc.data().fcmToken;
    if (!userToken) {
      throw new Error("User does not have an FCM token");
    }

    const payload = {
      notification: {
        title: "Közelgő időpont",
        body: `Ne feledd: ${appointmentTitle} időpont ${appointmentDate.toLocaleString()}`,
      },
    };

    await admin.messaging().sendToDevice(userToken, payload);

    return res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ error: error.message });
  }
}
