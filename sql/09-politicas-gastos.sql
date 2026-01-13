DROP POLICY IF EXISTS "Users can view own gastos" ON gastos;
CREATE POLICY "Users can view own gastos" ON gastos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gastos" ON gastos;
CREATE POLICY "Users can insert own gastos" ON gastos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gastos" ON gastos;
CREATE POLICY "Users can update own gastos" ON gastos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gastos" ON gastos;
CREATE POLICY "Users can delete own gastos" ON gastos
  FOR DELETE USING (auth.uid() = user_id);
