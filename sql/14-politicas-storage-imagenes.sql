-- Politicas de Storage para el bucket "Imagenes"
-- Estructura de carpetas esperada dentro del bucket:
--   landing/...              -> fotos del sitio publico, las administras solo vos
--   propiedades/{user_id}/... -> fotos que cada usuario sube de sus propias casas

-- IMPORTANTE (accion manual antes de correr esto):
-- En Supabase Dashboard > Storage > Imagenes > Policies hay una alerta:
-- "Clients can list all files in this bucket" (2 policies SELECT muy amplias).
-- Revisalas y eliminalas si quedan redundantes/mas permisivas que las de aca abajo,
-- para que la unica forma de listar sea a traves de estas policies scoped por carpeta.

alter table storage.objects enable row level security;

-- === landing/ : lectura publica, escritura solo admins ===

drop policy if exists "lectura publica landing" on storage.objects;
create policy "lectura publica landing"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'landing'
  );

drop policy if exists "admins suben landing" on storage.objects;
create policy "admins suben landing"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'landing'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "admins actualizan landing" on storage.objects;
create policy "admins actualizan landing"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'landing'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "admins borran landing" on storage.objects;
create policy "admins borran landing"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'landing'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- === propiedades/{user_id}/... : lectura publica, cada usuario escribe solo en su propia carpeta ===

drop policy if exists "lectura publica propiedades" on storage.objects;
create policy "lectura publica propiedades"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'propiedades'
  );

drop policy if exists "usuarios suben su carpeta" on storage.objects;
create policy "usuarios suben su carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'propiedades'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "usuarios actualizan su carpeta" on storage.objects;
create policy "usuarios actualizan su carpeta"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'propiedades'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "usuarios borran su carpeta" on storage.objects;
create policy "usuarios borran su carpeta"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'propiedades'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Los admins pueden borrar/actualizar cualquier foto de propiedades (moderacion)
drop policy if exists "admins moderan propiedades" on storage.objects;
create policy "admins moderan propiedades"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'Imagenes'
    and (storage.foldername(name))[1] = 'propiedades'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
