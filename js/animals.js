import { getAnimales, getAnimal, createAnimal, updateAnimal, getCrias, getCriaActual, getPesajes, addPesaje, venderAnimal, marcarPerdido } from './db.js';
import { uploadPhoto, uploadProfilePhoto, addPhoto, getPhotos, deletePhoto } from './storage.js';
import { showModal, showNoteModal, showToast, showConfirm, showLoading, hideLoading, formatDate, formatDateTime, formatMoney, formatWeight, createAnimalCard, escapeHTML, setupMoneyInput, parseMoneyInput } from './ui.js';
import { renderHistoryModal } from './history.js';
import { renderSellForm } from './sales.js';
import { getEstadisticas } from './db.js';

// ── Dashboard ────────────────────────────────────────────────────────
export async function renderDashboard(container) {
  showLoading();
  try {
    const [animales, stats] = await Promise.all([
      getAnimales({ estado: 'activo' }),
      getEstadisticas()
    ]);

        container.innerHTML = `
      <div class="farm-hero-banner">
                        <div class="farm-hero-frame">
          <img src="assets/logo-angel-maria.png" alt="Logo Finca Angel Maria" style="width:130px;height:130px;object-fit:cover;filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));margin:0 auto 14px auto;display:block;" />
          <h1 class="farm-hero-title">FINCA ANGEL MARIA</h1>
          <div class="farm-hero-divider"></div>
          <p class="farm-hero-subtitle">GANADERÍA TRADICIONAL &bull; CONTROL DE INVENTARIO</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card__value">${stats.totalVacas ?? 0}</div>
          <div class="stat-card__label">Vacas</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${stats.totalToros ?? 0}</div>
          <div class="stat-card__label">Toros</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${(stats.totalTerneros ?? 0) + (stats.totalNovillas ?? 0)}</div>
          <div class="stat-card__label">Terneros / Novillas</div>
        </div>
      </div>

      <div class="filter-bar">
        <button class="btn btn-sm filter-btn active" data-filter="todos">Todos</button>
        <button class="btn btn-sm filter-btn" data-filter="vaca">Vacas</button>
        <button class="btn btn-sm filter-btn" data-filter="toro">Toros</button>
        <button class="btn btn-sm filter-btn" data-filter="novilla">Novillas</button>
        <button class="btn btn-sm filter-btn" data-filter="ternero">Terneros</button>
        <input type="text" class="search-input" placeholder="Buscar por nombre o número..." id="search-animals" />
      </div>

      <div class="animal-cards-grid" id="animal-grid"></div>
    `;

    let currentFilter = 'todos';
    let searchQuery = '';

    function renderGrid() {
      const grid = document.getElementById('animal-grid');
      let filtered = animales;

      if (currentFilter !== 'todos') {
        filtered = filtered.filter(a => a.tipo === currentFilter);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(a =>
          (a.nombre && a.nombre.toLowerCase().includes(q)) ||
          (a.numero != null && String(a.numero).includes(q))
        );
      }

      if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">No se encontraron animales.</div>';
        return;
      }

      grid.innerHTML = filtered.map(a => createAnimalCard(a)).join('');

      grid.querySelectorAll('.animal-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          if (id) window.location.hash = `#/animal/${id}`;
        });
      });
    }

    // Filter buttons
    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderGrid();
      });
    });

    // Search
    document.getElementById('search-animals').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderGrid();
    });

    renderGrid();
  } catch (err) {
    console.error(err);
    showToast('Error cargando dashboard', 'error');
  } finally {
    hideLoading();
  }
}

