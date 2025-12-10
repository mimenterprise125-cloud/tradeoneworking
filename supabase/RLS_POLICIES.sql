-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- These policies ensure users can only access their own data
-- Enable RLS on all tables and add these policies

-- ============================================================================
-- 1. TRADING ACCOUNTS - RLS
-- ============================================================================
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY trading_accounts_select ON trading_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY trading_accounts_insert ON trading_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY trading_accounts_update ON trading_accounts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY trading_accounts_delete ON trading_accounts FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 2. JOURNALS - RLS
-- ============================================================================
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY journals_select ON journals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY journals_insert ON journals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY journals_update ON journals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY journals_delete ON journals FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. SETUPS - RLS
-- ============================================================================
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY setups_select ON setups FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY setups_insert ON setups FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY setups_update ON setups FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY setups_delete ON setups FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. SYMBOLS - RLS
-- ============================================================================
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;

CREATE POLICY symbols_select ON symbols FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY symbols_insert ON symbols FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY symbols_delete ON symbols FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 5. TRADES - RLS
-- ============================================================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY trades_select ON trades FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM trading_accounts 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY trades_insert ON trades FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM trading_accounts 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY trades_delete ON trades FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM trading_accounts 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. COPY RULES - RLS
-- ============================================================================
ALTER TABLE copy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY copy_rules_select ON copy_rules FOR SELECT
  USING (
    master_account_id IN (
      SELECT id FROM trading_accounts 
      WHERE user_id = auth.uid()
    )
    OR
    follower_account_id IN (
      SELECT id FROM trading_accounts 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY copy_rules_insert ON copy_rules FOR INSERT
  WITH CHECK (
    master_account_id IN (
      SELECT id FROM trading_accounts 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY copy_rules_delete ON copy_rules FOR DELETE
  USING (
    master_account_id IN (
      SELECT id FROM trading_accounts 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. PERFORMANCE METRICS - RLS
-- ============================================================================
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY performance_metrics_select ON performance_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY performance_metrics_insert ON performance_metrics FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY performance_metrics_update ON performance_metrics FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 8. MONTHLY PERFORMANCE - RLS
-- ============================================================================
ALTER TABLE monthly_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_performance_select ON monthly_performance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY monthly_performance_insert ON monthly_performance FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 9. DAILY PERFORMANCE - RLS
-- ============================================================================
ALTER TABLE daily_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_performance_select ON daily_performance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY daily_performance_insert ON daily_performance FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 10. TRADING GOALS - RLS
-- ============================================================================
ALTER TABLE trading_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY trading_goals_select ON trading_goals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY trading_goals_insert ON trading_goals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY trading_goals_update ON trading_goals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY trading_goals_delete ON trading_goals FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================
-- Run this to check RLS status:
/*
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'trading_accounts', 'journals', 'setups', 'symbols', 'trades',
    'copy_rules', 'performance_metrics', 'monthly_performance',
    'daily_performance', 'trading_goals'
  )
ORDER BY tablename;
*/

-- All tables should have rowsecurity = true

-- ============================================================================
-- TROUBLESHOOTING RLS
-- ============================================================================
-- If you get "permission denied" errors:
--
-- 1. Check that auth.uid() is returning a value:
--    SELECT auth.uid();
--
-- 2. Verify the policy is correct:
--    SELECT * FROM pg_policies WHERE tablename = 'journals';
--
-- 3. Test the policy with a sample query:
--    SELECT * FROM journals WHERE user_id = auth.uid();
--
-- 4. If needed, temporarily disable RLS for debugging:
--    ALTER TABLE journals DISABLE ROW LEVEL SECURITY;
--    (Then re-enable after fixing)

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- RLS Policies ensure:
-- ✓ Users can only see their own data
-- ✓ Users cannot modify other users' data
-- ✓ Data is automatically filtered by user_id
-- ✓ Prevents data leaks between accounts
--
-- How RLS Works:
-- - auth.uid() returns the current logged-in user's ID
-- - Policies are evaluated for every query
-- - Results are automatically filtered
-- - No need to check user_id in application code
--
-- Best Practices:
-- 1. Always enable RLS on user-specific tables
-- 2. Use auth.uid() for policy conditions
-- 3. Test policies with different users
-- 4. Never disable RLS in production
-- 5. Create policies for all CRUD operations
