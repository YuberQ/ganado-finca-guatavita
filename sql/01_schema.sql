-- =============================================================
-- 01_schema.sql
-- Schema for Sistema de Gestión Ganadera Finca Guatavita
-- Run this FIRST in Supabase SQL Editor
-- =============================================================

-- -----------------------------------------------
-- Trigger function: auto-update updated_at
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- Table: animales
-- -----------------------------------------------
CREATE TABLE animales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('vaca','toro','novilla','ternero','ternera')),
  sexo TEXT NOT NULL CHECK (sexo IN ('masculino','femenino')),
  peso_entrada DECIMAL(10,2),
  valor_compra DECIMAL(12,2),
  fecha_ingreso DATE,
  fecha_nacimiento DATE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','vendido','perdido')),
  madre_id UUID REFERENCES animales(id),
  padre_id UUID REFERENCES animales(id),
  es_nacido_en_finca BOOLEAN DEFAULT false,
  es_destetado BOOLEAN DEFAULT false,
  raza TEXT,
  color_pelaje TEXT,
  hierro TEXT,
  observaciones TEXT,
  foto_perfil_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to auto-update updated_at on animales
CREATE TRIGGER trg_animales_updated_at
  BEFORE UPDATE ON animales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------
-- Table: fotos_animal
-- -----------------------------------------------
CREATE TABLE fotos_animal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  es_perfil BOOLEAN DEFAULT false,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- Table: pesajes
-- -----------------------------------------------
CREATE TABLE pesajes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  peso_kg DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMPTZ DEFAULT now(),
  notas TEXT
);

-- -----------------------------------------------
-- Table: historial_cambios
-- -----------------------------------------------
CREATE TABLE historial_cambios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  campo_cambiado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  nota TEXT NOT NULL,
  usuario TEXT,
  fecha TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- Table: ventas
-- -----------------------------------------------
CREATE TABLE ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  peso_salida DECIMAL(10,2),
  precio_venta DECIMAL(12,2) NOT NULL,
  comprador TEXT,
  fecha_venta DATE DEFAULT CURRENT_DATE,
  nota TEXT
);

-- -----------------------------------------------
-- Indexes on frequently queried columns
-- -----------------------------------------------

-- animales: tipo, estado, madre_id
CREATE INDEX idx_animales_tipo ON animales (tipo);
CREATE INDEX idx_animales_estado ON animales (estado);
CREATE INDEX idx_animales_madre_id ON animales (madre_id);

-- fotos_animal: animal_id
CREATE INDEX idx_fotos_animal_animal_id ON fotos_animal (animal_id);

-- pesajes: animal_id
CREATE INDEX idx_pesajes_animal_id ON pesajes (animal_id);

-- historial_cambios: animal_id
CREATE INDEX idx_historial_cambios_animal_id ON historial_cambios (animal_id);

-- ventas: animal_id
CREATE INDEX idx_ventas_animal_id ON ventas (animal_id);
