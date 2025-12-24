import React, { useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Job, ServicePoint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Calendar, X, Image, Camera, Check, Phone, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Compressor from 'compressorjs';

interface JobWithDetails extends Job {
  customer?: {
    name: string;
    address: string;
    phone: string;
  };
  one_time_customer?: {
    name: string;
    address: string;
    phone: string;
  };
  worker?: {
    name: string;
  };
}

interface ServicePointWithEditing extends ServicePoint {
  isEditing?: boolean;
}

interface ServicePointsModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

interface ExecutionModalProps {
  job: JobWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}

function ServicePointsModal({ customerId, customerName, onClose }: ServicePointsModalProps) {
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([]);
  const [jobServicePoints, setJobServicePoints] = useState<{
    service_point_id: string;
    custom_refill_amount: number | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchServicePoints();
  }, []);

  const fetchServicePoints = async () => {
    try {
      const { data, error } = await supabase
        .from('service_points')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at');

      if (error) throw error;
      setServicePoints(data || []);
      
      const { data: jobSPData, error: jobSPError } = await supabase
        .from('job_service_points')
        .select('service_point_id, custom_refill_amount')
        .in('service_point_id', (data || []).map(sp => sp.id));
        
      if (jobSPError) throw jobSPError;
      setJobServicePoints(jobSPData || []);
    } catch (error) {
      console.error('Error fetching service points:', error);
      toast.error('טעינת נקודות השירות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const getRefillAmount = (servicePointId: string, defaultAmount: number) => {
    const customAmount = jobServicePoints.find(jsp => jsp.service_point_id === servicePointId)?.custom_refill_amount;
    return customAmount !== null && customAmount !== undefined ? customAmount : defaultAmount;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            נקודות שירות - {customerName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : servicePoints.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            אין נקודות שירות
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicePoints.map((point) => (
              <div
                key={point.id}
                className="bg-gray-700 rounded-lg p-4 flex flex-col"
              >
                <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm self-start mb-3">
                  {point.device_type}
                </div>
                <div className="text-white text-lg mb-2">
                  {point.scent_type}
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  כמות למילוי: {getRefillAmount(point.id, point.refill_amount)}
                  {jobServicePoints.some(jsp => 
                    jsp.service_point_id === point.id && 
                    jsp.custom_refill_amount !== null && 
                    jsp.custom_refill_amount !== point.refill_amount
                  ) && (
                    <span className="text-blue-400 text-xs mr-2">(מותאם אישית)</span>
                  )}
                </div>
                {point.notes && (
                  <div className="text-gray-400 text-sm mt-2">
                    הערות: {point.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutionModal({ job, onClose, onSuccess }: ExecutionModalProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [servicePoints, setServicePoints] = useState<{
    id: string;
    device_type: string;
    scent_type: string;
    refill_amount: number;
    custom_refill_amount?: number | null;
    image_url?: string;
  }[]>([]);

  React.useEffect(() => {
    fetchServicePoints();
  }, []);

  const fetchServicePoints = async () => {
    try {
      const { data: jobServicePoints, error: jobServicePointsError } = await supabase
        .from('job_service_points')
        .select(`
          id,
          image_url,
          custom_refill_amount,
          service_point:service_point_id(
            id,
            device_type,
            scent_type,
            refill_amount
          )
        `)
        .eq('job_id', job.id);

      if (jobServicePointsError) throw jobServicePointsError;

      const points = jobServicePoints?.map(jsp => ({
        id: jsp.id,
        device_type: jsp.service_point.device_type,
        scent_type: jsp.service_point.scent_type,
        refill_amount: jsp.service_point.refill_amount,
        custom_refill_amount: jsp.custom_refill_amount,
        image_url: jsp.image_url
      })) || [];

      setServicePoints(points);
    } catch (error) {
      console.error('Error fetching service points:', error);
      toast.error('טעינת נקודות השירות נכשלה');
    }
  };

  const handleImageUpload = async (servicePointId: string, file: File) => {
    setUploading(servicePointId);
    try {
      new Compressor(file, {
        quality: 0.1,
        maxWidth: 800,
        maxHeight: 800,
        convertSize: 30720,
        success: async (compressedFile) => {
          if (compressedFile.size > 30720) {
            toast.error('התמונה גדולה מדי. אנא נסה תמונה קטנה יותר');
            setUploading(null);
            return;
          }

          const fileName = `job-${job.id}-${servicePointId}-${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('job-images')
            .upload(fileName, compressedFile);

          if (uploadError) throw uploadError;

          const { error: updateError } = await supabase
            .from('job_service_points')
            .update({ image_url: fileName })
            .eq('id', servicePointId);

          if (updateError) throw updateError;

          setServicePoints(prevPoints => 
            prevPoints.map(point => 
              point.id === servicePointId 
                ? { ...point, image_url: fileName } 
                : point
            )
          );

          toast.success('התמונה הועלתה בהצלחה');
        },
        error(err) {
          console.error(err);
          toast.error('דחיסת התמונה נכשלה');
        },
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('העלאת התמונה נכשלה');
    } finally {
      setUploading(null);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', job.id);

      if (jobError) throw jobError;

      toast.success('המשימה הושלמה בהצלחה');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error completing job:', error);
      toast.error('השלמת המשימה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const getRefillAmount = (point: typeof servicePoints[0]) => {
    return point.custom_refill_amount !== null && point.custom_refill_amount !== undefined 
      ? point.custom_refill_amount 
      : point.refill_amount;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {job.customer?.name || job.one_time_customer?.name}
            </h2>
            <p className="text-gray-400">{job.customer?.address || job.one_time_customer?.address}</p>
            <p className="text-gray-400 flex items-center mt-1">
              <Phone className="h-4 w-4 ml-1" />
              <span dir="ltr">{job.customer?.phone || job.one_time_customer?.phone}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicePoints.map((point) => (
            <div key={point.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex flex-col h-full">
                <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm self-start mb-3">
                  {point.device_type}
                </div>
                <div className="text-white text-lg mb-2">
                  {point.scent_type}
                </div>
                <div className="text-gray-400 text-sm mb-4">
                  כמות למילוי: {getRefillAmount(point)}
                  {point.custom_refill_amount !== null && point.custom_refill_amount !== undefined && point.custom_refill_amount !== point.refill_amount && (
                    <span className="text-blue-400 text-xs mr-2">(מותאם אישית)</span>
                  )}
                </div>
                
                <div className="mt-auto">
                  {point.image_url ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <a
                        href={`${supabase.storage.from('job-images').getPublicUrl(point.image_url).data.publicUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        צפה בתמונה
                      </a>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(point.id, file);
                        }}
                        disabled={uploading === point.id}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button
                        className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 ${
                          uploading === point.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={uploading === point.id}
                      >
                        <Camera className="h-4 w-4 ml-2" />
                        {uploading === point.id ? 'מעלה...' : 'העלה תמונה'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3 gap-4 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-3 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            ביטול
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className={`px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'מסיים משימה...' : 'סיים משימה'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminJobExecution() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customer_id(name, address, phone),
          one_time_customer:one_time_customer_id(name, address, phone),
          worker:worker_id(name)
        `);

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
    setSearchQuery('');
  };

  const hasActiveFilters = selectedDate || selectedStatus !== 'all' || searchQuery;

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      (job.worker?.name?.toLowerCase().includes(searchLower) || false) ||
      (job.customer?.name?.toLowerCase().includes(searchLower) || false) ||
      (job.one_time_customer?.name?.toLowerCase().includes(searchLower) || false)
    );
  });

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">ביצוע משימות</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex flex-col space-y-5 md:flex-row md:items-center md:space-y-0 md:gap-5">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="חיפוש לפי עובד או לקוח..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pr-10 py-3 px-4 rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
            </div>

            <div className="flex-shrink-0 w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'pending' | 'completed')}
                className="block w-full rounded-lg py-3 px-4 bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
                <option value="all">כל המשימות</option>
                <option value="pending">ממתינות</option>
                <option value="completed">הושלמו</option>
              </select>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto">
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
                  className="block w-full pr-10 py-3 px-4 rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center px-4 py-3 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
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
            {/* Mobile cards view */}
            <div className="sm:hidden space-y-4">
              {filteredJobs.length === 0 ? (
                <div className="text-center text-gray-400 py-8 bg-gray-800 rounded-xl">לא נמצאו משימות מתאימות לחיפוש</div>
              ) : (
                filteredJobs.map((job) => (
                  <div key={job.id} className="bg-gray-900 rounded-2xl shadow-lg p-4 flex flex-col gap-2 border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-400">{format(new Date(job.date), 'dd/MM/yyyy')}</span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>{getStatusText(job.status)}</span>
                    </div>
                    <div className="text-lg font-bold text-white mb-1 text-right">{job.customer?.name || job.one_time_customer?.name}</div>
                    <div className="flex flex-col gap-1 text-sm text-gray-300 text-right">
                      {job.customer?.address || job.one_time_customer?.address ? (
                        <div>{job.customer?.address || job.one_time_customer?.address}</div>
                      ) : null}
                      {job.customer?.phone || job.one_time_customer?.phone ? (
                        <div dir="ltr">{job.customer?.phone || job.one_time_customer?.phone}</div>
                      ) : null}
                      {job.worker?.name ? (
                        <div>{job.worker?.name}</div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-gradient-to-l from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 active:scale-95 transition-all duration-150 shadow font-bold text-white text-sm"
                    >
                      בצע משימה
                    </button>
                  </div>
                ))
              )}
            </div>
            {/* Desktop table view */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col hidden sm:block" style={{ height: 'calc(100vh - 180px)' }}>
              <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
                <div className="min-w-max">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32">תאריך</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-48">לקוח</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-64">כתובת</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-36">טלפון</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-48">עובד</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32">סטטוס</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32">פעולות</th>
                      </tr>
                    </thead>
                  </table>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="overflow-y-auto h-full" style={{ marginBottom: '-17px' }}>
                  <div className="overflow-x-auto pb-[17px]">
                    <div className="min-w-max">
                      <table className="w-full">
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                          {filteredJobs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                לא נמצאו משימות מתאימות לחיפוש
                              </td>
                            </tr>
                          ) : (
                            filteredJobs.map((job) => (
                              <tr key={job.id} className="hover:bg-gray-700">
                                <td className="px-4 py-4 text-sm text-white w-32">
                                  {format(new Date(job.date), 'dd/MM/yyyy')}
                                </td>
                                <td className="px-4 py-4 text-sm text-white w-48">
                                  {job.customer?.name || job.one_time_customer?.name}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300 w-64">
                                  {job.customer?.address || job.one_time_customer?.address}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300 w-36" dir="ltr">
                                  {job.customer?.phone || job.one_time_customer?.phone}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300 w-48">
                                  {job.worker?.name}
                                </td>
                                <td className="px-4 py-4 text-sm w-32">
                                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>
                                    {getStatusText(job.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm w-32">
                                  <button
                                    onClick={() => setSelectedJob(job)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-l from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 active:scale-95 transition-all duration-150 shadow font-bold text-white text-xs"
                                  >
                                    בצע משימה
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedJob && (
        <ExecutionModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onSuccess={fetchJobs}
        />
      )}
    </Layout>
  );
}

