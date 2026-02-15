// ui-utils.js
export function createAppointmentElement(id, appointment) {
  const div = document.createElement('div');
  div.className = 'appointment-card';
  div.setAttribute('data-appointment-id', id);
  div.setAttribute('data-date', appointment.date.toDate().toISOString());
  
  const now = new Date();
  const appointmentDate = appointment.date.toDate();
  let status = '';
  
  if (appointmentDate < now) {
    status = 'past';
  } else if (
    appointmentDate.getDate() === now.getDate() &&
    appointmentDate.getMonth() === now.getMonth() &&
    appointmentDate.getFullYear() === now.getFullYear()
  ) {
    status = 'today';
  }
  
  if (status) {
    div.classList.add(status);
  }
  
  div.innerHTML = `
    <div class="appointment-content">
      <h3 class="appointment-title">${appointment.title}</h3>
      <div class="appointment-datetime">
        <i class="calendar-icon"></i>
        ${appointmentDate.toLocaleDateString('hu-HU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
        <i class="time-icon"></i>
        ${appointmentDate.toLocaleTimeString('hu-HU', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      ${appointment.description ? `
        <div class="appointment-description">
          ${appointment.description}
        </div>
      ` : ''}
      ${appointment.notifyBefore ? `
        <div class="appointment-notification">
          <i class="notification-icon"></i>
          Értesítés ${appointment.notifyBefore} perccel előtte
        </div>
      ` : ''}
    </div>
    <div class="appointment-actions">
      <button onclick="editAppointment('${id}')" 
              class="edit-button" 
              title="Szerkesztés">
        <i class="edit-icon"></i>
      </button>
      <button onclick="deleteAppointment('${id}')" 
              class="delete-button"
              title="Törlés">
        <i class="delete-icon"></i>
      </button>
    </div>
  `;
  
  return div;
}

export function showEditAppointmentModal(appointmentId, appointment) {
  const appointmentDate = appointment.date.toDate();
  const dateString = appointmentDate.toISOString().split('T')[0];
  const timeString = appointmentDate.toTimeString().slice(0, 5);

  const modalContent = `
    <form id="edit-appointment-form" class="appointment-form">
      <div class="form-row">
        <div class="form-group">
          <label for="edit-appointment-title">Megnevezés</label>
          <input type="text" 
                 id="edit-appointment-title" 
                 value="${appointment.title}"
                 required>
        </div>
        <div class="form-group">
          <label for="edit-appointment-date">Dátum</label>
          <input type="date" 
                 id="edit-appointment-date"
                 value="${dateString}"
                 min="${new Date().toISOString().split('T')[0]}"
                 required>
        </div>
        <div class="form-group">
          <label for="edit-appointment-time">Időpont</label>
          <input type="time" 
                 id="edit-appointment-time"
                 value="${timeString}"
                 required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="edit-appointment-description">Leírás</label>
          <textarea id="edit-appointment-description">${appointment.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-appointment-notify">Értesítés</label>
          <select id="edit-appointment-notify">
            <option value="10" ${appointment.notifyBefore === 10 ? 'selected' : ''}>
              10 perccel előtte
            </option>
            <option value="30" ${appointment.notifyBefore === 30 ? 'selected' : ''}>
              30 perccel előtte
            </option>
            <option value="60" ${appointment.notifyBefore === 60 ? 'selected' : ''}>
              1 órával előtte
            </option>
            <option value="1440" ${appointment.notifyBefore === 1440 ? 'selected' : ''}>
              1 nappal előtte
            </option>
            <option value="0" ${!appointment.notifyBefore ? 'selected' : ''}>
              Nincs értesítés
            </option>
          </select>
        </div>
      </div>
    </form>
  `;

  // Meghívja a globális showModal függvényt
  window.showModal({
    title: 'Időpont szerkesztése',
    content: modalContent,
    buttons: [
      {
        text: 'Mentés',
        type: 'primary',
        onClick: async () => {
          const title = document.getElementById('edit-appointment-title').value.trim();
          const date = document.getElementById('edit-appointment-date').value;
          const time = document.getElementById('edit-appointment-time').value;
          const description = document.getElementById('edit-appointment-description').value.trim();
          const notifyBefore = parseInt(document.getElementById('edit-appointment-notify').value);

          if (!title || !date || !time) return;

          try {
            const dateTime = new Date(`${date}T${time}`);
            if (isNaN(dateTime.getTime())) {
              throw new Error('Érvénytelen dátum vagy idő');
            }

            const updatedData = {
              title,
              description,
              date: window.fbDb.Timestamp.fromDate(dateTime),
              notifyBefore,
              lastModified: window.fbDb.Timestamp.now()
            };

            await window.fbDb.collection('appointments').doc(appointmentId).update(updatedData);

            // Értesítés frissítése - JELENLEG NEM HASZNÁLJUK
            // if (notifyBefore > 0) {
            //   await window.notificationManager.updateAppointmentNotification({
            //     id: appointmentId,
            //     ...updatedData
            //   });
            // } else {
            //   await window.notificationManager.cancelNotification(appointmentId);
            // }

            window.hideModal();
            console.info("Időpont sikeresen frissítve", { appointmentId });
          } catch (error) {
            console.error("Hiba az időpont frissítésekor", error);
            alert('Nem sikerült frissíteni az időpontot');
          }
        }
      },
      {
        text: 'Mégse',
        type: 'secondary',
        onClick: window.hideModal
      }
    ]
  });
}