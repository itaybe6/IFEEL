import React, { useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Job } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Calendar, X, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface JobWithDetails extends Job {
  worker?: {
    name: string;
  };
}

interface JobImage {
  jobId: string;
  url: string;
  index: number;
  total: number;
}

export default function CustomerServices() {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedImage, setSelectedImage] = useState<JobImage | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user?.id) {
        return;
      }

      let query = supabase
        .from('jobs')
        .select(`
          *,
          worker:worker_id(name)
        `)
        .eq('customer_id', user.id);

      if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString());
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('טעינת המשימות נכשלה');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedStatus]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const getStatusText = (status: string) => {
    return status === 'completed' ? 'הושלם' : 'ממתין';
  };

  const getStatusStyle = (status: string) => {
    return status === 'completed' 
      ? 'bg-green-900 text-green-200'
      : 'bg-yellow-900 text-yellow-200';
  };

  const clearFilters = () => {
    setSelectedDate(null);
    setSelectedStatus('all');
  };

  const hasActiveFilters = selectedDate || selectedStatus !== 'all';

  const handleViewImage = async (jobId: string) => {
    try {
      const { data: jobServicePoints, error } = await supabase
        .from('job_service_points')
        .select('image_url')
        .eq('job_id', jobId)
        .order('created_at');

      if (error) throw error;

      const images = jobServicePoints
        ?.filter(point => point.image_url)
        .map(point => point.image_url)
        .filter((url): url is string => url !== null);

      if (images && images.length > 0) {
        const imageUrl = supabase.storage
          .from('job-images')
          .getPublicUrl(images[0])
          .data.publicUrl;

        setSelectedImage({
          jobId,
          url: imageUrl,
          index: 0,
          total: images.length
        });
      }
    } catch (error) {
      console.error('Error fetching image:', error);
      toast.error('טעינת התמונה נכשלה');
    }
  };

  const handleNextImage = async (jobId: string, currentIndex: number) => {
    try {
      const { data: jobServicePoints, error } = await supabase
        .from('job_service_points')
        .select('image_url')
        .eq('job_id', jobId)
        .order('created_at');

      if (error) throw error;

      const images = jobServicePoints
        ?.filter(point => point.image_url)
        .map(point => point.image_url)
        .filter((url): url is string => url !== null);

      if (images && images.length > 0) {
        const nextIndex = (currentIndex + 1) % images.length;
        const imageUrl = supabase.storage
          .from('job-images')
          .getPublicUrl(images[nextIndex])
          .data.publicUrl;

        setSelectedImage({
          jobId,
          url: imageUrl,
          index: nextIndex,
          total: images.length
        });
      }
    } catch (error) {
      console.error('Error fetching next image:', error);
      toast.error('טעינת התמונה נכשלה');
    }
  };

  // Function to render job card for mobile view
  const renderJobCard = (job: JobWithDetails) => (
    <div key={job.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="text-sm text-gray-400">
          {format(new Date(job.date), 'dd/MM/yyyy')}
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>
          {getStatusText(job.status)}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="text-gray-300">
          <span className="text-gray-400">עובד: </span>
          {job.worker?.name}
        </div>
        
        {job.status === 'completed' && (
          <div className="flex justify-end">
            <button
              onClick={() => handleViewImage(job.id)}
              className="text-blue-400 hover:text-blue-300 flex items-center"
            >
              <Image className="h-5 w-5 ml-1" />
              צפה בתמונות
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout userRole="customer">
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          <h1 className="text-2xl font-bold text-white">השירותים שלי</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            {/* Status Filter */}
            <div className="flex-shrink-0">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'pending' | 'completed')}
                className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
                <option value="all">כל המשימות</option>
                <option value="pending">ממתינות</option>
                <option value="completed">הושלמו</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  readOnly
                  inputMode="none"
                  onKeyDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLInputElement).showPicker?.(); }}
                  onTouchStart={(e) => { e.preventDefault(); (e.currentTarget as HTMLInputElement).showPicker?.(); }}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                  className="block w-full pr-10 rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4 ml-2" />
                נקה סינון
              </button>
            )}
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
          <>
            {/* Mobile view - cards */}
            <div className="sm:hidden">
              {jobs.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-400">לא נמצאו משימות מתאימות לחיפוש</p>
                </div>
              ) : (
                jobs.map(job => renderJobCard(job))
              )}
            </div>
            
            {/* Desktop view - table */}
            <div className="hidden sm:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">תאריך</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">עובד</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">סטטוס</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">תמונות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                          לא נמצאו משימות מתאימות לחיפוש
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-700">
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-white">
                            {format(new Date(job.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-300">
                            {job.worker?.name}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>
                              {getStatusText(job.status)}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            {job.status === 'completed' && (
                              <button
                                onClick={() => handleViewImage(job.id)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Image className="h-5 w-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={selectedImage.url}
              alt="Job completion"
              className="max-w-[800px] max-h-[600px] object-contain rounded-lg"
            />
            {selectedImage.total > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-4 py-2 rounded-full text-white text-sm">
                תמונה {selectedImage.index + 1} מתוך {selectedImage.total}
                <button
                  onClick={() => handleNextImage(selectedImage.jobId, selectedImage.index)}
                  className="mr-2 hover:text-blue-300"
                >
                  הבא
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}