import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { Search, X, Calendar, DropletIcon, FileBarChart, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
  price?: number;
}

interface JobReport {
  date: string;
  refill_amount: number;
}

export default function AdminReports() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [jobReports, setJobReports] = useState<JobReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRefill, setTotalRefill] = useState(0);

  useEffect(() => {
    fetchCustomers();
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
    if (selectedCustomer) {
      fetchJobReports(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, price')
        .eq('role', 'customer')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('טעינת הלקוחות נכשלה');
    }
  };

  const fetchJobReports = async (customerId: string) => {
    setLoading(true);
    try {
      // First get all jobs for this customer
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, date')
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (jobsError) throw jobsError;

      if (!jobs || jobs.length === 0) {
        setJobReports([]);
        setTotalRefill(0);
        setLoading(false);
        return;
      }

      // For each job, get the service points and their refill amounts
      const jobReportsData: JobReport[] = [];
      let total = 0;

      for (const job of jobs) {
        const { data: jobServicePoints, error: jspError } = await supabase
          .from('job_service_points')
          .select(`
            custom_refill_amount,
            service_point:service_point_id(
              refill_amount
            )
          `)
          .eq('job_id', job.id);

        if (jspError) throw jspError;

        // Calculate total refill amount for this job
        let jobRefillAmount = 0;
        
        if (jobServicePoints && jobServicePoints.length > 0) {
          jobServicePoints.forEach(jsp => {
            // Use custom refill amount if available, otherwise use default
            const refillAmount = jsp.custom_refill_amount !== null && jsp.custom_refill_amount !== undefined
              ? jsp.custom_refill_amount
              : jsp.service_point.refill_amount;
            
            jobRefillAmount += refillAmount;
          });
        }

        // Add to job reports
        jobReportsData.push({
          date: job.date,
          refill_amount: jobRefillAmount
        });

        // Add to total
        total += jobRefillAmount;
      }

      setJobReports(jobReportsData);
      setTotalRefill(total);
    } catch (error) {
      console.error('Error fetching job reports:', error);
      toast.error('טעינת הדוחות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setJobReports([]);
    setTotalRefill(0);
  };

  // Format the refill amount for display
  const formatRefillAmount = (amount: number) => {
    return amount >= 1000 
      ? `${(amount / 1000).toFixed(1)} ליטר` 
      : `${amount} מ"ל`;
  };

  // Shekel icon component
  const ShekelIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="text-blue-400"
    >
      <path d="M6 3v18m6-9v9m6-18v8a2 2 0 0 1-2 2H6" />
    </svg>
  );

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FileBarChart className="h-7 w-7 text-blue-400 mr-2" />
            <h1 className="text-2xl font-bold text-white">דוחות שימוש בשמן</h1>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              <User className="h-5 w-5 text-blue-400 ml-2" />
              בחר לקוח
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                  if (e.target.value === '') {
                    setSelectedCustomer(null);
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="חפש לקוח..."
                className="block w-full pr-10 py-3 px-4 rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {customerSearch && (
                <button
                  onClick={clearCustomer}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                </button>
              )}
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="px-4 py-3 hover:bg-gray-600 cursor-pointer text-white"
                    >
                      {customer.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedCustomer && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <FileBarChart className="h-5 w-5 text-blue-400 ml-2" />
                דוח שימוש בשמן עבור {selectedCustomer.name}
              </h2>

              {selectedCustomer.price !== undefined && selectedCustomer.price !== null && (
                <div className="mb-6 bg-blue-900/20 p-4 rounded-lg border border-blue-800/30 flex items-center">
                  <ShekelIcon />
                  <span className="text-blue-300 mr-2">מחיר ללקוח: </span>
                  <span className="text-white font-medium mr-2">₪{selectedCustomer.price} </span>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-white transition ease-in-out duration-150 cursor-not-allowed">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    טוען נתונים...
                  </div>
                </div>
              ) : jobReports.length === 0 ? (
                <div className="text-center py-8 bg-gray-700 rounded-lg border border-gray-600">
                  <p className="text-gray-400">אין נתונים זמינים עבור לקוח זה</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600 border border-gray-600 rounded-lg overflow-hidden">
                      <thead className="bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-right text-sm font-medium text-gray-300 uppercase">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 ml-2 text-blue-400" />
                              תאריך
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-right text-sm font-medium text-gray-300 uppercase">
                            <div className="flex items-center">
                              <DropletIcon className="h-4 w-4 ml-2 text-blue-400" />
                              כמות שמן
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-700 divide-y divide-gray-600">
                        {jobReports.map((report, index) => (
                          <tr key={index} className="hover:bg-gray-650 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              {format(new Date(report.date), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              {formatRefillAmount(report.refill_amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-900/30 font-medium">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            סה"כ
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {formatRefillAmount(totalRefill)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}