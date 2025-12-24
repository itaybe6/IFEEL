import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { DEVICE_TYPES, DeviceType } from '../../types/database';
import { Calendar, Search, X, PenTool as Tool } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function AdminDeviceInstallation() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<{ id: string; name: string; address: string }[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<{ id: string; name: string; address: string }[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    workerId: '',
    deviceType: '' as DeviceType | '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jobDate = new Date(formData.date);
      // Set to 9:00 AM
      jobDate.setHours(9, 0, 0, 0);

      // Create new installation job
      const { data: newJob, error: jobError } = await supabase
        .from('installation_jobs')
        .insert([{
          customer_id: formData.customerId,
          worker_id: formData.workerId,
          device_type: formData.deviceType,
          date: jobDate.toISOString(),
          status: 'pending',
          notes: formData.notes || null
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      toast.success('משימת התקנה נוצרה בהצלחה');
      
      // Reset form
      setFormData({
        customerId: '',
        customerName: '',
        customerAddress: '',
        workerId: '',
        deviceType: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      setCustomerSearch('');
    } catch (error) {
      console.error('Error saving installation job:', error);
      toast.error('יצירת משימת ההתקנה נכשלה');
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

  const handleCancel = () => {
    navigate('/admin/installation-jobs');
  };

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Tool className="h-6 w-6 text-blue-400 ml-2" />
            <h1 className="text-2xl font-bold text-white">הוספת משימת התקנה חדשה</h1>
          </div>
        </div>

        <div className="bg-gray-850 rounded-lg p-6 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                {formData.customerId === '' && (
                  <p className="mt-1 text-sm text-red-400">יש לבחור לקוח</p>
                )}
              </div>

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
                  סוג מכשיר
                </label>
                <select
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as DeviceType })}
                  required
                  className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                >
                  <option value="">בחר סוג מכשיר</option>
                  {DEVICE_TYPES.map((deviceType) => (
                    <option key={deviceType} value={deviceType}>
                      {deviceType}
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

              <div className="form-group col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                  placeholder="הערות נוספות להתקנה..."
                />
              </div>
            </div>

            {formData.customerAddress && (
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/30">
                <h3 className="text-blue-300 font-medium mb-2">פרטי כתובת:</h3>
                <p className="text-white">{formData.customerAddress}</p>
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
                disabled={loading || formData.customerId === '' || formData.workerId === '' || formData.deviceType === ''}
                className="px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'יוצר משימה...' : 'צור משימת התקנה'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}