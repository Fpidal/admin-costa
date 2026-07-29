-- ============================================================
-- 16 · mensajes_usuarios
-- Buzon interno: el admin le manda un mensaje de texto a un
-- usuario puntual, y le aparece como notificacion (campanita)
-- dentro del sistema. Cada usuario ve solo lo suyo.
-- ============================================================

create table if not exists public.mensajes_usuarios (
  id          serial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  de_admin_id uuid not null references auth.users(id),
  mensaje     text not null,
  leido       boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 1. Permisos de API
grant select, update on public.mensajes_usuarios to authenticated;
grant select, insert, update, delete on public.mensajes_usuarios to service_role;

-- 2. RLS
alter table public.mensajes_usuarios enable row level security;

-- 3. Policies
drop policy if exists "mensajes_usuarios_select_propio" on public.mensajes_usuarios;
create policy "mensajes_usuarios_select_propio"
  on public.mensajes_usuarios for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "mensajes_usuarios_update_leido" on public.mensajes_usuarios;
create policy "mensajes_usuarios_update_leido"
  on public.mensajes_usuarios for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin_user())
  with check (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "mensajes_usuarios_insert_admin" on public.mensajes_usuarios;
create policy "mensajes_usuarios_insert_admin"
  on public.mensajes_usuarios for insert
  to authenticated
  with check (public.is_admin_user() and de_admin_id = auth.uid());

drop policy if exists "mensajes_usuarios_delete_admin" on public.mensajes_usuarios;
create policy "mensajes_usuarios_delete_admin"
  on public.mensajes_usuarios for delete
  to authenticated
  using (public.is_admin_user());

-- 4. Indice para la consulta por usuario
create index if not exists idx_mensajes_usuarios_user on public.mensajes_usuarios(user_id, created_at desc);
