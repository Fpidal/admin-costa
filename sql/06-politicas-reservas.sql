DROP POLICY IF EXISTS "Users can view own reservas" ON reservas;
CREATE POLICY "Users can view own reservas" ON reservas
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reservas" ON reservas;
CREATE POLICY "Users can insert own reservas" ON reservas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reservas" ON reservas;
CREATE POLICY "Users can update own reservas" ON reservas
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reservas" ON reservas;
CREATE POLICY "Users can delete own reservas" ON reservas
  FOR DELETE USING (auth.uid() = user_id);
