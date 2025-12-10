-- ============================================================================
-- FRESH JOURNALS TABLE - DELETE AND RECREATE
-- ============================================================================
-- This script completely removes the old journals table and creates a fresh one
-- with a clean schema designed for this project.

-- Step 1: Drop the old journals table (this will delete all data!)
DROP TABLE IF EXISTS journals CASCADE;

-- Step 2: Create the fresh journals table
CREATE TABLE journals (
  -- Primary keys and relationships
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES trading_accounts(id) ON DELETE SET NULL,
  
  -- Core trade information
  title text,
  symbol text NOT NULL,
  direction text NOT NULL,  -- 'Buy' or 'Sell'
  result text NOT NULL,     -- 'TP', 'SL', 'BREAKEVEN', 'MANUAL'
  
  -- Entry information
  entry_price numeric NOT NULL,
  entry_at timestamptz DEFAULT NOW(),
  
  -- Exit information (optional)
  exit_price numeric,
  exit_at timestamptz,
  
  -- Stop Loss & Take Profit - PRICES (actual price levels)
  stop_loss_price numeric,
  target_price numeric,
  
  -- Stop Loss & Take Profit - POINTS (calculated from prices)
  stop_loss_points numeric,
  target_points numeric,
  
  -- Session and setup information
  session text,
  setup text,
  setup_rating text,
  execution_type text,
  
  -- P&L AMOUNTS (Money Management - in account currency $$)
  -- These are the key fields for P&L calculation
  risk_amount numeric,      -- Amount risked (used when result = 'SL')
  profit_target numeric,    -- Profit target (used when result = 'TP')
  
  -- Realized amounts (what actually happened)
  realized_amount numeric,  -- Final P&L in $$ (positive = profit, negative = loss)
  realized_points numeric,  -- Final P&L in points
  
  -- Trade outcome
  win boolean,              -- true if profitable, false if loss
  duration_minutes integer, -- How long trade was open
  
  -- Trade quality
  rule_followed boolean DEFAULT false,
  confirmation boolean DEFAULT false,
  loss_reason text,
  
  -- Notes and metadata
  notes text,
  screenshot_urls text[] DEFAULT ARRAY[]::TEXT[],
  tags text[],
  
  -- Related records
  trade_id uuid REFERENCES trades(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_journals_user_id ON journals(user_id);
CREATE INDEX idx_journals_account_id ON journals(account_id);
CREATE INDEX idx_journals_created_at ON journals(created_at);
CREATE INDEX idx_journals_symbol ON journals(symbol);
CREATE INDEX idx_journals_result ON journals(result);
CREATE INDEX idx_journals_win ON journals(win);
CREATE INDEX idx_journals_entry_price ON journals(entry_price);

-- ============================================================================
-- SCHEMA SUMMARY
-- ============================================================================
-- 
-- PRICES (actual price levels):
--   - entry_price: Where you entered (e.g., 4650)
--   - stop_loss_price: SL price level (e.g., 4640)
--   - target_price: TP price level (e.g., 4670)
--
-- POINTS (calculated from prices):
--   - stop_loss_points: Calculated as |entry_price - stop_loss_price|
--   - target_points: Calculated as |entry_price - target_price|
--   - realized_points: Final points earned/lost
--
-- MONEY MANAGEMENT (in $$):
--   - risk_amount: How much $ you're risking
--   - profit_target: How much $ you want to profit
--   - realized_amount: Actual P&L in $$ (this is what's displayed!)
--
-- CALCULATION LOGIC:
--   When result = 'TP':
--     realized_amount = profit_target (from form)
--     realized_points = target_points (calculated from prices)
--     win = true
--   
--   When result = 'SL':
--     realized_amount = -risk_amount (negative of form value)
--     realized_points = -stop_loss_points (negative, calculated from prices)
--     win = false
--
--   When result = 'BREAKEVEN':
--     realized_amount = 0
--     realized_points = 0
--     win = false
--
--   When result = 'MANUAL':
--     realized_amount = manualAmount (from form, positive or negative)
--     realized_points = calculated from prices or manual entry
--     win = (manualOutcome === 'Profit')
-- ============================================================================

-- Verify the table was created:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'journals'
-- ORDER BY ordinal_position;
