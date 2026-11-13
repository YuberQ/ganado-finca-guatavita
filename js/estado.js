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

function mb(bytes) {
  const v = bytes / (1024 * 1024);
  return v >= 1000 ? `${(v / 1024).toFixed(2).replace('.', ',')} GB` : `${Math.round(v)} MB`;
}

/**
 * @returns {Promise<{nivel:'ok'|'aviso'|'critico'|'caido', titulo?:string, detalle?:string}>}
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
      };
    }
    return {
      nivel: 'caido',
      titulo: 'La base de datos no responde',
      detalle: 'Lo más común es que Supabase la haya pausado por no usarse en una semana. ' +
        'Entre a supabase.com, abra el proyecto y pulse «Restore project». Tarda unos minutos.',
    };
  }

  // 2. ¿Cuánto espacio queda? (requiere sql/04_estado_plan.sql)
  try {
    const { data, error } = await conTiempo(supabase.rpc('estado_plan'), 8000);
    if (error) throw error;
    const usoDb = Number(data?.db_bytes) || 0;
    const usoFotos = Number(data?.storage_bytes) || 0;
    const pDb = usoDb / LIMITE_DB_BYTES;
    const pFotos = usoFotos / LIMITE_FOTOS_BYTES;
    const peor = Math.max(pDb, pFotos);
    if (peor < AVISO) return { nivel: 'ok', usoDb, usoFotos };

    const partes = [];
    if (pDb >= AVISO) partes.push(`la base de datos va en ${mb(usoDb)} de 500 MB (${Math.round(pDb * 100)} %)`);
    if (pFotos >= AVISO) partes.push(`las fotos van en ${mb(usoFotos)} de 1 GB (${Math.round(pFotos * 100)} %)`);
    const critico = peor >= CRITICO;
    return {
      nivel: critico ? 'critico' : 'aviso',
      titulo: critico ? 'El espacio gratuito está casi lleno' : 'El espacio gratuito se está llenando',
      detalle: `Ahora mismo ${partes.join(' y ')}. ` +
        (critico
          ? 'Cuando se llene, no se podrán guardar más animales ni fotos. Borre fotos repetidas o pase a un plan de pago en Supabase.'
          : 'Todavía funciona bien, pero conviene borrar fotos que no sirvan o pensar en un plan de pago.'),
    };
  } catch (err) {
    // Si la función aún no existe en Supabase, solo se revisa la conexión.
    console.info('No se pudo revisar el espacio usado:', err?.message || err);
    return { nivel: 'ok' };
  }
}
