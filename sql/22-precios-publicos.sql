-- La web pública calcula el precio de las fechas buscadas con price_rules.
-- Sin login solo se pueden leer algunas columnas, y solo de reglas activas de
-- casas publicadas. Se sacan los permisos de escritura que anon tenía de más
-- (también en precios_calendario, que ya no se usa).
revoke all on public.price_rules from anon;
revoke all on public.precios_calendario from anon;
grant select (property_id, name, price_per_night, start_date, end_date, applies_to_days, min_nights, priority, active) on public.price_rules to anon;
create policy "precios visibles de casas publicadas" on public.price_rules for select to anon
  using (active and exists (select 1 from public.propiedades p where p.id = property_id and p.publicada is not false and p.eliminado_at is null));
