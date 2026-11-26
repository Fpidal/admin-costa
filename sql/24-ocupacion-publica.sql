-- La página pública necesita saber qué fechas están ocupadas para decir si una
-- casa está libre. Sin login no se puede leer reservas (bien), así que esta
-- función entrega solo casa y fechas de las reservas activas de casas
-- publicadas, sin huésped, montos ni ningún otro dato.
create or replace function public.ocupacion_publica()
returns table (propiedad_id uuid, fecha_inicio date, fecha_fin date)
language sql security definer set search_path = public stable as $$
  select r.propiedad_id, r.fecha_inicio, r.fecha_fin
  from reservas r join propiedades p on p.id = r.propiedad_id
  where r.eliminado_at is null and r.estado in ('confirmada', 'pendiente') and r.fecha_fin >= current_date
    and p.publicada is not false and p.eliminado_at is null
$$;
revoke all on function public.ocupacion_publica() from public;
grant execute on function public.ocupacion_publica() to anon, authenticated;
