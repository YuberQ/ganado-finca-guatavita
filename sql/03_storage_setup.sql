-- =============================================================
-- 03_storage_setup.sql
-- Storage bucket and policies for animal photos
-- Run this THIRD in Supabase SQL Editor (after 02_rls_policies.sql)
-- =============================================================

-- -----------------------------------------------
-- Create the 'animal-photos' storage bucket
-- public = true so images can be served via public URL
-- -----------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('animal-photos', 'animal-photos', true);

-- -----------------------------------------------
-- Storage policies: authenticated users can upload, read, delete
-- -----------------------------------------------

-- Allow authenticated users to upload files
CREATE POLICY "animal_photos_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'animal-photos');

-- Allow authenticated users to read/view files
CREATE POLICY "animal_photos_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'animal-photos');

-- Allow public read access (needed for public URLs on photo display)
CREATE POLICY "animal_photos_select_public"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'animal-photos');

-- Allow authenticated users to update files
CREATE POLICY "animal_photos_update_authenticated"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'animal-photos')
  WITH CHECK (bucket_id = 'animal-photos');

-- Allow authenticated users to delete files
CREATE POLICY "animal_photos_delete_authenticated"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'animal-photos');
