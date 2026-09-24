-- Datos del locador para el contrato, por usuario.
-- Antes el contrato salía siempre a nombre de la misma persona porque los datos
-- estaban fijos en el código. Ahora cada usuario los carga en "Mis datos" y el
-- contrato usa los del usuario logueado. nombre y telefono ya existían.
-- La tabla ya tiene RLS y la policy "Users can update own profile": cada uno
-- lee y edita solo su fila, no hace falta tocar permisos.

alter table public.profiles
  add column if not exists dni text,
  add column if not exists domicilio text;

comment on column public.profiles.dni is 'DNI del locador; sale en el contrato.';
comment on column public.profiles.domicilio is 'Domicilio del locador; sale en el contrato.';
