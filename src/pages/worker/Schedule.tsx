import React, { useState, useCallback, useRef, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Job, ServicePoint, DeviceType, BatteryType } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Calendar, Search, X, Image, Eye, Camera, Check, Phone, PenTool as Tool, Wrench, Battery, Leaf, SprayCan as Spray, Hash, Droplets } from 'lucide-react';
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
  order_number?: number;
  notes?: string;
}

type JobTypeTag = 'scent' | 'installation' | 'special';

interface UnifiedJob {
  id: string;
  customer_id: string;
  date: string;
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
  order_number?: number;
  notes?: string;
  type: JobTypeTag;
}

interface ServicePointWithEditing extends ServicePoint {
  isEditing?: boolean;
}

interface ScentSummary {
  [scentType: string]: number;
}

interface EquipmentSummary {
  devices: Record<DeviceType, number>;
  batteries: Record<BatteryType, number>;
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
      <div className="bg-gray-800 rounded-lg w-full max-w-lg mx-auto flex flex-col max-h-[90vh] shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 rounded-t-lg z-10">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            נקודות שירות - {customerName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : servicePoints.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              אין נקודות שירות
            </div>
          ) : (
            <div className="space-y-3">
              {servicePoints.map((point) => (
                <div
                  key={point.id}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm self-start inline-block mb-3">
                    {point.device_type}
                  </div>
                  <div className="text-white text-lg mb-2">
                    {point.scent_type}
                  </div>
                  <div className="text-gray-400 text-sm">
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
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl flex flex-col max-h-[90vh] shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {job.customer?.name || job.one_time_customer?.name}
            </h2>
            <p className="text-gray-400">{job.customer?.address || job.one_time_customer?.address}</p>
            <p className="text-gray-400 flex items-center mt-1">
              <Phone className="h-4 w-4 ml-1" />
              <a
                dir="ltr"
                href={`tel:${job.customer?.phone || job.one_time_customer?.phone || ''}`}
                className="hover:text-gray-300"
              >
                {job.customer?.phone || job.one_time_customer?.phone}
              </a>
            </p>
            {job.order_number && (
              <div className="flex items-center mt-2 text-blue-400">
                <Hash className="h-4 w-4 ml-1" />
                <span>משימה מספר {job.order_number}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
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
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 gap-4 sticky bottom-0 bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-3 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 w-full sm:w-auto"
          >
            ביטול
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className={`px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white w-full sm:w-auto ${
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

type JobFilter = 'all' | 'scent' | 'installation' | 'special';

export default function WorkerSchedule() {
  const [jobs, setJobs] = useState<UnifiedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [jobFilter, setJobFilter] = useState<JobFilter>('all');
  const [viewingServicePoints, setViewingServicePoints] = useState<{
    customerId: string;
    customerName: string;
  } | null>(null);
  const [executingJob, setExecutingJob] = useState<JobWithDetails | null>(null);
  const [scentSummary, setScentSummary] = useState<ScentSummary>({});
  const [loadingScentSummary, setLoadingScentSummary] = useState(true);
  const [equipmentSummary, setEquipmentSummary] = useState<EquipmentSummary>({
    devices: {} as Record<DeviceType, number>,
    batteries: {} as Record<BatteryType, number>
  });

  const selectedDateRef = useRef<Date>(selectedDate);
  const regularJobsMapRef = useRef<Record<string, JobWithDetails>>({});

  let jobsFetchRunId = 0;

  const fetchJobs = async () => {
    const runId = ++jobsFetchRunId;
    setLoading(true);
    try {
      if (!selectedDate) return;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user?.id) return;
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      // Fetch regular jobs
      const { data: regularJobs, error: regularJobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customer_id(name, address, phone),
          one_time_customer:one_time_customer_id(name, address, phone)
        `)
        .eq('worker_id', user.id)
        .eq('status', 'pending')
        .gte('date', startOfDay.toISOString())
        .lte('date', endOfDay.toISOString())
        .order('order_number', { ascending: true })
        .order('date');
      if (regularJobsError) throw regularJobsError;
      // Fetch installation jobs
      const { data: installationJobs, error: installationJobsError } = await supabase
        .from('installation_jobs')
        .select(`
          *,
          customer:customer_id(name, address, phone),
          one_time_customer:one_time_customer_id(name, address, phone),
          devices:installation_devices(device_type)
        `)
        .eq('worker_id', user.id)
        .eq('status', 'pending')
        .gte('date', startOfDay.toISOString())
        .lte('date', endOfDay.toISOString())
        .order('order_number', { ascending: true })
        .order('date');
      if (installationJobsError) throw installationJobsError;
      // Fetch special jobs
      const { data: specialJobs, error: specialJobsError } = await supabase
        .from('special_jobs')
        .select(`
          *,
          customer:customer_id(name, address, phone),
          one_time_customer:one_time_customer_id(name, address, phone)
        `)
        .eq('worker_id', user.id)
        .eq('status', 'pending')
        .gte('date', startOfDay.toISOString())
        .lte('date', endOfDay.toISOString())
        .order('order_number', { ascending: true })
        .order('date');
      if (specialJobsError) throw specialJobsError;
      if (runId !== jobsFetchRunId) return; // ביטול אם זו לא הריצה האחרונה
      // Build regular jobs map for execution
      const regMap: Record<string, JobWithDetails> = {};
      (regularJobs || []).forEach((r: any) => {
        regMap[r.id] = r as JobWithDetails;
      });
      regularJobsMapRef.current = regMap;
      // Build unified jobs with type tags
      const unified: UnifiedJob[] = [
        ...(regularJobs || []).map((j: any) => ({
          id: j.id,
          customer_id: j.customer_id,
          date: j.date,
          customer: j.customer,
          one_time_customer: j.one_time_customer,
          order_number: j.order_number,
          notes: j.notes,
          type: 'scent' as JobTypeTag,
        })),
        ...(installationJobs || []).map((j: any) => ({
          id: j.id,
          customer_id: j.customer_id,
          date: j.date,
          customer: j.customer,
          one_time_customer: j.one_time_customer,
          order_number: j.order_number,
          notes: j.notes,
          type: 'installation' as JobTypeTag,
        })),
        ...(specialJobs || []).map((j: any) => ({
          id: j.id,
          customer_id: j.customer_id,
          date: j.date,
          customer: j.customer,
          one_time_customer: j.one_time_customer,
          order_number: j.order_number,
          notes: j.notes,
          type: 'special' as JobTypeTag,
        })),
      ];
      setJobs(unified);
      // Calculate equipment summary
      const newEquipmentSummary: EquipmentSummary = {
        devices: {} as Record<DeviceType, number>,
        batteries: {} as Record<BatteryType, number>
      };
      installationJobs?.forEach((job: any) => {
        job.devices?.forEach((device: any) => {
          const deviceType = device.device_type as DeviceType;
          newEquipmentSummary.devices[deviceType] = (newEquipmentSummary.devices[deviceType] || 0) + 1;
        });
      });
      specialJobs?.forEach((job: any) => {
        if (job.job_type === 'batteries' && job.battery_type) {
          const batteryType = job.battery_type as BatteryType;
          newEquipmentSummary.batteries[batteryType] = (newEquipmentSummary.batteries[batteryType] || 0) + 1;
        }
      });
      if (runId !== jobsFetchRunId) return;
      setEquipmentSummary(newEquipmentSummary);
      // After fetching jobs, calculate scent summary
      await calculateScentSummary(
        (regularJobs || []).filter(job =>
          new Date(job.date).toDateString() === selectedDate.toDateString()
        ),
        selectedDate
      );
    } catch (error) {
      if (runId !== jobsFetchRunId) return;
      console.error('Error fetching jobs:', error);
      toast.error('טעינת המשימות נכשלה');
    } finally {
      if (runId === jobsFetchRunId) setLoading(false);
    }
  };

  const calculateScentSummary = async (jobsList: JobWithDetails[], dateForValidation: Date) => {
    setLoadingScentSummary(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user?.id) return;
      if (selectedDateRef.current.toDateString() !== dateForValidation.toDateString()) {
        console.warn("מבטל חישוב scentSummary כי התאריך השתנה באמצע");
        return;
      }
      const allSameWorker = jobsList.every(job => job.worker_id === user.id);
      if (!allSameWorker && jobsList.length > 0) {
        console.warn('⚠️ calculateScentSummary קיבל משימות של עובדים שונים!', jobsList.map(j => j.worker_id));
        return;
      }
      const allSameDay = jobsList.every(job => {
        const d = new Date(job.date);
        return d.toDateString() === dateForValidation.toDateString();
      });
      if (!allSameDay && jobsList.length > 0) {
        console.warn('⚠️ calculateScentSummary קיבל משימות מתאריכים שונים!', jobsList.map(j => j.date));
        return;
      }
      const summary: ScentSummary = {};
      for (const job of jobsList) {
        const { data: jobServicePoints, error: jobServicePointsError } = await supabase
          .from('job_service_points')
          .select(`
            custom_refill_amount,
            service_point:service_point_id(
              scent_type,
              refill_amount
            )
          `)
          .eq('job_id', job.id);
        if (jobServicePointsError) throw jobServicePointsError;
        jobServicePoints?.forEach((jsp: any) => {
          const scentType = jsp.service_point.scent_type;
          const refillAmount = jsp.custom_refill_amount !== null && jsp.custom_refill_amount !== undefined
            ? jsp.custom_refill_amount
            : jsp.service_point.refill_amount;
          if (scentType && refillAmount) {
            summary[scentType] = (summary[scentType] || 0) + refillAmount;
          }
        });
      }
      if (selectedDateRef.current.toDateString() !== dateForValidation.toDateString()) {
        console.warn("מבטל עדכון scentSummary כי התאריך השתנה בסוף החישוב");
        return;
      }
      setScentSummary(summary);
    } catch (error) {
      console.error('Error calculating scent summary:', error);
      toast.error('חישוב כמויות השמן נכשל');
    } finally {
      setLoadingScentSummary(false);
    }
  };

  useEffect(() => {
    selectedDateRef.current = selectedDate;
    fetchJobs();
  }, [selectedDate]);

  const sortedJobs = [...jobs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const filteredJobs = sortedJobs.filter(job => {
    if (jobFilter === 'all') return true;
    return job.type === jobFilter;
  });

  return (
    <Layout userRole="worker">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">לוח זמנים</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-4">
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
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : new Date())}
                className="block w-full pr-10 rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Job Type Filters */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setJobFilter('all')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
              jobFilter === 'all'
                ? 'bg-gray-700 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            הכל
            {jobFilter === 'all' && (
              <span className="mr-2 bg-gray-600 text-white text-xs px-2 py-0.5 rounded-full">
                {sortedJobs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setJobFilter('scent')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
              jobFilter === 'scent'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-blue-600/20 hover:text-blue-300'
            }`}
          >
            <Spray className="h-4 w-4 ml-2" />
            משימות ריח
            {jobFilter === 'scent' && (
              <span className="mr-2 bg-blue-700 text-white text-xs px-2 py-0.5 rounded-full">
                {sortedJobs.filter(j => j.type === 'scent').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setJobFilter('installation')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
              jobFilter === 'installation'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-purple-600/20 hover:text-purple-300'
            }`}
          >
            <Tool className="h-4 w-4 ml-2" />
            משימות התקנה
            {jobFilter === 'installation' && (
              <span className="mr-2 bg-purple-700 text-white text-xs px-2 py-0.5 rounded-full">
                {sortedJobs.filter(j => j.type === 'installation').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setJobFilter('special')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
              jobFilter === 'special'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-amber-600/20 hover:text-amber-300'
            }`}
          >
            <Wrench className="h-4 w-4 ml-2" />
            משימות מיוחדות
            {jobFilter === 'special' && (
              <span className="mr-2 bg-amber-700 text-white text-xs px-2 py-0.5 rounded-full">
                {sortedJobs.filter(j => j.type === 'special').length}
              </span>
            )}
          </button>
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
            {/* Jobs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.length === 0 ? (
                <div className="col-span-full text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-400">
                    {sortedJobs.length === 0 ? 'אין משימות ליום זה' : 'אין משימות מסוג זה'}
                  </p>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div key={job.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0">
                          <div className="text-gray-400 text-sm mb-1">
                            {format(new Date(job.date), 'HH:mm')}
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-white whitespace-normal break-words">
                            {job.customer?.name || job.one_time_customer?.name}
                          </h3>
                          {job.type === 'scent' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-900/40 text-blue-300 border border-blue-800">
                                <Spray className="h-3 w-3 ml-1" />
                                משימת ריח
                              </span>
                            </div>
                          )}
                          {job.type === 'installation' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-900/40 text-purple-300 border border-purple-800">
                                <Tool className="h-3 w-3 ml-1" />
                                משימת התקנה
                              </span>
                            </div>
                          )}
                          {job.type === 'special' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-900/40 text-amber-300 border border-amber-800">
                                <Wrench className="h-3 w-3 ml-1" />
                                משימה מיוחדת
                              </span>
                            </div>
                          )}
                          <div className="text-gray-400 text-sm mt-1">
                            {job.customer?.address || job.one_time_customer?.address}
                          </div>
                          <div className="text-gray-400 text-sm mt-1 flex items-center">
                            <Phone className="h-4 w-4 ml-1" />
                            <a
                              dir="ltr"
                              href={`tel:${job.customer?.phone || job.one_time_customer?.phone || ''}`}
                              className="hover:text-gray-300"
                            >
                              {job.customer?.phone || job.one_time_customer?.phone}
                            </a>
                          </div>
                          {job.order_number && (
                            <div className="flex items-center mt-2 text-blue-400">
                              <Hash className="h-4 w-4 ml-1" />
                              <span>משימה מספר {job.order_number}</span>
                            </div>
                          )}
                          {job.notes && (
                            <div className="mt-2 text-gray-400 text-sm whitespace-pre-line break-words">
                              <div className="font-medium text-gray-300">הערות:</div>
                              {job.notes}
                            </div>
                          )}
                        </div>
                        <div />
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-gray-700">
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => setViewingServicePoints({
                              customerId: job.customer_id,
                              customerName: job.customer?.name || job.one_time_customer?.name || ''
                            })}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-600 rounded-md text-sm font-medium text-blue-300 hover:text-blue-200 hover:border-gray-500"
                            title="הצג נקודות שירות"
                          >
                            <Eye className="h-4 w-4 ml-2" />
                            נקודות שירות
                          </button>
                          {job.type === 'scent' && (
                            <button
                              onClick={() => {
                                const reg = regularJobsMapRef.current[job.id];
                                if (reg) setExecutingJob(reg);
                                else toast.error('לא נמצאו פרטי משימה לביצוע');
                              }}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <Camera className="h-4 w-4 ml-2" />
                              ביצוע משימה
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Equipment Summary Section */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center mb-4">
                <Droplets className="h-5 w-5 text-blue-400 ml-2" />
                <h2 className="text-lg font-semibold text-white">כמויות שמן נדרשות</h2>
              </div>
              
              {loadingScentSummary ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-white transition-all">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    מחשב כמויות...
                  </div>
                </div>
              ) : Object.keys(scentSummary).length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  אין שמנים נדרשים להיום
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.entries(scentSummary).map(([scentType, amount]) => (
                    <div key={scentType} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
                      <div className="text-white font-medium mb-2">{scentType}</div>
                      
                      <div className="text-blue-300 text-lg">
                        {amount >= 1000 ? `${(amount / 1000).toFixed(1)}   ליטר` : `${amount}  מ"ל`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Installation Equipment Summary */}
            {Object.keys(equipmentSummary.devices).length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center mb-4">
                  <Tool className="h-5 w-5 text-purple-400 ml-2" />
                  <h2 className="text-lg font-semibold text-white">ציוד להתקנות</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.entries(equipmentSummary.devices).map(([deviceType, count]) => (
                    <div key={deviceType} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
                      <div className="text-white font-medium mb-2">{deviceType}</div>
                      <div className="text-purple-300 text-lg">{count} יחידות</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batteries Summary */}
            {Object.keys(equipmentSummary.batteries).length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center mb-4">
                  <Battery className="h-5 w-5 text-green-400 ml-2" />
                  <h2 className="text-lg font-semibold text-white">סוללות נדרשות</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.entries(equipmentSummary.batteries).map(([batteryType, count]) => (
                    <div key={batteryType} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
                      <div className="text-white font-medium mb-2">סוללות {batteryType}</div>
                      <div className="text-green-300 text-lg">{count} יחידות</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {viewingServicePoints && (
        <ServicePointsModal
          customerId={viewingServicePoints.customerId}
          customerName={viewingServicePoints.customerName}
          onClose={() => setViewingServicePoints(null)}
        />
      )}

      {executingJob && (
        <ExecutionModal
          job={executingJob}
          onClose={() => setExecutingJob(null)}
          onSuccess={fetchJobs}
        />
      )}
    </Layout>
  );
}