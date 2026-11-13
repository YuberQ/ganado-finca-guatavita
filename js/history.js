// history.js — Modal y visualización del historial de cambios
import { getHistorial } from './db.js';
import { formatDate, formatDateTime, escapeHTML, showLoading, hideLoading, showToast } from './ui.js';

export async function renderHistoryModal(animalId) {
  showLoading();
  try {
    const historial = await getHistorial(animalId);

    const modal = document.createElement('div');
    modal.className = 'modal';

    let tableRows = '';
    if (!historial || historial.length === 0) {
      tableRows = '<tr><td colspan="5" class="empty-state">No hay cambios registrados para este animal.</td></tr>';
    } else {
      tableRows = historial.map(h => `
        <tr>
          <td>${formatDateTime(h.fecha || h.created_at)}</td>
          <td><strong>${escapeHTML(h.campo_cambiado || '—')}</strong></td>
          <td><span style="color:var(--color-danger); text-decoration:line-through;">${escapeHTML(h.valor_anterior ?? '—')}</span></td>
          <td><span style="color:var(--green-700); font-weight:600;">${escapeHTML(h.valor_nuevo ?? '—')}</span></td>
          <td>${escapeHTML(h.nota || h.nota_obligatoria || 'Sin nota')}</td>
        </tr>
      `).join('');
    }

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 780px;">
        <div class="modal-header">
          <span>⚠️ Historial de Modificaciones</span>
          <button class="modal-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body" style="padding: 16px;">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
            Registro auditado de cada cambio de datos y estado, junto a la justificación obligatoria.
          </p>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Campo</th>
                  <th>Anterior</th>
                  <th>Nuevo</th>
                  <th>Nota / Motivo</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-close-btn">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.modal-close').addEventListener('click', close);
    modal.querySelector('.modal-close-btn').addEventListener('click', close);

  } catch (err) {
    console.error(err);
    showToast('Error cargando el historial: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}
