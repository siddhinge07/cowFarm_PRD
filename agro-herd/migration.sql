-- Run this in your Supabase SQL Editor to support the new Smart Alert cycle actions.

-- Drop the existing constraint (if it exists)
ALTER TABLE estrus_cycles DROP CONSTRAINT IF EXISTS estrus_cycles_cycle_status_check;

-- Add the new updated constraint with all allowed actions
ALTER TABLE estrus_cycles ADD CONSTRAINT estrus_cycles_cycle_status_check 
CHECK (cycle_status IN (
  'pending', 
  'observed', 
  'missed', 
  'confirmed_pregnancy',
  'failed',
  'pregnancy_attempt',
  'given_medicine',
  'pregnant'
));

-- Informational message
SELECT 'Migration completed successfully!' as result;
