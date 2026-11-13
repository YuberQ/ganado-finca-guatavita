// storage.js — Módulo de almacenamiento de fotos (Supabase Storage)
import { supabase } from './config.js';

const BUCKET = 'animal-photos';

/**
 * Subir un archivo al bucket de fotos.
 * @param {File} file
 * @param {string} animalId
 * @returns {string} URL pública del archivo
 */
export async function uploadPhoto(file, animalId) {
  const timestamp = Date.now();
  const path = `${animalId}/${timestamp}_${file.name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Subir foto de perfil: sube archivo, actualiza foto_perfil_url del animal,
 * e inserta registro en fotos_animal con es_perfil=true.
 */
export async function uploadProfilePhoto(file, animalId) {
  const url = await uploadPhoto(file, animalId);

  // Actualizar foto de perfil del animal
  const { error: updateError } = await supabase
    .from('animales')
    .update({ foto_perfil_url: url, updated_at: new Date().toISOString() })
    .eq('id', animalId);

  if (updateError) throw updateError;

  // Insertar en fotos_animal
  const { error: insertError } = await supabase
    .from('fotos_animal')
    .insert({
      animal_id: animalId,
      url: url,
      es_perfil: true,
    });

  if (insertError) throw insertError;

  return url;
}

/**
 * Agregar una foto adicional (no de perfil) a un animal.
 */
export async function addPhoto(file, animalId) {
  const url = await uploadPhoto(file, animalId);

  const { error } = await supabase
    .from('fotos_animal')
    .insert({
      animal_id: animalId,
      url: url,
      es_perfil: false,
    });

  if (error) throw error;

  return url;
}

/**
 * Obtener todas las fotos de un animal.
 */
export async function getPhotos(animalId) {
  const { data, error } = await supabase
    .from('fotos_animal')
    .select('*')
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Eliminar una foto (del registro en BD y del bucket de storage).
 * @param {string} photoId — UUID del registro en fotos_animal
 * @param {string} url — URL pública de la foto para extraer la ruta en storage
 */
export async function deletePhoto(photoId, url) {
  // Eliminar registro de la BD
  const { error: dbError } = await supabase
    .from('fotos_animal')
    .delete()
    .eq('id', photoId);

  if (dbError) throw dbError;

  // Extraer la ruta del archivo en el bucket desde la URL pública
  // URL format: .../storage/v1/object/public/animal-photos/animalId/timestamp_filename
  try {
    const bucketPath = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
    if (bucketPath) {
      await supabase.storage
        .from(BUCKET)
        .remove([bucketPath]);
    }
  } catch (e) {
    // Si falla la eliminación del storage, no lanzar error —
    // el registro ya fue eliminado de la BD
    console.warn('No se pudo eliminar el archivo del storage:', e);
  }
}

/**
 * Obtener URL pública de un archivo en el bucket.
 * @param {string} path — ruta dentro del bucket
 * @returns {string}
 */
export function getPhotoUrl(path) {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
