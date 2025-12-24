import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { WorkTemplate } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdminWorkSchedule() {
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, WorkTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchSchedules();
  }, [selectedDate]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('work_templates')
        .select('*')
        .order('created_at');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('טעינת התבניות נכשלה');
    }
  };

  const fetchSchedules = async () => {
    try {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);

      const { data, error } = await supabase
        .from('work_schedules')
        .select(`
          date,
          template:template_id(
            id,
            name
          )
        `)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (error) throw error;

      const schedulesMap: Record<string, WorkTemplate> = {};
      data?.forEach(schedule => {
        if (schedule.template) {
          schedulesMap[format(new Date(schedule.date), 'yyyy-MM-dd')] = schedule.template;
        }
      });

      setSchedules(schedulesMap);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('טעינת לוח העבודה נכשל');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTemplate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      // First, get all stations for the selected template
      const { data: stations, error: stationsError } = await supabase
        .from('template_stations')
        .select(`
          *,
          customer:customer_id(
            id,
            service_points(
              id,
              scent_type,
              device_type,
              refill_amount
            )
          )
        `)
        .eq('template_id', selectedTemplate)
        .order('order');

      if (stationsError) throw stationsError;

      // Insert or update work schedule
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { error: scheduleError } = await supabase
        .from('work_schedules')
        .upsert({
          template_id: selectedTemplate,
          date: formattedDate
        });

      if (scheduleError) throw scheduleError;

      // Create jobs for each station with their scheduled times
      if (stations) {
        for (const station of stations) {
          if (station.customer?.id && station.customer.service_points) {
            const jobDate = new Date(selectedDate);
            
            // Parse the scheduled time and set it on the job date
            if (station.scheduled_time) {
              const [hours, minutes] = station.scheduled_time.split(':').map(Number);
              jobDate.setHours(hours, minutes, 0, 0);
            } else {
              // Default to 9:00 AM if no time is set
              jobDate.setHours(9, 0, 0, 0);
            }

            // Create the job
            const { data: newJob, error: jobError } = await supabase
              .from('jobs')
              .insert([{
                customer_id: station.customer.id,
                worker_id: station.worker_id,
                date: jobDate.toISOString(),
                status: 'pending'
              }])
              .select()
              .single();

            if (jobError) throw jobError;

            // Create job service points
            const jobServicePoints = station.customer.service_points.map(point => ({
              job_id: newJob.id,
              service_point_id: point.id,
              custom_refill_amount: point.refill_amount
            }));

            const { error: pointsError } = await supabase
              .from('job_service_points')
              .insert(jobServicePoints);

            if (pointsError) throw pointsError;
          }
        }
      }

      toast.success('התבנית הוקצתה בהצלחה עם השעות שנקבעו');
      setIsModalOpen(false);
      fetchSchedules();
    } catch (error) {
      console.error('Error assigning template:', error);
      toast.error('הקצאת התבנית נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTemplate = async (date: Date) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר את התבנית מיום זה? פעולה זו תמחק גם את כל המשימות הממתינות שנוצרו מתבנית זו.')) {
      return;
    }

    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Get the template_id for this date
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('work_schedules')
        .select('template_id')
        .eq('date', formattedDate)
        .single();

      if (scheduleError) throw scheduleError;

      if (!scheduleData?.template_id) {
        throw new Error('Template not found');
      }

      // Get all stations for this template
      const { data: stations, error: stationsError } = await supabase
        .from('template_stations')
        .select('customer_id, worker_id')
        .eq('template_id', scheduleData.template_id);

      if (stationsError) throw stationsError;

      // Start of day and end of day for the selected date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Delete pending jobs that match the template's stations for this date
      if (stations) {
        for (const station of stations) {
          // First get the job IDs to delete their service points
          const { data: jobsToDelete, error: jobsError } = await supabase
            .from('jobs')
            .select('id')
            .eq('status', 'pending')
            .eq('customer_id', station.customer_id)
            .eq('worker_id', station.worker_id)
            .gte('date', startOfDay.toISOString())
            .lte('date', endOfDay.toISOString());

          if (jobsError) throw jobsError;

          // Delete job service points first
          if (jobsToDelete && jobsToDelete.length > 0) {
            const jobIds = jobsToDelete.map(job => job.id);
            const { error: deletePointsError } = await supabase
              .from('job_service_points')
              .delete()
              .in('job_id', jobIds);

            if (deletePointsError) throw deletePointsError;
          }

          // Then delete the jobs
          const { error: deleteJobsError } = await supabase
            .from('jobs')
            .delete()
            .eq('status', 'pending')
            .eq('customer_id', station.customer_id)
            .eq('worker_id', station.worker_id)
            .gte('date', startOfDay.toISOString())
            .lte('date', endOfDay.toISOString());

          if (deleteJobsError) throw deleteJobsError;
        }
      }

      // Delete the schedule entry
      const { error: deleteError } = await supabase
        .from('work_schedules')
        .delete()
        .eq('date', formattedDate);

      if (deleteError) throw deleteError;

      toast.success('התבנית והמשימות הממתינות הוסרו בהצלחה');
      fetchSchedules();
    } catch (error) {
      console.error('Error removing template:', error);
      toast.error('הסרת התבנית נכשלה');
    }
  };

  const renderCalendar = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    
    // Get the start of the week for the first day of the month
    const calendarStart = startOfWeek(start, { weekStartsOn: 0 });
    // Get the end of the week for the last day of the month
    const calendarEnd = endOfWeek(end, { weekStartsOn: 0 });
    
    // Get all days in the calendar view
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Calendar header */}
        {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const template = schedules[dateKey];
          const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
          
          return (
            <div
              key={dateKey}
              className={`p-2 border border-gray-700 rounded-lg ${
                !isCurrentMonth ? 'opacity-50' : ''
              } ${
                isToday(day) ? 'bg-blue-900 bg-opacity-20' : 'bg-gray-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-400">
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && (
                  template ? (
                    <button
                      onClick={() => handleRemoveTemplate(day)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDate(day);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>
              {template && isCurrentMonth && (
                <div className="mt-1 text-sm text-white truncate">
                  {template.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">ניהול קווי עבודה</h1>
          <div className="flex items-center space-x-4">
            <select
              value={format(selectedDate, 'yyyy-MM')}
              onChange={(e) => setSelectedDate(new Date(e.target.value + '-01'))}
              className="rounded-md bg-gray-700 border-gray-600 text-white"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date(selectedDate.getFullYear(), i, 1);
                return (
                  <option key={i} value={format(date, 'yyyy-MM')}>
                    {format(date, 'MMMM yyyy', { locale: he })}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-white transition ease-in-out duration-150 cursor-not-allowed">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              טוען לוח עבודה...
            </div>
          </div>
        ) : (
          renderCalendar()
        )}
      </div>

      {/* Modal for assigning template */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              הקצאת תבנית עבודה
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-white">
                  {format(selectedDate, 'dd/MM/yyyy', { locale: he })}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">
                  בחר תבנית
                </label>
                <select
                  value={selectedTemplate || ''}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                >
                  <option value="">בחר תבנית</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedTemplate(null);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
                >
                  ביטול
                </button>
                <button
                  onClick={handleAssignTemplate}
                  disabled={!selectedTemplate || loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'מקצה...' : 'הקצה תבנית'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}