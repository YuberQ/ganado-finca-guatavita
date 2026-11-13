import { getAnimales, getAnimal, createAnimal, updateAnimal, getCrias, getCriaActual, getPesajes, addPesaje, venderAnimal, marcarPerdido } from './db.js';
import { uploadPhoto, uploadProfilePhoto, addPhoto, getPhotos, deletePhoto } from './storage.js';
import { showModal, showNoteModal, showToast, showConfirm, showLoading, hideLoading, formatDate, formatDateTime, formatMoney, formatWeight, createAnimalCard, escapeHTML } from './ui.js';
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
          <svg style="width:58px;height:58px;color:#ffffff;margin:0 auto 10px auto;display:block;" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="square" />
            <line x1="28" y1="28" x2="28" y2="72" stroke="currentColor" stroke-width="5" stroke-linecap="square" />
            <line x1="46" y1="28" x2="46" y2="72" stroke="currentColor" stroke-width="5" stroke-linecap="square" />
            <line x1="28" y1="50" x2="46" y2="50" stroke="currentColor" stroke-width="5" stroke-linecap="square" />
            <path d="M 68 32 C 60 32 55 40 55 50 C 55 60 60 68 68 68 C 76 68 81 60 81 50 C 81 40 76 32 68 32 Z" fill="none" stroke="currentColor" stroke-width="4.8" />
            <line x1="68" y1="60" x2="80" y2="74" stroke="currentColor" stroke-width="5" stroke-linecap="square" />
          </svg>
          <h1 class="farm-hero-title">FINCA ANGEL MARIA</h1>
          <div class="farm-hero-divider"></div>
          <p class="farm-hero-subtitle">HIERRO DE MARCAR HQ &bull; INVENTARIO GANADERO</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card__value">${stats.vacas ?? 0}</div>
          <div class="stat-card__label">Vacas</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${stats.toros ?? 0}</div>
          <div class="stat-card__label">Toros</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${stats.terneros ?? 0}</div>
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
            <input type="number" step="0.01" class="form-input" name="valor_compra" />
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

        <div class="form-group">
          <label class="form-label">Foto de perfil</label>
          <input type="file" class="form-input" name="foto_perfil" accept="image/*" capture="environment" />
          <div id="profile-preview" class="photo-upload"></div>
        </div>

        <div class="form-group">
          <label class="form-label">Fotos adicionales</label>
          <input type="file" class="form-input" name="fotos_adicionales" accept="image/*" multiple />
          <div id="extra-preview" class="photo-upload" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"></div>
        </div>

        <button type="submit" class="btn btn-primary">Guardar Animal</button>
      </div>
    </form>
  `;

  // Auto-set sexo when tipo changes
  const tipoSelect = container.querySelector('[name="tipo"]');
  const sexoSelect = container.querySelector('[name="sexo"]');
  tipoSelect.addEventListener('change', () => {
    const tipo = tipoSelect.value;
    const sexoMap = { vaca: 'femenino', toro: 'masculino', novilla: 'femenino', ternero: 'masculino', ternera: 'femenino' };
    if (sexoMap[tipo]) {
      sexoSelect.value = sexoMap[tipo];
    }
  });

  // Profile photo preview
  container.querySelector('[name="foto_perfil"]').addEventListener('change', (e) => {
    const preview = document.getElementById('profile-preview');
    preview.innerHTML = '';
    if (e.target.files[0]) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(e.target.files[0]);
      img.style.cssText = 'max-width:200px;max-height:200px;margin-top:8px;';
      preview.appendChild(img);
    }
  });

  // Extra photos preview
  container.querySelector('[name="fotos_adicionales"]').addEventListener('change', (e) => {
    const preview = document.getElementById('extra-preview');
    preview.innerHTML = '';
    Array.from(e.target.files).forEach(file => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.style.cssText = 'max-width:120px;max-height:120px;';
      preview.appendChild(img);
    });
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
        valor_compra: form.valor_compra.value ? parseFloat(form.valor_compra.value) : null,
        fecha_ingreso: form.fecha_ingreso.value || null,
        raza: form.raza.value.trim() || null,
        color_pelaje: form.color_pelaje.value.trim() || null,
        hierro: form.hierro.value.trim() || null,
        observaciones: form.observaciones.value.trim() || null,
      };

      const animal = await createAnimal(data);

      // Upload profile photo
      const profileFile = form.foto_perfil.files[0];
      if (profileFile) {
        await uploadProfilePhoto(profileFile, animal.id);
      }

      // Upload additional photos
      const extraFiles = form.fotos_adicionales.files;
      for (const file of extraFiles) {
        const url = await uploadPhoto(file, animal.id);
        await addPhoto(animal.id, url);
      }

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
        <div style="margin-top:8px;">
          <input type="file" id="add-photo-input" accept="image/*" multiple style="display:none;" />
          <button class="btn btn-secondary btn-sm" id="btn-add-photo">Agregar Fotos</button>
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
        <button class="btn btn-danger" id="btn-perdido">Marcar como Perdido</button>
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
    document.getElementById('btn-add-photo').addEventListener('click', () => {
      document.getElementById('add-photo-input').click();
    });
    document.getElementById('add-photo-input').addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files.length) return;
      showLoading();
      try {
        for (const file of files) {
          const url = await uploadPhoto(file, id);
          await addPhoto(id, url);
        }
        showToast('Fotos agregadas', 'success');
        renderAnimalDetail(container, id);
      } catch (err) {
        console.error(err);
        showToast('Error subiendo fotos', 'error');
      } finally {
        hideLoading();
      }
    });

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
      showConfirm('¿Está seguro de marcar este animal como perdido?', () => {
        showNoteModal('Motivo de pérdida', async (nota) => {
          showLoading();
          try {
            await marcarPerdido(id, nota);
            showToast('Animal marcado como perdido', 'success');
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
              <input type="number" step="0.01" class="form-input" name="valor_compra" value="${animal.valor_compra ?? ''}" />
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
        valor_compra: form.valor_compra.value ? parseFloat(form.valor_compra.value) : null,
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
