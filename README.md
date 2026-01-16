# Admin Costa Esmeralda

Sistema de administración de propiedades para alquileres temporarios en Costa Esmeralda.

## Funcionalidades

### Landing Page
- Visualización de propiedades disponibles (solo las publicadas)
- Detalle completo de cada propiedad (amenities, fotos, descripción)
- Filtro por barrio
- Formulario de consulta vía WhatsApp
- Compartir propiedades en redes sociales
- Modo demo con datos ficticios

### Panel de Administración
- **Dashboard**: Resumen de reservas, ingresos y ocupación
- **Propiedades**: CRUD completo con fotos, amenities, precios y toggle de publicación
- **Reservas**: Gestión de reservas con generación de PDF de contrato
- **Inquilinos**: Base de datos de inquilinos
- **Gastos**: Control de gastos por propiedad
- **Usuarios**: Panel de administración de usuarios (solo admin)
- **Info útil**: Información de servicios y contactos

### Sistema de Usuarios

#### Registro de nuevos usuarios
El formulario de registro solicita:
- Nombre completo
- Barrio (selector con todos los barrios de Costa Esmeralda)
- Número de lote
- Teléfono (opcional)
- Email y contraseña

#### Flujo de autorización
1. Usuario se registra con sus datos
2. Recibe email de confirmación de Supabase
3. Al intentar ingresar, ve pantalla "Autorización Pendiente"
4. El administrador recibe la solicitud en el panel de Usuarios
5. Admin puede aprobar o rechazar la solicitud
6. Usuario aprobado puede acceder al sistema

#### Panel de Usuarios (Admin)
- Lista de solicitudes pendientes con datos del usuario
- Botón "Autorizar" para aprobar usuarios
- Botón para rechazar/desactivar usuarios
- Lista de usuarios autorizados
- Gestión de permisos de administrador

### Publicación de Propiedades
- Toggle en cada tarjeta de propiedad para publicar/ocultar
- Estado "Online" (verde) u "Oculta" (gris)
- Las propiedades ocultas no aparecen en la landing page
- Cambio instantáneo sin recargar la página

### Seguridad
- Autenticación multi-usuario con Supabase Auth
- Row Level Security (RLS) para aislamiento de datos por usuario
- Recuperación de contraseña con cambio obligatorio
- Sistema de autorización para nuevos usuarios
- Panel de administrador para gestión de usuarios
- Usuario logueado visible en el sidebar

## Tecnologías

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **PDF**: jsPDF
- **Deploy**: Vercel

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/Fpidal/admin-costa.git
cd admin-costa
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env.local
```

4. Editar `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

5. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

6. Abrir [http://localhost:3000](http://localhost:3000)

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |

## Base de Datos

### Tablas principales
| Tabla | Descripción |
|-------|-------------|
| `propiedades` | Datos de las propiedades (incluye campo `publicada`) |
| `reservas` | Reservas de inquilinos |
| `inquilinos` | Información de inquilinos |
| `gastos` | Gastos asociados a propiedades |
| `cobros` | Registro de cobros |
| `proveedores_servicios` | Proveedores de servicios |
| `profiles` | Perfiles de usuarios |

### Campos de profiles
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID del usuario (referencia a auth.users) |
| `email` | TEXT | Email del usuario |
| `nombre` | TEXT | Nombre completo |
| `barrio` | TEXT | Barrio en Costa Esmeralda |
| `lote` | TEXT | Número de lote |
| `telefono` | TEXT | Teléfono de contacto |
| `is_admin` | BOOLEAN | Si es administrador |
| `autorizado` | BOOLEAN | Si está autorizado para acceder |
| `activo` | BOOLEAN | Si la cuenta está activa |

### Row Level Security (RLS)
- Los usuarios solo ven sus propios datos
- Las propiedades publicadas tienen lectura pública (landing page)
- Los administradores pueden ver todos los perfiles

## Deploy

El proyecto está configurado para deploy automático en Vercel:

1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno en Vercel
3. Cada push a `main` dispara un deploy automático

## Estructura del Proyecto

```
admin-costa/
├── app/
│   ├── admin/
│   │   ├── layout.tsx        # Layout con autenticación y autorización
│   │   ├── page.tsx          # Dashboard
│   │   ├── propiedades/      # CRUD propiedades + toggle publicación
│   │   ├── reservas/         # CRUD reservas + PDF contrato
│   │   ├── inquilinos/       # CRUD inquilinos
│   │   ├── gastos/           # CRUD gastos
│   │   ├── usuarios/         # Panel admin de usuarios
│   │   └── info-util/        # Información de servicios
│   ├── page.tsx              # Landing page pública
│   └── layout.tsx            # Layout principal
├── components/
│   ├── Sidebar.tsx           # Menú lateral con usuario logueado
│   ├── PageHeader.tsx        # Header de páginas
│   └── ui/                   # Componentes UI reutilizables
├── hooks/
│   └── useAuth.ts            # Hook de autenticación
├── lib/
│   ├── supabase.ts           # Cliente Supabase
│   └── demoData.ts           # Datos para modo demo
└── public/                   # Assets estáticos
```

## Changelog

### v1.1.0
- Sistema de autorización de usuarios
- Formulario de registro con barrio, lote y teléfono
- Panel de administración de usuarios
- Toggle para publicar/ocultar propiedades
- Usuario logueado visible en sidebar

### v1.0.0
- Lanzamiento inicial
- CRUD de propiedades, reservas, inquilinos y gastos
- Generación de PDF de contratos
- Landing page con filtros
- Autenticación multi-usuario

## Licencia

Proyecto privado - Todos los derechos reservados
