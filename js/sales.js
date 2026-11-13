// sales.js — Gestión de animales vendidos, formulario de venta y animales perdidos
import { venderAnimal, revertirVenta, revertirPerdido, getVendidos, getPerdidos, getAnimal } from './db.js';
import { showNoteModal, showToast, showLoading, hideLoading, formatDate, formatMoney, formatWeight, escapeHTML, setupMoneyInput, parseMoneyInput } from './ui.js';

/**
 * Modal para vender un animal.
 * Permite registrar peso de salida (opcional si no fue pesado), precio de venta y comprador.
 */
export async function renderSellForm(animalId) {
  showLoading();
  try {
    const animal = await getAnimal(animalId);
    if (!animal) {
      showToast('Animal no encontrado', 'error');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <span>Registrar Venta — ${escapeHTML(animal.nombre)}</span>
          <button class="modal-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Al marcarlo como vendido, este animal saldrá del banner y catálogo principal activo y se moverá a la sección "Vendidos".
          </p>

          <form id="sell-modal-form">
            <div class="form-group">
              <label class="form-label" for="sell-peso">Peso de Salida (kg — opcional si no se vendió pesado)</label>
              <input type="number" step="0.01" id="sell-peso" class="form-input" placeholder="Ej: 420" />
            </div>

            <div class="form-group">
              <label class="form-label" for="sell-precio">Precio Total de Venta ($ COP) *</label>
              <input type="text" id="sell-precio" class="form-input" placeholder="$ 0" autocomplete="off" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="sell-comprador">Comprador (Opcional)</label>
              <input type="text" id="sell-comprador" class="form-input" placeholder="Nombre del comprador" />
            </div>

            <div class="form-group">
              <label class="form-label" for="sell-nota">Observación de Venta</label>
              <textarea id="sell-nota" class="form-textarea" rows="2" placeholder="Detalles de entrega, pago, etc."></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
              <button type="button" class="btn btn-secondary modal-cancel-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">Confirmar Venta</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.modal-close').addEventListener('click', close);
        modal.querySelector('.modal-cancel-btn').addEventListener('click', close);
    setupMoneyInput(modal.querySelector('#sell-precio'));

    modal.querySelector('#sell-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pesoSalida = modal.querySelector('#sell-peso').value;
      const precioVenta = parseMoneyInput(modal.querySelector('#sell-precio'));
      const comprador = modal.querySelector('#sell-comprador').value.trim() || null;
      const nota = modal.querySelector('#sell-nota').value.trim() || 'Venta de animal';

      if (!precioVenta || precioVenta <= 0) {
        showToast('Ingrese un precio de venta válido', 'error');
        return;
      }

      showLoading();
      try {
        await venderAnimal(animalId, {
          peso_salida: pesoSalida ? parseFloat(pesoSalida) : null,
          precio_venta: precioVenta,
          comprador: comprador,
          nota: nota
        });

        close();
        showToast('Venta registrada', 'success');
        window.location.hash = '#/sold';
      } catch (err) {
        console.error(err);
        showToast('Error registrando la venta: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    });

  } catch (err) {
    console.error(err);
    showToast('Error preparando formulario de venta: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Listado de animales vendidos con opción de revertir venta con nota obligatoria.
 */
export async function renderSoldList(container) {
  showLoading();
  try {
    const vendidos = await getVendidos();

    let tableRows = '';
    if (!vendidos || vendidos.length === 0) {
      tableRows = '<tr><td colspan="7" class="empty-state">No hay animales registrados como vendidos.</td></tr>';
    } else {
      tableRows = vendidos.map(a => {
        const venta = a.ventas && a.ventas.length > 0 ? a.ventas[0] : null;
        const pesoSalida = venta?.peso_salida ? formatWeight(venta.peso_salida) : 'Sin pesar';
        const precioVenta = venta?.precio_venta ? formatMoney(venta.precio_venta) : '—';
        const fechaVenta = venta?.fecha_venta ? formatDate(venta.fecha_venta) : '—';
        const comprador = venta?.comprador ? escapeHTML(venta.comprador) : '—';

        return `
          <tr>
            <td><strong>N° ${escapeHTML(a.numero)}</strong></td>
            <td>
              <a href="#/animal/${a.id}" style="color:var(--green-700); font-weight:700; text-decoration:none;">
                ${escapeHTML(a.nombre)}
              </a>
            </td>
            <td><span class="badge badge-${a.tipo}">${escapeHTML(a.tipo)}</span></td>
            <td>${pesoSalida}</td>
            <td><strong style="color:var(--green-700);">${precioVenta}</strong></td>
            <td>${fechaVenta}</td>
            <td>${comprador}</td>
            <td style="text-align:right;">
              <button class="btn btn-sm btn-secondary btn-revert-sale" data-id="${a.id}" data-name="${escapeHTML(a.nombre)}">
                Corregir / Revertir
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h2>Vendidos</h2>
          <span style="font-size:14px; font-weight:600; color:var(--text-secondary);">
            Total: ${vendidos ? vendidos.length : 0} animales
          </span>
        </div>
        <div class="card-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Historial de ventas realizadas. Si hubo alguna equivocación al marcar un animal como vendido, puede corregirlo exigiendo una nota obligatoria de justificación.
          </p>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Peso Salida</th>
                  <th>Precio Venta</th>
                  <th>Fecha Venta</th>
                  <th>Comprador</th>
                  <th style="text-align:right;">Acción</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Botones de revertir venta con nota obligatoria
    container.querySelectorAll('.btn-revert-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const nombre = btn.dataset.name;

        showNoteModal(`Revertir venta de "${nombre}"`, async (nota) => {
          showLoading();
          try {
            await revertirVenta(id, nota);
            showToast(`Venta revertida para ${nombre}. Volvió al inventario activo.`, 'success');
            renderSoldList(container);
          } catch (err) {
            console.error(err);
            showToast('Error revirtiendo venta: ' + err.message, 'error');
          } finally {
            hideLoading();
          }
        });
      });
    });

  } catch (err) {
    console.error(err);
    showToast('Error cargando lista de vendidos: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Listado de animales perdidos con opción de revertir estado con nota obligatoria.
 */
export async function renderLostList(container) {
  showLoading();
  try {
    const perdidos = await getPerdidos();

    let tableRows = '';
    if (!perdidos || perdidos.length === 0) {
      tableRows = '<tr><td colspan="5" class="empty-state">No hay animales en la papelera de eliminadas.</td></tr>';
    } else {
      tableRows = perdidos.map(a => `
        <tr>
          <td><strong>N° ${escapeHTML(a.numero)}</strong></td>
          <td>
            <a href="#/animal/${a.id}" style="color:var(--color-danger); font-weight:700; text-decoration:none;">
              ${escapeHTML(a.nombre)}
            </a>
          </td>
          <td><span class="badge badge-${a.tipo}">${escapeHTML(a.tipo)}</span></td>
          <td>${formatDate(a.updated_at)}</td>
          <td>${escapeHTML(a.observaciones || 'Sin detalles')}</td>
          <td style="text-align:right;">
            <button class="btn btn-sm btn-secondary btn-revert-lost" data-id="${a.id}" data-name="${escapeHTML(a.nombre)}">
              Restaurar al Inventario
            </button>
          </td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h2>Bajas</h2>
          <span style="font-size:14px; font-weight:600; color:var(--color-danger);">
            Total: ${perdidos ? perdidos.length : 0} animales
          </span>
        </div>
        <div class="card-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Papelera de animales eliminados. Si fue un error o una prueba, puede reactivar el animal al inventario activo ingresando una nota de justificación.
          </p>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Fecha de Registro</th>
                  <th>Detalle / Motivo</th>
                  <th style="text-align:right;">Acción</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Botones reactivar perdido
    container.querySelectorAll('.btn-revert-lost').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const nombre = btn.dataset.name;

        showNoteModal(`Restaurar animal "${nombre}"`, async (nota) => {
          showLoading();
          try {
            await revertirPerdido(id, nota);
            showToast(`${nombre} volvió al ganado activo`, 'success');
            renderLostList(container);
          } catch (err) {
            console.error(err);
            showToast('Error restaurando animal: ' + err.message, 'error');
          } finally {
            hideLoading();
          }
        });
      });
    });

  } catch (err) {
    console.error(err);
    showToast('Error cargando lista de perdidos: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}
