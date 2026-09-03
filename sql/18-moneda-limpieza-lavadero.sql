-- Moneda de la limpieza final y del lavadero.
-- Hasta ahora el alquiler tenía su moneda (reservas.moneda) pero estos dos
-- servicios se asumían siempre en pesos, y no siempre se pactan así.

alter table public.reservas
  add column if not exists moneda_limpieza text not null default 'ARS',
  add column if not exists moneda_lavadero text not null default 'ARS';

comment on column public.reservas.moneda_limpieza is 'ARS o USD. Moneda de limpieza_final.';
comment on column public.reservas.moneda_lavadero is 'ARS o USD. Moneda de monto_lavadero.';
