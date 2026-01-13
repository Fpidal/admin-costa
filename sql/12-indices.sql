CREATE INDEX IF NOT EXISTS idx_propiedades_user_id ON propiedades(user_id);
CREATE INDEX IF NOT EXISTS idx_reservas_user_id ON reservas(user_id);
CREATE INDEX IF NOT EXISTS idx_inquilinos_user_id ON inquilinos(user_id);
CREATE INDEX IF NOT EXISTS idx_cobros_user_id ON cobros(user_id);
CREATE INDEX IF NOT EXISTS idx_gastos_user_id ON gastos(user_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_user_id ON liquidaciones(user_id);
