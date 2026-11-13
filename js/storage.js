// storage.js — Módulo de almacenamiento y compresión de fotos de animales
import { supabase } from './config.js';

const BUCKET = 'animal-photos';

/**
 * Comprime y redimensiona cualquier imagen antes de subirla a la base de datos.
 * Reduce fotos de cámaras de celular (5MB - 12MB) a archivos ligeros de ~150KB - 300KB
 * conservando nitidez total, sin saturar el almacenamiento gratuito de Supabase.
 *
 * @param {File|Blob} file - Archivo de imagen original
 * @param {number} maxDimension - Tamaño máximo en píxeles (ancho o alto, por defecto 1400px)
 * @param {number} quality - Calidad JPEG (0.8 = 80%)
 * @returns {Promise<Blob>} Blob comprimido listo para subir
 */
export async function compressImage(file, maxDimension = 1400, quality = 0.8) {
  // Si no es imagen, retornar tal cual
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escalado proporcional
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Suavizado de imagen para máxima nitidez
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a JPEG optimizado
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              // Si por alguna razón el original era menor, usar el original
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Subir un archivo de foto al bucket de Supabase con compresión automática previa.
 * @param {File|Blob} file - Foto tomada o seleccionada
 * @param {string} animalId - UUID del animal
 * @returns {Promise<string>} URL pública de la imagen
 */
export async function uploadPhoto(file, animalId) {
  // Comprimir antes de enviar a internet
  const compressedBlob = await compressImage(file);

  const timestamp = Date.now();
  const rawName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "foto";
  const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `${animalId}/${timestamp}_${cleanName}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressedBlob, {
      contentType: 'image/jpeg',
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Subir foto de perfil: comprime, sube, actualiza foto_perfil_url del animal,
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
 * Agregar una foto adicional (no de perfil) a un animal con compresión.
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
 */
export async function deletePhoto(photoId, url) {
  const { error: dbError } = await supabase
    .from('fotos_animal')
    .delete()
    .eq('id', photoId);

  if (dbError) throw dbError;

  try {
    const bucketPath = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
    if (bucketPath) {
      await supabase.storage
        .from(BUCKET)
        .remove([bucketPath]);
    }
  } catch (e) {
    console.warn('No se pudo eliminar el archivo del storage:', e);
  }
}

/**
 * Obtener URL pública de un archivo en el bucket.
 */
export function getPhotoUrl(path) {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
