import React, { useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Job, ServicePoint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Calendar, X, Image, Eye, Edit, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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

type CombinedJob = (JobWithDetails & { jobType: 'scent' });

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

interface NewJobModalProps {
  onClose: () => void;
  onSuccess: () => void;
  job?: JobWithDetails;
  isEditing?: boolean;
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
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
                <div className="bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-sm self-start mb-3">
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
                    <span className="text-gray-400 text-xs mr-2">(מותאם אישית)</span>
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

function NewJobModal({ job, isEditing, onClose, onSuccess }: NewJobModalProps) {
  const [workers, setWorkers] = React.useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    date: job ? format(new Date(job.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    worker_id: job?.worker_id || '',
    status: job?.status || 'pending',
    notes: job?.notes || '',
  });

  React.useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name')
          .eq('role', 'worker')
          .order('name');
        if (error) throw error;
        setWorkers(data || []);
      } catch (err) {
        console.error('Error fetching workers:', err);
        toast.error('טעינת העובדים נכשלה');
      }
    };
    fetchWorkers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          date: new Date(form.date).toISOString(),
          worker_id: form.worker_id,
          status: form.status as 'pending' | 'completed',
          notes: form.notes || null,
        })
        .eq('id', job.id);

      if (error) throw error;
      toast.success('המשימה עודכנה בהצלחה');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating job:', err);
      toast.error('עדכון המשימה נכשל');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full shadow-xl border border-gray-700 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {isEditing ? 'עריכת משימת ריח' : 'משימה חדשה'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-2">תאריך</label>
              <input
                type="date"
                readOnly
                inputMode="none"
                onKeyDown={(e) => e.preventDefault()}
                onMouseDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLInputElement).showPicker?.(); }}
                onTouchStart={(e) => { e.preventDefault(); (e.currentTarget as HTMLInputElement).showPicker?.(); }}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                onFocus={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-2">עובד</label>
              <select
                value={form.worker_id}
                onChange={(e) => setForm((f) => ({ ...f, worker_id: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
              >
                <option value="" disabled>בחר עובד</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-2">סטטוס</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'pending' | 'completed' }))}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
              >
                <option value="pending">ממתין</option>
                <option value="completed">הושלם</option>
              </select>
            </div>

            <div className="form-group sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">הערות</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="הזן הערות (אופציונלי)"
                rows={6}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4 resize-y min-h-[120px] max-h-80 overflow-y-auto"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CombinedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const datePickerRef = React.useRef<HTMLInputElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<JobImage | null>(null);
  const [viewingServicePoints, setViewingServicePoints] = useState<{
    customerId: string;
    customerName: string;
  } | null>(null);
  const [editingJob, setEditingJob] = useState<JobWithDetails | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      
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

      const combined: CombinedJob[] = (data || []).map((j) => ({
        ...(j as JobWithDetails),
        jobType: 'scent' as const,
      }));

      setJobs(combined);
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
  
  const groupedByDate = React.useMemo(() => {
    const groups = new Map<string, CombinedJob[]>();
    for (const job of filteredJobs) {
      const key = format(new Date(job.date), 'yyyy-MM-dd');
      const list = groups.get(key) || [];
      list.push(job);
      groups.set(key, list);
    }
    // Sort groups by date descending
    return Array.from(groups.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [filteredJobs]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      return;
    }

    try {
      // First delete all job service points
      const { error: servicePointsError } = await supabase
        .from('job_service_points')
        .delete()
        .eq('job_id', jobId);

      if (servicePointsError) throw servicePointsError;

      // Then delete the job
      const { error: jobError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (jobError) throw jobError;

      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      toast.success('המשימה נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('מחיקת המשימה נכשלה');
    }
  };

  const handleDeleteAny = async (job: CombinedJob) => {
    await handleDeleteJob(job.id);
  };

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

  const handleViewImageFromPath = (imagePath: string, jobId: string) => {
    const publicUrl = supabase.storage.from('job-images').getPublicUrl(imagePath).data.publicUrl;
    setSelectedImage({
      jobId,
      url: publicUrl,
      index: 0,
      total: 1,
    });
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

  const renderJobTypeText = (job: CombinedJob) => {
    return 'ריח';
  };
  
  const handleEditJob = (job: CombinedJob) => {
    setEditingJob(job as JobWithDetails);
  };

  const renderJobCard = (job: CombinedJob) => (
    <div key={`${job.jobType}-${job.id}`} className="group relative bg-gradient-to-br from-gray-900/70 to-gray-950/70 backdrop-blur-xl rounded-2xl p-5 border border-gray-800/60 mb-4 hover:border-gray-700 hover:shadow-2xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent rounded-2xl pointer-events-none"></div>
      
      <div className="relative flex justify-between items-start mb-4">
        <div className="text-lg font-semibold text-white">
          {job.customer?.name || job.one_time_customer?.name}
        </div>
        <span className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
          {getStatusText(job.status)}
        </span>
      </div>
      
      <div className="relative space-y-2.5 mb-4">
        <p className="text-sm flex items-center gap-2">
          <span className="text-gray-500 min-w-[60px]">תאריך:</span>
          <span className="text-gray-300">{format(new Date(job.date), 'dd/MM/yyyy')}</span>
        </p>
        <p className="text-sm flex items-center gap-2">
          <span className="text-gray-500 min-w-[60px]">כתובת:</span>
          <span className="text-gray-300">{job.customer?.address || job.one_time_customer?.address}</span>
        </p>
        <p className="text-sm flex items-center gap-2">
          <span className="text-gray-500 min-w-[60px]">עובד:</span>
          <span className="text-gray-300">{job.worker?.name}</span>
        </p>
        <p className="text-sm flex items-center gap-2">
          <span className="text-gray-500 min-w-[60px]">סוג:</span>
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20">
            {renderJobTypeText(job)}
          </span>
        </p>
      </div>
      
      <div className="relative flex flex-wrap gap-2 pt-4 border-t border-gray-800/50">
        <button
          onClick={() => handleEditJob(job)}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 text-sm"
        >
          ערוך
        </button>
        <button
          onClick={() =>
            setViewingServicePoints({
              customerId: job.customer_id!,
              customerName: job.customer?.name || job.one_time_customer?.name || '',
            })
          }
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 text-sm"
        >
          נקודות שירות
        </button>
        {job.status === 'completed' && (
          <button
            onClick={() => handleViewImage(job.id)}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 text-sm"
          >
            תמונות
          </button>
        )}
        <button onClick={() => handleDeleteAny(job)} className="flex-1 px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-all duration-200 text-sm">
          מחק
        </button>
      </div>
    </div>
  );
  
  const renderDayTable = (dateKey: string, dayJobs: CombinedJob[]) => (
    <div key={dateKey} className="relative bg-gradient-to-br from-gray-900/70 to-gray-950/70 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none"></div>
      <div className="px-5 py-3 bg-gradient-to-b from-gray-950/90 to-gray-900/90 backdrop-blur-sm border-b border-gray-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-white font-semibold">
            {format(new Date(dateKey), 'dd/MM/yyyy')}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-700/60 text-gray-200 border border-gray-600/60">
              סה״כ {dayJobs.length}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              ממתינות {dayJobs.filter(j => j.status === 'pending').length}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              הושלמו {dayJobs.filter(j => j.status === 'completed').length}
            </span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[700px] w-full divide-y divide-gray-800/50">
          <thead className="bg-gradient-to-b from-gray-950/90 to-gray-900/90 backdrop-blur-sm sticky top-0 z-10">
            <tr>
              <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide max-w-[110px]">תאריך</th>
              <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide max-w-[160px]">לקוח</th>
              <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell max-w-[220px]">כתובת</th>
              <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell max-w-[120px]">עובד</th>
              <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide max-w-[120px]">סוג</th>
              <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide max-w-[90px]">סטטוס</th>
              <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide max-w-[120px]">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {dayJobs.map((job) => (
              <tr key={`${job.jobType}-${job.id}`} className="group hover:bg-gradient-to-l hover:from-gray-800/40 hover:to-transparent transition-all duration-200">
                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">{format(new Date(job.date), 'dd/MM/yyyy')}</td>
                <td className="px-5 py-4 text-sm text-white font-semibold max-w-[160px] truncate">{job.customer?.name || job.one_time_customer?.name}</td>
                <td className="px-5 py-4 text-sm text-gray-400 hidden sm:table-cell max-w-[220px] truncate">{job.customer?.address || job.one_time_customer?.address}</td>
                <td className="px-5 py-4 text-sm text-gray-400 hidden md:table-cell max-w-[120px] truncate">{job.worker?.name}</td>
                <td className="px-5 py-4 text-sm text-gray-400 max-w-[120px] truncate">{renderJobTypeText(job)}</td>
                <td className="px-5 py-4 text-sm">
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {getStatusText(job.status)}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <button onClick={() => handleEditJob(job)} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110" title="ערוך משימה"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => setViewingServicePoints({customerId: (job as JobWithDetails).customer_id!,customerName: job.customer?.name || job.one_time_customer?.name || ''})} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110" title="הצג נקודות שירות"><Eye className="h-4 w-4" /></button>
                    {job.status === 'completed' && (<button onClick={() => handleViewImage(job.id)} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110" title="הצג תמונות"><Image className="h-4 w-4" /></button>)}
                    <button onClick={() => handleDeleteAny(job)} className="p-2 rounded-lg bg-gray-800/60 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110" title="מחק משימה">מחק</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Layout userRole="admin">
      <div className="space-y-8">
        {/* Header with gradient text and modern buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              ניהול משימות ריח
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">צפייה וניהול כל משימות הריח במערכת</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/job-execution')}
              className="group px-5 py-2.5 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 text-gray-100 hover:shadow-xl hover:shadow-gray-900/30 hover:scale-[1.02] transition-all duration-300"
            >
              ביצוע משימה
            </button>
            <button
              onClick={() => navigate('/admin/add-jobs')}
              className="group px-5 py-2.5 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 text-gray-100 hover:shadow-xl hover:shadow-gray-900/30 hover:scale-[1.02] transition-all duration-300"
            >
              הוסף משימה
            </button>
          </div>
        </div>

        {/* Modern filter panel with glass morphism */}
        <div className="relative bg-gradient-to-br from-gray-900/70 to-gray-950/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/60 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl pointer-events-none"></div>
          <div className="relative flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:gap-4">
            {/* Search Input */}
            <div className="relative flex-grow group">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500 group-focus-within:text-gray-400 transition-colors duration-200" />
              </div>
              <input
                type="text"
                placeholder="חיפוש לפי עובד או לקוח..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pr-11 py-3 px-4 rounded-xl bg-gray-950/60 border border-gray-800/60 text-white placeholder-gray-500 hover:bg-gray-950/80 focus:bg-gray-950 focus:border-gray-700 focus:ring-2 focus:ring-gray-700/40 transition-all duration-200"
              />
            </div>

            {/* Filters */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'pending' | 'completed')}
                className="block w-full rounded-xl py-3 px-4 bg-gray-950/60 border border-gray-800/60 text-white hover:bg-gray-950/80 focus:bg-gray-950 focus:border-gray-700 focus:ring-2 focus:ring-gray-700/40 transition-all duration-200 cursor-pointer"
              >
                <option value="all">כל המשימות</option>
                <option value="pending">ממתינות</option>
                <option value="completed">הושלמו</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex-shrink-0 w-full md:w-auto group">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-500 group-focus-within:text-gray-400 transition-colors duration-200" />
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
                  className="block w-full pr-11 py-3 px-4 rounded-xl bg-gray-950/60 border border-gray-800/60 text-white hover:bg-gray-950/80 focus:bg-gray-950 focus:border-gray-700 focus:ring-2 focus:ring-gray-700/40 transition-all duration-200 text-right"
                >
                  בחירת תאריך
                </button>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center px-4 py-3 border border-gray-800/60 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-900/40 hover:border-gray-700 transition-all duration-200"
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
              {groupedByDate.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-400">לא נמצאו משימות מתאימות לחיפוש</p>
                </div>
              ) : (
                groupedByDate.map(([dateKey, dayJobs]) => (
                  <div key={dateKey} className="mb-6">
                    <div className="px-1 py-2">
                      <div className="text-sm font-semibold text-gray-200">
                        {format(new Date(dateKey), 'dd/MM/yyyy')}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-200 border border-gray-600/60">
                          סה״כ {dayJobs.length}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          ממתינות {dayJobs.filter(j => j.status === 'pending').length}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          הושלמו {dayJobs.filter(j => j.status === 'completed').length}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          ריח {dayJobs.length}
                        </span>
                      </div>
                    </div>
                    {dayJobs.map(job => renderJobCard(job))}
                  </div>
                ))
              )}
            </div>
            
            {/* Desktop view - Modern table with enhanced design */}
            <div className="hidden sm:block">
              {groupedByDate.length === 0 ? (
                <div className="relative bg-gradient-to-br from-gray-900/70 to-gray-950/70 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl">
                  <div className="px-5 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-12 w-12 text-gray-600 mb-2" />
                      <p className="text-lg font-medium">לא נמצאו משימות מתאימות</p>
                    </div>
                  </div>
                </div>
              ) : (
                groupedByDate.map(([dateKey, dayJobs]) => renderDayTable(dateKey, dayJobs))
              )}
            </div>
          </>
        )}
      </div>

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
                  className="mr-2 hover:text-gray-300"
                >
                  הבא
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {viewingServicePoints && (
        <ServicePointsModal
          customerId={viewingServicePoints.customerId}
          customerName={viewingServicePoints.customerName}
          onClose={() => setViewingServicePoints(null)}
        />
      )}

      {editingJob && (
        <NewJobModal
          job={editingJob}
          isEditing={true}
          onClose={() => setEditingJob(null)}
          onSuccess={fetchJobs}
        />
      )}
    </Layout>
  );
}