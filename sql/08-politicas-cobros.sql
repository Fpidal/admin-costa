DROP POLICY IF EXISTS "Users can view own cobros" ON cobros;
CREATE POLICY "Users can view own cobros" ON cobros
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cobros" ON cobros;
CREATE POLICY "Users can insert own cobros" ON cobros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cobros" ON cobros;
CREATE POLICY "Users can update own cobros" ON cobros
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cobros" ON cobros;
CREATE POLICY "Users can delete own cobros" ON cobros
  FOR DELETE USING (auth.uid() = user_id);
