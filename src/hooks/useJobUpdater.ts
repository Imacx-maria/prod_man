import { Dispatch, SetStateAction } from 'react';
import { createBrowserClient } from '@/utils/supabase';

export interface Job {
  id: string;
  [key: string]: any;
}

/**
 * Returns an async function to update a job in Supabase and update local state.
 * Usage: const updateJob = useJobUpdater(setJobs);
 *        await updateJob(jobId, { field: value });
 */
export function useJobUpdater<T extends Job>(setJobs: Dispatch<SetStateAction<T[]>>) {
  return async (jobId: string, fields: Partial<T>): Promise<void> => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('folhas_obras')
      .update(fields)
      .eq('id', jobId)
      .select('*');
    if (!error && data && data[0]) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...data[0] } : j));
    }
    // Optionally, handle errors here (e.g., return error or throw)
  };
} 