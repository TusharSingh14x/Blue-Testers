-- Add missing columns to resources table
-- These columns are needed for resource approval workflow

-- Add approved_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resources' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE resources 
    ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add approved_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resources' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE resources 
    ADD COLUMN approved_at TIMESTAMP;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resources' AND column_name = 'status'
  ) THEN
    ALTER TABLE resources 
    ADD COLUMN status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Verify the columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'resources'
  AND column_name IN ('approved_by', 'approved_at', 'status')
ORDER BY column_name;

