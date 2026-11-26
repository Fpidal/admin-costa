-- Cuando el huésped carga sus acompañantes por el link, además de la reserva
-- se suman a su ficha de Huéspedes (para la próxima reserva). Se agregan los
-- nuevos sin borrar los que ya tenía; si alguien ya estaba (mismo DNI, o mismo
-- nombre y apellido si no hay DNI) se actualizan sus datos.
create or replace function public.guardar_huespedes(p_token uuid, p_lista jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_lista jsonb; v_inquilino uuid; v_previos jsonb;
begin
  if jsonb_typeof(p_lista) <> 'array' or jsonb_array_length(p_lista) > 20 then return false; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'nombre', left(trim(coalesce(x->>'nombre', '')), 80), 'apellido', left(trim(coalesce(x->>'apellido', '')), 80),
      'edad', left(trim(coalesce(x->>'edad', '')), 3), 'documento', left(trim(coalesce(x->>'documento', '')), 20))), '[]'::jsonb)
    into v_lista from jsonb_array_elements(p_lista) x
    where trim(coalesce(x->>'nombre', '')) <> '' or trim(coalesce(x->>'apellido', '')) <> '';
  update reservas set acompanantes = v_lista,
    cantidad_personas = greatest(coalesce(cantidad_personas, 1), 1 + jsonb_array_length(v_lista))
  where token_huespedes = p_token and eliminado_at is null and estado <> 'cancelada'
  returning inquilino_id into v_inquilino;
  if not found then return false; end if;
  if v_inquilino is not null then
    select coalesce(acompanantes, '[]'::jsonb) into v_previos from inquilinos where id = v_inquilino;
    update inquilinos set acompanantes = (
      select coalesce(jsonb_agg(p), '[]'::jsonb) from jsonb_array_elements(v_previos) p
      where not exists (select 1 from jsonb_array_elements(v_lista) n
        where (coalesce(n->>'documento', '') <> '' and n->>'documento' = p->>'documento')
           or (coalesce(n->>'documento', '') = '' and lower(n->>'nombre') = lower(p->>'nombre') and lower(n->>'apellido') = lower(p->>'apellido')))
    ) || v_lista
    where id = v_inquilino;
  end if;
  return true;
end $$;
