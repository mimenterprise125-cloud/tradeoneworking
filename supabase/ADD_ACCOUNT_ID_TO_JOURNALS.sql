-- ============================================================================
-- MIGRATION: Add all missing columns to journals table
-- ============================================================================
-- This comprehensive migration adds every column required by the trading
-- journal schema that might be missing from existing databases.

-- Core trade fields
ALTER TABLE journals ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS symbol TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS entry_price NUMERIC;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS exit_price NUMERIC;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS entry_at TIMESTAMPTZ;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS exit_at TIMESTAMPTZ;

-- Session and setup information
ALTER TABLE journals ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS setup TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS setup_rating TEXT;

-- Execution and pricing
ALTER TABLE journals ADD COLUMN IF NOT EXISTS execution_type TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS stop_loss_price NUMERIC;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS target_price NUMERIC;

-- Points-based entries (user-entered points)
ALTER TABLE journals ADD COLUMN IF NOT EXISTS stop_loss_points NUMERIC;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS target_points NUMERIC;

-- Realized amounts and points
ALTER TABLE journals ADD COLUMN IF NOT EXISTS realized_points NUMERIC;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS realized_amount NUMERIC;

-- Account reference (optional)
ALTER TABLE journals ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES trading_accounts(id);

-- Trade quality and outcome
ALTER TABLE journals ADD COLUMN IF NOT EXISTS rule_followed BOOLEAN DEFAULT FALSE;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS confirmation BOOLEAN DEFAULT FALSE;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS loss_reason TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS win BOOLEAN;

-- Duration and notes
ALTER TABLE journals ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Screenshots and metadata
ALTER TABLE journals ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE journals ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Related trades
ALTER TABLE journals ADD COLUMN IF NOT EXISTS trade_id UUID REFERENCES trades(id);

-- Updated timestamp (separate from created_at)
ALTER TABLE journals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_journals_user_id ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_account_id ON journals(account_id);
CREATE INDEX IF NOT EXISTS idx_journals_created_at ON journals(created_at);
CREATE INDEX IF NOT EXISTS idx_journals_symbol ON journals(symbol);
CREATE INDEX IF NOT EXISTS idx_journals_result ON journals(result);
CREATE INDEX IF NOT EXISTS idx_journals_win ON journals(win);

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================
-- Run this query to check all columns were added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'journals'
-- ORDER BY ordinal_position;
