// breeding.js — Gestión de crías y destete
import { getAnimal, registrarCria, destetar } from './db.js';
import { uploadProfilePhoto } from './storage.js';
import { showToast, showLoading, hideLoading, showConfirm, escapeHTML } from './ui.js';

/**
 * Formulario para registrar una nueva cría nacida en la finca.
 * Solo solicita sexo, fecha de nacimiento y foto.
 * El nombre se genera automáticamente: "Hijo de [Madre]" o "Hija de [Madre]".
 */
export async function renderBreedingForm(container, motherId) {
  showLoading();
  try {
    const madre = await getAnimal(motherId);
    if (!madre) {
      showToast('Vaca madre no encontrada', 'error');
      window.location.hash = '#/dashboard';
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div class="card" style="max-width: 650px; margin: 0 auto;">
        <div class="card-header">
          <h2>Registrar Nueva Cría</h2>
        </div>
        <div class="card-body">
          <div style="background:var(--brown-100); border:2px solid var(--brown-300); padding:16px; margin-bottom:20px;">
            <p style="margin:0 0 6px 0;"><strong>Madre:</strong> ${escapeHTML(madre.nombre)} (N° ${madre.numero})</p>
            <p style="margin:0; font-size:13px; color:var(--text-secondary);">
              El nombre de la cría se asignará automáticamente como "Hijo de ${escapeHTML(madre.nombre)}" o "Hija de ${escapeHTML(madre.nombre)}".
            </p>
          </div>

          <form id="breeding-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="cria-sexo">Sexo de la Cría *</label>
                <select id="cria-sexo" class="form-select" required>
                  <option value="femenino">Femenino (Ternera)</option>
                  <option value="masculino">Masculino (Ternero)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="cria-fecha">Fecha de Nacimiento *</label>
                <input type="date" id="cria-fecha" class="form-input" value="${today}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="cria-numero">Número del Animal (Opcional / Chapeta)</label>
              <input type="number" id="cria-numero" class="form-input" placeholder="Ej: 105" />
            </div>

            <div class="form-group">
              <label class="form-label" for="cria-peso">Peso al Nacer (kg, Opcional)</label>
              <input type="number" step="0.01" id="cria-peso" class="form-input" placeholder="Ej: 32" />
            </div>

            <div class="form-group">
              <label class="form-label">Foto de la Cría (Cámara o Galería)</label>
              <input type="file" id="cria-foto" accept="image/*" capture="environment" class="form-input" />
              <div id="cria-preview" style="margin-top:10px; display:none;">
                <img id="cria-preview-img" src="" alt="Vista previa" style="max-height:160px; border:2px solid var(--border-color); object-fit:cover;" />
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
              <a href="#/animal/${motherId}" class="btn btn-secondary">Cancelar</a>
              <button type="submit" class="btn btn-primary">Registrar Cría</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const fotoInput = container.querySelector('#cria-foto');
    const previewDiv = container.querySelector('#cria-preview');
    const previewImg = container.querySelector('#cria-preview-img');

    fotoInput.addEventListener('change', () => {
      const file = fotoInput.files[0];
      if (file) {
        previewImg.src = URL.createObjectURL(file);
        previewDiv.style.display = 'block';
      } else {
        previewDiv.style.display = 'none';
      }
    });

    container.querySelector('#breeding-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoading();

      try {
        const sexo = container.querySelector('#cria-sexo').value;
        const fechaNacimiento = container.querySelector('#cria-fecha').value;
        const numeroVal = container.querySelector('#cria-numero').value;
        const pesoVal = container.querySelector('#cria-peso').value;

        // Auto número si no se pone
        const numero = numeroVal ? parseInt(numeroVal) : (Math.floor(Date.now() / 1000) % 10000);

        const nuevaCria = await registrarCria(motherId, {
          sexo,
          fecha_nacimiento: fechaNacimiento,
          numero,
          peso_entrada: pesoVal ? parseFloat(pesoVal) : null,
          color_pelaje: null,
          observaciones: `Hijo nacido de ${madre.nombre} (N° ${madre.numero})`
        });

        // Subir foto si existe
        if (fotoInput.files[0] && nuevaCria?.id) {
          await uploadProfilePhoto(fotoInput.files[0], nuevaCria.id);
        }

        showToast('Cría registrada exitosamente', 'success');
        window.location.hash = `#/animal/${motherId}`;
      } catch (err) {
        console.error(err);
        showToast('Error al registrar la cría: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    });

  } catch (err) {
    console.error(err);
    showToast('Error cargando formulario de cría: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Formulario para destetar un ternero/cría y promoverlo a vaca/novilla o toro.
 */
export async function renderWeanForm(container, calfId) {
  showLoading();
  try {
    const ternero = await getAnimal(calfId);
    if (!ternero) {
      showToast('Animal no encontrado', 'error');
      window.location.hash = '#/dashboard';
      return;
    }

    const opcionesTipo = ternero.sexo === 'femenino'
      ? `<option value="novilla" selected>Novilla</option><option value="vaca">Vaca</option>`
      : `<option value="toro" selected>Toro</option>`;

    container.innerHTML = `
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="card-header">
          <h2>Destetar Ternero</h2>
        </div>
        <div class="card-body">
          <div style="background:var(--brown-100); border:2px solid var(--brown-300); padding:16px; margin-bottom:20px;">
            <p style="margin:0 0 6px 0;"><strong>Animal:</strong> ${escapeHTML(ternero.nombre)} (N° ${ternero.numero})</p>
            <p style="margin:0; font-size:13px; color:var(--text-secondary);">
              Al destetar este animal, dejará de ser la cría actual dependiente de su madre y pasará a ser un animal independiente en el inventario.
            </p>
          </div>

          <form id="wean-form">
            <div class="form-group">
              <label class="form-label" for="nuevo-tipo">¿A qué categoría pasa el animal? *</label>
              <select id="nuevo-tipo" class="form-select" required>
                ${opcionesTipo}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="wean-name">Nombre definitivo (Opcional)</label>
              <input type="text" id="wean-name" class="form-input" value="${escapeHTML(ternero.nombre)}" placeholder="Nuevo nombre" />
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
              <a href="#/animal/${calfId}" class="btn btn-secondary">Cancelar</a>
              <button type="submit" class="btn btn-primary">Confirmar Destete</button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.querySelector('#wean-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const nuevoTipo = container.querySelector('#nuevo-tipo').value;
      const nuevoNombre = container.querySelector('#wean-name').value.trim() || ternero.nombre;

      showConfirm(`¿Confirmar destete de "${ternero.nombre}" pasando a categoría "${nuevoTipo}"?`, async () => {
        showLoading();
        try {
          await destetar(calfId, nuevoTipo);
          showToast('Animal destetado exitosamente', 'success');
          window.location.hash = `#/animal/${calfId}`;
        } catch (err) {
          console.error(err);
          showToast('Error al destetar: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      });
    });

  } catch (err) {
    console.error(err);
    showToast('Error cargando formulario de destete: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}
