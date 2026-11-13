// config.js — Configuración de Supabase para FINCA ANGEL MARIA

export const SUPABASE_URL = 'https://jkjsbgijgzlijsmmdxch.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_MPg1W9YiH6sGo7FjkQ3qBg_dfJ7uEEN';

// Límites del plan gratuito de Supabase (para avisar antes de que se llene)
export const LIMITE_DB_BYTES = 500 * 1024 * 1024;       // 500 MB de base de datos
export const LIMITE_FOTOS_BYTES = 1024 * 1024 * 1024;   // 1 GB de fotos

// Supabase JS client se carga via CDN en app.html e index.html
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
