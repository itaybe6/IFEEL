import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Bell, PenTool as Tool, LayoutDashboard, Users, Droplets, PlusCircle, ClipboardCheck, FileText, CalendarRange, CalendarDays, HeadphonesIcon, Clock as CalendarClock, SprayCan as Spray } from 'lucide-react';
import { useLoading } from './LoadingProvider';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: string;
}

type NavItem = {
  label: string;
  path: string;
  icon: JSX.Element;
  notification?: boolean;
  notificationCount?: number;
};

export default function Layout({ children, userRole }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isTasksOpen, setIsTasksOpen] = React.useState(false);
  const { setIsLoading } = useLoading();
  const { setUser } = useAuth();
  const [newTicketsCount, setNewTicketsCount] = useState(0);

  const handleLogout = async () => {
    setIsLoading(true);
    setUser(null);
    navigate('/login');
    setIsLoading(false);
  };

  const handleNavigation = (path: string) => {
    if (location.pathname !== path) {
      setIsLoading(true);
      navigate(path);
      setTimeout(() => setIsLoading(false), 300);
    }
    setIsSidebarOpen(false);
  };

  React.useEffect(() => {
    // Only fetch new tickets count for admin role
    if (userRole === 'admin') {
      const fetchNewTicketsCount = async () => {
        try {
          const { count, error } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('is_new', true);
          
          if (error) throw error;
          setNewTicketsCount(count || 0);
        } catch (error) {
          console.error('Error fetching new tickets count:', error);
        }
      };

      fetchNewTicketsCount();

      // Set up subscription for real-time updates
      const subscription = supabase
        .channel('support_tickets_changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'support_tickets' 
        }, () => {
          fetchNewTicketsCount();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userRole]);

  const getMenuItems = () => {
    switch (userRole) {
      case 'admin': {
        const taskItems: NavItem[] = [
          { label: 'משימות ריח', path: '/admin/jobs', icon: <Droplets className="h-4 w-4 ml-1" /> },
          { label: 'הוספת משימות', path: '/admin/add-jobs', icon: <PlusCircle className="h-4 w-4 ml-1" /> },
          { label: 'ביצוע משימות', path: '/admin/job-execution', icon: <ClipboardCheck className="h-4 w-4 ml-1" /> },
        ];

        const otherItems: NavItem[] = [
          { label: 'לוח בקרה', path: '/admin', icon: <LayoutDashboard className="h-4 w-4 ml-1" /> },
          { label: 'לוז יומי', path: '/admin/daily-schedule', icon: <CalendarDays className="h-4 w-4 ml-1" /> },
          { label: 'משתמשים', path: '/admin/users', icon: <Users className="h-4 w-4 ml-1" /> },
          { label: 'מכשירים וניחוחות', path: '/admin/devices-and-scents', icon: <Spray className="h-4 w-4 ml-1" /> },
          { label: 'תבניות עבודה', path: '/admin/work-templates', icon: <FileText className="h-4 w-4 ml-1" /> },
          { label: 'קווי עבודה', path: '/admin/work-schedule', icon: <CalendarRange className="h-4 w-4 ml-1" /> },
          { 
            label: 'שירות לקוחות', 
            path: '/admin/support',
            icon: <HeadphonesIcon className="h-4 w-4 ml-1" />,
            notification: newTicketsCount > 0
          },
          { label: 'דוחות', path: '/admin/reports', icon: <CalendarClock className="h-4 w-4 ml-1" /> },
        ];

        return { taskItems, otherItems };
      }
      case 'worker':
        return {
          taskItems: [] as NavItem[],
          otherItems: [
            { label: 'לוז יומי', path: '/worker', icon: <CalendarDays className="h-4 w-4 ml-1" /> },
            { label: 'היסטוריית משימות', path: '/worker/jobs', icon: <ClipboardCheck className="h-4 w-4 ml-1" /> }
          ] as NavItem[]
        };
      case 'customer':
        return {
          taskItems: [] as NavItem[],
          otherItems: [
            { label: 'פרופיל', path: '/customer', icon: <Users className="h-4 w-4 ml-1" /> },
            { label: 'שירותים', path: '/customer/services', icon: <Droplets className="h-4 w-4 ml-1" /> },
            { label: 'תמיכה טכנית', path: '/customer/support', icon: <HeadphonesIcon className="h-4 w-4 ml-1" /> }
          ] as NavItem[]
        };
      default:
        return { taskItems: [], otherItems: [] };
    }
  };

  const { taskItems, otherItems } = getMenuItems();

  return (
    <div className="min-h-screen bg-primary-dark font-heebo">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-primary-dark/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-primary shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-primary-light/10 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-primary-light/10">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-white tracking-wider">FEEL</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-white md:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 overflow-y-auto">
            <ul className="space-y-1">
              {otherItems.slice(0, 4).map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-all duration-200 flex justify-between items-center group ${
                      location.pathname === item.path
                        ? 'bg-secondary text-primary-dark font-bold shadow-lg'
                        : 'text-gray-300 hover:bg-primary-light/50 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className={`${location.pathname === item.path ? 'text-primary-dark' : 'text-secondary'} group-hover:scale-110 transition-transform`}>
                        {item.icon}
                      </span>
                      <span className="mr-2">{item.label}</span>
                    </span>
                    {item.notification && (
                      <span className="relative">
                        <Bell className="h-5 w-5 text-red-400" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {item.notificationCount || ''}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              ))}

              {userRole === 'admin' && taskItems.length > 0 && (
                <li>
                  <button
                    onClick={() => handleNavigation('/admin/jobs')}
                    className="w-full text-right px-4 py-3 rounded-lg transition-colors flex justify-between items-center text-gray-300 hover:bg-gray-800"
                  >
                    <span className="flex items-center">
                      <Droplets className="h-4 w-4 ml-1" />
                      משימות
                    </span>
                  </button>
                  {isTasksOpen && (
                    <ul className="mr-4 mt-1 space-y-1 border-r border-gray-800 pr-4">
                      {taskItems.map((item) => (
                        <li key={item.path}>
                          <button
                            onClick={() => handleNavigation(item.path)}
                            className={`w-full text-right px-4 py-3 rounded-lg transition-colors flex justify-between items-center ${
                              location.pathname === item.path
                                ? 'bg-gray-800 text-white font-medium'
                                : 'text-gray-300 hover:bg-gray-800'
                            }`}
                          >
                            <span className="flex items-center">
                              {item.icon}
                              {item.label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )}

              {otherItems.slice(4).map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-all duration-200 flex justify-between items-center group ${
                      location.pathname === item.path
                        ? 'bg-secondary text-primary-dark font-bold shadow-lg'
                        : 'text-gray-300 hover:bg-primary-light/50 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className={`${location.pathname === item.path ? 'text-primary-dark' : 'text-secondary'} group-hover:scale-110 transition-transform`}>
                        {item.icon}
                      </span>
                      <span className="mr-2">{item.label}</span>
                    </span>
                    {item.notification && (
                      <span className="relative">
                        <Bell className="h-5 w-5 text-red-400" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {item.notificationCount || ''}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-300 hover:text-white w-full px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              <LogOut className="h-5 w-5" />
              <span>התנתק</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:mr-64 min-h-screen">
        <header className="bg-gray-900 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden text-gray-300 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-800">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}