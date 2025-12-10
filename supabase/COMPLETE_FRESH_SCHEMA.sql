-- ============================================================================
-- COMPLETE FRESH DATABASE SCHEMA FOR TRADING JOURNAL & DASHBOARD
-- ============================================================================
-- This script creates all necessary tables for a trading journal system
-- with proper relationships and performance optimization.
-- NOTE: User/Auth tables (profiles, auth.users) are NOT included - they're managed by Supabase

-- ============================================================================
-- 1. TRADING ACCOUNTS TABLE
-- ============================================================================
-- Stores user's trading accounts (brokers, strategies, etc.)
DROP TABLE IF EXISTS trading_accounts CASCADE;

CREATE TABLE trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Account identification
  provider text NOT NULL,              -- 'MetaTrader5', 'FTX', 'Bybit', etc.
  account_identifier text NOT NULL,    -- Account number or login
  name text,                           -- User-friendly name (e.g., "Main Account")
  
  -- Account details
  balance numeric,                     -- Current balance
  currency text DEFAULT 'USD',         -- Account currency
  
  -- Metadata
  metadata jsonb,                      -- Additional data (JSON flexible storage)
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, provider, account_identifier)
);

CREATE INDEX idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX idx_trading_accounts_provider ON trading_accounts(provider);

-- ============================================================================
-- 2. TRADES TABLE (Optional - for imported trades)
-- ============================================================================
-- Stores raw trades imported from broker/platform
DROP TABLE IF EXISTS trades CASCADE;

CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES trading_accounts(id) ON DELETE CASCADE,
  
  -- Trade details
  symbol text,
  side text,                -- 'buy' or 'sell'
  size numeric,
  price numeric,
  status text,              -- 'pending', 'executed', 'closed'
  
  -- Timing
  executed_at timestamptz,
  
  -- Metadata
  metadata jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  
  CONSTRAINT fk_trades_account FOREIGN KEY(account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_trades_account_id ON trades(account_id);
CREATE INDEX idx_trades_executed_at ON trades(executed_at);

-- ============================================================================
-- 3. JOURNALS TABLE (MAIN - Trading Journal Entries)
-- ============================================================================
-- Stores detailed trade journal entries with P&L tracking
DROP TABLE IF EXISTS journals CASCADE;

CREATE TABLE journals (
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
  setup_rating text,        -- 'A+', 'A', 'B', 'C', etc.
  execution_type text,      -- 'Market', 'Limit', 'Stop'
  
  -- P&L AMOUNTS (Money Management - in account currency $$)
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

CREATE INDEX idx_journals_user_id ON journals(user_id);
CREATE INDEX idx_journals_account_id ON journals(account_id);
CREATE INDEX idx_journals_created_at ON journals(created_at);
CREATE INDEX idx_journals_symbol ON journals(symbol);
CREATE INDEX idx_journals_result ON journals(result);
CREATE INDEX idx_journals_win ON journals(win);
CREATE INDEX idx_journals_session ON journals(session);
CREATE INDEX idx_journals_setup ON journals(setup);

-- ============================================================================
-- 4. SETUPS TABLE
-- ============================================================================
-- Stores user-defined trading setups
DROP TABLE IF EXISTS setups CASCADE;

CREATE TABLE setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Setup information
  name text NOT NULL,
  description text,
  tags text[],
  
  -- Setup rules/parameters (JSON for flexibility)
  rules jsonb,              -- Trade rules for this setup
  parameters jsonb,         -- Setup-specific parameters
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX idx_setups_user_id ON setups(user_id);
CREATE INDEX idx_setups_name ON setups(name);

-- ============================================================================
-- 5. SAVED SYMBOLS TABLE
-- ============================================================================
-- Stores user's favorite/traded symbols
DROP TABLE IF EXISTS symbols CASCADE;

CREATE TABLE symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Symbol information
  name text NOT NULL,                -- Display name (EUR/USD)
  normalized_name text NOT NULL,     -- Normalized form (EURUSD)
  
  -- User association
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  
  -- Constraints - prevent duplicates per user
  UNIQUE(normalized_name, user_id)
);

CREATE INDEX idx_symbols_user_id ON symbols(user_id);
CREATE INDEX idx_symbols_normalized_name ON symbols(normalized_name);

-- ============================================================================
-- 6. PERFORMANCE METRICS TABLE (Pre-calculated for dashboard)
-- ============================================================================
-- Stores pre-calculated performance metrics for fast dashboard loading
DROP TABLE IF EXISTS performance_metrics CASCADE;

CREATE TABLE performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES trading_accounts(id) ON DELETE CASCADE,
  
  -- Period information
  metric_date date NOT NULL,          -- Date these metrics are for
  metric_type text NOT NULL,          -- 'daily', 'weekly', 'monthly', 'all_time'
  
  -- Trading statistics
  total_trades bigint DEFAULT 0,
  winning_trades bigint DEFAULT 0,
  losing_trades bigint DEFAULT 0,
  breakeven_trades bigint DEFAULT 0,
  
  -- Win rate
  win_rate numeric,                   -- 0-100 percentage
  
  -- P&L statistics
  total_pnl numeric DEFAULT 0,        -- Total profit/loss
  total_points numeric DEFAULT 0,     -- Total points earned/lost
  best_trade numeric,
  worst_trade numeric,
  avg_trade numeric,
  
  -- Risk management
  largest_win numeric,
  largest_loss numeric,
  avg_win numeric,
  avg_loss numeric,
  profit_factor numeric,              -- Total wins / Total losses
  
  -- Session statistics
  session_breakdown jsonb,            -- {'Asia': 5, 'Europe': 10, ...}
  setup_breakdown jsonb,              -- {'Setup1': {wins: 5, losses: 2}, ...}
  
  -- Timestamps
  calculated_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  UNIQUE(user_id, account_id, metric_date, metric_type)
);

CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_account_id ON performance_metrics(account_id);
CREATE INDEX idx_performance_metrics_date ON performance_metrics(metric_date);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type);

-- ============================================================================
-- 7. MONTHLY PERFORMANCE TABLE (For charts)
-- ============================================================================
-- Stores monthly P&L breakdown for dashboard charts
DROP TABLE IF EXISTS monthly_performance CASCADE;

CREATE TABLE monthly_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES trading_accounts(id) ON DELETE CASCADE,
  
  -- Month information
  year_month text NOT NULL,           -- 'YYYY-MM' format (e.g., '2024-12')
  
  -- Monthly statistics
  trades_count integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  losing_trades integer DEFAULT 0,
  
  -- Monthly P&L
  pnl_amount numeric DEFAULT 0,       -- Total P&L for the month
  pnl_percentage numeric,             -- % return for the month
  
  -- Win rate
  win_rate numeric,
  
  -- Session breakdown
  asia_trades integer DEFAULT 0,
  europe_trades integer DEFAULT 0,
  us_trades integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  UNIQUE(user_id, account_id, year_month)
);

CREATE INDEX idx_monthly_performance_user_id ON monthly_performance(user_id);
CREATE INDEX idx_monthly_performance_account_id ON monthly_performance(account_id);
CREATE INDEX idx_monthly_performance_year_month ON monthly_performance(year_month);

-- ============================================================================
-- 8. DAILY PERFORMANCE TABLE (For detailed tracking)
-- ============================================================================
-- Stores daily P&L for detailed analysis
DROP TABLE IF EXISTS daily_performance CASCADE;

CREATE TABLE daily_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES trading_accounts(id) ON DELETE CASCADE,
  
  -- Day information
  trading_date date NOT NULL,
  
  -- Daily statistics
  trades_count integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  losing_trades integer DEFAULT 0,
  
  -- Daily P&L
  pnl_amount numeric DEFAULT 0,
  
  -- Trade details
  best_trade numeric,
  worst_trade numeric,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  UNIQUE(user_id, account_id, trading_date)
);

CREATE INDEX idx_daily_performance_user_id ON daily_performance(user_id);
CREATE INDEX idx_daily_performance_account_id ON daily_performance(account_id);
CREATE INDEX idx_daily_performance_date ON daily_performance(trading_date);

-- ============================================================================
-- 9. COPY TRADING RULES TABLE (Optional - for copy trading features)
-- ============================================================================
DROP TABLE IF EXISTS copy_rules CASCADE;

CREATE TABLE copy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  follower_account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  
  -- Rule configuration
  enabled boolean DEFAULT true,
  lot_multiplier numeric DEFAULT 1,   -- Copy at different size
  max_loss_per_trade numeric,         -- Max loss per trade
  
  -- Metadata
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  UNIQUE(master_account_id, follower_account_id)
);

CREATE INDEX idx_copy_rules_master ON copy_rules(master_account_id);
CREATE INDEX idx_copy_rules_follower ON copy_rules(follower_account_id);

-- ============================================================================
-- 10. TRADING GOALS TABLE
-- ============================================================================
-- Stores user's trading goals and targets
DROP TABLE IF EXISTS trading_goals CASCADE;

CREATE TABLE trading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES trading_accounts(id) ON DELETE CASCADE,
  
  -- Goal information
  title text NOT NULL,
  description text,
  goal_type text NOT NULL,            -- 'daily_pnl', 'monthly_pnl', 'win_rate', 'trades_per_day'
  
  -- Goal target
  target_value numeric NOT NULL,
  period text NOT NULL,               -- 'daily', 'weekly', 'monthly'
  
  -- Progress tracking
  current_value numeric DEFAULT 0,
  progress_percentage numeric,
  
  -- Status
  status text DEFAULT 'active',       -- 'active', 'completed', 'failed'
  
  -- Timestamps
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_trading_goals_user_id ON trading_goals(user_id);
CREATE INDEX idx_trading_goals_account_id ON trading_goals(account_id);
CREATE INDEX idx_trading_goals_status ON trading_goals(status);

-- ============================================================================
-- TABLE RELATIONSHIPS SUMMARY
-- ============================================================================
--
-- auth.users (Supabase managed)
--   └── profiles (optional)
--   └── trading_accounts
--       ├── journals (main journal entries)
--       ├── trades (imported trades)
--       ├── copy_rules (copy trading)
--       ├── performance_metrics
--       ├── monthly_performance
--       ├── daily_performance
--       └── trading_goals
--   └── setups (user-defined setups)
--   └── symbols (favorite symbols)
--
-- ============================================================================

-- ============================================================================
-- VERIFY ALL TABLES WERE CREATED
-- ============================================================================
-- Run this query to confirm all tables exist:
/*
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
*/

-- Expected tables:
-- ✓ trading_accounts
-- ✓ trades
-- ✓ journals
-- ✓ setups
-- ✓ symbols
-- ✓ performance_metrics
-- ✓ monthly_performance
-- ✓ daily_performance
-- ✓ copy_rules
-- ✓ trading_goals
