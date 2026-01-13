DROP POLICY IF EXISTS "Users can view own inquilinos" ON inquilinos;
CREATE POLICY "Users can view own inquilinos" ON inquilinos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inquilinos" ON inquilinos;
CREATE POLICY "Users can insert own inquilinos" ON inquilinos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inquilinos" ON inquilinos;
CREATE POLICY "Users can update own inquilinos" ON inquilinos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inquilinos" ON inquilinos;
CREATE POLICY "Users can delete own inquilinos" ON inquilinos
  FOR DELETE USING (auth.uid() = user_id);
