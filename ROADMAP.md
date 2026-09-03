# Admin Costa - Hoja de Ruta

## Actualizaciones Recientes (Septiembre 2026)

### Contrato PDF
- **Locadora**: sale a nombre de Rosa María Martín D., Av. Italia 4500, con teléfono de contacto, y firma como Locadora
- **Barrio y lote**: se toman del campo `lote` de cada propiedad (Golf 1 → 234, Deportiva 1 → 9). Antes `barrioLote` repetía el nombre de la propiedad
- **Ocupación máxima**: el punto Destino fija 8 personas como cláusula del contrato, en vez de reflejar la cantidad cargada en la reserva

### Fix de fechas (bug)
- `new Date('2027-02-01')` se parsea como medianoche **UTC**, así que en Argentina (UTC-3) caía el día anterior: una reserva del 1 al 15 de febrero salía en el contrato como 31 de enero al 14 de febrero
- Se agregó parseo en horario local y se aplicó en el contrato, el listado de reservas y el módulo de cobros
- El total de noches nunca estuvo mal: ambas fechas tenían el mismo desfase y se cancelaba

### Reservas
- **Precio por noche con decimales**: `InputNumber` usaba `parseInt` y descartaba las comas. Ahora acepta decimales vía prop opcional, sin cambiar el resto de los campos
- **Moneda para limpieza final y lavadero**: antes se asumían siempre en pesos. Migración `sql/18-moneda-limpieza-lavadero.sql`

### Cobros - Reestructuración a dos bloques
- **De tres cuadros a dos**: "Alquiler y servicios" (alquiler + limpieza + lavadero) y "Depósito en garantía". El depósito va aparte porque entra y sale: es garantía, no ingreso de la reserva
- **Subtotales por moneda**: como cada concepto puede pactarse en distinta moneda, se agrupa por moneda en vez de sumar montos heterogéneos
- **Aplicar pago simplificado**: de cuatro opciones (alquiler, limpieza, lavadero, depósito) a dos (alquiler y servicios, depósito). Los cobros ya cargados como limpieza o lavadero siguen sumando al bloque de operación
- **Comentario en el pago**: la columna `descripcion` ya existía en `cobros` pero no estaba en el formulario. Sirve para aclarar pagos que cubren varios conceptos
- **Depósito en dólares**: cobros leía y editaba `deposito_pesos`, mientras que el formulario de reservas carga `deposito` (etiquetado "Depósito USD"). Ahora ambos usan el mismo campo y se muestra en U$D; se cae a `deposito_pesos` solo para las reservas editadas desde cobros cuando guardaba en ese campo. Lo recibido sale con la moneda real de cada cobro

---

## Actualizaciones Recientes (Agosto 2026)

### Piezas Gráficas - Rediseño 70/30
- **Fotos al 70% de la pieza**: Antes el bloque de fotos se achicaba hasta el 40% para hacerle lugar al texto; ahora manda la foto y la tipografía se ajusta sola
- **Portada más grande**: Se lleva el 75% del bloque de fotos (antes 63,5%). Pasa de una franja 3,14:1 a 1,5:1, con lo que de una foto de celular 4:3 se ve el 87% en vez del 42%
- **Encuadre por foto**: Botones arriba / centro / abajo para elegir qué parte se conserva al recortar. Antes siempre centraba sin forma de corregirlo
- **Barra de iconos**: Reemplaza a los destacados con viñetas. Hasta 6 de un set de 15, dibujados como paths SVG sobre el canvas (sin librerías nuevas)
- **Título a la izquierda, precio a la derecha**: Entra en la mitad de alto que apilado, que es lo que libera el 70% para las fotos
- **Logo de WhatsApp** en la barra de contacto, y logo de Costa Esmeralda en la esquina opuesta
- **Símbolo de moneda en cuerpo menor** que la cifra
- **Hasta 7 iconos** por pieza y más aire entre volanta y título

### Ficha A4 de Venta
- **Nuevo formato** junto a Post y Story: 1080×1527 (proporción A4), pensado para WhatsApp, mail e impresión
- **Otra estructura**: la portada pesa 27% en vez de 70%, y mandan la fila de datos duros, la grilla de 6 fotos parejas y el texto a dos columnas
- **Se llena sola desde la ficha**: los m², el lote y las plantas salen de las columnas de la propiedad, y la descripción se parte en dos columnas por sus títulos en mayúscula (salteando FICHA TÉCNICA, cuyos números ya van en la fila de arriba)
- **Exportación a PDF A4** además de PNG, con jsPDF en import dinámico
- **Tope de fotos de 4 a 7**: la ficha usa portada + 6; el post y el story siguen con 4

