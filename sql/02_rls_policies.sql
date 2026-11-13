-- =============================================================
-- 02_rls_policies.sql
-- Row Level Security policies
-- Run this SECOND in Supabase SQL Editor (after 01_schema.sql)
-- =============================================================

-- -----------------------------------------------
-- Enable RLS on all tables
-- -----------------------------------------------
ALTER TABLE animales ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_animal ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- Policies for: animales
-- Authenticated users get full CRUD; anonymous denied (no policy = deny)
-- -----------------------------------------------
CREATE POLICY "animales_select_authenticated"
  ON animales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "animales_insert_authenticated"
  ON animales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "animales_update_authenticated"
  ON animales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "animales_delete_authenticated"
  ON animales FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------
-- Policies for: fotos_animal
-- -----------------------------------------------
CREATE POLICY "fotos_animal_select_authenticated"
  ON fotos_animal FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "fotos_animal_insert_authenticated"
  ON fotos_animal FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "fotos_animal_update_authenticated"
  ON fotos_animal FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fotos_animal_delete_authenticated"
  ON fotos_animal FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------
-- Policies for: pesajes
-- -----------------------------------------------
CREATE POLICY "pesajes_select_authenticated"
  ON pesajes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pesajes_insert_authenticated"
  ON pesajes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "pesajes_update_authenticated"
  ON pesajes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "pesajes_delete_authenticated"
  ON pesajes FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------
-- Policies for: historial_cambios
-- -----------------------------------------------
CREATE POLICY "historial_cambios_select_authenticated"
  ON historial_cambios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "historial_cambios_insert_authenticated"
  ON historial_cambios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "historial_cambios_update_authenticated"
  ON historial_cambios FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "historial_cambios_delete_authenticated"
  ON historial_cambios FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------
-- Policies for: ventas
-- -----------------------------------------------
CREATE POLICY "ventas_select_authenticated"
  ON ventas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ventas_insert_authenticated"
  ON ventas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "ventas_update_authenticated"
  ON ventas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ventas_delete_authenticated"
  ON ventas FOR DELETE
  TO authenticated
  USING (true);
