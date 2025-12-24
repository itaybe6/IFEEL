import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { DEVICE_TYPES, DeviceType, SCENT_TYPES, DEVICE_REFILL_AMOUNTS, SPECIAL_JOB_TYPES, BATTERY_TYPES, BatteryType, SpecialJobType } from '../../types/database';
import { Calendar, Search, X, PenTool as Tool, Plus, Trash, Wrench, Battery, Leaf, SprayCan as Spray, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface InstallationDevice {
  deviceType: DeviceType;
  notes?: string;
}

interface ServicePointWithEditing {
  id: string;
  customer_id: string;
  scent_type: string;
  device_type: DeviceType;
  refill_amount: number;
  notes?: string;
  customRefillAmount: number;
}

interface OneTimeCustomerData {
  name: string;
  phone?: string;
  address?: string;
}

export default function AdminAddJobs() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<{ id: string; name: string; address: string }[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<{ id: string; name: string; address: string }[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobType, setJobType] = useState<'regular' | 'installation' | 'special'>('regular');
  const [specialJobType, setSpecialJobType] = useState<SpecialJobType>('scent_spread');
  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(false);
  const [oneTimeCustomer, setOneTimeCustomer] = useState<OneTimeCustomerData>({
    name: '',
    phone: '',
    address: ''
  });
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    workerId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending',
    deviceType: '' as DeviceType | '',
    notes: '',
    batteryType: '' as BatteryType | '',
    scheduledTime: '09:00',
  });
  const [servicePoints, setServicePoints] = useState<ServicePointWithEditing[]>([]);
  const [loadingServicePoints, setLoadingServicePoints] = useState(false);
  const [installationDevices, setInstallationDevices] = useState<InstallationDevice[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (customerSearch) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [customerSearch, customers]);

  useEffect(() => {
    if (formData.customerId && jobType === 'regular') {
      fetchServicePoints(formData.customerId);
    } else {
      setServicePoints([]);
    }
  }, [formData.customerId, jobType]);

  const fetchUsers = async () => {
    try {
      const [customersResponse, workersResponse] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, address')
          .eq('role', 'customer')
          .order('name'),
        supabase
          .from('users')
          .select('id, name')
          .eq('role', 'worker')
          .order('name')
      ]);

      if (customersResponse.error) throw customersResponse.error;
      if (workersResponse.error) throw workersResponse.error;

      setCustomers(customersResponse.data || []);
      setFilteredCustomers(customersResponse.data || []);
      setWorkers(workersResponse.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('טעינת המשתמשים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const fetchServicePoints = async (customerId: string) => {
    setLoadingServicePoints(true);
    try {
      const { data, error } = await supabase
        .from('service_points')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at');

      if (error) throw error;
      
      setServicePoints(data?.map(point => ({
        ...point,
        customRefillAmount: point.refill_amount
      })) || []);
    } catch (error) {
      console.error('Error fetching service points:', error);
      toast.error('טעינת נקודות השירות נכשלה');
    } finally {
      setLoadingServicePoints(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jobDate = new Date(formData.date);
      const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
      jobDate.setHours(hours, minutes, 0, 0);

      // Get the start and end of the selected day
      const dayStart = startOfDay(jobDate);
      const dayEnd = endOfDay(jobDate);

      let customerId = formData.customerId;
      let oneTimeCustomerId = null;

      // If this is a one-time customer, create them first
      if (isOneTimeCustomer && oneTimeCustomer.name) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('one_time_customers')
          .insert([{
            name: oneTimeCustomer.name,
            phone: oneTimeCustomer.phone,
            address: oneTimeCustomer.address
          }])
          .select()
          .single();

        if (customerError) throw customerError;
        oneTimeCustomerId = newCustomer.id;
        customerId = '';
      }

      if (jobType === 'regular') {
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert([{
            customer_id: customerId || null,
            one_time_customer_id: oneTimeCustomerId,
            worker_id: formData.workerId,
            date: jobDate.toISOString(),
            status: 'pending',
            notes: formData.notes || null,
          }])
          .select()
          .single();

        if (jobError) throw jobError;

        if (servicePoints && servicePoints.length > 0) {
          const jobServicePoints = servicePoints.map(point => ({
            job_id: newJob.id,
            service_point_id: point.id,
            custom_refill_amount: point.customRefillAmount !== point.refill_amount ? point.customRefillAmount : null
          }));

          const { error: insertError } = await supabase
            .from('job_service_points')
            .insert(jobServicePoints);

          if (insertError) throw insertError;
        }

        toast.success('המשימה נוצרה בהצלחה');
      } else if (jobType === 'installation') {
        // Create new installation job
        const { data: newJob, error: installationError } = await supabase
          .from('installation_jobs')
          .insert([{
            customer_id: customerId || null,
            one_time_customer_id: oneTimeCustomerId,
            worker_id: formData.workerId,
            date: jobDate.toISOString(),
            status: 'pending',
            notes: formData.notes || null,
            device_type: installationDevices[0]?.deviceType || 'Z30',
          }])
          .select()
          .single();

        if (installationError) throw installationError;

        // Add installation devices
        if (installationDevices.length > 0) {
          const devices = installationDevices.map(device => ({
            installation_job_id: newJob.id,
            device_type: device.deviceType,
            notes: device.notes || null
          }));

          const { error: devicesError } = await supabase
            .from('installation_devices')
            .insert(devices);

          if (devicesError) throw devicesError;
        }

        toast.success('משימת התקנה נוצרה בהצלחה');
      } else if (jobType === 'special') {
        const { error: specialError } = await supabase
          .from('special_jobs')
          .insert([{
            customer_id: customerId || null,
            one_time_customer_id: oneTimeCustomerId,
            worker_id: formData.workerId,
            job_type: specialJobType,
            date: jobDate.toISOString(),
            status: 'pending',
            notes: formData.notes || null,
            battery_type: specialJobType === 'batteries' ? formData.batteryType : null,
          }]);

        if (specialError) throw specialError;

        toast.success('המשימה המיוחדת נוצרה בהצלחה');
      }
      
      setFormData({
        customerId: '',
        customerName: '',
        customerAddress: '',
        workerId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
        deviceType: '',
        notes: '',
        batteryType: '',
        scheduledTime: '09:00',
      });
      setCustomerSearch('');
      setServicePoints([]);
      setJobType('regular');
      setSpecialJobType('scent_spread');
      setInstallationDevices([]);
      setIsOneTimeCustomer(false);
      setOneTimeCustomer({
        name: '',
        phone: '',
        address: ''
      });
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('יצירת המשימה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: { id: string; name: string; address: string }) => {
    setFormData({
      ...formData,
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: customer.address || ''
    });
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleRefillAmountChange = (id: string, value: string) => {
    const numValue = parseInt(value);
    const validValue = isNaN(numValue) ? 0 : numValue;
    
    setServicePoints(prevPoints => 
      prevPoints.map(point => 
        point.id === id ? { ...point, customRefillAmount: validValue } : point
      )
    );
  };

  const handleCancel = () => {
    navigate('/admin/jobs');
  };

  const getSpecialJobIcon = (type: SpecialJobType) => {
    switch (type) {
      case 'scent_spread':
        return <Spray className="h-4 w-4 ml-1" />;
      case 'plants':
        return <Leaf className="h-4 w-4 ml-1" />;
      case 'batteries':
        return <Battery className="h-4 w-4 ml-1" />;
      case 'repairs':
        return <Wrench className="h-4 w-4 ml-1" />;
    }
  };

  const addInstallationDevice = () => {
    setInstallationDevices(prev => [...prev, { deviceType: 'Z30' }]);
  };

  const removeInstallationDevice = (index: number) => {
    setInstallationDevices(prev => prev.filter((_, i) => i !== index));
  };

  const updateInstallationDevice = (index: number, updates: Partial<InstallationDevice>) => {
    setInstallationDevices(prev => 
      prev.map((device, i) => 
        i === index ? { ...device, ...updates } : device
      )
    );
  };

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">הוספת משימה חדשה</h1>
        </div>

        <div className="bg-gray-850 rounded-lg p-6 border border-gray-800">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              סוג משימה
            </label>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setJobType('regular')}
                className={`px-4 py-2 rounded-lg ${
                  jobType === 'regular'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                משימת מילוי רגילה
              </button>
              <button
                type="button"
                onClick={() => setJobType('installation')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  jobType === 'installation'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Tool className="h-4 w-4 ml-1" />
                משימת התקנת מכשיר
              </button>
              <button
                type="button"
                onClick={() => setJobType('special')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  jobType === 'special'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                משימה מיוחדת
              </button>
            </div>
          </div>

          {jobType === 'special' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                סוג משימה מיוחדת
              </label>
              <div className="flex flex-wrap gap-4">
                {Object.entries(SPECIAL_JOB_TYPES).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSpecialJobType(type as SpecialJobType)}
                    className={`px-4 py-2 rounded-lg flex items-center ${
                      specialJobType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {getSpecialJobIcon(type as SpecialJobType)}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                סוג לקוח
              </label>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setIsOneTimeCustomer(false)}
                  className={`px-4 py-2 rounded-lg ${
                    !isOneTimeCustomer
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  לקוח קיים
                </button>
                <button
                  type="button"
                  onClick={() => setIsOneTimeCustomer(true)}
                  className={`px-4 py-2 rounded-lg ${
                    isOneTimeCustomer
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  לקוח חד פעמי
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {isOneTimeCustomer ? (
                <>
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      שם לקוח
                    </label>
                    <input
                      type="text"
                      value={oneTimeCustomer.name}
                      onChange={(e) => setOneTimeCustomer({ ...oneTimeCustomer, name: e.target.value })}
                      placeholder="הזן שם לקוח..."
                      className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      טלפון (אופציונלי)
                    </label>
                    <input
                      type="tel"
                      value={oneTimeCustomer.phone}
                      onChange={(e) => setOneTimeCustomer({ ...oneTimeCustomer, phone: e.target.value })}
                      placeholder="הזן מספר טלפון..."
                      className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                      dir="ltr"
                    />
                  </div>

                  <div className="form-group col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      כתובת (אופציונלי)
                    </label>
                    <input
                      type="text"
                      value={oneTimeCustomer.address}
                      onChange={(e) => setOneTimeCustomer({ ...oneTimeCustomer, address: e.target.value })}
                      placeholder="הזן כתובת..."
                      className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    לקוח
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch || formData.customerName}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (e.target.value === '') {
                          setFormData({
                            ...formData,
                            customerId: '',
                            customerName: '',
                            customerAddress: ''
                          });
                        }
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="חפש לקוח..."
                      className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="px-4 py-3 hover:bg-gray-700 cursor-pointer text-white"
                          >
                            {customer.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isOneTimeCustomer && formData.customerId === '' && (
                    <p className="mt-1 text-sm text-red-400">יש לבחור לקוח</p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  עובד
                </label>
                <select
                  value={formData.workerId}
                  onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
                  required
                  className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                >
                  <option value="">בחר עובד</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  תאריך
                </label>
                <input
                  type="date"
                  readOnly
                  inputMode="none"
                  onKeyDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLInputElement).showPicker?.(); }}
                  onTouchStart={(e) => { e.preventDefault(); (e.currentTarget as HTMLInputElement).showPicker?.(); }}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  שעה
                </label>
                <input
                  type="time"
                  step="60"
                  value={formData.scheduledTime}
                  onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                  required
                  className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                />
              </div>

              {jobType === 'special' && specialJobType === 'batteries' && (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    סוג סוללה
                  </label>
                  <select
                    value={formData.batteryType}
                    onChange={(e) => setFormData({ ...formData, batteryType: e.target.value as BatteryType })}
                    required
                    className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                  >
                    <option value="">בחר סוג סוללה</option>
                    {BATTERY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                placeholder="הערות נוספות..."
              />
            </div>

            {jobType === 'installation' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">מכשירים להתקנה</h3>
                  <button
                    type="button"
                    onClick={addInstallationDevice}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף מכשיר
                  </button>
                </div>

                {installationDevices.length === 0 ? (
                  <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-gray-400">לא נבחרו מכשירים להתקנה</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {installationDevices.map((device, index) => (
                      <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                סוג מכשיר
                              </label>
                              <select
                                value={device.deviceType}
                                onChange={(e) => updateInstallationDevice(index, { deviceType: e.target.value as DeviceType })}
                                className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                              >
                                {DEVICE_TYPES.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                הערות
                              </label>
                              <input
                                type="text"
                                value={device.notes || ''}
                                onChange={(e) => updateInstallationDevice(index, { notes: e.target.value })}
                                placeholder="הערות למכשיר..."
                                className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeInstallationDevice(index)}
                            className="text-red-400 hover:text-red-300 p-1 ml-4"
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {((isOneTimeCustomer && oneTimeCustomer.address) || (!isOneTimeCustomer && formData.customerAddress)) && (jobType === 'installation' || jobType === 'special') && (
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/30">
                <h3 className="text-blue-300 font-medium mb-2">פרטי כתובת:</h3>
                <p className="text-white">{isOneTimeCustomer ? oneTimeCustomer.address : formData.customerAddress}</p>
              </div>
            )}

            {jobType === 'regular' && !isOneTimeCustomer && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4">נקודות שירות</h3>
                
                {loadingServicePoints ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : servicePoints.length === 0 ? (
                  <div className="text-center py-4 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-gray-400">אין נקודות שירות ללקוח זה</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servicePoints.map((point) => (
                      <div key={point.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex flex-col h-full">
                          <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm self-start mb-3">
                            {point.device_type}
                          </div>
                          <div className="text-white text-lg mb-2">
                            {point.scent_type}
                          </div>
                          
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              כמות למילוי
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={point.customRefillAmount}
                              onChange={(e) => handleRefillAmountChange(point.id, e.target.value)}
                              className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-2 px-3"
                            />
                            {point.customRefillAmount !== point.refill_amount && (
                              <p className="mt-1 text-xs text-blue-400">
                                ערך מותאם אישית (ברירת מחדל: {point.refill_amount})
                              </p>
                            )}
                          </div>
                          
                          {point.notes && (
                            <div className="text-gray-400 text-sm mt-2">
                              הערות: {point.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3 gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-3 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={
                  loading || 
                  (!isOneTimeCustomer && formData.customerId === '' && jobType !== 'regular') || 
                  (isOneTimeCustomer && !oneTimeCustomer.name) ||
                  formData.workerId === '' || 
                  (jobType === 'installation' && installationDevices.length === 0) ||
                  (jobType === 'special' && specialJobType === 'batteries' && !formData.batteryType)
                }
                className="px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'יוצר משימה...' : 'צור משימה'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}