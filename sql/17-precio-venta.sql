-- Precio de venta de la propiedad.
-- Hasta ahora solo existía precio_alquiler, así que al generar un aviso de
-- venta el precio había que escribirlo a mano en cada pieza y no quedaba
-- guardado en la ficha.

alter table public.propiedades
  add column if not exists precio_venta numeric;

comment on column public.propiedades.precio_venta is
  'Precio de venta en dólares. Null = no está en venta.';
