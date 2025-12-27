import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoadingProvider } from './components/LoadingProvider';
import { AuthProvider, RequireAuth } from './components/AuthProvider';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminJobs from './pages/admin/Jobs';
import AdminAddJobs from './pages/admin/AddJobs';
import AdminJobExecution from './pages/admin/JobExecution';
import AdminWorkTemplates from './pages/admin/WorkTemplates';
import AdminWorkSchedule from './pages/admin/WorkSchedule';
import AdminDailySchedule from './pages/admin/DailySchedule';
import AdminDevicesAndScents from './pages/admin/DevicesAndScents';
import WorkerSchedule from './pages/worker/Schedule';
import WorkerJobs from './pages/worker/Jobs';
import CustomerProfile from './pages/customer/Profile';
import CustomerServices from './pages/customer/Services';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoadingProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/users" element={<RequireAuth role="admin"><AdminUsers /></RequireAuth>} />
            <Route path="/admin/jobs" element={<RequireAuth role="admin"><AdminJobs /></RequireAuth>} />
            <Route path="/admin/add-jobs" element={<RequireAuth role="admin"><AdminAddJobs /></RequireAuth>} />
            <Route path="/admin/job-execution" element={<RequireAuth role="admin"><AdminJobExecution /></RequireAuth>} />
            <Route path="/admin/work-templates" element={<RequireAuth role="admin"><AdminWorkTemplates /></RequireAuth>} />
            <Route path="/admin/work-schedule" element={<RequireAuth role="admin"><AdminWorkSchedule /></RequireAuth>} />
            <Route path="/admin/daily-schedule" element={<RequireAuth role="admin"><AdminDailySchedule /></RequireAuth>} />
            <Route path="/admin/devices-and-scents" element={<RequireAuth role="admin"><AdminDevicesAndScents /></RequireAuth>} />
            
            {/* Worker Routes */}
            <Route path="/worker" element={<RequireAuth role="worker"><WorkerSchedule /></RequireAuth>} />
            <Route path="/worker/jobs" element={<RequireAuth role="worker"><WorkerJobs /></RequireAuth>} />
            
            {/* Customer Routes */}
            <Route path="/customer" element={<RequireAuth role="customer"><CustomerProfile /></RequireAuth>} />
            <Route path="/customer/services" element={<RequireAuth role="customer"><CustomerServices /></RequireAuth>} />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </LoadingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;