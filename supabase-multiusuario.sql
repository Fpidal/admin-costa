-- =============================================
-- SCRIPT PARA SISTEMA MULTIUSUARIO
-- Ejecutar en Supabase SQL Editor
-- IMPORTANTE: Ejecutar cada sección por separado
-- =============================================

-- =============================================
-- PARTE 1: Crear tabla de perfiles
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT,
  telefono TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PARTE 2: Agregar columna user_id a las tablas
-- (Ejecutar después de la Parte 1)
-- =============================================
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE inquilinos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE cobros ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- =============================================
-- PARTE 3: Función y trigger para nuevos usuarios
-- (Ejecutar después de la Parte 2)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'nombre');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PARTE 4: Habilitar RLS en todas las tablas
-- (Ejecutar después de la Parte 3)
-- =============================================
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PARTE 5: Políticas RLS para PROPIEDADES
-- (Ejecutar después de la Parte 4)
-- =============================================
DROP POLICY IF EXISTS "Users can view own propiedades" ON propiedades;
CREATE POLICY "Users can view own propiedades" ON propiedades
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own propiedades" ON propiedades;
CREATE POLICY "Users can insert own propiedades" ON propiedades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own propiedades" ON propiedades;
CREATE POLICY "Users can update own propiedades" ON propiedades
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own propiedades" ON propiedades;
CREATE POLICY "Users can delete own propiedades" ON propiedades
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PARTE 6: Políticas RLS para RESERVAS
-- =============================================
DROP POLICY IF EXISTS "Users can view own reservas" ON reservas;
CREATE POLICY "Users can view own reservas" ON reservas
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reservas" ON reservas;
CREATE POLICY "Users can insert own reservas" ON reservas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reservas" ON reservas;
CREATE POLICY "Users can update own reservas" ON reservas
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reservas" ON reservas;
CREATE POLICY "Users can delete own reservas" ON reservas
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PARTE 7: Políticas RLS para INQUILINOS
-- =============================================
DROP POLICY IF EXISTS "Users can view own inquilinos" ON inquilinos;
CREATE POLICY "Users can view own inquilinos" ON inquilinos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inquilinos" ON inquilinos;
CREATE POLICY "Users can insert own inquilinos" ON inquilinos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inquilinos" ON inquilinos;
CREATE POLICY "Users can update own inquilinos" ON inquilinos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inquilinos" ON inquilinos;
CREATE POLICY "Users can delete own inquilinos" ON inquilinos
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PARTE 8: Políticas RLS para COBROS
-- =============================================
DROP POLICY IF EXISTS "Users can view own cobros" ON cobros;
CREATE POLICY "Users can view own cobros" ON cobros
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cobros" ON cobros;
CREATE POLICY "Users can insert own cobros" ON cobros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cobros" ON cobros;
CREATE POLICY "Users can update own cobros" ON cobros
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cobros" ON cobros;
CREATE POLICY "Users can delete own cobros" ON cobros
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PARTE 9: Políticas RLS para GASTOS
-- =============================================
DROP POLICY IF EXISTS "Users can view own gastos" ON gastos;
CREATE POLICY "Users can view own gastos" ON gastos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gastos" ON gastos;
CREATE POLICY "Users can insert own gastos" ON gastos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gastos" ON gastos;
CREATE POLICY "Users can update own gastos" ON gastos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gastos" ON gastos;
CREATE POLICY "Users can delete own gastos" ON gastos
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PARTE 10: Políticas RLS para LIQUIDACIONES
-- =============================================
DROP POLICY IF EXISTS "Users can view own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can view own liquidaciones" ON liquidaciones
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can insert own liquidaciones" ON liquidaciones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can update own liquidaciones" ON liquidaciones
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can delete own liquidaciones" ON liquidaciones
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PARTE 11: Políticas RLS para PROFILES
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- PARTE 12: Crear índices para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_propiedades_user_id ON propiedades(user_id);
CREATE INDEX IF NOT EXISTS idx_reservas_user_id ON reservas(user_id);
CREATE INDEX IF NOT EXISTS idx_inquilinos_user_id ON inquilinos(user_id);
CREATE INDEX IF NOT EXISTS idx_cobros_user_id ON cobros(user_id);
CREATE INDEX IF NOT EXISTS idx_gastos_user_id ON gastos(user_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_user_id ON liquidaciones(user_id);
