// app.js — Router y controlador principal de la SPA
import { requireAuth, logout } from './auth.js';
import { renderDashboard, renderAddForm, renderAnimalDetail, renderEditForm } from './animals.js';
import { renderBreedingForm, renderWeanForm } from './breeding.js';
import { renderWeightSession } from './weights.js';
import { renderSoldList, renderLostList } from './sales.js';
import { renderExportPage } from './excel.js';

// Títulos para la barra superior
const ROUTE_TITLES = {
  '/dashboard': 'Dashboard — Ganado Activo',
  '/add': 'Agregar Nuevo Animal',
  '/weight-session': 'Jornada de Pesaje',
  '/sold': 'Animales Vendidos',
  '/lost': 'Animales Perdidos / Bajas',
  '/export': 'Exportar Relación a Excel'
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar autenticación
  try {
    await requireAuth();
  } catch (e) {
    // Si no está configurado Supabase o no hay sesión, se maneja en auth.js
    console.warn('Verificación de sesión:', e);
  }

  const pageContent = document.getElementById('page-content');
  const pageTitle = document.getElementById('page-title');
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-route]');
  const logoutBtn = document.getElementById('logout-btn');

  // Botón cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Actualizar estado visual de los enlaces en el menú
  function updateNav(routePath) {
    sidebarLinks.forEach(link => {
      const target = link.getAttribute('data-route');
      if (routePath.startsWith(target) && (target !== '/dashboard' || routePath === '/dashboard')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Router basado en window.location.hash
  async function router() {
    const rawHash = window.location.hash || '#/dashboard';
    const hash = rawHash.replace(/^#/, '');
    const parts = hash.split('/').filter(Boolean); // ej: ['animal', 'uuid-123']

    const baseRoute = '/' + (parts[0] || 'dashboard');
    updateNav(baseRoute);

    if (ROUTE_TITLES[baseRoute]) {
      if (pageTitle) pageTitle.textContent = ROUTE_TITLES[baseRoute];
    }

    try {
      if (parts.length === 0 || parts[0] === 'dashboard') {
        if (pageTitle) pageTitle.textContent = 'Dashboard — Ganado Activo';
        await renderDashboard(pageContent);
      } else if (parts[0] === 'add') {
        if (pageTitle) pageTitle.textContent = 'Agregar Animal';
        await renderAddForm(pageContent);
      } else if (parts[0] === 'animal' && parts[1]) {
        if (pageTitle) pageTitle.textContent = 'Ficha del Animal';
        await renderAnimalDetail(pageContent, parts[1]);
      } else if (parts[0] === 'edit' && parts[1]) {
        if (pageTitle) pageTitle.textContent = 'Editar Animal (Con Nota)';
        await renderEditForm(pageContent, parts[1]);
      } else if (parts[0] === 'breeding' && parts[1]) {
        if (pageTitle) pageTitle.textContent = 'Registrar Cría';
        await renderBreedingForm(pageContent, parts[1]);
      } else if (parts[0] === 'wean' && parts[1]) {
        if (pageTitle) pageTitle.textContent = 'Destetar Ternero';
        await renderWeanForm(pageContent, parts[1]);
      } else if (parts[0] === 'weight-session') {
        if (pageTitle) pageTitle.textContent = 'Jornada de Pesaje';
        await renderWeightSession(pageContent);
      } else if (parts[0] === 'sold') {
        if (pageTitle) pageTitle.textContent = 'Animales Vendidos';
        await renderSoldList(pageContent);
      } else if (parts[0] === 'lost') {
        if (pageTitle) pageTitle.textContent = 'Animales Perdidos';
        await renderLostList(pageContent);
      } else if (parts[0] === 'export') {
        if (pageTitle) pageTitle.textContent = 'Exportar a Excel';
        renderExportPage(pageContent);
      } else {
        // Ruta desconocida, volver a dashboard
        window.location.hash = '#/dashboard';
      }
    } catch (err) {
      console.error('Error de renderizado de ruta:', err);
      pageContent.innerHTML = `
        <div class="card" style="margin:20px 0;">
          <div class="card-body">
            <h3 style="color:var(--color-danger);">Error cargando la vista</h3>
            <p>${err.message}</p>
            <a href="#/dashboard" class="btn btn-secondary" style="margin-top:12px;">Volver al Dashboard</a>
          </div>
        </div>
      `;
    }
  }

  window.addEventListener('hashchange', router);
  // Ejecutar primer renderizado
  router();
});
