// ui.js — Componentes de interfaz, modales, toasts, formateadores y utilidades
// Estilo Editorial / Prensa Institucional (Sin emojis)

export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '$0';
  return '$' + Math.round(amount).toLocaleString('es-CO');
}

/**
 * Conecta un input de texto para formatear automáticamente dinero en Pesos Colombianos (COP)
 * mientras el usuario escribe (ej: 1500000 -> $1.500.000)
 */
export function setupMoneyInput(inputElement) {
  if (!inputElement) return;

  function formatValue() {
    // Extraer solo dígitos
    const cleanDigits = inputElement.value.replace(/\D/g, '');
    if (!cleanDigits) {
      inputElement.value = '';
      return;
    }
    const num = parseInt(cleanDigits, 10);
    inputElement.value = '$ ' + num.toLocaleString('es-CO');
  }

  inputElement.addEventListener('input', formatValue);
  inputElement.addEventListener('blur', formatValue);

  // Formato inicial si ya viene con valor
  if (inputElement.value) {
    formatValue();
  }
}

/**
 * Extrae el valor numérico limpio de un input con formato monetario
 */
export function parseMoneyInput(inputElement) {
  if (!inputElement || !inputElement.value) return null;
  const cleanDigits = inputElement.value.replace(/\D/g, '');
  return cleanDigits ? parseInt(cleanDigits, 10) : null;
}

export function formatWeight(kg) {
  if (kg == null || isNaN(kg)) return '—';
  return `${parseFloat(kg).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
}

// Loading overlay
export function showLoading() {
  let loader = document.getElementById('global-loading');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loading';
    loader.style.position = 'fixed';
    loader.style.inset = '0';
    loader.style.backgroundColor = 'rgba(31, 27, 23, 0.35)';
    loader.style.display = 'flex';
    loader.style.alignItems = 'center';
    loader.style.justifyContent = 'center';
    loader.style.zIndex = '9999';
    loader.innerHTML = `
      <div style="background:var(--papel); border-radius:12px; padding:14px 22px; font-family:var(--font-sans); font-size:16px; font-weight:600; color:var(--potrero-oscuro); box-shadow:0 10px 30px rgba(0,0,0,0.18);">
        Un momento…
      </div>
    `;
    document.body.appendChild(loader);
  } else {
    loader.style.display = 'flex';
  }
}

export function hideLoading() {
  const loader = document.getElementById('global-loading');
  if (loader) {
    loader.style.display = 'none';
  }
}

// Toast notifications
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 3500);
}

// Modals
export function showModal(title, contentHTML, onConfirm, onCancel) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <span>${escapeHTML(title)}</span>
          <button class="modal-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body">
          ${contentHTML}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel">Cancelar</button>
          <button class="btn btn-primary btn-confirm">Aceptar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.modal-close').addEventListener('click', () => {
      close();
      if (typeof onCancel === 'function') onCancel();
      resolve(false);
    });

    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      close();
      if (typeof onCancel === 'function') onCancel();
      resolve(false);
    });

    modal.querySelector('.btn-confirm').addEventListener('click', async () => {
      if (typeof onConfirm === 'function') {
        const res = await onConfirm();
        if (res === false) return;
      }
      close();
      resolve(true);
    });
  });
}

// Modal que exige nota obligatoria
export function showNoteModal(title, onConfirm) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <span>${escapeHTML(title || '¿Por qué el cambio?')}</span>
          <button class="modal-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:12px; font-size:15px; color:var(--tinta-suave);">
            Escriba en pocas palabras qué pasó. Queda guardado en el historial del animal.
          </p>
          <div class="form-group">
            <label class="form-label" for="modal-note-input">Motivo</label>
            <textarea id="modal-note-input" class="form-textarea" rows="4" placeholder="Ej.: se pesó de nuevo, estaba mal el número…" required></textarea>
            <div id="modal-note-error" style="color:var(--color-danger); font-size:14px; font-weight:600; margin-top:4px; display:none;">
              Escriba el motivo para poder guardar.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel">Cancelar</button>
          <button class="btn btn-primary btn-save">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const textarea = modal.querySelector('#modal-note-input');
    const errorDiv = modal.querySelector('#modal-note-error');
    textarea.focus();

    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.modal-close').addEventListener('click', () => {
      close();
      resolve(null);
    });

    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      close();
      resolve(null);
    });

    modal.querySelector('.btn-save').addEventListener('click', async () => {
      const val = textarea.value.trim();
      if (!val) {
        errorDiv.style.display = 'block';
        textarea.focus();
        return;
      }
      errorDiv.style.display = 'none';

      if (typeof onConfirm === 'function') {
        await onConfirm(val);
      }
      close();
      resolve(val);
    });
  });
}

// Modal de confirmación simple
export function showConfirm(message, onConfirm) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <span>¿Seguro?</span>
          <button class="modal-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size:15px; color:var(--text-primary); line-height:1.4;">${escapeHTML(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel">Cancelar</button>
          <button class="btn btn-primary btn-confirm">Sí, seguir</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.modal-close').addEventListener('click', () => {
      close();
      resolve(false);
    });

    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      close();
      resolve(false);
    });

    modal.querySelector('.btn-confirm').addEventListener('click', async () => {
      if (typeof onConfirm === 'function') {
        await onConfirm();
      }
      close();
      resolve(true);
    });
  });
}

// Generador de Tarjeta de Animal (Estilo Archivo Fotográfico)
export function createAnimalCard(animal) {
  const photo = animal.foto_perfil_url
    ? `<img src="${escapeHTML(animal.foto_perfil_url)}" alt="${escapeHTML(animal.nombre)}" class="animal-card__photo" />`
    : `<div class="animal-card__photo--placeholder">Sin foto todavía</div>`;

  const tipo = animal.tipo || 'animal';
  const peso = animal.peso_actual || animal.peso_entrada;
  const pesoStr = peso ? formatWeight(peso) : 'Sin pesar';

  return `
    <div class="animal-card" data-id="${escapeHTML(animal.id)}">
      ${photo}
      <div class="animal-card__info">
        <div class="animal-card__number">N.º ${escapeHTML(animal.numero)}</div>
        <div class="animal-card__name">${escapeHTML(animal.nombre)}</div>
        <div class="animal-card__meta">
          <span class="badge badge-${escapeHTML(tipo)}">${escapeHTML(tipo)}</span>
          <span style="font-size:15px; font-weight:600; color:var(--ink-soft);">${pesoStr}</span>
        </div>
      </div>
    </div>
  `;
}
