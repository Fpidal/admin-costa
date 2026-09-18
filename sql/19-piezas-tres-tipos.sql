-- ============================================================
-- 19 · piezas_avisos: el alquiler se parte en dos
-- El tipo pasa de (venta, alquiler) a (venta, temporada,
-- fuera_temporada), cada uno con su propio estilo de pieza.
-- Los avisos ya grabados como 'alquiler' pasan a 'temporada'.
-- ============================================================

-- 1. Soltar el check viejo para poder mover las filas
alter table public.piezas_avisos
  drop constraint if exists piezas_avisos_tipo_check;

-- 2. Los avisos de alquiler pasan a temporada.
--    El `where not exists` cubre el caso de que una propiedad ya tenga
--    grabado un aviso de temporada: ese manda y el viejo se descarta,
--    porque (user_id, propiedad_id, tipo) es único.
update public.piezas_avisos a
   set tipo = 'temporada',
       updated_at = now()
 where a.tipo = 'alquiler'
   and not exists (
     select 1
       from public.piezas_avisos b
      where b.user_id = a.user_id
        and b.propiedad_id = a.propiedad_id
        and b.tipo = 'temporada'
   );

-- 3. Si quedó alguno sin migrar es porque ya había uno de temporada: se borra
delete from public.piezas_avisos where tipo = 'alquiler';

-- 4. El check nuevo, ya con los tres tipos
alter table public.piezas_avisos
  add constraint piezas_avisos_tipo_check
  check (tipo in ('venta', 'temporada', 'fuera_temporada'));

-- 5. Esta tabla no tiene por qué leerse sin login: son los textos de los
--    avisos de cada usuario. El grant a `anon` venía de la migración 13.
revoke select on public.piezas_avisos from anon;
