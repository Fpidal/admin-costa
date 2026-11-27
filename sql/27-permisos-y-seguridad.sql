-- Multiusuario seguro: cada dueño ve solo lo suyo y solo las secciones que el
-- super admin le habilitó. Cierra además permisos de más que venían de la
-- plantilla vieja (anon con escritura y TRUNCATE en todas las tablas, contactos
-- abiertos a todo internet, perfiles que se podían auto-ascender a admin,
-- fotos que cualquiera podía borrar).

-- 1. Permisos por usuario --------------------------------------------------
alter table public.profiles add column if not exists permisos text[] not null default '{}';
update public.profiles set is_admin = true, activo = true, autorizado = true
  where id = '9c801979-66ed-4b85-b942-f0df7d66821c';

create or replace function public.is_admin_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin and activo is not false from public.profiles where id = auth.uid()), false);
$$;

-- ¿El usuario logueado tiene alguna de estas secciones? (el admin tiene todas)
create or replace function public.tiene_permiso(variadic p text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select activo is not false and autorizado is not false and (is_admin or permisos && p)
    from public.profiles where id = auth.uid()), false);
$$;
revoke all on function public.tiene_permiso(text[]) from public, anon;
grant execute on function public.tiene_permiso(text[]) to authenticated;
revoke all on function public.is_admin_user() from public, anon;
grant execute on function public.is_admin_user() to authenticated;
revoke all on function public.is_admin() from public, anon;

-- Nadie se puede dar a sí mismo admin, permisos ni reactivarse: solo el admin
-- (o el servidor, al invitar) cambia esas columnas.
create or replace function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin_user() then return new; end if;
  if tg_op = 'INSERT' then
    new.is_admin := false; new.permisos := '{}'; new.autorizado := false;
  elsif new.is_admin is distinct from old.is_admin or new.permisos is distinct from old.permisos
     or new.activo is distinct from old.activo or new.autorizado is distinct from old.autorizado then
    raise exception 'Solo el administrador puede cambiar permisos';
  end if;
  return new;
end $$;
drop trigger if exists proteger_perfil on public.profiles;
create trigger proteger_perfil before insert or update on public.profiles
  for each row execute function public.proteger_perfil();

-- Resumen para la pantalla Usuarios (solo admin): casas de cada usuario y último ingreso
create or replace function public.resumen_usuarios()
returns table (id uuid, casas bigint, ultimo_ingreso timestamptz, invitado timestamptz, confirmado boolean)
language sql stable security definer set search_path = public as $$
  select u.id, (select count(*) from public.propiedades p where p.user_id = u.id and p.eliminado_at is null),
         u.last_sign_in_at, u.invited_at, u.last_sign_in_at is not null
  from auth.users u where public.is_admin_user();
$$;
revoke all on function public.resumen_usuarios() from public, anon;
grant execute on function public.resumen_usuarios() to authenticated;

-- 2. Permisos de API: anon solo lee lo que muestra la web, nadie hace TRUNCATE --
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
grant select on public.propiedades, public.price_rules to anon;
alter default privileges in schema public revoke all on tables from anon;

-- 3. Policies: se borran todas y se crean de nuevo, limpias --------------------
do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Tablas de cada dueño: lee si tiene la sección (o Informes), escribe si tiene la sección
do $$ declare t record; begin
  for t in select * from (values
    ('reservas','{reservas}','{reservas,informes}'), ('cobros','{reservas}','{reservas,informes}'),
    ('liquidaciones','{reservas}','{reservas,informes}'), ('inquilinos','{reservas}','{reservas,informes}'),
    ('lista_negra','{reservas}','{reservas}'),
    ('gastos','{gastos}','{gastos,informes}'), ('proveedores_servicios','{gastos}','{gastos}'),
    ('mediciones_electricidad','{gastos}','{gastos,reservas}'),
    ('price_rules','{precios}','{precios,reservas,informes,casas}'),
    ('precios_calendario','{precios}','{precios,reservas,informes,casas}'),
    ('piezas_avisos','{piezas}','{piezas}')
  ) v(tabla, escribe, lee) loop
    execute format('create policy "dueño lee" on public.%I for select to authenticated using (user_id = (select auth.uid()) and public.tiene_permiso(variadic %L::text[]))', t.tabla, t.lee);
    execute format('create policy "dueño agrega" on public.%I for insert to authenticated with check (user_id = (select auth.uid()) and public.tiene_permiso(variadic %L::text[]))', t.tabla, t.escribe);
    execute format('create policy "dueño modifica" on public.%I for update to authenticated using (user_id = (select auth.uid()) and public.tiene_permiso(variadic %L::text[])) with check (user_id = (select auth.uid()))', t.tabla, t.escribe);
    execute format('create policy "dueño borra" on public.%I for delete to authenticated using (user_id = (select auth.uid()) and public.tiene_permiso(variadic %L::text[]))', t.tabla, t.escribe);
  end loop;
