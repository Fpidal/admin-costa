# Admin Costa - Hoja de Ruta

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
