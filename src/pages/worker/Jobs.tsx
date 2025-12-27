import React, { useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Job, ServicePoint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Calendar, X, Image, Eye, Phone, SprayCan as Spray, Camera, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
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

interface JobImage {
  jobId: string;
  url: string;
  index: number;
  total: number;
}

interface ServicePointsModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

export default function WorkerJobs() {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const datePickerRef = React.useRef<HTMLInputElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedImage, setSelectedImage] = useState<JobImage | null>(null);
  const [viewingServicePoints, setViewingServicePoints] = useState<{
    customerId: string;
    customerName: string;
  } | null>(null);
  const [executingRegularJob, setExecutingRegularJob] = useState<JobWithDetails | null>(null);

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
          customer:customer_id(name, address, phone)
        `)
        .eq('worker_id', user.id);

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

  // Group jobs by date for better readability
  const groupedJobs = React.useMemo(() => {
    const groups: { key: string; timestamp: number; items: JobWithDetails[] }[] = [];
    const map: Record<string, number> = {};
    for (const job of jobs) {
      const key = format(new Date(job.date), 'dd/MM/yyyy');
      if (map[key] === undefined) {
        map[key] = groups.length;
        groups.push({
          key,
          timestamp: new Date(new Date(job.date).toDateString()).getTime(),
          items: [job]
        });
      } else {
        groups[map[key]].items.push(job);
      }
    }
    // sort groups by date desc, and items by time desc within each group
    groups.sort((a, b) => b.timestamp - a.timestamp);
    groups.forEach(g => g.items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return groups;
  }, [jobs]);

  return (
    <Layout userRole="worker">
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          <h1 className="text-2xl font-bold text-white">המשימות שלי</h1>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 sm:p-5 border border-gray-700/50">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:gap-4">
            {/* Status Filter */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'pending' | 'completed')}
                className="block w-full rounded-lg bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-2.5 px-4"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="pending">ממתינות</option>
                <option value="completed">הושלמו</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => datePickerRef.current?.showPicker?.()}
                  className="block w-full pr-10 py-2.5 px-4 rounded-lg bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-right"
                >
                  בחירת תאריך
                </button>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-600/50 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors w-full md:w-auto"
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
            {/* Desktop Table View - Hidden on small screens */}
            <div className="hidden sm:block">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400">שעה</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400">לקוח</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400">כתובת</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400">טלפון</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-400">סטטוס</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-400">פעולות</th>
                    </tr>
                    </thead>
                    <tbody>
                    {groupedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-12 text-center text-gray-400">
                          לא נמצאו משימות מתאימות לחיפוש
                        </td>
                      </tr>
                    ) : (
                      groupedJobs.map(group => (
                        <React.Fragment key={group.key}>
                          <tr className="bg-gray-900/40">
                            <td colSpan={6} className="px-3 py-2.5 text-xs font-semibold text-blue-400">
                              {group.key}
                            </td>
                          </tr>
                          {group.items.map((job) => (
                            <tr key={job.id} className="border-b border-gray-800/50 hover:bg-gray-700/30 transition-colors">
                              <td className="px-3 py-3 text-sm text-white font-medium">
                                {format(new Date(job.date), 'HH:mm')}
                              </td>
                              <td className="px-3 py-3 text-sm text-white">
                                {job.customer?.name || job.one_time_customer?.name}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-400">
                                {job.customer?.address || job.one_time_customer?.address}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-400" dir="ltr">
                                {job.customer?.phone || job.one_time_customer?.phone}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                                  job.status === 'completed' 
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {getStatusText(job.status)}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  {job.customer_id && (
                                    <button
                                      onClick={() => setViewingServicePoints({
                                        customerId: job.customer_id!,
                                        customerName: job.customer?.name || ''
                                      })}
                                      className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                      title="הצג נקודות שירות"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  )}
                                  {job.status === 'completed' && (
                                    <button
                                      onClick={() => handleViewImage(job.id)}
                                      className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                                      title="הצג תמונות"
                                    >
                                      <Image className="h-4 w-4" />
                                    </button>
                                  )}
                                  {job.status === 'pending' && (
                                    <button
                                      onClick={() => setExecutingRegularJob(job)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500/90 hover:bg-blue-500 rounded-lg transition-all"
                                      title="ביצוע משימה"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                      ביצוע
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mobile Job Cards - Visible only on small screens */}
            <div className="sm:hidden space-y-4">
              {groupedJobs.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-400">לא נמצאו משימות מתאימות לחיפוש</p>
                </div>
              ) : (
                groupedJobs.map(group => (
                  <div key={group.key} className="space-y-3">
                    <div className="text-sm text-blue-300 font-semibold px-1">{group.key}</div>
                    {group.items.map(job => (
                      <div key={job.id} className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-lg font-medium text-white">{job.customer?.name || job.one_time_customer?.name}</div>
                          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>
                            {getStatusText(job.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 mb-3">{job.customer?.address || job.one_time_customer?.address}</div>
                        <div className="text-sm text-gray-300 mb-3 flex items-center">
                          <Phone className="h-4 w-4 ml-1" />
                          <span dir="ltr">{job.customer?.phone || job.one_time_customer?.phone}</span>
                        </div>
                        <div className="text-sm text-gray-400 mb-4">
                          {format(new Date(job.date), 'HH:mm')}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                          {job.customer_id && (
                            <button
                              onClick={() => setViewingServicePoints({
                                customerId: job.customer_id!,
                                customerName: job.customer?.name || ''
                              })}
                              className="flex items-center text-blue-400 hover:text-blue-300"
                            >
                              <Eye className="h-5 w-5 ml-1" />
                              נקודות שירות
                            </button>
                          )}
                          <div className="flex items-center gap-3">
                            {job.status === 'completed' && (
                              <button
                                onClick={() => handleViewImage(job.id)}
                                className="flex items-center text-blue-400 hover:text-blue-300"
                              >
                                <Image className="h-5 w-5 ml-1" />
                                תמונות
                              </button>
                            )}
                            {job.status === 'pending' && (
                              <button
                                onClick={() => setExecutingRegularJob(job)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <Camera className="h-4 w-4 ml-2" />
                                ביצוע משימה
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={selectedImage.url}
              alt="Job completion"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
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

      {/* Service Points Modal */}
      {viewingServicePoints && (
        <ServicePointsModal
          customerId={viewingServicePoints.customerId}
          customerName={viewingServicePoints.customerName}
          onClose={() => setViewingServicePoints(null)}
        />
      )}
      
      {executingRegularJob && (
        <RegularExecutionModal
          job={executingRegularJob}
          onClose={() => setExecutingRegularJob(null)}
          onSuccess={fetchJobs}
        />
      )}
    </Layout>
  );
}

interface RegularExecutionModalProps {
  job: JobWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}

function RegularExecutionModal({ job, onClose, onSuccess }: RegularExecutionModalProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const points = jobServicePoints?.map((jsp: any) => ({
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl w-full max-w-4xl flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl border border-gray-700/50">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                {job.customer?.name || job.one_time_customer?.name}
              </h2>
              <div className="flex flex-col gap-1 text-sm text-gray-400">
                <p>{job.customer?.address || job.one_time_customer?.address}</p>
                <p className="flex items-center" dir="ltr">
                  <Phone className="h-3.5 w-3.5 ml-1" />
                  {job.customer?.phone || job.one_time_customer?.phone}
                </p>
                {'order_number' in job && job.order_number && (
                  <p className="flex items-center text-blue-400">
                    <Hash className="h-3.5 w-3.5 ml-1" />
                    <span>משימה #{job.order_number}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {servicePoints.map((point, index) => (
              <div key={point.id} className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-4 border border-gray-600/30 hover:border-blue-500/30 transition-all">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-500/20">
                      {point.device_type}
                    </span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  
                  <div className="text-white text-base sm:text-lg font-medium mb-2">
                    {point.scent_type}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-400 mb-4">
                    <span className="font-medium ml-1">כמות:</span>
                    <span className="text-white font-semibold">{getRefillAmount(point)}</span>
                    {point.custom_refill_amount !== null && point.custom_refill_amount !== undefined && point.custom_refill_amount !== point.refill_amount && (
                      <span className="mr-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        מותאם
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-3 border-t border-gray-600/30">
                    {point.image_url ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-500/10 rounded-lg border border-green-500/20">
                          <span className="text-green-400 text-lg">✓</span>
                        </div>
                        <a
                          href={`${supabase.storage.from('job-images').getPublicUrl(point.image_url).data.publicUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          צפה בתמונה
                        </a>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(point.id, file);
                          }}
                          disabled={uploading === point.id}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button
                          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            uploading === point.id 
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                              : 'bg-blue-500/90 hover:bg-blue-500 text-white'
                          }`}
                          disabled={uploading === point.id}
                        >
                          <Camera className="h-4 w-4" />
                          {uploading === point.id ? 'מעלה...' : 'העלה תמונה'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm sticky bottom-0 rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-all"
            >
              ביטול
            </button>
            <button
              onClick={handleComplete}
              disabled={loading}
              className={`px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loading 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-500/90 hover:bg-green-500 text-white'
              }`}
            >
              {loading ? 'מסיים משימה...' : 'סיים משימה'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}