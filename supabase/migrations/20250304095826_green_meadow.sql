-- Create support_tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  description text NOT NULL,
  is_new boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'support_tickets' AND rowsecurity = true
  ) THEN
    ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policy if it exists and create a new one
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all operations on support_tickets" ON support_tickets;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_tickets' AND policyname = 'Allow all operations on support_tickets'
  ) THEN
    CREATE POLICY "Allow all operations on support_tickets"
      ON support_tickets
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_support_tickets_created_at'
  ) THEN
    CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_support_tickets_is_new'
  ) THEN
    CREATE INDEX idx_support_tickets_is_new ON support_tickets(is_new);
  END IF;
END $$;