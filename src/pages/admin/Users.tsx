import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { User, ServicePoint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { UserPlus, Plus, Trash, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewUser extends Omit<User, 'id' | 'created_at'> {
  service_points: Omit<ServicePoint, 'id' | 'created_at' | 'customer_id'>[];
}

interface ServicePointsModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
  onEdit: () => void;
}

interface Device {
  id: string;
  name: string;
  refill_amount: number;
}

interface Scent {
  id: string;
  name: string;
}

function UserDetailsModal({ user, onClose, onEdit }: UserDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">פרטי משתמש</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400">שם</label>
              <div className="mt-1 text-white">{user.name}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400">טלפון</label>
              <div className="mt-1 text-white" dir="ltr">{user.phone}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400">תפקיד</label>
              <div className="mt-1">
                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-purple-900 text-purple-200'
                    : user.role === 'worker'
                    ? 'bg-blue-900 text-blue-200'
                    : 'bg-green-900 text-green-200'
                }`}>
                  {user.role === 'admin' ? 'מנהל' : user.role === 'worker' ? 'עובד' : 'לקוח'}
                </span>
              </div>
            </div>

            {user.role === 'customer' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400">כתובת</label>
                  <div className="mt-1 text-white">{user.address || '-'}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400">מחיר</label>
                  <div className="mt-1 text-white">
                    {user.price !== null && user.price !== undefined ? `₪${user.price}` : '-'}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400">נוצר בתאריך</label>
              <div className="mt-1 text-white">
                {new Date(user.created_at).toLocaleDateString('he-IL')}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 gap-4 pt-4 border-t border-gray-700 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700"
            >
              סגור
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ערוך
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicePointsModal({ userId, userName, onClose }: ServicePointsModalProps) {
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServicePoints();
  }, []);

  const fetchServicePoints = async () => {
    try {
      const { data, error } = await supabase
        .from('service_points')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at');

      if (error) throw error;
      setServicePoints(data || []);
    } catch (error) {
      console.error('Error fetching service points:', error);
      toast.error('טעינת נקודות השירות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 my-8 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            נקודות שירות - {userName}
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
                <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm self-start mb-3">
                  {point.device_type}
                </div>
                <div className="text-white text-lg mb-2">
                  {point.scent_type}
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  כמות מילוי: {point.refill_amount}
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

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [viewingServicePoints, setViewingServicePoints] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [scents, setScents] = useState<Scent[]>([]);
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    phone: '',
    password: '',
    address: '',
    role: 'customer',
    price: undefined,
    service_points: []
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchDevicesAndScents();
  }, []);

  // Refetch users when role filter changes
  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchDevicesAndScents = async () => {
    try {
      const [devicesResponse, scentsResponse] = await Promise.all([
        supabase
          .from('devices')
          .select('*')
          .order('name'),
        supabase
          .from('scents')
          .select('*')
          .order('name')
      ]);

      if (devicesResponse.error) throw devicesResponse.error;
      if (scentsResponse.error) throw scentsResponse.error;

      setDevices(devicesResponse.data || []);
      setScents(scentsResponse.data || []);
    } catch (error) {
      console.error('Error fetching devices and scents:', error);
      toast.error('טעינת המכשירים והניחוחות נכשלה');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedRole !== 'all') {
        query = query.eq('role', selectedRole);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('טעינת המשתמשים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: User['role']) => {
    setNewUser(prev => ({
      ...prev,
      role,
      address: role === 'customer' ? prev.address : '',
      price: role === 'customer' ? prev.price : undefined,
      service_points: role === 'customer' ? prev.service_points : []
    }));
  };

  async function fetchServicePoints(userId: string) {
    try {
      const { data, error } = await supabase
        .from('service_points')
        .select('*')
        .eq('customer_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching service points:', error);
      toast.error('טעינת נקודות השירות נכשלה');
      return [];
    }
  }

  const handleEdit = async (user: User) => {
    setEditingUser(user.id);
    let servicePoints: ServicePoint[] = [];
    
    if (user.role === 'customer') {
      servicePoints = await fetchServicePoints(user.id);
    }

    setNewUser({
      name: user.name,
      phone: user.phone,
      password: user.password,
      address: user.address || '',
      role: user.role,
      price: user.price,
      service_points: servicePoints.map(point => ({
        scent_type: point.scent_type,
        device_type: point.device_type,
        refill_amount: point.refill_amount,
        notes: point.notes || ''
      }))
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו תמחק גם את כל המשימות והנתונים הקשורים למשתמש.')) {
      return;
    }

    setLoading(true);
    try {
      // First delete all related records
      if (users.find(u => u.id === userId)?.role === 'customer') {
        // Delete service points
        await supabase
          .from('service_points')
          .delete()
          .eq('customer_id', userId);

        // Delete job service points
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('customer_id', userId);

        if (jobs) {
          for (const job of jobs) {
            await supabase
              .from('job_service_points')
              .delete()
              .eq('job_id', job.id);
          }
        }

        // Delete jobs
        await supabase
          .from('jobs')
          .delete()
          .eq('customer_id', userId);

        // Delete installation jobs
        await supabase
          .from('installation_jobs')
          .delete()
          .eq('customer_id', userId);

        // Delete special jobs
        await supabase
          .from('special_jobs')
          .delete()
          .eq('customer_id', userId);

        // Delete template stations
        await supabase
          .from('template_stations')
          .delete()
          .eq('customer_id', userId);
      }

      if (users.find(u => u.id === userId)?.role === 'worker') {
        // Delete jobs assigned to worker
        await supabase
          .from('jobs')
          .delete()
          .eq('worker_id', userId);

        // Delete installation jobs assigned to worker
        await supabase
          .from('installation_jobs')
          .delete()
          .eq('worker_id', userId);

        // Delete special jobs assigned to worker
        await supabase
          .from('special_jobs')
          .delete()
          .eq('worker_id', userId);

        // Delete template stations
        await supabase
          .from('template_stations')
          .delete()
          .eq('worker_id', userId);
      }

      // Finally delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('המשתמש נמחק בהצלחה');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('מחיקת המשתמש נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First check if phone number already exists
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('phone', newUser.phone);

      if (existingUsers && existingUsers.length > 0 && (!editingUser || existingUsers[0].id !== editingUser)) {
        toast.error('מספר טלפון כבר קיים במערכת');
        setLoading(false);
        return;
      }

      const userData = {
        name: newUser.name,
        phone: newUser.phone,
        password: newUser.password,
        role: newUser.role,
        address: newUser.role === 'customer' ? newUser.address : undefined,
        price: newUser.role === 'customer' ? newUser.price : undefined
      };

      if (editingUser) {
        const { error: userError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', editingUser);

        if (userError) throw userError;

        if (newUser.role === 'customer') {
          const { error: deleteError } = await supabase
            .from('service_points')
            .delete()
            .eq('customer_id', editingUser);

          if (deleteError) throw deleteError;

          if (newUser.service_points.length > 0) {
            const { error: pointsError } = await supabase
              .from('service_points')
              .insert(
                newUser.service_points.map(point => ({
                  ...point,
                  customer_id: editingUser
                }))
              );

            if (pointsError) throw pointsError;
          }
        }

        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === editingUser 
              ? { ...user, ...userData }
              : user
          )
        );

        toast.success('משתמש עודכן בהצלחה');
      } else {
        const { data: newUserData, error: userError } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (userError) throw userError;

        if (!newUserData) {
          throw new Error('No user was created');
        }

        if (newUser.role === 'customer' && newUser.service_points.length > 0) {
          const { error: pointsError } = await supabase
            .from('service_points')
            .insert(
              newUser.service_points.map(point => ({
                ...point,
                customer_id: newUserData.id
              }))
            );

          if (pointsError) throw pointsError;
        }

        setUsers(prevUsers => [newUserData, ...prevUsers]);
        toast.success('משתמש נוסף בהצלחה');
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setNewUser({
        name: '',
        phone: '',
        password: '',
        address: '',
        role: 'customer',
        price: undefined,
        service_points: []
      });
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(
        editingUser 
          ? 'עדכון המשתמש נכשל. אנא נסה שוב.' 
          : 'הוספת המשתמש נכשלה. אנא נסה שוב.'
      );
    } finally {
      setLoading(false);
    }
  };

  const addServicePoint = () => {
    if (devices.length === 0) {
      toast.error('אין מכשירים זמינים');
      return;
    }
    if (scents.length === 0) {
      toast.error('אין ניחוחות זמינים');
      return;
    }

    const defaultDevice = devices[0];
    setNewUser(prev => ({
      ...prev,
      service_points: [
        ...prev.service_points,
        {
          scent_type: scents[0].name,
          device_type: defaultDevice.name,
          refill_amount: defaultDevice.refill_amount,
          notes: ''
        }
      ]
    }));
  };

  const removeServicePoint = (index: number) => {
    setNewUser(prev => ({
      ...prev,
      service_points: prev.service_points.filter((_, i) => i !== index)
    }));
  };

  const updateServicePoint = (index: number, field: keyof Omit<ServicePoint, 'id' | 'created_at' | 'customer_id'>, value: any) => {
    setNewUser(prev => ({
      ...prev,
      service_points: prev.service_points.map((point, i) => {
        if (i === index) {
          if (field === 'device_type') {
            const selectedDevice = devices.find(d => d.name === value);
            return {
              ...point,
              [field]: value,
              refill_amount: selectedDevice ? selectedDevice.refill_amount : point.refill_amount
            };
          }
          return { ...point, [field]: value };
        }
        return point;
      })
    }));
  };

  return (
    <Layout userRole="admin">
      <div className="space-y-8">
        {/* Header with gradient text and modern button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              ניהול משתמשים
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">ניהול לקוחות ועובדים במערכת</p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setNewUser({
                name: '',
                phone: '',
                password: '',
                address: '',
                role: 'customer',
                price: undefined,
                service_points: []
              });
              setIsModalOpen(true);
            }}
            className="group px-5 py-2.5 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 text-gray-100 hover:shadow-xl hover:shadow-gray-900/30 hover:scale-[1.02] transition-all duration-300 inline-flex items-center"
          >
            <UserPlus className="h-5 w-5 ml-2" />
            הוסף משתמש חדש
          </button>
        </div>

        {/* Modern filter panel with glass morphism */}
        <div className="relative bg-gradient-to-br from-gray-900/70 to-gray-950/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/60 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl pointer-events-none"></div>
          <div className="relative flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:gap-4">
            {/* Search Input */}
            <div className="relative flex-grow group">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500 group-focus-within:text-gray-400 transition-colors duration-200" />
              </div>
              <input
                type="text"
                placeholder="חיפוש לפי שם או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pr-11 py-3 px-4 rounded-xl bg-gray-950/60 border border-gray-800/60 text-white placeholder-gray-500 hover:bg-gray-950/80 focus:bg-gray-950 focus:border-gray-700 focus:ring-2 focus:ring-gray-700/40 transition-all duration-200"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex-shrink-0 w-full sm:w-auto">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  className={`px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 w-full sm:w-auto ${
                    selectedRole === 'customer'
                      ? 'bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-lg'
                      : 'bg-gray-950/60 border border-gray-800/60 text-gray-400 hover:text-gray-300 hover:bg-gray-900/60'
                  }`}
                >
                  לקוחות
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('worker')}
                  className={`px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 w-full sm:w-auto ${
                    selectedRole === 'worker'
                      ? 'bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-lg'
                      : 'bg-gray-950/60 border border-gray-800/60 text-gray-400 hover:text-gray-300 hover:bg-gray-900/60'
                  }`}
                >
                  עובדים
                </button>
              </div>
            </div>
          </div>
        </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-white transition ease-in-out duration-150">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                טוען משתמשים...
              </div>
            </div>
          ) : (
            <>
              {/* Mobile view - Modern cards */}
              <div className="sm:hidden p-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-12 w-12 text-gray-600 mb-2" />
                      <p className="text-lg font-medium">לא נמצאו משתמשים מתאימים</p>
                    </div>
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <div key={user.id} className="group relative bg-gradient-to-br from-gray-900/70 to-gray-950/70 backdrop-blur-xl rounded-2xl p-5 border border-gray-800/60 mb-4 hover:border-gray-700 hover:shadow-2xl transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent rounded-2xl pointer-events-none"></div>
                      
                      <div className="relative flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                        <span className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : user.role === 'worker'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {user.role === 'admin' ? 'מנהל' : user.role === 'worker' ? 'עובד' : 'לקוח'}
                        </span>
                      </div>
                      
                      <div className="relative mb-4">
                        <p className="text-sm flex items-center gap-2">
                          <span className="text-gray-500 min-w-[60px]">טלפון:</span>
                          <span className="text-gray-300" dir="ltr">{user.phone}</span>
                        </p>
                      </div>
                      
                      <div className="relative flex flex-wrap gap-2 pt-4 border-t border-gray-800/50">
                        {user.role === 'customer' && (
                          <button
                            onClick={() => setViewingServicePoints({
                              userId: user.id,
                              userName: user.name
                            })}
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 text-sm inline-flex items-center justify-center"
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            נקודות שירות
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(user)}
                          className="flex-1 px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 text-sm"
                        >
                          ערוך
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="flex-1 px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-all duration-200 text-sm"
                        >
                          מחק
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Desktop view - Modern table */}
              <div className="hidden sm:block relative bg-gradient-to-br from-gray-900/70 to-gray-950/70 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none"></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-800/50">
                    <thead className="bg-gradient-to-b from-gray-950/90 to-gray-900/90 backdrop-blur-sm sticky top-0 z-10">
                      <tr>
                        <th scope="col" className="px-4 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          שם
                        </th>
                        <th scope="col" className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          טלפון
                        </th>
                        <th scope="col" className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          תפקיד
                        </th>
                        <th scope="col" className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-16 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <Search className="h-12 w-12 text-gray-600 mb-2" />
                              <p className="text-lg font-medium">לא נמצאו משתמשים מתאימים</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="group hover:bg-gradient-to-l hover:from-gray-800/40 hover:to-transparent transition-all duration-200">
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="text-white font-semibold hover:text-gray-300 transition-colors"
                              >
                                {user.name}
                              </button>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-400 text-right tabular-nums" dir="ltr">
                              {user.phone}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : user.role === 'worker'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {user.role === 'admin' ? 'מנהל' : user.role === 'worker' ? 'עובד' : 'לקוח'}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-1.5 items-center">
                                {user.role === 'customer' && (
                                  <button
                                    onClick={() => setViewingServicePoints({
                                      userId: user.id,
                                      userName: user.name
                                    })}
                                    className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                                    title="הצג נקודות שירות"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleEdit(user)}
                                  className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                                  title="ערוך משתמש"
                                >
                                  ערוך
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 rounded-lg bg-gray-800/60 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110"
                                  title="מחק משתמש"
                                >
                                  מחק
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser as User}
          onClose={() => setSelectedUser(null)}
          onEdit={() => {
            setSelectedUser(null);
            handleEdit(selectedUser as User);
          }}
        />
      )}

      {viewingServicePoints && (
        <ServicePointsModal
          userId={viewingServicePoints!.userId}
          userName={viewingServicePoints!.userName}
          onClose={() => setViewingServicePoints(null)}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full shadow-xl border border-gray-700 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {editingUser ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                }}
                aria-label="סגור"
                className="group inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-700/60 hover:bg-gray-700 text-gray-300 border border-gray-600/60 shadow-sm transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    מספר טלפון
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    required
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                    dir="ltr"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    סיסמה
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                    dir="ltr"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    תפקיד
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => handleRoleChange(e.target.value as User['role'])}
                    required
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                  >
                    <option value="customer">לקוח</option>
                    <option value="worker">עובד</option>
                    <option value="admin">מנהל</option>
                  </select>
                </div>

                {newUser.role === 'customer' && (
                  <>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        כתובת
                      </label>
                      <input
                        type="text"
                        value={newUser.address}
                        onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                        required
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                      />
                    </div>
                    
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        מחיר
                      </label>
                      <input
                        type="number"
                        value={newUser.price !== undefined ? newUser.price : ''}
                        onChange={(e) => setNewUser({ ...newUser, price: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="הזן מחיר ללקוח"
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                      />
                    </div>
                  </>
                )}
              </div>

              {newUser.role === 'customer' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">נקודות שירות</h3>
                    <button
                      type="button"
                      onClick={addServicePoint}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      הוסף נקודה
                    </button>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
                    {newUser.service_points.map((point, index) => (
                      <div key={index} className="bg-gray-700 p-5 rounded-lg space-y-4 mb-4 last:mb-0">
                        <div className="flex justify-between items-center">
                          <h4 className="text-white font-medium">נקודת שירות {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeServicePoint(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="form-group">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              סוג ריח
                            </label>
                            <select
                              value={point.scent_type}
                              onChange={(e) => updateServicePoint(index, 'scent_type', e.target.value)}
                              required
                              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                            >
                              {scents.map((scent) => (
                                <option key={scent.id} value={scent.name}>{scent.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              סוג מכשיר
                            </label>
                            <select
                              value={point.device_type}
                              onChange={(e) => updateServicePoint(index, 'device_type', e.target.value)}
                              required
                              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                            >
                              {devices.map((device) => (
                                <option key={device.id} value={device.name}>{device.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              כמות מילוי
                            </label>
                            <input
                              type="number"
                              value={point.refill_amount}
                              readOnly
                              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                            />
                          </div>

                          <div className="form-group">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              הערות
                            </label>
                            <input
                              type="text"
                              value={point.notes || ''}
                              onChange={(e) => updateServicePoint(index, 'notes', e.target.value)}
                              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-3 px-4"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 gap-4 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-3 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'שומר...' : editingUser ? 'שמור שינויים' : 'שמור משתמש'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}