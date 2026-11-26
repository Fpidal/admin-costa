-- Link para que el huésped cargue sus acompañantes (nombre, apellido, edad y
-- DNI) para la autorización del barrio. Cada reserva tiene un código secreto;
-- sin login solo se puede usar a través de estas dos funciones, que leen y
-- guardan únicamente la reserva de ese código. La tabla no se abre a anon.
alter table public.reservas add column if not exists token_huespedes uuid not null default gen_random_uuid();
create unique index if not exists reservas_token_huespedes_idx on public.reservas (token_huespedes);

create or replace function public.datos_link_huespedes(p_token uuid)
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'casa', p.nombre, 'lote', p.lote, 'fecha_inicio', r.fecha_inicio, 'fecha_fin', r.fecha_fin,
    'cantidad_personas', r.cantidad_personas, 'titular', split_part(coalesce(i.nombre, ''), ' ', 1),
    'acompanantes', coalesce(r.acompanantes, '[]'::jsonb))
  from reservas r left join propiedades p on p.id = r.propiedad_id left join inquilinos i on i.id = r.inquilino_id
  where r.token_huespedes = p_token and r.eliminado_at is null and r.estado <> 'cancelada'
$$;

create or replace function public.guardar_huespedes(p_token uuid, p_lista jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_lista jsonb;
begin
  if jsonb_typeof(p_lista) <> 'array' or jsonb_array_length(p_lista) > 20 then return false; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'nombre', left(trim(coalesce(x->>'nombre', '')), 80), 'apellido', left(trim(coalesce(x->>'apellido', '')), 80),
      'edad', left(trim(coalesce(x->>'edad', '')), 3), 'documento', left(trim(coalesce(x->>'documento', '')), 20))), '[]'::jsonb)
    into v_lista from jsonb_array_elements(p_lista) x
    where trim(coalesce(x->>'nombre', '')) <> '' or trim(coalesce(x->>'apellido', '')) <> '';
  update reservas set acompanantes = v_lista,
    cantidad_personas = greatest(coalesce(cantidad_personas, 1), 1 + jsonb_array_length(v_lista))
  where token_huespedes = p_token and eliminado_at is null and estado <> 'cancelada';
  return found;
end $$;

revoke all on function public.datos_link_huespedes(uuid) from public;
revoke all on function public.guardar_huespedes(uuid, jsonb) from public;
grant execute on function public.datos_link_huespedes(uuid) to anon, authenticated;
grant execute on function public.guardar_huespedes(uuid, jsonb) to anon, authenticated;
