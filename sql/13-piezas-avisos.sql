-- ============================================================
-- 13 · piezas_avisos
-- Guarda las ediciones de las piezas gráficas por propiedad y
-- tipo (venta / alquiler). Cada usuario ve solo las suyas.
-- Los campos editables se guardan en el JSON `datos`.
-- ============================================================

create table if not exists public.piezas_avisos (
  id            serial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  propiedad_id  uuid not null references public.propiedades(id) on delete cascade,
  tipo          text not null check (tipo in ('venta', 'alquiler')),
  datos         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, propiedad_id, tipo)
);

-- 1. Permisos de API
grant select on public.piezas_avisos to anon;
grant select, insert, update, delete on public.piezas_avisos to authenticated;
grant select, insert, update, delete on public.piezas_avisos to service_role;

-- 2. RLS
alter table public.piezas_avisos enable row level security;

-- 3. Policies (datos por usuario)
drop policy if exists "piezas_avisos_select" on public.piezas_avisos;
create policy "piezas_avisos_select" on public.piezas_avisos
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "piezas_avisos_insert" on public.piezas_avisos;
create policy "piezas_avisos_insert" on public.piezas_avisos
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "piezas_avisos_update" on public.piezas_avisos;
create policy "piezas_avisos_update" on public.piezas_avisos
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "piezas_avisos_delete" on public.piezas_avisos;
create policy "piezas_avisos_delete" on public.piezas_avisos
  for delete to authenticated
  using (auth.uid() = user_id);

-- 4. Índice para la consulta por usuario
create index if not exists idx_piezas_avisos_user on public.piezas_avisos(user_id);