end $$;

-- Casas: cada uno lee las suyas (todas las secciones las necesitan); escribe con "casas"
create policy "dueño lee" on public.propiedades for select to authenticated using (user_id = (select auth.uid()));
create policy "dueño agrega" on public.propiedades for insert to authenticated with check (user_id = (select auth.uid()) and public.tiene_permiso('casas'));
create policy "dueño modifica" on public.propiedades for update to authenticated using (user_id = (select auth.uid()) and public.tiene_permiso('casas')) with check (user_id = (select auth.uid()));
create policy "dueño borra" on public.propiedades for delete to authenticated using (user_id = (select auth.uid()) and public.tiene_permiso('casas'));
create policy "web ve casas publicadas" on public.propiedades for select to anon using (publicada is not false and eliminado_at is null);
create policy "web ve precios de casas publicadas" on public.price_rules for select to anon using (active and exists (
  select 1 from public.propiedades p where p.id = price_rules.property_id and p.publicada is not false and p.eliminado_at is null));

-- Feriados propios y contactos de Info útil: de cada usuario, sin sección
create policy "dueño" on public.feriados_custom for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dueño" on public.contactos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Tablas generales: las leen los usuarios, las cambia solo el admin
create policy "usuarios leen" on public.info_util for select to authenticated using (true);
create policy "admin cambia" on public.info_util for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "usuarios leen" on public.categorias_gasto for select to authenticated using (true);
create policy "admin cambia" on public.categorias_gasto for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "admin" on public.configuracion for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
-- usuarios: tabla vieja sin uso, queda cerrada (sin policies nadie la lee)

-- Perfiles: cada uno el suyo; el admin ve y cambia todos
create policy "ve el suyo" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin_user());
create policy "cambia el suyo" on public.profiles for update to authenticated using (id = (select auth.uid()) or public.is_admin_user());
create policy "admin borra" on public.profiles for delete to authenticated using (public.is_admin_user());

-- 4. Fotos: todos las ven (la web las muestra); cada dueño sube y borra solo en su carpeta
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;
create policy "fotos visibles" on storage.objects for select using (bucket_id = 'Imagenes');
create policy "dueño sube fotos" on storage.objects for insert to authenticated with check (
  bucket_id = 'Imagenes' and (storage.foldername(name))[2] = (select auth.uid())::text and public.tiene_permiso('casas', 'piezas'));
create policy "dueño cambia fotos" on storage.objects for update to authenticated using (
  bucket_id = 'Imagenes' and (storage.foldername(name))[2] = (select auth.uid())::text and public.tiene_permiso('casas', 'piezas'));
create policy "dueño borra fotos" on storage.objects for delete to authenticated using (
  bucket_id = 'Imagenes' and (storage.foldername(name))[2] = (select auth.uid())::text and public.tiene_permiso('casas', 'piezas'));

-- 5. Proveedores viejos sin dueño pasan a Francisco; los nuevos toman el usuario logueado
update public.proveedores_servicios set user_id = '9c801979-66ed-4b85-b942-f0df7d66821c' where user_id is null;
alter table public.proveedores_servicios alter column user_id set default auth.uid();

-- 6. Cuentas nuevas arrancan sin autorizar: solo las habilita la invitación del admin
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre, autorizado, permisos)
  values (new.id, new.email, new.raw_user_meta_data->>'nombre', false, '{}')
  on conflict (id) do nothing;
  return new;
end $$;
