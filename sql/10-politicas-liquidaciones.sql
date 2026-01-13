DROP POLICY IF EXISTS "Users can view own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can view own liquidaciones" ON liquidaciones
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can insert own liquidaciones" ON liquidaciones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can update own liquidaciones" ON liquidaciones
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own liquidaciones" ON liquidaciones;
CREATE POLICY "Users can delete own liquidaciones" ON liquidaciones
  FOR DELETE USING (auth.uid() = user_id);
