-- Propiedades
CREATE TABLE propiedades (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT,
  tipo TEXT, -- casa, departamento, monoambiente, local
  habitaciones INTEGER,
  banos INTEGER,
  cochera BOOLEAN DEFAULT FALSE,
  precio_alquiler NUMERIC,
  estado TEXT DEFAULT 'disponible', -- disponible, alquilada, mantenimiento
  descripcion TEXT,
  imagen_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inquilinos
CREATE TABLE inquilinos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  documento TEXT,
  propiedad_id INTEGER REFERENCES propiedades(id),
  fecha_inicio DATE,
  fecha_fin DATE,
  monto_alquiler NUMERIC,
  estado TEXT DEFAULT 'activo', -- activo, inactivo, por_vencer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservas
CREATE TABLE reservas (
  id SERIAL PRIMARY KEY,
  propiedad_id INTEGER REFERENCES propiedades(id),
  huesped TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  monto NUMERIC,
  estado TEXT DEFAULT 'pendiente', -- pendiente, confirmada, cancelada
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gastos
CREATE TABLE gastos (
  id SERIAL PRIMARY KEY,
  propiedad_id INTEGER REFERENCES propiedades(id),
  concepto TEXT NOT NULL,
  categoria TEXT, -- servicios, mantenimiento, reparaciones, seguros, impuestos, otros
  monto NUMERIC NOT NULL,
  fecha DATE NOT NULL,
  vencimiento DATE,
  estado TEXT DEFAULT 'pendiente', -- pendiente, pagado, vencido
  comprobante TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contactos útiles
CREATE TABLE contactos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT, -- emergencias, servicios, mantenimiento
  telefono TEXT,
  email TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (opcional pero recomendado)
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (para desarrollo - ajustar en producción)
CREATE POLICY "Acceso público propiedades" ON propiedades FOR ALL USING (true);
CREATE POLICY "Acceso público inquilinos" ON inquilinos FOR ALL USING (true);
CREATE POLICY "Acceso público reservas" ON reservas FOR ALL USING (true);
CREATE POLICY "Acceso público gastos" ON gastos FOR ALL USING (true);
CREATE POLICY "Acceso público contactos" ON contactos FOR ALL USING (true);
