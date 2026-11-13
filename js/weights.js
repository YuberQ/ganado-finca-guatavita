// weights.js — Jornada de pesaje para actualizar pesos periódicamente
import { getAnimales, addPesaje } from './db.js';
import { showToast, showLoading, hideLoading, showConfirm, formatWeight, escapeHTML } from './ui.js';

export async function renderWeightSession(container) {
  showLoading();
  try {
    const animales = await getAnimales({ estado: 'activo' });

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2>️ Jornada de Pesaje</h2>
            <p style="margin:4px 0 0 0; font-size:13px; color:var(--text-secondary);">
              Agregue nuevos pesajes sin modificar el histórico. La fecha se registra automáticamente.
            </p>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="btn-save-all-weights" class="btn btn-primary">Guardar Todos los Pesajes</button>
          </div>
        </div>
        <div class="card-body">
          <div class="filter-bar" style="margin-bottom:20px;">
            <button class="btn btn-sm filter-weight-btn active" data-filter="todos">Todos los Activos</button>
            <button class="btn btn-sm filter-weight-btn" data-filter="vaca">Solo Vacas</button>
            <button class="btn btn-sm filter-weight-btn" data-filter="toro">Solo Toros</button>
            <button class="btn btn-sm filter-weight-btn" data-filter="novilla">Solo Novillas</button>
            <button class="btn btn-sm filter-weight-btn" data-filter="ternero">Solo Terneros/as</button>
            <input type="text" id="search-weight-animals" class="search-input" placeholder="Buscar por número o nombre..." />
          </div>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Animal</th>
                  <th>Tipo</th>
                  <th>Último Peso Registrado</th>
                  <th style="min-width: 170px;">Nuevo Peso (kg)</th>
                  <th style="min-width: 180px;">Notas / Observación</th>
                  <th style="text-align:right;">Acción</th>
                </tr>
              </thead>
              <tbody id="weight-table-body">
                <!-- Se llena con renderRows -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    let activeFilter = 'todos';
    let searchQuery = '';

    function renderRows() {
      const tbody = container.querySelector('#weight-table-body');
      let filtered = animales;

      if (activeFilter === 'ternero') {
        filtered = filtered.filter(a => a.tipo === 'ternero' || a.tipo === 'ternera');
      } else if (activeFilter !== 'todos') {
        filtered = filtered.filter(a => a.tipo === activeFilter);
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(a =>
          (a.nombre && a.nombre.toLowerCase().includes(q)) ||
          (a.numero != null && String(a.numero).includes(q))
        );
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay animales que coincidan con el filtro.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(a => {
        const pesoActual = a.peso_actual || a.peso_entrada;
        const pesoStr = pesoActual ? formatWeight(pesoActual) : 'Sin registrar';

        return `
          <tr data-animal-id="${a.id}">
            <td><strong>N° ${escapeHTML(a.numero)}</strong></td>
            <td>
              <a href="#/animal/${a.id}" style="color:var(--text-primary); font-weight:700; text-decoration:none;">
                ${escapeHTML(a.nombre)}
              </a>
            </td>
            <td><span class="badge badge-${a.tipo}">${escapeHTML(a.tipo)}</span></td>
            <td><strong>${pesoStr}</strong></td>
            <td>
              <input type="number" step="0.01" class="form-input input-peso-nuevo" placeholder="Ej: 385" style="width:130px;" />
            </td>
            <td>
              <input type="text" class="form-input input-nota-peso" placeholder="Opcional..." style="width:160px;" />
            </td>
            <td style="text-align:right;">
              <button class="btn btn-sm btn-primary btn-save-single-weight" data-id="${a.id}" data-name="${escapeHTML(a.nombre)}">
                Guardar
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Guardar peso individual
      tbody.querySelectorAll('.btn-save-single-weight').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const row = tbody.querySelector(`tr[data-animal-id="${id}"]`);
          const pesoInput = row.querySelector('.input-peso-nuevo');
          const notaInput = row.querySelector('.input-nota-peso');

          const pesoVal = parseFloat(pesoInput.value);
          if (!pesoVal || pesoVal <= 0) {
            showToast('Ingrese un peso válido mayor a 0 kg', 'error');
            pesoInput.focus();
            return;
          }

          showLoading();
          try {
            await addPesaje(id, pesoVal, notaInput.value.trim() || 'Jornada de pesaje');
            showToast(`Pesaje de ${btn.dataset.name} guardado: ${pesoVal} kg`, 'success');
            pesoInput.value = '';
            notaInput.value = '';
          } catch (err) {
            console.error(err);
            showToast('Error guardando pesaje: ' + err.message, 'error');
          } finally {
            hideLoading();
          }
        });
      });
    }

    renderRows();

    // Filtros
    container.querySelectorAll('.filter-weight-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-weight-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderRows();
      });
    });

    const searchInput = container.querySelector('#search-weight-animals');
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderRows();
    });

    // Guardar todos los pesos llenados
    container.querySelector('#btn-save-all-weights').addEventListener('click', () => {
      const rows = container.querySelectorAll('#weight-table-body tr[data-animal-id]');
      const itemsToSave = [];

      rows.forEach(row => {
        const id = row.dataset.animalId;
        const pesoInput = row.querySelector('.input-peso-nuevo');
        const notaInput = row.querySelector('.input-nota-peso');
        const pesoVal = parseFloat(pesoInput?.value);

        if (pesoVal && pesoVal > 0) {
          itemsToSave.push({
            animalId: id,
            peso: pesoVal,
            notas: notaInput?.value.trim() || 'Jornada masiva de pesaje',
            pesoInput,
            notaInput
          });
        }
      });

      if (itemsToSave.length === 0) {
        showToast('No ha ingresado ningún peso nuevo en la tabla', 'info');
        return;
      }

      showConfirm(`¿Desea registrar los ${itemsToSave.length} pesajes ingresados?`, async () => {
        showLoading();
        let guardados = 0;
        try {
          for (const item of itemsToSave) {
            await addPesaje(item.animalId, item.peso, item.notas);
            item.pesoInput.value = '';
            if (item.notaInput) item.notaInput.value = '';
            guardados++;
          }
          showToast(`¡Se guardaron ${guardados} pesajes exitosamente!`, 'success');
        } catch (err) {
          console.error(err);
          showToast(`Se guardaron ${guardados} pesajes antes de un error: ${err.message}`, 'error');
        } finally {
          hideLoading();
        }
      });
    });

  } catch (err) {
    console.error(err);
    showToast('Error cargando jornada de peso: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

