import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { WorkTemplate, TemplateStation, User } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { UserPlus, UserMinus, GripVertical, Search, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

interface TemplateWithStationCount extends WorkTemplate {
  station_count: number;
}

interface TemplateStationWithTime extends TemplateStation {
  scheduled_time?: string;
}

// Helper to format time as HH:MM
function formatTimeHHMM(time: string | undefined): string {
  if (!time) return '09:00';
  const [h, m] = time.split(':');
  const hour = h && h.length === 1 ? '0' + h : h;
  const minute = m && m.length === 1 ? '0' + m : m;
  return `${hour || '09'}:${minute || '00'}`;
}

export default function AdminWorkTemplates() {
  const [templates, setTemplates] = useState<TemplateWithStationCount[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [stations, setStations] = useState<TemplateStationWithTime[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState<{ [stationId: string]: string }>({});
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<{ [stationId: string]: boolean }>({});
  const [editingTime, setEditingTime] = useState<{ [stationId: string]: string }>({});
  const [timeError, setTimeError] = useState<{ [stationId: string]: string }>({});

  useEffect(() => {
    fetchTemplates();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchStations(selectedTemplate);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      // First get all templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('work_templates')
        .select('*')
        .order('created_at');

      if (templatesError) throw templatesError;

      // Then get station counts for each template
      const templatesWithCounts = await Promise.all((templatesData || []).map(async (template) => {
        const { data: stationsData, error: stationsError } = await supabase
          .from('template_stations')
          .select('id', { count: 'exact' })
          .eq('template_id', template.id);

        if (stationsError) throw stationsError;

        return {
          ...template,
          station_count: stationsData?.length || 0
        };
      }));

      setTemplates(templatesWithCounts);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('טעינת התבניות נכשלה');
    }
  };

  const createTemplate = async (number: number) => {
    try {
      const { data, error } = await supabase
        .from('work_templates')
        .insert([{
          name: `תבנית ${number}`
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Add the new template with 0 stations
      const newTemplate = {
        ...data,
        station_count: 0
      };
      
      setTemplates([...templates, newTemplate]);
      return data.id;
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('יצירת התבנית נכשלה');
      return null;
    }
  };

  const fetchStations = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_stations')
        .select(`
          *,
          customer:customer_id(name),
          worker:worker_id(name)
        `)
        .eq('template_id', templateId)
        .order('order');

      if (error) throw error;
      
      // Normalize scheduled_time to HH:mm (drop seconds if present)
      const stationsWithTime = (data || []).map(station => ({
        ...station,
        scheduled_time: formatTimeHHMM(typeof station.scheduled_time === 'string' ? station.scheduled_time : undefined)
      }));
      
      setStations(stationsWithTime);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('טעינת התחנות נכשלה');
    }
  };

  const fetchUsers = async () => {
    try {
      const [customersResponse, workersResponse] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('role', 'customer')
          .order('name'),
        supabase
          .from('users')
          .select('*')
          .eq('role', 'worker')
          .order('name')
      ]);

      if (customersResponse.error) throw customersResponse.error;
      if (workersResponse.error) throw workersResponse.error;

      setCustomers(customersResponse.data || []);
      setWorkers(workersResponse.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('טעינת המשתמשים נכשלה');
    }
  };

  const handleAddStation = async () => {
    if (!selectedTemplate) return;

    try {
      // First, get the maximum order value for the current template
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('template_stations')
        .select('order')
        .eq('template_id', selectedTemplate)
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxOrderError && maxOrderError.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw maxOrderError;
      }

      // Calculate the next order value
      const nextOrder = (maxOrderData?.order || 0) + 1;

      // Insert the new station with the calculated order and default time
      const { data, error } = await supabase
        .from('template_stations')
        .insert([{
          template_id: selectedTemplate,
          order: nextOrder,
          scheduled_time: '09:00' // Default time
        }])
        .select()
        .single();

      if (error) throw error;
      
      const newStation = {
        ...data,
        scheduled_time: '09:00'
      };
      
      setStations([...stations, newStation]);
      
      // Update the station count for the selected template
      setTemplates(templates.map(t => 
        t.id === selectedTemplate 
          ? { ...t, station_count: t.station_count + 1 }
          : t
      ));
      
      toast.success('התחנה נוספה בהצלחה');
    } catch (error) {
      console.error('Error adding station:', error);
      toast.error('הוספת התחנה נכשלה');
    }
  };

  const handleDeleteStation = async (stationId: string) => {
    try {
      const { error } = await supabase
        .from('template_stations')
        .delete()
        .eq('id', stationId);

      if (error) throw error;
      setStations(stations.filter(s => s.id !== stationId));
      
      // Update the station count for the selected template
      if (selectedTemplate) {
        setTemplates(templates.map(t => 
          t.id === selectedTemplate 
            ? { ...t, station_count: t.station_count - 1 }
            : t
        ));
      }
      
      toast.success('התחנה נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting station:', error);
      toast.error('מחיקת התחנה נכשלה');
    }
  };

  const handleUpdateStation = async (stationId: string, updates: Partial<TemplateStationWithTime>) => {
    try {
      const { error } = await supabase
        .from('template_stations')
        .update(updates)
        .eq('id', stationId);

      if (error) throw error;
      setStations(stations.map(s => 
        s.id === stationId ? { ...s, ...updates } : s
      ));
    } catch (error) {
      console.error('Error updating station:', error);
      toast.error('עדכון התחנה נכשל');
    }
  };

  const handleTimeChange = async (stationId: string, time: string) => {
    const formatted = formatTimeHHMM(time);
    try {
      const { error } = await supabase
        .from('template_stations')
        .update({ scheduled_time: formatted })
        .eq('id', stationId);

      if (error) throw error;
      setStations(stations.map(s =>
        s.id === stationId ? { ...s, scheduled_time: formatted } : s
      ));
      toast.success('השעה עודכנה בהצלחה');
    } catch (error) {
      console.error('Error updating time:', error);
      toast.error('עדכון השעה נכשל');
    }
  };

  const handleTemplateClick = async (number: number) => {
    // Find existing template for this number
    const template = templates.find(t => t.name === `תבנית ${number}` || t.name.includes(`תבנית ${number} `));
    
    if (template) {
      setSelectedTemplate(template.id);
    } else {
      // Create new template if it doesn't exist
      const newTemplateId = await createTemplate(number);
      if (newTemplateId) {
        setSelectedTemplate(newTemplateId);
      }
    }
  };

  const renderTemplateGrid = () => {
    const totalTemplates = 28; // Changed from 21 to 28
    const templateBoxes = [];

    for (let i = 1; i <= totalTemplates; i++) {
      const template = templates.find(t => {
        // Check if the template name contains the number
        const nameContainsNumber = t.name.includes(`${i}`);
        // Check if this is the correct template by checking if it's exactly "תבנית i" or starts with "תבנית i "
        const isExactTemplate = t.name === `תבנית ${i}` || t.name.startsWith(`תבנית ${i} `);
        return isExactTemplate || nameContainsNumber;
      });
      
      const isSelected = selectedTemplate === (template?.id || null);
      const stationCount = template?.station_count || 0;
      
      templateBoxes.push(
        <div
          key={i}
          className={`bg-gray-800 rounded-lg p-4 border border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => handleTemplateClick(i)}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-white mb-2">
              {i}
            </div>
            <div className="text-sm text-gray-400">
              {stationCount} תחנות
            </div>
            {template && (
              <div className="mt-2 text-sm text-gray-300 text-center truncate w-full">
                {template.name}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
        {templateBoxes}
      </div>
    );
  };

  // Filter stations based on search query
  const filteredStations = stations.filter(station => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (station.customer?.name?.toLowerCase().includes(query) || false) ||
      (station.worker?.name?.toLowerCase().includes(query) || false)
    );
  });

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">בחירת תבנית</h1>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-white transition ease-in-out duration-150 cursor-not-allowed">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              טוען תבניות...
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {renderTemplateGrid()}

            {selectedTemplate && (
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className="text-xl font-semibold text-white">
                    תחנות בתבנית {templates.find(t => t.id === selectedTemplate)?.name.split(' ')[1]}
                  </h2>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {/* Search input */}
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="חיפוש לפי לקוח או עובד..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pr-10 py-2 px-3 rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                      />
                      {searchQuery && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleAddStation}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="h-4 w-4 ml-1" />
                      הוסף תחנה
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredStations.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-gray-400">
                      לא נמצאו תחנות התואמות לחיפוש
                    </div>
                  )}
                  
                  {filteredStations.length === 0 && !searchQuery && (
                    <div className="text-center py-8 text-gray-400">
                      אין תחנות בתבנית זו
                    </div>
                  )}
                  
                  {filteredStations.map((station, index) => (
                    <div
                      key={station.id}
                      className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4 bg-gray-700 p-4 rounded-lg"
                    >
                      <div className="flex items-center">
                        <GripVertical className="h-5 w-5 text-gray-500 cursor-move" />
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="חפש לקוח..."
                            value={customerSearch[station.id] !== undefined ? customerSearch[station.id] : station.customer?.name || ''}
                            onChange={e => {
                              setCustomerSearch({ ...customerSearch, [station.id]: e.target.value });
                              setShowCustomerDropdown({ ...showCustomerDropdown, [station.id]: true });
                            }}
                            onFocus={() => setShowCustomerDropdown({ ...showCustomerDropdown, [station.id]: true })}
                            className="block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                          />
                          {showCustomerDropdown[station.id] && (
                            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {customers.filter(c => (customerSearch[station.id] || '').length === 0 || c.name.toLowerCase().includes((customerSearch[station.id] || '').toLowerCase())).map(customer => (
                                <div
                                  key={customer.id}
                                  onClick={() => {
                                    handleUpdateStation(station.id, { customer_id: customer.id });
                                    setCustomerSearch({ ...customerSearch, [station.id]: customer.name });
                                    setShowCustomerDropdown({ ...showCustomerDropdown, [station.id]: false });
                                  }}
                                  className="px-4 py-3 hover:bg-gray-700 cursor-pointer text-white"
                                >
                                  {customer.name}
                                </div>
                              ))}
                            </div>
                          )}
                          {station.customer && (
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateStation(station.id, { customer_id: '' });
                                  setCustomerSearch({ ...customerSearch, [station.id]: '' });
                                }}
                                className="text-gray-400 hover:text-gray-300"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <select
                          value={station.worker_id || ''}
                          onChange={(e) => handleUpdateStation(station.id, { worker_id: e.target.value })}
                          className="block w-full rounded-md bg-gray-600 border-gray-500 text-white"
                        >
                          <option value="">בחר עובד</option>
                          {workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name}
                            </option>
                          ))}
                        </select>

                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="HH:mm"
                            value={editingTime[station.id] !== undefined ? editingTime[station.id] : (station.scheduled_time || '')}
                            onChange={e => {
                              setEditingTime({ ...editingTime, [station.id]: e.target.value });
                              setTimeError({ ...timeError, [station.id]: '' });
                            }}
                            onBlur={e => {
                              const value = e.target.value;
                              const isValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
                              if (isValid) {
                                setTimeError({ ...timeError, [station.id]: '' });
                                handleTimeChange(station.id, value);
                              } else {
                                setTimeError({ ...timeError, [station.id]: 'יש להזין שעה בפורמט HH:mm (למשל 09:00)' });
                              }
                            }}
                            className={`block w-full pr-10 rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 ${timeError[station.id] ? 'border-red-500' : ''}`}
                            title="הכנס שעה בפורמט 09:00 או 22:30"
                          />
                          {timeError[station.id] && (
                            <div className="text-red-400 text-xs mt-1">{timeError[station.id]}</div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteStation(station.id)}
                        className="text-red-400 hover:text-red-300 self-center lg:self-auto"
                      >
                        <UserMinus className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}