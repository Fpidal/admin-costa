# Admin Costa Esmeralda

Sistema de administración de propiedades para alquileres temporarios en Costa Esmeralda.

## Funcionalidades

### Página pública
- **Portada en una pantalla**: presentación institucional, datos del lugar (playa, bosque, barrio cerrado, golf, distancia) y foto de portada (`public/portada.jpg`)
- **Propiedades en una pantalla**: buscador de llegada, salida, personas y barrio arriba; cada casa (de a dos por fila) muestra fotos, cifras, amenities, precio "desde", total de las fechas elegidas y si está libre
- **Precios reales**: salen de Casas → Precios alquileres (`price_rules`, lectura pública solo de columnas y casas publicadas, ver `sql/22`)
- **Ficha completa** de cada casa (todas las fotos, descripción, amenities, compartir) que abre también el link `/casa/[id]`
- **Link para compartir** `/casa/[id]` con vista previa de WhatsApp (foto, título y datos)
- **El barrio** (amenities de Costa Esmeralda), **cómo llegar** (mapa esquemático + Google Maps) y **cómo reservar**
- Consulta por WhatsApp con casa, fechas, personas y link; español / inglés; modo demo (`?demo=true`)

### Panel de Administración
- **Informes** (antes Resumen): reservas, ingresos y ocupación del período, evolución por temporada (precio de lista, cobrado por noche, ocupación y total, con variación contra la anterior) y resultado del año (cobrado menos gastos, con acumulado)
- **Propiedades**: CRUD completo con fotos (hasta 16), amenities, precio de alquiler y de venta, y toggle de publicación
- **Piezas gráficas**: Generador de avisos de venta y alquiler (post 4:5, story 9:16 y ficha A4 en PDF)
- **Temporada** (inicio): avisos de cobranza, ocupación con huecos para ofrecer por WhatsApp y **resultado por año calendario** por casa: pagos de alquiler y servicios cobrados en el año (sin depósitos) menos todos los gastos del año (expensas, mantenimiento, etc.), más el **acumulado** de todos los años; en dólares y pesos con el dólar del día (blue/MEP/oficial) o uno a mano
- **Precios alquileres**: ver abajo
- **Reservas**: Vigentes / Cerradas / Pagos en dos columnas (lista por fecha + detalle), resumen en cuadro, calendario de 3 meses con colores por casa (solo Vigentes), detalle con noches × precio por noche y cada servicio (limpieza final, lavadero, extras) y reporte PDF que pregunta el período (temporada, desde hoy o rango) con calendario y precio por noche. PDF de contrato y recibo en verde esmeralda
- **Cobros**: Dos bloques — alquiler y servicios (con subtotales por moneda) y depósito en garantía, que se lleva aparte por no ser ingreso
- **Calendario de Reservas**: Vista mensual con indicadores de feriados
- **Inquilinos / Huéspedes**: Base de datos de inquilinos con validación contra lista negra e historial de reservas
- **Link para el huésped**: `/huespedes/[código]` para que cargue nombre, apellido, edad y DNI de sus acompañantes (autorización del barrio); en la reserva se copia la lista lista para mandar
- **Gastos**: Control de gastos por propiedad
- **Usuarios**: Panel de administración de usuarios (solo admin)
- **Info útil**: Información de servicios, contactos y lista negra
- **Papelera**: Recuperación de elementos eliminados (soft delete)
- **Versiones**: historial de cambios del sistema (`lib/versiones.ts`), con la versión actual al pie del menú

### Precios alquileres (Casas → Precios alquileres)
- **Calendario mensual** de lunes a domingo con el precio por noche de cada casa (ambas o una sola), botón Hoy y buscador de fecha
- **Colores**: un verde en cuatro intensidades según el precio; reservada en gris, sin confirmar punteada, feriados con la fila del número resaltada
- **Precios por tramo**: tabla fija (Fiestas, Temporada alta, Febrero, Semana Santa, Carnaval, Feriados largos, Temporada baja) editable en el lugar; casilleros punteados para cargar lo que falta
- **Nuevo tramo** con nombre y fechas, o **fines de semana largos** sin fechas (toma los feriados de cada año, fuera de temporada)
- **Precios por temporada**: comparativo de las últimas temporadas por casa, editable, con el promedio cobrado en las reservas
- **Un solo cálculo** (`lib/preciosReglas.ts`) para el calendario, la web pública, las ofertas de Temporada y Nueva reserva
- **Feriados** dentro del mismo recuadro, con selector de año; fines de semana largos por racha de días libres (ej. Memoria + Semana Santa = 5 días)

### Calendario Argentina
- **Feriados oficiales**: Cálculo automático de feriados inamovibles y trasladables
- **Feriados móviles**: Carnaval, Semana Santa calculados con algoritmo de Computus
- **Fines de semana largos**: Detección automática de puentes de 3+ días
- **Feriados personalizados**: CRUD para agregar/editar feriados que se corren
- **Integración visual**: Indicadores de feriados en calendarios de precios y reservas