// ── Add Form ─────────────────────────────────────────────────────────
export async function renderAddForm(container) {
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <h2>Agregar Animal</h2>
    <form id="add-animal-form" class="card">
      <div class="card-body">

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Número *</label>
            <input type="number" class="form-input" name="numero" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-input" name="nombre" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo *</label>
            <select class="form-select" name="tipo" required>
              <option value="">Seleccionar...</option>
              <option value="vaca">Vaca</option>
              <option value="toro">Toro</option>
              <option value="novilla">Novilla</option>
              <option value="ternero">Ternero</option>
              <option value="ternera">Ternera</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sexo *</label>
            <select class="form-select" name="sexo" required>
              <option value="">Seleccionar tipo primero</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Peso de entrada (kg)</label>
            <input type="number" step="0.01" class="form-input" name="peso_entrada" />
          </div>
          <div class="form-group">
            <label class="form-label">Valor de compra ($)</label>
            <input type="text" class="form-input" name="valor_compra" placeholder="$ 0" autocomplete="off" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fecha de ingreso</label>
            <input type="date" class="form-input" name="fecha_ingreso" value="${today}" />
          </div>
          <div class="form-group">
            <label class="form-label">Raza</label>
            <input type="text" class="form-input" name="raza" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Color / Pelaje</label>
            <input type="text" class="form-input" name="color_pelaje" />
          </div>
          <div class="form-group">
            <label class="form-label">Hierro / Marca</label>
            <input type="text" class="form-input" name="hierro" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <textarea class="form-textarea" name="observaciones" rows="3"></textarea>
        </div>

                <div class="form-group" style="background:#faf8f5; border:1px solid #d4caba; padding:16px;">
          <label class="form-label">Foto de Perfil del Animal</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
            <label class="btn btn-primary btn-sm" style="margin:0; cursor:pointer;">
              Tomar Foto con Cámara
              <input type="file" name="foto_perfil_cam" accept="image/*" capture="environment" style="display:none;" />
            </label>
            <label class="btn btn-secondary btn-sm" style="margin:0; cursor:pointer;">
              Subir desde Galería
              <input type="file" name="foto_perfil_gal" accept="image/*" style="display:none;" />
            </label>
          </div>
          <div id="profile-preview" class="photo-upload"></div>
        </div>

        <div class="form-group" style="background:#faf8f5; border:1px solid #d4caba; padding:16px;">
          <label class="form-label">Fotos Adicionales (Marcas, Fierros, Vistas)</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
            <label class="btn btn-secondary btn-sm" style="margin:0; cursor:pointer;">
              Tomar Otra con Cámara
              <input type="file" id="foto-extra-cam" accept="image/*" capture="environment" style="display:none;" />
            </label>
            <label class="btn btn-secondary btn-sm" style="margin:0; cursor:pointer;">
              Seleccionar Varias de Galería
              <input type="file" id="foto-extra-gal" accept="image/*" multiple style="display:none;" />
            </label>
          </div>
          <div id="extra-preview" class="photo-upload" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"></div>
        </div>

        <button type="submit" class="btn btn-primary">Guardar Animal</button>
      </div>
    </form>
  `;

  // Restaurar borrador de campos si el usuario cambió de pestaña
  const draftKey = 'draft_add_animal';
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      const d = JSON.parse(saved);
      const f = container.querySelector('#add-animal-form');
      if (f) {
        if (d.numero) f.numero.value = d.numero;
        if (d.nombre) f.nombre.value = d.nombre;
        if (d.tipo) f.tipo.value = d.tipo;
        if (d.sexo) f.sexo.value = d.sexo;
        if (d.peso_entrada) f.peso_entrada.value = d.peso_entrada;
        if (d.valor_compra) f.valor_compra.value = d.valor_compra;
        if (d.fecha_ingreso) f.fecha_ingreso.value = d.fecha_ingreso;
        if (d.raza) f.raza.value = d.raza;
        if (d.color_pelaje) f.color_pelaje.value = d.color_pelaje;
        if (d.hierro) f.hierro.value = d.hierro;
        if (d.observaciones) f.observaciones.value = d.observaciones;
      }
    }
  } catch (err) {}

  // Guardar en tiempo real lo que el usuario escribe
    const formElement = container.querySelector('#add-animal-form');
  setupMoneyInput(formElement.valor_compra);
  formElement.addEventListener('input', () => {
    try {
      const draft = {
        numero: formElement.numero.value,
        nombre: formElement.nombre.value,
        tipo: formElement.tipo.value,
        sexo: formElement.sexo.value,
        peso_entrada: formElement.peso_entrada.value,
        valor_compra: formElement.valor_compra.value,
        fecha_ingreso: formElement.fecha_ingreso.value,
        raza: formElement.raza.value,
        color_pelaje: formElement.color_pelaje.value,
        hierro: formElement.hierro.value,
        observaciones: formElement.observaciones.value,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {}
  });

  const tipoSelect = container.querySelector('[name="tipo"]');
  const sexoSelect = container.querySelector('[name="sexo"]');
  tipoSelect.addEventListener('change', () => {
    const tipo = tipoSelect.value;
    const sexoMap = { vaca: 'femenino', toro: 'masculino', novilla: 'femenino', ternero: 'masculino', ternera: 'femenino' };
    if (sexoMap[tipo]) {
      sexoSelect.value = sexoMap[tipo];
    }
  });

      // Variables para almacenar los archivos seleccionados
    let selectedProfileFile = null;
    let selectedExtraFiles = [];

    function handleProfileSelection(file) {
      if (!file) return;
      selectedProfileFile = file;
      const preview = document.getElementById('profile-preview');
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.style.cssText = 'max-width:200px;max-height:200px;margin-top:8px;border:2px solid #211a16;object-fit:cover;';
      preview.appendChild(img);
    }

    container.querySelector('[name="foto_perfil_cam"]').addEventListener('change', (e) => {
      handleProfileSelection(e.target.files[0]);
    });
    container.querySelector('[name="foto_perfil_gal"]').addEventListener('change', (e) => {
      handleProfileSelection(e.target.files[0]);
    });

    function renderExtraPreviews() {
      const preview = document.getElementById('extra-preview');
      preview.innerHTML = '';
      selectedExtraFiles.forEach(file => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.style.cssText = 'width:90px;height:90px;border:1px solid #211a16;object-fit:cover;';
        preview.appendChild(img);
      });
    }

    container.querySelector('#foto-extra-cam').addEventListener('change', (e) => {
      if (e.target.files[0]) {
        selectedExtraFiles.push(e.target.files[0]);
        renderExtraPreviews();
      }
    });

    container.querySelector('#foto-extra-gal').addEventListener('change', (e) => {
      if (e.target.files.length) {
        Array.from(e.target.files).forEach(f => selectedExtraFiles.push(f));
        renderExtraPreviews();
      }
    });

  // Submit
  container.querySelector('#add-animal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    try {
      const form = e.target;
      const data = {
        numero: parseInt(form.numero.value),
        nombre: form.nombre.value.trim(),
        tipo: form.tipo.value,
        sexo: form.sexo.value,
        peso_entrada: form.peso_entrada.value ? parseFloat(form.peso_entrada.value) : null,
        valor_compra: parseMoneyInput(form.valor_compra),
        fecha_ingreso: form.fecha_ingreso.value || null,
        raza: form.raza.value.trim() || null,
        color_pelaje: form.color_pelaje.value.trim() || null,
        hierro: form.hierro.value.trim() || null,
        observaciones: form.observaciones.value.trim() || null,
      };

      const animal = await createAnimal(data);

      // Upload profile photo
      const profileFile = selectedProfileFile;
      if (profileFile) {
        await uploadProfilePhoto(profileFile, animal.id);
      }

      // Upload additional photos
      const extraFiles = selectedExtraFiles;
      for (const file of extraFiles) {
        await addPhoto(file, animal.id);
      }

            localStorage.removeItem('draft_add_animal');
      showToast('Animal agregado exitosamente', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      console.error(err);
      showToast('Error al agregar animal: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
}

// ── Animal Detail ────────────────────────────────────────────────────
export async function renderAnimalDetail(container, id) {
  showLoading();
  try {
    const [animal, pesajes, fotos] = await Promise.all([
      getAnimal(id),
      getPesajes(id),
      getPhotos(id)
    ]);

    if (!animal) {
      container.innerHTML = '<div class="empty-state">Animal no encontrado.</div>';
      hideLoading();
      return;
    }

    const lastPeso = pesajes.length > 0 ? pesajes[0].peso_kg : animal.peso_entrada;
    const isVacaONovilla = animal.tipo === 'vaca' || animal.tipo === 'novilla';
    const isCalf = animal.tipo === 'ternero' || animal.tipo === 'ternera';
    const isNotWeaned = isCalf && !animal.es_destetado;

    let criaActual = null;
    let todasCrias = [];
    if (isVacaONovilla) {
      [criaActual, todasCrias] = await Promise.all([
        getCriaActual(id),
        getCrias(id)
      ]);
    }

    const profileSrc = animal.foto_perfil_url || '';
    const profileHTML = profileSrc
      ? `<img src="${escapeHTML(profileSrc)}" alt="${escapeHTML(animal.nombre)}" class="detail-profile-photo" />`
      : `<div class="detail-profile-placeholder">Sin Fotografía</div>`;

    container.innerHTML = `
      <div class="detail-section">
        <div class="detail-header">
          <div class="detail-photo-wrapper">
            ${profileHTML}
            <button class="btn btn-sm history-icon" id="btn-history" title="Historial de cambios">Historial</button>
          </div>
          <div class="detail-info">
            <h2>${escapeHTML(animal.nombre)} <span class="badge badge-${animal.tipo}">${escapeHTML(animal.tipo)}</span></h2>
            <p><strong>Número:</strong> ${animal.numero}</p>
            <p><strong>Sexo:</strong> ${escapeHTML(animal.sexo)}</p>
            ${animal.peso_entrada != null ? `<p><strong>Peso entrada:</strong> ${formatWeight(animal.peso_entrada)}</p>` : ''}
            ${animal.valor_compra != null ? `<p><strong>Valor compra:</strong> ${formatMoney(animal.valor_compra)}</p>` : ''}
            ${animal.fecha_ingreso ? `<p><strong>Fecha ingreso:</strong> ${formatDate(animal.fecha_ingreso)}</p>` : ''}
            ${animal.fecha_nacimiento ? `<p><strong>Fecha nacimiento:</strong> ${formatDate(animal.fecha_nacimiento)}</p>` : ''}
            ${animal.raza ? `<p><strong>Raza:</strong> ${escapeHTML(animal.raza)}</p>` : ''}
            ${animal.color_pelaje ? `<p><strong>Color/Pelaje:</strong> ${escapeHTML(animal.color_pelaje)}</p>` : ''}
            ${animal.hierro ? `<p><strong>Hierro/Marca:</strong> ${escapeHTML(animal.hierro)}</p>` : ''}
            ${animal.observaciones ? `<p><strong>Observaciones:</strong> ${escapeHTML(animal.observaciones)}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- Photo Gallery -->
      <div class="detail-section">
        <h3>Fotos</h3>
        <div class="photo-gallery" id="photo-gallery">
          ${fotos.length > 0
            ? fotos.map(f => `<img src="${escapeHTML(f.url)}" class="gallery-thumb" data-url="${escapeHTML(f.url)}" />`).join('')
            : '<div class="empty-state">Sin fotos adicionales.</div>'
          }
        </div>
                <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <label class="btn btn-primary btn-sm" style="margin:0; cursor:pointer;">
            Tomar Foto con Cámara
            <input type="file" id="add-photo-cam" accept="image/*" capture="environment" style="display:none;" />
          </label>
          <label class="btn btn-secondary btn-sm" style="margin:0; cursor:pointer;">
            Subir desde Galería
            <input type="file" id="add-photo-gal" accept="image/*" multiple style="display:none;" />
          </label>
        </div>
      </div>

      <!-- Peso Section -->
      <div class="detail-section">
        <h3>Peso</h3>
        <p><strong>Peso actual:</strong> ${lastPeso != null ? formatWeight(lastPeso) : 'Sin registro'}</p>
        ${pesajes.length > 0 ? `
          <table class="table">
            <thead><tr><th>Fecha</th><th>Peso (kg)</th><th>Notas</th></tr></thead>
            <tbody>
              ${pesajes.map(p => `<tr><td>${formatDateTime(p.fecha)}</td><td>${formatWeight(p.peso_kg)}</td><td>${p.notas ? escapeHTML(p.notas) : ''}</td></tr>`).join('')}
            </tbody>
          </table>
        ` : ''}
        <button class="btn btn-primary btn-sm" id="btn-new-pesaje">Nuevo Pesaje</button>
      </div>

      ${criaActual ? `
      <div class="detail-section cria-info">
        <h3>Cría Actual</h3>
        <div style="display:flex;align-items:center;gap:12px;">
          ${criaActual.foto_perfil_url
            ? `<img src="${escapeHTML(criaActual.foto_perfil_url)}" style="width:80px;height:80px;object-fit:cover;" />`
            : `<div style="width:80px;height:80px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">Sin Foto</div>`
          }
          <div>
            <p><strong>${escapeHTML(criaActual.nombre)}</strong></p>
            <p>Sexo: ${escapeHTML(criaActual.sexo)}</p>
            ${criaActual.fecha_nacimiento ? `<p>Nacimiento: ${formatDate(criaActual.fecha_nacimiento)}</p>` : ''}
            <a href="#/animal/${criaActual.id}" class="btn btn-sm btn-secondary">Ver detalle</a>
          </div>
        </div>
      </div>
      ` : ''}

      ${isVacaONovilla && todasCrias.length > 0 ? `
      <div class="detail-section">
        <h3>Historial de Crías</h3>
        <table class="table">
          <thead><tr><th>Nombre</th><th>Sexo</th><th>Nacimiento</th><th>Estado</th><th>Destetado</th></tr></thead>
          <tbody>
            ${todasCrias.map(c => `
              <tr style="cursor:pointer;" onclick="location.hash='#/animal/${c.id}'">
                <td>${escapeHTML(c.nombre)}</td>
                <td>${escapeHTML(c.sexo)}</td>
                <td>${c.fecha_nacimiento ? formatDate(c.fecha_nacimiento) : '-'}</td>
                <td><span class="badge badge-${c.tipo}">${escapeHTML(c.tipo)}</span></td>
                <td>${c.es_destetado ? 'Sí' : 'No'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Action Buttons -->
      <div class="detail-section" style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="#/edit/${id}" class="btn btn-primary">Editar Información</a>
        ${isVacaONovilla ? `<a href="#/breeding/${id}" class="btn btn-secondary">Registrar Cría</a>` : ''}
        ${isNotWeaned ? `<a href="#/wean/${id}" class="btn btn-secondary">Destetar</a>` : ''}
        <button class="btn btn-warning" id="btn-vender">Vender</button>
        <button class="btn btn-danger" id="btn-perdido">Eliminar Animal</button>
      </div>
    `;

    // ── Event Listeners ──

    // History modal
    document.getElementById('btn-history').addEventListener('click', () => {
      renderHistoryModal(id);
    });

    // Photo gallery click → full-size modal
    container.querySelectorAll('.gallery-thumb').forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        showModal('Foto', `<img src="${escapeHTML(img.dataset.url)}" style="max-width:100%;max-height:80vh;" />`);
      });
    });

    // Add photos
    async function handleDetailUpload(files) {
      if (!files || !files.length) return;
      showLoading();
      try {
        for (const file of files) {
          await addPhoto(file, id);
        }
        showToast('Fotos agregadas y optimizadas', 'success');
        renderAnimalDetail(container, id);
      } catch (err) {
        console.error(err);
        showToast('Error subiendo fotos: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    }

    const camInput = document.getElementById('add-photo-cam');
    if (camInput) {
      camInput.addEventListener('change', (e) => handleDetailUpload(e.target.files));
    }
    const galInput = document.getElementById('add-photo-gal');
    if (galInput) {
      galInput.addEventListener('change', (e) => handleDetailUpload(e.target.files));
    }

    // New pesaje modal
    document.getElementById('btn-new-pesaje').addEventListener('click', () => {
      showModal(
        'Nuevo Pesaje',
        `<div class="form-group">
          <label class="form-label">Peso (kg)</label>
          <input type="number" step="0.01" class="form-input" id="modal-peso" required />
        </div>
        <div class="form-group">
          <label class="form-label">Notas</label>
          <textarea class="form-textarea" id="modal-peso-notas" rows="2"></textarea>
        </div>`,
        async () => {
          const pesoVal = parseFloat(document.getElementById('modal-peso').value);
          const notasVal = document.getElementById('modal-peso-notas').value.trim() || null;
          if (!pesoVal || pesoVal <= 0) {
            showToast('Ingrese un peso válido', 'error');
            return;
          }
          showLoading();
          try {
            await addPesaje(id, pesoVal, notasVal);
            showToast('Pesaje registrado', 'success');
            renderAnimalDetail(container, id);
          } catch (err) {
            console.error(err);
            showToast('Error registrando pesaje', 'error');
          } finally {
            hideLoading();
          }
        }
      );
    });

    // Sell
    document.getElementById('btn-vender').addEventListener('click', () => {
      renderSellForm(id);
    });

    // Mark lost
    document.getElementById('btn-perdido').addEventListener('click', () => {
      showConfirm('¿Está seguro de enviar este animal al apartado de Eliminadas?', () => {
        showNoteModal('Motivo de eliminación', async (nota) => {
          showLoading();
          try {
            await marcarPerdido(id, nota);
            showToast('Animal movido al apartado de Eliminadas', 'success');
            window.location.hash = '#/dashboard';
          } catch (err) {
            console.error(err);
            showToast('Error: ' + err.message, 'error');
          } finally {
            hideLoading();
          }
        });
      });
    });
  } catch (err) {
    console.error(err);
    showToast('Error cargando detalle del animal', 'error');
  } finally {
    hideLoading();
  }
}

// ── Edit Form ────────────────────────────────────────────────────────
export async function renderEditForm(container, id) {
  showLoading();
  try {
    const animal = await getAnimal(id);
    if (!animal) {
      container.innerHTML = '<div class="empty-state">Animal no encontrado.</div>';
      hideLoading();
      return;
    }

    container.innerHTML = `
      <h2>Editar: ${escapeHTML(animal.nombre)}</h2>
      <form id="edit-animal-form" class="card">
        <div class="card-body">

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Número *</label>
              <input type="number" class="form-input" name="numero" value="${animal.numero}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input type="text" class="form-input" name="nombre" value="${escapeHTML(animal.nombre)}" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <select class="form-select" name="tipo" required>
                <option value="vaca" ${animal.tipo === 'vaca' ? 'selected' : ''}>Vaca</option>
                <option value="toro" ${animal.tipo === 'toro' ? 'selected' : ''}>Toro</option>
                <option value="novilla" ${animal.tipo === 'novilla' ? 'selected' : ''}>Novilla</option>
                <option value="ternero" ${animal.tipo === 'ternero' ? 'selected' : ''}>Ternero</option>
                <option value="ternera" ${animal.tipo === 'ternera' ? 'selected' : ''}>Ternera</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Sexo *</label>
              <select class="form-select" name="sexo" required>
                <option value="masculino" ${animal.sexo === 'masculino' ? 'selected' : ''}>Masculino</option>
                <option value="femenino" ${animal.sexo === 'femenino' ? 'selected' : ''}>Femenino</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Peso de entrada (kg)</label>
              <input type="number" step="0.01" class="form-input" name="peso_entrada" value="${animal.peso_entrada ?? ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Valor de compra ($)</label>
              <input type="text" inputmode="numeric" class="form-input" name="valor_compra" value="${animal.valor_compra != null ? Math.round(animal.valor_compra) : ''}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fecha de ingreso</label>
              <input type="date" class="form-input" name="fecha_ingreso" value="${animal.fecha_ingreso || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Raza</label>
              <input type="text" class="form-input" name="raza" value="${escapeHTML(animal.raza || '')}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Color / Pelaje</label>
              <input type="text" class="form-input" name="color_pelaje" value="${escapeHTML(animal.color_pelaje || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Hierro / Marca</label>
              <input type="text" class="form-input" name="hierro" value="${escapeHTML(animal.hierro || '')}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Observaciones</label>
            <textarea class="form-textarea" name="observaciones" rows="3">${escapeHTML(animal.observaciones || '')}</textarea>
          </div>

          <button type="submit" class="btn btn-primary">Guardar Cambios</button>
          <a href="#/animal/${id}" class="btn btn-secondary" style="margin-left:8px;">Cancelar</a>
        </div>
      </form>
    `;

    // Borrador de edición (por animal) por si el usuario cambia de pestaña
    const draftEditKey = `draft_edit_animal_${id}`;
    const formElement = container.querySelector('#edit-animal-form');
    const draftFields = ['numero', 'nombre', 'tipo', 'sexo', 'peso_entrada', 'valor_compra',
      'fecha_ingreso', 'raza', 'color_pelaje', 'hierro', 'observaciones'];
    try {
      const saved = localStorage.getItem(draftEditKey);
      if (saved) {
        const d = JSON.parse(saved);
        for (const k of draftFields) {
          if (d[k] != null && d[k] !== '') formElement[k].value = d[k];
        }
      }
    } catch (err) {}

    setupMoneyInput(formElement.valor_compra);
    formElement.addEventListener('input', () => {
      try {
        const draft = {};
        for (const k of draftFields) draft[k] = formElement[k].value;
        localStorage.setItem(draftEditKey, JSON.stringify(draft));
      } catch (e) {}
    });

    // Auto-set sexo on tipo change
    const tipoSelect = container.querySelector('[name="tipo"]');
    const sexoSelect = container.querySelector('[name="sexo"]');
    tipoSelect.addEventListener('change', () => {
      const sexoMap = { vaca: 'femenino', toro: 'masculino', novilla: 'femenino', ternero: 'masculino', ternera: 'femenino' };
      if (sexoMap[tipoSelect.value]) sexoSelect.value = sexoMap[tipoSelect.value];
    });

    container.querySelector('#edit-animal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;

      // Collect new values
      const newData = {
        numero: parseInt(form.numero.value),
        nombre: form.nombre.value.trim(),
        tipo: form.tipo.value,
        sexo: form.sexo.value,
        peso_entrada: form.peso_entrada.value ? parseFloat(form.peso_entrada.value) : null,
        valor_compra: parseMoneyInput(form.valor_compra),
        fecha_ingreso: form.fecha_ingreso.value || null,
        raza: form.raza.value.trim() || null,
        color_pelaje: form.color_pelaje.value.trim() || null,
        hierro: form.hierro.value.trim() || null,
        observaciones: form.observaciones.value.trim() || null,
      };

      // Compare old vs new to find changes
      const changes = {};
      for (const key of Object.keys(newData)) {
        const oldVal = animal[key] ?? null;
        const newVal = newData[key];
        if (String(oldVal) !== String(newVal)) {
          changes[key] = newVal;
        }
      }

      if (Object.keys(changes).length === 0) {
        showToast('No se detectaron cambios', 'info');
        return;
      }

      // Show note modal before saving
      showNoteModal('Nota sobre los cambios realizados', async (nota) => {
        showLoading();
        try {
                    await updateAnimal(id, changes, nota);
          try { localStorage.removeItem(draftEditKey); } catch(e) {}
          showToast('Animal actualizado exitosamente', 'success');
          window.location.hash = `#/animal/${id}`;
        } catch (err) {
          console.error(err);
          showToast('Error al actualizar: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      });
    });
  } catch (err) {
    console.error(err);
    showToast('Error cargando formulario de edición', 'error');
  } finally {
    hideLoading();
  }
}
