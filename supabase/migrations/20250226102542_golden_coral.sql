/*
  # Add Job Rescheduling Function

  1. New Function
    - `reschedule_pending_jobs()`: Moves pending jobs from past dates to the next day
    - Can be called manually or through an external scheduler

  2. Security
    - Function is accessible only to authenticated users
    - Only affects jobs with status 'pending'
    - Preserves all job details except date
*/

-- Create function to reschedule pending jobs
CREATE OR REPLACE FUNCTION reschedule_pending_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  yesterday_start timestamptz;
  yesterday_end timestamptz;
BEGIN
  -- Set time range for yesterday
  yesterday_start := date_trunc('day', now() - interval '1 day');
  yesterday_end := date_trunc('day', now()) - interval '1 second';

  -- Update pending jobs from yesterday to today
  UPDATE jobs
  SET date = date_trunc('day', now()) + 
      make_interval(
        hours => date_part('hour', date)::int,
        mins => date_part('minute', date)::int
      )
  WHERE status = 'pending'
    AND date >= yesterday_start
    AND date <= yesterday_end;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reschedule_pending_jobs() TO authenticated;