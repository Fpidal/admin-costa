-- Gastos en pesos o en dólares, con el tipo de cambio del día del gasto
alter table public.gastos
  add column if not exists moneda text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  add column if not exists cotizacion numeric;
