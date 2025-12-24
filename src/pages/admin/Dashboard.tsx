import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Users, Briefcase, UserCheck, TrendingUp, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DeviceType } from '../../types/database';

interface DeviceCount {
  device_type: DeviceType;
  count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeWorkers: 0,
    totalCustomers: 0,
    totalPointsPrice: 0,
    deviceCounts: [] as DeviceCount[],
    recentJobs: [],
    activeWorkersList: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Fetch total jobs for current month
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (jobsError) throw jobsError;

      // First get all workers
      const { data: workersData, error: workersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'worker');

      if (workersError) throw workersError;

      // Then check which workers have pending jobs today
      const activeWorkersList = await Promise.all(
        (workersData || []).map(async (worker) => {
          const { data: workerJobs, error: workerJobsError } = await supabase
            .from('jobs')
            .select('id')
            .eq('worker_id', worker.id)
            .eq('status', 'pending')
            .gte('date', todayStart)
            .lte('date', todayEnd);

          if (workerJobsError) throw workerJobsError;

          return {
            ...worker,
            jobs: workerJobs || [],
            isActive: (workerJobs || []).length > 0
          };
        })
      );

      // Filter to only active workers
      const activeWorkers = activeWorkersList.filter(worker => worker.isActive);

      // Fetch total customers
      const { count: customersCount, error: customersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      if (customersError) throw customersError;

      // Fetch total price of all customers
      const { data: customersData, error: customersPriceError } = await supabase
        .from('users')
        .select('price')
        .eq('role', 'customer')
        .not('price', 'is', null);

      if (customersPriceError) throw customersPriceError;

      // Calculate total price
      const totalPointsPrice = customersData?.reduce((sum, customer) => {
        return sum + (customer.price || 0);
      }, 0) || 0;

      // Fetch device distribution
      const { data: deviceData, error: deviceError } = await supabase
        .from('service_points')
        .select('device_type');

      if (deviceError) throw deviceError;

      // Fetch recent jobs with details
      const { data: recentJobsData, error: recentJobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customer_id(name),
          worker:worker_id(name)
        `)
        .order('date', { ascending: false })
        .limit(3);

      if (recentJobsError) throw recentJobsError;

      // Calculate device type distribution
      const deviceCounts = deviceData?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.device_type] = (acc[curr.device_type] || 0) + 1;
        return acc;
      }, {});

      const formattedDeviceCounts = Object.entries(deviceCounts || {}).map(([device_type, count]) => ({
        device_type: device_type as DeviceType,
        count
      }));

      setStats({
        totalJobs: jobsData?.length || 0,
        activeWorkers: activeWorkers.length,
        totalCustomers: customersCount || 0,
        totalPointsPrice,
        deviceCounts: formattedDeviceCounts,
        recentJobs: recentJobsData || [],
        activeWorkersList: activeWorkers
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Coin icon component
  const CoinIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="h-6 w-6 text-purple-300"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0v6a2.5 2.5 0 0 1-5 0V9z" />
    </svg>
  );

  if (loading) {
    return (
      <Layout userRole="admin">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="admin">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">לוח בקרה</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-850 rounded-xl shadow-sm p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">סה"כ משימות</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalJobs}</p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-amber-300" />
              </div>
            </div>
          </div>

          <div className="bg-gray-850 rounded-xl shadow-sm p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">עובדים פעילים</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.activeWorkers}</p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-teal-300" />
              </div>
            </div>
          </div>

          <div className="bg-gray-850 rounded-xl shadow-sm p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">לקוחות</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalCustomers}</p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-purple-300" />
              </div>
            </div>
          </div>

          <div className="bg-gray-850 rounded-xl shadow-sm p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">מחיר כל הנקודות</p>
                <p className="text-2xl font-bold text-white mt-1">₪{stats.totalPointsPrice}</p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <CoinIcon />
              </div>
            </div>
          </div>
        </div>

        {/* Device Distribution */}
        <div className="bg-gray-850 rounded-xl shadow-sm p-6 border border-gray-800">
          <div className="flex items-center mb-6">
            <Cpu className="h-6 w-6 text-blue-300 mr-2" />
            <h2 className="text-lg font-semibold text-white">התפלגות מכשירים</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.deviceCounts.map((device) => (
              <div key={device.device_type} className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-medium">{device.device_type}</h3>
                <p className="text-2xl font-bold text-gray-300 mt-2">{device.count}</p>
                <p className="text-sm text-gray-400 mt-1">יחידות</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-850 rounded-xl shadow-sm p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">משימות אחרונות</h2>
            <div className="space-y-4">
              {stats.recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{job.customer?.name}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(job.date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    job.status === 'completed' 
                      ? 'text-green-300 bg-green-900/30' 
                      : 'text-yellow-300 bg-yellow-900/30'
                  }`}>
                    {job.status === 'completed' ? 'הושלם' : 'בתהליך'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-850 rounded-xl shadow-sm p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">עובדים פעילים</h2>
            <div className="space-y-4">
              {stats.activeWorkersList.map((worker: any) => (
                <div key={worker.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{worker.name}</p>
                    <p className="text-sm text-gray-400">{worker.jobs.length} משימות היום</p>
                  </div>
                  <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/30 rounded-full">
                    פעיל
                  </span>
                </div>
              ))}
              {stats.activeWorkersList.length === 0 && (
                <div className="text-center text-gray-400 py-4">
                  אין עובדים פעילים כרגע
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}