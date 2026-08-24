# Admin Costa - Hoja de Ruta

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

### Propiedades
- Tope de fotos por propiedad de 10 a 16

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
