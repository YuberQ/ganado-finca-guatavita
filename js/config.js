// config.js — Configuración de Supabase para FINCA ANGEL MARIA

const SUPABASE_URL = 'https://jkjsbgijgzlijsmmdxch.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MPg1W9YiH6sGo7FjkQ3qBg_dfJ7uEEN';

// Supabase JS client se carga via CDN en app.html e index.html
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
