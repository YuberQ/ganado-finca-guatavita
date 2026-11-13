// db.js — Módulo de base de datos (Supabase queries)
import { supabase } from './config.js';

// ─── ANIMALES ────────────────────────────────────────────

/**
 * Obtener lista de animales con filtros opcionales.
 * @param {{ tipo?, estado?, searchTerm? }} filters
 */
export async function getAnimales(filters = {}) {
  let query = supabase
    .from('animales')
    .select('*')
    .order('numero', { ascending: true });

  // Filtro por estado (por defecto 'activo')
  const estado = filters.estado !== undefined ? filters.estado : 'activo';
  if (estado) {
    query = query.eq('estado', estado);
  }

  if (filters.tipo) {
    query = query.eq('tipo', filters.tipo);
  }

  if (filters.searchTerm) {
    const term = `%${filters.searchTerm}%`;
    query = query.or(`nombre.ilike.${term},numero::text.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Obtener un animal por ID con sus relaciones.
 */
export async function getAnimal(id) {
  const { data: animal, error } = await supabase
    .from('animales')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  // Fotos
  const { data: fotos } = await supabase
    .from('fotos_animal')
    .select('*')
    .eq('animal_id', id)
    .order('created_at', { ascending: false });

  // Pesajes
  const { data: pesajes } = await supabase
    .from('pesajes')
    .select('*')
    .eq('animal_id', id)
    .order('fecha', { ascending: false });

  // Cría actual (no destetada, activa)
  const { data: criaActualArr } = await supabase
    .from('animales')
    .select('*')
    .eq('madre_id', id)
    .eq('es_destetado', false)
    .eq('estado', 'activo');

  const cria_actual = criaActualArr && criaActualArr.length > 0 ? criaActualArr[0] : null;

  // Historial de crías
  const { data: historial_crias } = await supabase
    .from('animales')
    .select('*')
    .eq('madre_id', id)
    .order('fecha_nacimiento', { ascending: false });

  animal.fotos = fotos || [];
  animal.pesajes = pesajes || [];
  animal.cria_actual = cria_actual;
  animal.historial_crias = historial_crias || [];

  return animal;
}

/**
 * Crear un nuevo animal.
 */
export async function createAnimal(data) {
  const { data: animal, error } = await supabase
    .from('animales')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return animal;
}

/**
 * Actualizar un animal. Para CADA campo cambiado, registra en historial_cambios.
 * La nota es OBLIGATORIA.
 */
export async function updateAnimal(id, changes, nota) {
  if (!nota || nota.trim() === '') {
    throw new Error('La nota es obligatoria para registrar cambios.');
  }

  // Obtener valores actuales
  const { data: current, error: fetchError } = await supabase
    .from('animales')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  const usuario = user ? user.email : 'desconocido';

  // Registrar cada cambio en historial
  for (const campo of Object.keys(changes)) {
    const valorAnterior = current[campo];
    const valorNuevo = changes[campo];

    // Solo registrar si realmente cambió
    if (String(valorAnterior) !== String(valorNuevo)) {
      const { error: histError } = await supabase
        .from('historial_cambios')
        .insert({
          animal_id: id,
          campo_cambiado: campo,
          valor_anterior: valorAnterior != null ? String(valorAnterior) : null,
          valor_nuevo: valorNuevo != null ? String(valorNuevo) : null,
          nota: nota,
          usuario: usuario,
        });

      if (histError) throw histError;
    }
  }

  // Aplicar los cambios al animal
  const { data: updated, error: updateError } = await supabase
    .from('animales')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated;
}

/**
 * Eliminar animal (soft-delete: estado → 'perdido' para usuarios normales).
 */
export async function deleteAnimal(id) {
  // Soft delete — cambiar estado
  const { error } = await supabase
    .from('animales')
    .update({ estado: 'perdido', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ─── CRÍAS ───────────────────────────────────────────────

/**
 * Registrar una cría vinculada a una madre.
 */
export async function registrarCria(madreId, data) {
  // Obtener datos de la madre
  const { data: madre, error: madreError } = await supabase
    .from('animales')
    .select('nombre')
    .eq('id', madreId)
    .single();

  if (madreError) throw madreError;

  const sexo = data.sexo || 'masculino';
  const tipo = sexo === 'masculino' ? 'ternero' : 'ternera';
  const prefijo = sexo === 'masculino' ? 'Hijo' : 'Hija';

  const criaData = {
    ...data,
    madre_id: madreId,
    es_nacido_en_finca: true,
    tipo: tipo,
    sexo: sexo,
    nombre: data.nombre || `${prefijo} de ${madre.nombre}`,
    estado: 'activo',
    es_destetado: false,
  };

  const { data: cria, error } = await supabase
    .from('animales')
    .insert(criaData)
    .select()
    .single();

  if (error) throw error;
  return cria;
}

/**
 * Obtener todas las crías de una madre.
 */
export async function getCrias(madreId) {
  const { data, error } = await supabase
    .from('animales')
    .select('*')
    .eq('madre_id', madreId)
    .order('fecha_nacimiento', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Obtener cría actual (no destetada, activa) de una madre.
 */
export async function getCriaActual(madreId) {
  const { data, error } = await supabase
    .from('animales')
    .select('*')
    .eq('madre_id', madreId)
    .eq('es_destetado', false)
    .eq('estado', 'activo')
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Destetar un ternero: marca como destetado y cambia su tipo.
 */
export async function destetar(terneroId, nuevoTipo) {
  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  const usuario = user ? user.email : 'desconocido';

  // Obtener datos actuales del ternero
  const { data: current, error: fetchError } = await supabase
    .from('animales')
    .select('tipo, es_destetado')
    .eq('id', terneroId)
    .single();

  if (fetchError) throw fetchError;

  // Registrar cambio tipo
  await supabase.from('historial_cambios').insert({
    animal_id: terneroId,
    campo_cambiado: 'tipo',
    valor_anterior: current.tipo,
    valor_nuevo: nuevoTipo,
    nota: 'Destete realizado',
    usuario: usuario,
  });

  // Registrar cambio es_destetado
  await supabase.from('historial_cambios').insert({
    animal_id: terneroId,
    campo_cambiado: 'es_destetado',
    valor_anterior: 'false',
    valor_nuevo: 'true',
    nota: 'Destete realizado',
    usuario: usuario,
  });

  // Actualizar animal
  const { data, error } = await supabase
    .from('animales')
    .update({
      es_destetado: true,
      tipo: nuevoTipo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', terneroId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── PESAJES ─────────────────────────────────────────────

/**
 * Obtener pesajes de un animal.
 */
export async function getPesajes(animalId) {
  const { data, error } = await supabase
    .from('pesajes')
    .select('*')
    .eq('animal_id', animalId)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Registrar un nuevo pesaje.
 */
export async function addPesaje(animalId, pesoKg, notas) {
  const { data, error } = await supabase
    .from('pesajes')
    .insert({
      animal_id: animalId,
      peso_kg: pesoKg,
      notas: notas || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── VENTAS ──────────────────────────────────────────────

/**
 * Vender un animal.
 * @param {string} animalId
 * @param {{ peso_salida?, precio_venta, comprador?, nota? }} ventaData
 */
export async function venderAnimal(animalId, { peso_salida, precio_venta, comprador, nota }) {
  // Obtener usuario
  const { data: { user } } = await supabase.auth.getUser();
  const usuario = user ? user.email : 'desconocido';

  // Insertar venta
  const { error: ventaError } = await supabase
    .from('ventas')
    .insert({
      animal_id: animalId,
      peso_salida: peso_salida || null,
      precio_venta: precio_venta,
      comprador: comprador || null,
      nota: nota || null,
    });

  if (ventaError) throw ventaError;

  // Actualizar estado del animal
  const { error: updateError } = await supabase
    .from('animales')
    .update({ estado: 'vendido', updated_at: new Date().toISOString() })
    .eq('id', animalId);

  if (updateError) throw updateError;

  // Registrar en historial
  const { error: histError } = await supabase
    .from('historial_cambios')
    .insert({
      animal_id: animalId,
      campo_cambiado: 'estado',
      valor_anterior: 'activo',
      valor_nuevo: 'vendido',
      nota: nota || 'Animal vendido',
      usuario: usuario,
    });

  if (histError) throw histError;
}

/**
 * Revertir una venta: restaurar animal a activo y eliminar registro de venta.
 */
export async function revertirVenta(animalId, nota) {
  const { data: { user } } = await supabase.auth.getUser();
  const usuario = user ? user.email : 'desconocido';

  // Actualizar estado a activo
  const { error: updateError } = await supabase
    .from('animales')
    .update({ estado: 'activo', updated_at: new Date().toISOString() })
    .eq('id', animalId);

  if (updateError) throw updateError;

  // Registrar en historial
  const { error: histError } = await supabase
    .from('historial_cambios')
    .insert({
      animal_id: animalId,
      campo_cambiado: 'estado',
      valor_anterior: 'vendido',
      valor_nuevo: 'activo',
      nota: nota,
      usuario: usuario,
    });

  if (histError) throw histError;

  // Eliminar registro de venta
  const { error: deleteError } = await supabase
    .from('ventas')
    .delete()
    .eq('animal_id', animalId);

  if (deleteError) throw deleteError;
}

// ─── PERDIDOS ────────────────────────────────────────────

/**
 * Marcar animal como perdido.
 */
export async function marcarPerdido(animalId, nota) {
  const { data: { user } } = await supabase.auth.getUser();
  const usuario = user ? user.email : 'desconocido';

  const { error: updateError } = await supabase
    .from('animales')
    .update({ estado: 'perdido', updated_at: new Date().toISOString() })
    .eq('id', animalId);

  if (updateError) throw updateError;

  const { error: histError } = await supabase
    .from('historial_cambios')
    .insert({
      animal_id: animalId,
      campo_cambiado: 'estado',
      valor_anterior: 'activo',
      valor_nuevo: 'perdido',
      nota: nota,
      usuario: usuario,
    });

  if (histError) throw histError;
}

/**
 * Revertir animal perdido a activo.
 */
export async function revertirPerdido(animalId, nota) {
  const { data: { user } } = await supabase.auth.getUser();
  const usuario = user ? user.email : 'desconocido';

  const { error: updateError } = await supabase
    .from('animales')
    .update({ estado: 'activo', updated_at: new Date().toISOString() })
    .eq('id', animalId);

  if (updateError) throw updateError;

  const { error: histError } = await supabase
    .from('historial_cambios')
    .insert({
      animal_id: animalId,
      campo_cambiado: 'estado',
      valor_anterior: 'perdido',
      valor_nuevo: 'activo',
      nota: nota,
      usuario: usuario,
    });

  if (histError) throw histError;
}

// ─── HISTORIAL ───────────────────────────────────────────

/**
 * Obtener historial de cambios de un animal.
 */
export async function getHistorial(animalId) {
  const { data, error } = await supabase
    .from('historial_cambios')
    .select('*')
    .eq('animal_id', animalId)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}

// ─── LISTAS ESPECIALES ───────────────────────────────────

/**
 * Obtener animales vendidos con información de venta.
 */
export async function getVendidos() {
  const { data, error } = await supabase
    .from('animales')
    .select('*, ventas(*)')
    .eq('estado', 'vendido')
    .order('numero', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Obtener animales perdidos.
 */
export async function getPerdidos() {
  const { data, error } = await supabase
    .from('animales')
    .select('*')
    .eq('estado', 'perdido')
    .order('numero', { ascending: true });

  if (error) throw error;
  return data;
}

// ─── ESTADÍSTICAS ────────────────────────────────────────

/**
 * Obtener conteos de animales por tipo y estado.
 */
export async function getEstadisticas() {
  const { data: animales, error } = await supabase
    .from('animales')
    .select('tipo, estado');

  if (error) throw error;

  const stats = {
    totalVacas: 0,
    totalToros: 0,
    totalTerneros: 0,
    totalNovillas: 0,
    totalVendidos: 0,
    totalPerdidos: 0,
  };

  for (const a of animales) {
    if (a.estado === 'vendido') {
      stats.totalVendidos++;
    } else if (a.estado === 'perdido') {
      stats.totalPerdidos++;
    } else if (a.estado === 'activo') {
      switch (a.tipo) {
        case 'vaca': stats.totalVacas++; break;
        case 'toro': stats.totalToros++; break;
        case 'ternero': stats.totalTerneros++; break;
        case 'ternera': stats.totalTerneros++; break;
        case 'novilla': stats.totalNovillas++; break;
      }
    }
  }

  return stats;
}
