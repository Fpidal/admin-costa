# Instrucciones para Claude Code - Admin Costa

## Contexto del Proyecto

Dashboard de **gestión de propiedades y alquileres** para administración de inmuebles. Permite:
- Gestionar propiedades (casas, departamentos, etc.)
- Controlar reservas y disponibilidad
- Administrar inquilinos y contratos
- Registrar gastos por propiedad
- Acceder a información útil (contactos, servicios)

## Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| `app/page.tsx` | Dashboard principal |
| `app/propiedades/page.tsx` | Gestión de propiedades |
| `app/reservas/page.tsx` | Control de reservas |
| `app/inquilinos/page.tsx` | Administración de inquilinos |
| `app/gastos/page.tsx` | Registro de gastos |
| `app/info-util/page.tsx` | Contactos e información útil |
| `components/Sidebar.tsx` | Navegación lateral |
| `components/ui/` | Componentes reutilizables |
| `lib/supabase.ts` | Configuración de Supabase |

## Tecnologías

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Lucide React para iconos

## Base de Datos - Supabase

### Tablas:

```sql
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
  comprobante TEXT, -- URL del comprobante
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
```

## Módulos del Dashboard

1. **Dashboard** - Vista general con:
   - Total de propiedades
   - Reservas activas
   - Inquilinos
   - Ingresos del mes
   - Próximas reservas
   - Gastos pendientes
   - Alertas (contratos por vencer, pagos atrasados)

2. **Propiedades** - CRUD de propiedades con:
   - Tipo, ubicación, amenities
   - Estado (disponible, alquilada, mantenimiento)
   - Precio de alquiler
   - Fotos

3. **Reservas** - Gestión de reservas con:
   - Calendario de disponibilidad
   - Estados (pendiente, confirmada, cancelada)
   - Datos del huésped
   - Montos y fechas

4. **Inquilinos** - Administración de inquilinos:
   - Datos de contacto
   - Propiedad asignada
   - Fechas de contrato
   - Estado de pagos

5. **Gastos** - Control de gastos:
   - Por propiedad
   - Categorías (servicios, mantenimiento, etc.)
   - Estados (pendiente, pagado, vencido)
   - Vencimientos

6. **Info Útil** - Contactos y recursos:
   - Emergencias
   - Servicios (luz, gas, agua)
   - Mantenimiento (plomero, electricista)
   - Enlaces útiles

## Componentes Reutilizables

- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Contenedores
- `Button` - Botones (primary, secondary, danger, ghost)
- `Input` - Inputs con label y error
- `Badge` - Etiquetas de estado
- `PageHeader` - Encabezado de página con título y acciones

## Deploy

Push a main → Vercel hace deploy automático