### Ajustes sobre la Ficha (post-uso)
- **Iconos según el tipo de aviso**: en venta la preselección arranca por superficie cubierta, superficie del lote y ambientes, que es lo que compara un comprador; el alquiler sigue con dormitorios, baños y capacidad
- **Set de iconos a 20**: nuevos Ambientes, Superficie del lote, Antigüedad, Orientación y Luminosidad; rediseñados Superficie cubierta (se confundía con el lote) y Cochera, tomando como referencia las fichas de los portales inmobiliarios
- **Datos duros con catálogo**: el botón "+ Agregar dato" sumaba una fila en blanco y había que adivinar qué escribir. Ahora es un desplegable que muestra cada dato con el valor que ya tiene la propiedad, y se suma completo. Se agregaron encabezados de columna
- **Fix de alineación**: la clase base de los inputs traía `w-full` y competía con el ancho fijo del campo de valor, así que este se estiraba a todo el ancho y la etiqueta quedaba aplastada contra el borde con la × afuera del panel. Mismo problema en la fila de iconos
- **Espaciado de la cabecera**: la volanta quedaba pegada al título (38px entre bases, con un título de 43px son ~6px de aire real) y el subtítulo de ubicación quedaba más separado que ella, cuando forma bloque con el título. Ahora 50px arriba y 2px abajo
- **Fotos más grandes**: de 156 a 168px de alto, con el espacio ganado al compactar la fila de datos duros

### Propiedades
- Tope de fotos por propiedad de 10 a 16
- **Nueva columna `precio_venta`** (migración `sql/17-precio-venta.sql`): antes solo existía `precio_alquiler`, así que el precio de venta había que escribirlo a mano en cada pieza y no quedaba guardado en la ficha

---

## Actualizaciones Recientes (Enero 2026)

### Gestión de Cobros - Reestructuración Completa
- **3 Secciones diferenciadas**:
  - **Alquiler**: Valor del alquiler acordado
  - **Limpieza**: Limpieza final + Lavadero
  - **Liquidación Final**: Depósito, descuentos, devolución

### Modal de Edición de Reserva
- Botón de editar reserva desde la página de cobros
- Abre modal en lugar de redirigir
- Botones Cancelar/Actualizar en la parte superior

### Conversión Dólar Blue
- Campo para cotización del dólar en liquidación
- Convierte automáticamente gastos en pesos a USD
- Cálculo de devolución de depósito en dólares

### Mejoras en Cobros
- Depósito ahora se cobra en USD por defecto
- Concepto de cobro es dropdown (Seña, Anticipo, Liquidación, Otro)
- Moneda se muestra en tamaño menor (U$D / $)

### Servicios Adicionales en Reservas
- Checkboxes para Limpieza final y Lavadero
- Campos de monto asociados a cada servicio

### Proveedores de Servicios
- Nueva sección en Info Útil
- CRUD completo de proveedores (nombre, apellido, rubro, teléfono)

---

## Funcionalidades Existentes

### Propiedades
- CRUD completo de propiedades
- Imágenes y galería
- Información detallada (ubicación, capacidad, amenidades)

### Reservas
- Gestión de reservas con estados
- Calendario de disponibilidad
- Precios por temporada
- Contratos PDF

### Inquilinos
- Base de datos de inquilinos
- Historial de reservas
- Información de contacto

### Dashboard
- Vista general de reservas activas
- Métricas de ocupación
- Ingresos del mes

### Administración (Gastos)
- Registro de expensas
- Importación desde Eidico
- Agrupación por período

### Info Útil
- Contactos de emergencia
- Proveedores de servicios
- Enlaces útiles

---

## Próximas Mejoras (Pendientes)

- [ ] Reportes de ingresos por período
- [ ] Notificaciones de vencimientos
- [ ] Integración con calendario externo
- [ ] Estadísticas avanzadas
- [ ] Multi-idioma

---

## Stack Tecnológico

- **Frontend**: Next.js 14, React, TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **PDF**: jsPDF

---

## Notas de Base de Datos

### Columna cotizacion_dolar en liquidaciones
Si falta la columna, ejecutar:
```sql
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS cotizacion_dolar DECIMAL DEFAULT 0;
```

### Columnas de liquidaciones requeridas
```sql
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS costo_kw DECIMAL DEFAULT 0;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS kw_final DECIMAL DEFAULT 0;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS consumo_energia DECIMAL DEFAULT 0;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS roturas DECIMAL DEFAULT 0;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS otros_descuentos DECIMAL DEFAULT 0;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS monto_devolver DECIMAL DEFAULT 0;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS fecha_liquidacion DATE;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS cotizacion_dolar DECIMAL DEFAULT 0;
```
