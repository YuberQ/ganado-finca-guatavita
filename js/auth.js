// auth.js — Módulo de autenticación
import { supabase } from './config.js';

const MINUTOS_INACTIVIDAD = 20;
const IDLE_MS = MINUTOS_INACTIVIDAD * 60 * 1000;
const AVISO_MS = 60 * 1000; // avisar un minuto antes
const CLAVE_ACTIVIDAD = 'ultima_actividad';

/**
 * Iniciar sesión con email y contraseña.
 * @returns {{ data, error }}
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) marcarActividad(true);
  return { data, error };
}

/**
 * Cerrar sesión y redirigir al login.
 * @param {string} [motivo] — se muestra en la pantalla de entrada (ej. 'inactividad')
 */
export async function logout(motivo) {
  try { localStorage.removeItem(CLAVE_ACTIVIDAD); } catch (e) {}
  try { await supabase.auth.signOut(); } catch (e) {}
  window.location.href = motivo ? `index.html?motivo=${encodeURIComponent(motivo)}` : 'index.html';
}

/**
 * Obtener la sesión activa.
 * @returns {object|null}
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Obtener el usuario actual.
 * @returns {object|null}
 */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Suscribirse a cambios de estado de autenticación.
 * @param {Function} callback — recibe (event, session)
 */
export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Verificar que existe sesión activa; si no, redirige al login.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'index.html';
  }
  return session;
}

// ─── Cierre de sesión por inactividad ─────────────────────────────────

let ultimaEscritura = 0;

function leerActividad() {
  try { return Number(localStorage.getItem(CLAVE_ACTIVIDAD)) || 0; } catch (e) { return 0; }
}

function marcarActividad(forzar = false) {
  const ahora = Date.now();
  // Escribir como mucho cada 10 s para no saturar el almacenamiento
  if (!forzar && ahora - ultimaEscritura < 10000) return;
  ultimaEscritura = ahora;
  try { localStorage.setItem(CLAVE_ACTIVIDAD, String(ahora)); } catch (e) {}
}

/**
 * Cierra la sesión después de 20 minutos sin usar la página.
 * La última actividad se comparte entre pestañas, así que usar cualquier
 * pestaña de la app mantiene la sesión abierta.
 * @param {(mensaje:string)=>void} [avisar] — muestra el aviso de un minuto antes
 */
export function iniciarCierrePorInactividad(avisar) {
  // Si volvió después de mucho tiempo con la pestaña cerrada, cerrar de una vez
  const previa = leerActividad();
  if (previa && Date.now() - previa > IDLE_MS) {
    logout('inactividad');
    return;
  }
  marcarActividad(true);

  let avisado = false;
  const alUsar = () => { marcarActividad(); avisado = false; };
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach((ev) =>
    window.addEventListener(ev, alUsar, { passive: true })
  );

  const revisar = () => {
    const inactivo = Date.now() - (leerActividad() || Date.now());
    if (inactivo >= IDLE_MS) {
      logout('inactividad');
    } else if (inactivo >= IDLE_MS - AVISO_MS && !avisado) {
      avisado = true;
      if (typeof avisar === 'function') {
        avisar('Por seguridad, la sesión se cerrará en un minuto si no usa la página.');
      }
    }
  };
  setInterval(revisar, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
}
