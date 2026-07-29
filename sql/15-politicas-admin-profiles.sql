-- Permite a los usuarios con is_admin = true ver y gestionar TODOS los perfiles,
-- no solo el propio. Sin esto, la pantalla "Gestion de Usuarios" solo le muestra
-- al admin su propia fila (RLS de profiles solo dejaba auth.uid() = id).

-- Funcion security definer: evita el problema de recursion al consultar
-- is_admin desde una policy de la misma tabla profiles.
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "Admins ven todos los perfiles" on public.profiles;
create policy "Admins ven todos los perfiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "Admins actualizan todos los perfiles" on public.profiles;
create policy "Admins actualizan todos los perfiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin_user());

drop policy if exists "Admins borran perfiles" on public.profiles;
create policy "Admins borran perfiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin_user());
