-- Servicios de la reserva, separados del precio.
-- Cada servicio se tilda y, si se quiere, se le pone precio; si no, queda en
-- blanco (incluido o bonificado). Además de ropa blanca, limpieza final (que
-- puede incluir el lavadero) y lavadero, hay una lista libre de extras, como
-- ropa blanca adicional o mucama cada X días.

alter table public.reservas
  add column if not exists incluye_limpieza boolean not null default false,
  add column if not exists incluye_lavadero boolean not null default false,
  add column if not exists monto_ropa_blanca numeric not null default 0,
  add column if not exists moneda_ropa_blanca text not null default 'ARS',
  add column if not exists servicios_extra jsonb not null default '[]'::jsonb,
  add column if not exists comentario_servicios text;

-- Las reservas ya cargadas: lo que tenía precio estaba incluido
update public.reservas set incluye_limpieza = true where limpieza_final > 0;
update public.reservas set incluye_lavadero = true where monto_lavadero > 0;

comment on column public.reservas.incluye_limpieza is 'La reserva incluye limpieza final. Su precio va en limpieza_final (0 = bonificada).';
comment on column public.reservas.incluye_lavadero is 'La reserva incluye lavadero. Su precio va en monto_lavadero, o dentro de la limpieza final.';
comment on column public.reservas.monto_ropa_blanca is 'Precio de la ropa blanca; 0 = incluida sin cargo.';
comment on column public.reservas.moneda_ropa_blanca is 'ARS o USD. Moneda de monto_ropa_blanca.';
comment on column public.reservas.servicios_extra is 'Lista de extras con precio: [{concepto, monto, moneda}].';
comment on column public.reservas.comentario_servicios is 'Comentario sobre los servicios; sale en el detalle de reserva.';
