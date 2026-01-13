DROP POLICY IF EXISTS "Users can view own propiedades" ON propiedades;
CREATE POLICY "Users can view own propiedades" ON propiedades
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own propiedades" ON propiedades;
CREATE POLICY "Users can insert own propiedades" ON propiedades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own propiedades" ON propiedades;
CREATE POLICY "Users can update own propiedades" ON propiedades
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own propiedades" ON propiedades;
CREATE POLICY "Users can delete own propiedades" ON propiedades
  FOR DELETE USING (auth.uid() = user_id);
