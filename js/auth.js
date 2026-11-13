// auth.js — Módulo de autenticación
import { supabase } from './config.js';

/**
 * Iniciar sesión con email y contraseña.
 * @returns {{ data, error }}
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Cerrar sesión y redirigir al login.
 */
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
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
