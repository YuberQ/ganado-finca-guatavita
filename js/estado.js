// estado.js — Revisa si la base de datos responde y cuánto espacio queda en el plan gratuito.
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, LIMITE_DB_BYTES, LIMITE_FOTOS_BYTES } from './config.js';

const AVISO = 0.8;    // 80 % usado: aviso amarillo
const CRITICO = 0.95; // 95 % usado: aviso rojo

function conTiempo(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo agotado')), ms)),
  ]);
}

function tamano(bytes) {
  const v = bytes / (1024 * 1024);
  if (v >= 1000) return `${(v / 1024).toFixed(2).replace('.', ',')} GB`;
  if (v >= 10) return `${Math.round(v)} MB`;
  return `${v.toFixed(1).replace('.', ',')} MB`;
}

/**
 * Lee el espacio usado (requiere sql/04_estado_plan.sql en Supabase).
 * @returns {Promise<{usoDb:number, usoFotos:number}|null>} null si no se pudo leer
 */
export async function obtenerUso() {
  try {
    const { data, error } = await conTiempo(supabase.rpc('estado_plan'), 8000);
    if (error) throw error;
    return { usoDb: Number(data?.db_bytes) || 0, usoFotos: Number(data?.storage_bytes) || 0 };
  } catch (err) {
    console.info('No se pudo revisar el espacio usado:', err?.message || err);
    return null;
  }
}

/** Texto corto para la esquina: "12 MB / 500 MB · 80 MB / 1 GB" */
export function textoUso(uso) {
  return `${tamano(uso.usoDb)} / 500 MB · ${tamano(uso.usoFotos)} / 1 GB`;
}

/**
 * Pone el contador discreto de espacio en la esquina inferior derecha.
 * Si no se puede leer el uso, no muestra nada.
 * @param {{usoDb:number, usoFotos:number}|null} [uso] — si ya se leyó, se reutiliza
 * @param {{fondoOscuro?:boolean}} [opciones] — texto claro cuando va sobre una foto oscura
 */
export async function mostrarUsoEnEsquina(uso, opciones = {}) {
  const datos = uso === undefined ? await obtenerUso() : uso;
  if (!datos) return;
  let el = document.getElementById('uso-espacio');
  if (!el) {
    el = document.createElement('div');
    el.id = 'uso-espacio';
    const color = opciones.fondoOscuro ? 'color:#ffffff;opacity:0.5;' : 'color:#6b6159;opacity:0.55;';
    el.style.cssText = 'position:fixed;right:10px;bottom:5px;z-index:50;font:10px/1.2 -apple-system,"Segoe UI",Arial,sans-serif;' +
      color + 'letter-spacing:0.2px;user-select:none;white-space:nowrap;';
    document.body.appendChild(el);
  }
  el.textContent = textoUso(datos);
  el.title = `Base de datos: ${tamano(datos.usoDb)} de 500 MB · Fotos: ${tamano(datos.usoFotos)} de 1 GB (plan gratuito de Supabase)`;
}

/**
 * @returns {Promise<{nivel:'ok'|'aviso'|'critico'|'caido', titulo?:string, detalle?:string, uso?:object|null}>}
 */
export async function revisarServicio() {
  // 1. ¿Responde la base de datos?
  try {
    const r = await conTiempo(fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      cache: 'no-store',
    }), 8000);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (err) {
    if (!navigator.onLine) {
      return {
        nivel: 'caido',
        titulo: 'Sin internet',
        detalle: 'Este equipo no tiene conexión. Revise el wifi o los datos y vuelva a cargar la página.',
        uso: null,
      };
    }
    return {
      nivel: 'caido',
      titulo: 'La base de datos no responde',
      detalle: 'Lo más común es que Supabase la haya pausado por no usarse en una semana. ' +
        'Entre a supabase.com, abra el proyecto y pulse «Restore project». Tarda unos minutos.',
      uso: null,
    };
  }

  // 2. ¿Cuánto espacio queda?
  const uso = await obtenerUso();
  if (!uso) return { nivel: 'ok', uso: null };

  const pDb = uso.usoDb / LIMITE_DB_BYTES;
  const pFotos = uso.usoFotos / LIMITE_FOTOS_BYTES;
  const peor = Math.max(pDb, pFotos);
  if (peor < AVISO) return { nivel: 'ok', uso };

  const partes = [];
  if (pDb >= AVISO) partes.push(`la base de datos va en ${tamano(uso.usoDb)} de 500 MB (${Math.round(pDb * 100)} %)`);
  if (pFotos >= AVISO) partes.push(`las fotos van en ${tamano(uso.usoFotos)} de 1 GB (${Math.round(pFotos * 100)} %)`);
  const critico = peor >= CRITICO;
  return {
    nivel: critico ? 'critico' : 'aviso',
    titulo: critico ? 'El espacio gratuito está casi lleno' : 'El espacio gratuito se está llenando',
    detalle: `Ahora mismo ${partes.join(' y ')}. ` +
      (critico
        ? 'Cuando se llene, no se podrán guardar más animales ni fotos. Borre fotos repetidas o pase a un plan de pago en Supabase.'
        : 'Todavía funciona bien, pero conviene borrar fotos que no sirvan o pensar en un plan de pago.'),
    uso,
  };
}
