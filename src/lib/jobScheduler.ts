import { supabase } from './supabase';
import { format, addDays, isAfter, startOfDay } from 'date-fns';

/**
 * Updates the dates of pending jobs that have passed their scheduled date
 * to the next day while preserving the time.
 */
export async function updatePastDueJobs(): Promise<{ success: boolean; message: string; updatedCount?: number }> {
  try {
    // Get current date at start of day (midnight)
    const today = startOfDay(new Date());
    
    // Find all pending jobs with dates before today
    const { data: pastDueJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, date')
      .eq('status', 'pending')
      .lt('date', today.toISOString());
    
    if (fetchError) {
      console.error('Error fetching past due jobs:', fetchError);
      return { success: false, message: 'Failed to fetch past due jobs' };
    }
    
    if (!pastDueJobs || pastDueJobs.length === 0) {
      return { success: true, message: 'No past due jobs to update', updatedCount: 0 };
    }
    
    // Update each job's date to the next day while preserving time
    const updates = pastDueJobs.map(job => {
      const jobDate = new Date(job.date);
      const newDate = new Date();
      
      // Set the time from the original job date
      newDate.setHours(jobDate.getHours());
      newDate.setMinutes(jobDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      
      // If the new time has already passed today, move to tomorrow
      if (isAfter(new Date(), newDate)) {
        newDate.setDate(newDate.getDate() + 1);
      }
      
      return {
        id: job.id,
        date: newDate.toISOString()
      };
    });
    
    let successfulUpdates = 0;
    
    // Perform batch update with error handling for each job
    for (const update of updates) {
      try {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ date: update.date })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`Error updating job ${update.id}:`, updateError);
        } else {
          successfulUpdates++;
        }
      } catch (error) {
        console.error(`Error updating job ${update.id}:`, error);
      }
    }
    
    return { 
      success: true, 
      message: `Updated ${successfulUpdates} past due jobs to new dates`, 
      updatedCount: successfulUpdates 
    };
  } catch (error) {
    console.error('Error in updatePastDueJobs:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred while updating past due jobs'
    };
  }
}

/**
 * Schedules a job to run at 22:00 every day to update past due jobs
 */
let schedulerInitialized = false;
let schedulerTimer: NodeJS.Timeout | null = null;

export function initJobScheduler() {
  if (schedulerInitialized) return;
  
  // Calculate time until next 22:00
  const scheduleNextRun = () => {
    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(22, 0, 0, 0);
    
    // If it's already past 22:00, schedule for tomorrow
    if (now.getHours() >= 22) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const timeUntilTarget = targetTime.getTime() - now.getTime();
    
  
    
    // Set timeout for the next run
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
    }
    
    schedulerTimer = setTimeout(() => {
      updatePastDueJobs()
        .then(result => {
          // Schedule the next run
          scheduleNextRun();
        })
        .catch(error => {
          // Even if there's an error, schedule the next run
          scheduleNextRun();
        });
    }, timeUntilTarget);
  };
  
  // Start the scheduler
  scheduleNextRun();
  schedulerInitialized = true;
  
  // Also run immediately if it's between 22:00 and 23:59
  const now = new Date();
  if (now.getHours() >= 22) {
    updatePastDueJobs().then(result => {
    });
  }
}

// Function to manually trigger the job scheduler (for testing)
function triggerJobScheduler() {
  return updatePastDueJobs();
}