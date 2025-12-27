import React, { useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Job } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Calendar, X, Phone, SprayCan as Spray, Hash, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface JobWithDetails extends Job {
  customer?: {
    name: string;
    address: string;
    phone: string;
  };
  worker?: {
    name: string;
  };
  order_number?: number | null;
}

interface TimeEditModalProps {
  job: JobWithDetails;
  onClose: () => void;
  onSave: () => void;
}

function TimeEditModal({ job, onClose, onSave }: TimeEditModalProps) {
  const [time, setTime] = useState(format(new Date(job.date), 'HH:mm'));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(job.date);
      newDate.setHours(hours, minutes);

      const { error } = await supabase
        .from('jobs')
        .update({ date: newDate.toISOString() })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('זמן המשימה עודכן בהצלחה');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating job time:', error);
      toast.error('עדכון זמן המשימה נכשל');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">עריכת זמן משימה</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {job.customer?.name}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                step="60"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDailySchedule() {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [editingJob, setEditingJob] = useState<JobWithDetails | null>(null);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'worker')
        .order('name');

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast.error('טעינת העובדים נכשלה');
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch regular jobs with proper ordering
      let regularJobsQuery = supabase
        .from('jobs')
        .select(`
          *,
          customer:customer_id(name, address, phone),
          worker:worker_id(name)
        `)
        .gte('date', startOfDay.toISOString())
        .lte('date', endOfDay.toISOString());

      if (selectedWorker !== 'all') {
        regularJobsQuery = regularJobsQuery.eq('worker_id', selectedWorker);
      }

      // First order by order_number (nulls last), then by date
      regularJobsQuery = regularJobsQuery
        .order('order_number', { ascending: true, nullsLast: true })
        .order('date', { ascending: true });

      const regularData = await regularJobsQuery;

      if (regularData.error) throw regularData.error;

      // Sort the data arrays manually to ensure correct ordering
      const sortByOrderNumber = (a: any, b: any) => {
        // If both have order numbers, compare them
        if (a.order_number !== null && b.order_number !== null) {
          return a.order_number - b.order_number;
        }
        // If only one has order number, it comes first
        if (a.order_number !== null) return -1;
        if (b.order_number !== null) return 1;
        // If neither has order number, sort by date
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      };

      const sortedRegularJobs = (regularData.data || []).sort(sortByOrderNumber);

      setJobs(sortedRegularJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('טעינת המשימות נכשלה');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedWorker]);

  React.useEffect(() => {
    fetchWorkers();
  }, []);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const getStatusStyle = (status: string) => {
    return status === 'completed' 
      ? 'bg-green-900/30 text-green-200'
      : 'bg-yellow-900/30 text-yellow-200';
  };

  const getStatusText = (status: string) => {
    return status === 'completed' ? 'הושלם' : 'ממתין';
  };

  const renderJobNumber = (orderNumber: number | null | undefined) => {
    if (orderNumber === null || orderNumber === undefined) return null;
    
    return (
      <div className="flex items-center mt-2 text-blue-400">
        <Hash className="h-4 w-4 ml-1" />
        <span>משימה מספר {orderNumber}</span>
      </div>
    );
  };

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">לוז יומי</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex flex-col space-y-5 md:flex-row md:items-center md:space-y-0 md:gap-5">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : new Date())}
                  className="block w-full pr-10 rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <div className="inline-flex items-center gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => setSelectedWorker('all')}
                  aria-selected={selectedWorker === 'all'}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedWorker === 'all'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-650'
                  }`}
                >
                  כל העובדים
                </button>
                {workers.map((worker) => (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => setSelectedWorker(worker.id)}
                    aria-selected={selectedWorker === worker.id}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedWorker === worker.id
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-650'
                    }`}
                  >
                    {worker.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-white transition ease-in-out duration-150 cursor-not-allowed">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              טוען משימות...
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Regular Jobs */}
            {jobs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Spray className="h-5 w-5 text-blue-400 ml-2" />
                  משימות ריח
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-white">{job.customer?.name}</h3>
                          <div className="text-gray-400 text-sm mt-1">{job.customer?.address}</div>
                          <div className="text-gray-400 text-sm mt-1 flex items-center">
                            <Phone className="h-4 w-4 ml-1" />
                            <span dir="ltr">{job.customer?.phone}</span>
                          </div>
                          {renderJobNumber(job.order_number)}
                        </div>
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>
                          {getStatusText(job.status)}
                        </span>
                      </div>
                      <div className="text-blue-400 text-sm">{job.worker?.name}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-gray-400 text-sm flex items-center">
                          <Clock className="h-4 w-4 ml-1" />
                          {format(new Date(job.date), 'HH:mm')}
                        </div>
                        <button
                          onClick={() => setEditingJob(job)}
                          className="text-blue-400 hover:text-blue-300 flex items-center"
                        >
                          ערוך שעה
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {jobs.length === 0 && (
              <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400">אין משימות ליום זה</p>
              </div>
            )}
          </div>
        )}
      </div>

      {editingJob && (
        <TimeEditModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSave={fetchJobs}
        />
      )}
    </Layout>
  );
}