### Piezas Gráficas
- **Generación por propiedad**: Los textos, amenities y fotos salen de la ficha; se edita solo lo que haga falta
- **Tres formatos**: Post 4:5 (1080×1350), Story 9:16 (1080×1920) y Ficha A4 de venta (1080×1527)
- **Ficha A4**: Pensada para mandar por WhatsApp o mail e imprimir. Portada + fila de datos duros (m² cubiertos, lote, dormitorios, baños, plantas), grilla de 6 fotos parejas y la descripción a dos columnas. Exporta en PNG y en **PDF A4**
- **Fotos**: Hasta 7 elegibles — la ficha usa portada + 6 en grilla; el post y el story se quedan con las primeras 4
- **Composición 70/30** (post y story): El 70% de la pieza son fotos — portada grande más una fila de hasta 3 secundarias
- **Encuadre por foto**: Recorte vertical arriba / centro / abajo para corregir cuando el corte se come el techo o la pileta
- **Barra de amenities**: Hasta 7 iconos elegibles de un set de 20, con texto editable y reordenables. La preselección depende del tipo de aviso: en venta arranca con superficies, lote y ambientes; en alquiler con dormitorios, baños y capacidad
- **Datos duros de la ficha**: Se eligen de un catálogo (m² cubiertos, semicubiertos, de lote, ambientes, dormitorios, baños, plantas, camas, huéspedes, cocheras, años) y se suman con el valor ya tomado de la propiedad
- **Barra de contacto**: Logo de WhatsApp junto al teléfono y logo de Costa Esmeralda en la esquina opuesta (`public/logo-costa-esmeralda.png`, opcional: si falta, la pieza sale sin él)
- **Ajuste automático**: La tipografía se adapta al espacio disponible; con títulos largos la foto cede hasta un piso del 64%
- **Guardado por propiedad y tipo**: Cada aviso (temporada / fuera de temporada / venta) conserva textos, fotos, encuadres e iconos en `piezas_avisos`, y cada tipo tiene su propia paleta

### Mensajería Interna
- Campanita de mensajes en el sidebar con contador de no leídos
- Envío de mensajes entre usuarios del sistema desde el panel de Usuarios

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

### Lista Negra de Inquilinos
- **Gestión completa**: Agregar, editar y eliminar registros
- **Búsqueda**: Por documento, nombre o motivo
- **Diseño grid**: Tarjetas responsive (3 cols desktop, 2 tablet, 1 mobile)
- **Validación automática**: Alerta visual al cargar inquilino en lista negra
- **Importación masiva**: Soporte para importar desde Excel vía SQL

### Papelera (Soft Delete)
- **Recuperación**: Restaurar propiedades, reservas e inquilinos eliminados
- **Eliminación permanente**: Opción de borrar definitivamente
- **Organización por tabs**: Separación por tipo de elemento
- **Protección**: No se pueden eliminar propiedades con reservas activas

### Seguridad
- Autenticación multi-usuario con Supabase Auth
- Row Level Security (RLS) para aislamiento de datos por usuario
- Recuperación de contraseña con cambio obligatorio
- Sistema de autorización para nuevos usuarios
- Panel de administrador para gestión de usuarios
- Usuario logueado visible en el sidebar
- Validación de inquilinos contra lista negra

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
| `propiedades` | Datos de las propiedades (incluye campo `publicada` y `eliminado_at`) |
| `reservas` | Reservas de inquilinos (incluye `eliminado_at` para soft delete) |
| `inquilinos` | Información de inquilinos (incluye `eliminado_at` para soft delete) |
| `gastos` | Gastos asociados a propiedades |
| `cobros` | Registro de cobros |
| `proveedores_servicios` | Proveedores de servicios |
| `profiles` | Perfiles de usuarios |
| `price_rules` | Reglas de precios por propiedad |
| `feriados_custom` | Feriados personalizados por usuario |
| `lista_negra` | Inquilinos en lista negra con documento, nombre y motivo |

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
│   │   ├── info-util/        # Información de servicios y lista negra
│   │   └── papelera/         # Elementos eliminados (soft delete)
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

### v1.5.0
- Lista Negra de inquilinos con grid de tarjetas responsive
- Validación automática de DNI contra lista negra al cargar inquilino
- Papelera con soft delete para propiedades, reservas e inquilinos
- Restauración de elementos eliminados
- Modal mejorado: no se cierra al tocar fuera del formulario
- Precios por defecto: Limpieza final $150.000, Lavadero $100.000
- Precios sugeridos en gris (editables)
- Validación de fechas superpuestas en reservas
- Trigger automático para crear perfiles de nuevos usuarios

### v1.4.0
- Solapa "Calendario de Precios" integrada en página de Propiedades
- Acceso directo al calendario desde botón $ en cada tarjeta
- Preset con multiplicadores personalizables por temporada
- Vista en tiempo real del precio calculado al editar multiplicadores
- Proveedores de servicios organizados por rubro con colores
- Filtro de disponibilidad en landing page (oculta propiedades reservadas)
- Botones Crear/Cancelar fijos en modal de propiedades
- Botones de tarjetas siempre alineados al final

### v1.3.0
- Calendario de feriados Argentina con cálculo automático
- Feriados personalizados editables (CRUD completo)
- Detección de fines de semana largos
- Indicadores de feriados en calendario de reservas
- Integración de feriados en calendario de precios

### v1.2.0
- Sistema de reglas de precios por propiedad
- Categorías de temporada (muy alta, alta, media, baja)
- Presets de configuración rápida
- Calendario de precios visual con colores
- Métricas de cobertura y precio promedio
- Vista detalle de reserva clickeable desde calendario

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

