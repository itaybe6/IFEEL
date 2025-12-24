import React, { useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { DEVICE_TYPES, DeviceType, SPECIAL_JOB_TYPES, BATTERY_TYPES, BatteryType, SpecialJobType } from '../../types/database';
import { Calendar, Search, X, PenTool as Tool, Edit, Trash2, Wrench, Battery, Leaf, SprayCan as Spray, Eye, Image, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface InstallationJobWithDetails {
  id: string;
  customer_id: string;
  worker_id: string;
  date: string;
  status: 'pending' | 'completed';
  notes?: string;
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
  devices?: {
    id: string;
    device_type: string;
    notes?: string;
    image_url?: string;
  }[];
}

interface SpecialJobWithDetails {
  id: string;
  customer_id: string;
  worker_id: string;
  job_type: SpecialJobType;
  date: string;
  status: 'pending' | 'completed';
  notes?: string;
  battery_type?: string;
  image_url?: string;
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

type JobType = 'all' | 'installation' | 'special';

interface JobDetailsModalProps {
  job: InstallationJobWithDetails | (SpecialJobWithDetails & { jobType: 'special' });
  onClose: () => void;
}

interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
}

function ImageViewerModal({ imageUrl, onClose }: ImageViewerModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={imageUrl}
          alt="Job completion"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
}

const getSpecialJobIcon = (type: SpecialJobType) => {
  switch (type) {
    case 'scent_spread':
      return <Spray className="h-5 w-5 text-blue-400" />;
    case 'plants':
      return <Leaf className="h-5 w-5 text-green-400" />;
    case 'batteries':
      return <Battery className="h-5 w-5 text-yellow-400" />;
    case 'repairs':
      return <Wrench className="h-5 w-5 text-purple-400" />;
  }
};

function JobDetailsModal({ job, onClose }: JobDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
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
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Job Info */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">תאריך:</span>
                <span className="text-white mr-2">{format(new Date(job.date), 'dd/MM/yyyy')}</span>
              </div>
              <div>
                <span className="text-gray-400">עובד:</span>
                <span className="text-white mr-2">{job.worker?.name}</span>
              </div>
              <div>
                <span className="text-gray-400">סטטוס:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full mr-2 ${job.status === 'completed' ? 'bg-green-900/30 text-green-200' : 'bg-yellow-900/30 text-yellow-200'}`}>
                  {job.status === 'completed' ? 'הושלם' : 'ממתין'}
                </span>
              </div>
            </div>
          </div>

          {/* Job Type Specific Details */}
          {'jobType' in job && job.jobType === 'special' ? (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <span className="mr-2">{SPECIAL_JOB_TYPES[job.job_type]}</span>
              </h3>
              {job.job_type === 'batteries' && job.battery_type && (
                <div className="mb-2">
                  <span className="text-gray-400">סוג סוללה:</span>
                  <span className="text-white mr-2">{job.battery_type}</span>
                </div>
              )}
              {job.notes && (
                <div>
                  <span className="text-gray-400">הערות:</span>
                  <p className="text-white mt-1">{job.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-4">מכשירים להתקנה</h3>
              <div className="space-y-3">
                {(job as InstallationJobWithDetails).devices?.map((device, index) => (
                  <div key={device.id} className="bg-gray-600 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-blue-300">{device.device_type}</span>
                        {device.notes && (
                          <p className="text-gray-300 text-sm mt-1">{device.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminInstallationJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<(InstallationJobWithDetails | SpecialJobWithDetails)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedJobType, setSelectedJobType] = useState<JobType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<InstallationJobWithDetails | (SpecialJobWithDetails & { jobType: 'special' }) | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      let installationJobsQuery = supabase
        .from('installation_jobs')
        .select(`
          *,
          customer:customer_id(name, address, phone),
          one_time_customer:one_time_customer_id(name, address, phone),
          worker:worker_id(name),
          devices:installation_devices(id, device_type, notes, image_url)
        `);

      let specialJobsQuery = supabase
        .from('special_jobs')
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

        installationJobsQuery = installationJobsQuery
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString());

        specialJobsQuery = specialJobsQuery
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString());
      }

      if (selectedStatus !== 'all') {
        installationJobsQuery = installationJobsQuery.eq('status', selectedStatus);
        specialJobsQuery = specialJobsQuery.eq('status', selectedStatus);
      }

      const [installationData, specialData] = await Promise.all([
        selectedJobType === 'all' || selectedJobType === 'installation' ? installationJobsQuery : Promise.resolve({ data: [] }),
        selectedJobType === 'all' || selectedJobType === 'special' ? specialJobsQuery : Promise.resolve({ data: [] })
      ]);

      setJobs([
        ...(installationData.data || []),
        ...(specialData.data || []).map(job => ({ ...job, jobType: 'special' as const }))
      ]);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('טעינת המשימות נכשלה');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedStatus, selectedJobType]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDeleteJob = async (job: InstallationJobWithDetails | SpecialJobWithDetails) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      return;
    }

    try {
      const table = 'jobType' in job ? 'special_jobs' : 'installation_jobs';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', job.id);

      if (error) throw error;

      toast.success('המשימה נמחקה בהצלחה');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('מחיקת המשימה נכשלה');
    }
  };

  const handleViewImage = (imageUrl: string) => {
    const publicUrl = supabase.storage
      .from('job-images')
      .getPublicUrl(imageUrl)
      .data.publicUrl;
    setViewingImage(publicUrl);
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

  const getStatusStyle = (status: string) => {
    return status === 'completed' ? 'bg-green-900/30 text-green-200' : 'bg-yellow-900/30 text-yellow-200';
  };

  const getStatusText = (status: string) => {
    return status === 'completed' ? 'הושלם' : 'ממתין';
  };

  const renderActions = (job: any) => (
    <div className="flex space-x-2 items-center gap-2">
      <button
        onClick={() => setSelectedJob(job)}
        className="text-gray-400 hover:text-gray-300"
        title="הצג פרטים"
      >
        <Eye className="h-5 w-5" />
      </button>

      {job.status === 'completed' && (
        <>
          {'job_type' in job && job.image_url && (
            <button
              onClick={() => handleViewImage(job.image_url)}
              className="text-blue-400 hover:text-blue-300"
              title="הצג תמונה"
            >
              <Image className="h-5 w-5" />
            </button>
          )}
          {'devices' in job && job.devices?.some(d => d.image_url) && (
            <button
              onClick={() => handleViewImage(job.devices[0].image_url)}
              className="text-blue-400 hover:text-blue-300"
              title="הצג תמונה"
            >
              <Image className="h-5 w-5" />
            </button>
          )}
        </>
      )}
  
      <button
        onClick={() => handleDeleteJob(job)}
        className="text-red-400 hover:text-red-300"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );

  const renderJobCard = (job: any) => {
    return (
      <div key={`${job.jobType}-${job.id}`} className="bg-gray-800 rounded-lg p-5 border border-gray-700 mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-medium text-white">
              {job.customer?.name || job.one_time_customer?.name}
            </h3>
            <div className="text-gray-400 text-sm mt-1">
              {job.customer?.address || job.one_time_customer?.address}
            </div>
            <div className="text-gray-400 text-sm mt-1 flex items-center">
              <Phone className="h-4 w-4 ml-1" />
              <span dir="ltr">{job.customer?.phone || job.one_time_customer?.phone}</span>
            </div>
          </div>
          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>
            {getStatusText(job.status)}
          </span>
        </div>

        <div className="flex items-center mt-2">
          {'job_type' in job ? (
            <>
              {getSpecialJobIcon(job.job_type)}
              <span className="text-gray-300 mr-2">{SPECIAL_JOB_TYPES[job.job_type]}</span>
            </>
          ) : (
            <>
              <Tool className="h-5 w-5 text-purple-400" />
              <span className="text-gray-300 mr-2">התקנת מכשיר</span>
            </>
          )}
        </div>
        
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-300">
            <span className="text-gray-400">תאריך:</span> {format(new Date(job.date), 'dd/MM/yyyy')}
          </p>
          <p className="text-sm text-gray-300">
            <span className="text-gray-400">כתובת:</span> {job.customer?.address || job.one_time_customer?.address}
          </p>
          <p className="text-sm text-gray-300">
            <span className="text-gray-400">עובד:</span> {job.worker?.name}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-700">
          {renderActions(job)}
        </div>
      </div>
    );
  };

  const renderTableRow = (job: any) => (
    <tr key={`${job.jobType}-${job.id}`} className="hover:bg-gray-700">
      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
        {format(new Date(job.date), 'dd/MM/yyyy')}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
        {job.customer?.name || job.one_time_customer?.name}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 hidden sm:table-cell">
        {job.customer?.address || job.one_time_customer?.address}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">
        {job.worker?.name}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center">
          {'job_type' in job ? (
            <>
              {getSpecialJobIcon(job.job_type)}
              <span className="text-gray-300 mr-2">{SPECIAL_JOB_TYPES[job.job_type]}</span>
            </>
          ) : (
            <>
              <Tool className="h-5 w-5 text-purple-400" />
              <span className="text-gray-300 mr-2">התקנת מכשיר</span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusStyle(job.status)}`}>
          {getStatusText(job.status)}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        {renderActions(job)}
      </td>
    </tr>
  );

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Tool className="h-6 w-6 text-blue-400 ml-2" />
            <h1 className="text-2xl font-bold text-white">ניהול משימות התקנה ומיוחדות</h1>
          </div>
        </div>

        <div className="bg-gray-850 rounded-lg p-5 border border-gray-800">
          <div className="flex flex-col space-y-5 md:flex-row md:items-center md:space-y-0 md:gap-5">
            {/* Search Input */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="חיפוש לפי עובד או לקוח..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pr-10 py-3 px-4 rounded-lg bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-gray-600 focus:ring focus:ring-gray-600 focus:ring-opacity-50"
              />
            </div>

            {/* Job Type Filter */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <select
                value={selectedJobType}
                onChange={(e) => setSelectedJobType(e.target.value as JobType)}
                className="block w-full rounded-lg py-3 px-4 bg-gray-800 border-gray-700 text-white shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-600 focus:ring-opacity-50"
              >
                <option value="all">כל סוגי המשימות</option>
                <option value="installation">משימות התקנה</option>
                <option value="special">משימות מיוחדות</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'pending' | 'completed')}
                className="block w-full rounded-lg py-3 px-4 bg-gray-800 border-gray-700 text-white shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-600 focus:ring-opacity-50"
              >
                <option value="all">כל המשימות</option>
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
                  className="block w-full pr-10 py-3 px-4 rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-600 focus:ring-opacity-50"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
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
            {/* Mobile view - cards */}
            <div className="sm:hidden">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-400">לא נמצאו משימות מתאימות לחיפוש</p>
                </div>
              ) : (
                filteredJobs.map(job => renderJobCard(job))
              )}
            </div>
            
            {/* Desktop view - table */}
            <div className="hidden sm:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">תאריך</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">לקוח</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">כתובת</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">עובד</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">סוג משימה</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">סטטוס</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          לא נמצאו משימות מתאימות לחיפוש
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map(job => renderTableRow(job))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {viewingImage && (
        <ImageViewerModal
          imageUrl={viewingImage}
          onClose={() => setViewingImage(null)}
        />
      )}
    </Layout>
  );
}