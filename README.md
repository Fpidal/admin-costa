# Admin Costa Esmeralda

Sistema de administración de propiedades para alquileres temporarios en Costa Esmeralda.

## Funcionalidades

### Landing Page
- Visualización de propiedades disponibles
- Detalle completo de cada propiedad (amenities, fotos, descripción)
- Formulario de consulta vía WhatsApp
- Compartir propiedades en redes sociales
- Modo demo con datos ficticios

### Panel de Administración
- **Dashboard**: Resumen de reservas, ingresos y ocupación
- **Propiedades**: CRUD completo de propiedades con fotos, amenities y precios
- **Reservas**: Gestión de reservas con generación de PDF de contrato
- **Inquilinos**: Base de datos de inquilinos
- **Gastos**: Control de gastos por propiedad
- **Usuarios**: Administración de usuarios (solo admin)

### Seguridad
- Autenticación multi-usuario con Supabase Auth
- Row Level Security (RLS) para aislamiento de datos por usuario
- Recuperación de contraseña con cambio obligatorio
- Panel de administrador para gestión de usuarios

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
git clone https://github.com/tu-usuario/admin-costa.git
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
- `propiedades`: Datos de las propiedades
- `reservas`: Reservas de inquilinos
- `inquilinos`: Información de inquilinos
- `gastos`: Gastos asociados a propiedades
- `cobros`: Registro de cobros
- `proveedores_servicios`: Proveedores de servicios
- `profiles`: Perfiles de usuarios (con `is_admin` para superusuarios)

### Row Level Security (RLS)
Cada tabla tiene políticas RLS para:
- Los usuarios solo ven sus propios datos
- Las propiedades tienen lectura pública (para la landing page)
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
│   │   ├── layout.tsx      # Layout con autenticación
│   │   ├── page.tsx        # Dashboard
│   │   ├── propiedades/    # CRUD propiedades
│   │   ├── reservas/       # CRUD reservas + PDF
│   │   ├── inquilinos/     # CRUD inquilinos
│   │   └── gastos/         # CRUD gastos
│   ├── page.tsx            # Landing page pública
│   └── layout.tsx          # Layout principal
├── components/             # Componentes reutilizables
├── hooks/
│   └── useAuth.ts          # Hook de autenticación
├── lib/
│   └── supabase.ts         # Cliente Supabase
└── public/                 # Assets estáticos
```

## Licencia

Proyecto privado - Todos los derechos reservados
