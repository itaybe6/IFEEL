import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ServicePoint, SCENT_TYPES } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { Edit2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface ServicePointWithEditing extends ServicePoint {
  isEditing?: boolean;
}

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    name: string;
    price?: number;
    servicePoints: ServicePointWithEditing[];
  }>({
    name: '',
    price: undefined,
    servicePoints: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user?.id || user?.role !== 'customer') {
        navigate('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, price')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const { data: servicePoints, error: pointsError } = await supabase
        .from('service_points')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at');

      if (pointsError) throw pointsError;

      setProfile({
        name: userData?.name || '',
        price: userData?.price,
        servicePoints: servicePoints || []
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('טעינת הפרופיל נכשלה');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }

  const toggleEditing = (index: number) => {
    setProfile(prev => ({
      ...prev,
      servicePoints: prev.servicePoints.map((point, i) => 
        i === index ? { ...point, isEditing: !point.isEditing } : point
      )
    }));
  };

  const handleScentTypeChange = async (pointId: string, index: number, newScentType: string) => {
    try {
      const { error } = await supabase
        .from('service_points')
        .update({ scent_type: newScentType })
        .eq('id', pointId);

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        servicePoints: prev.servicePoints.map((point, i) => 
          i === index ? { ...point, scent_type: newScentType, isEditing: false } : point
        )
      }));

      toast.success('סוג הריח עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating scent type:', error);
      toast.error('עדכון סוג הריח נכשל');
    }
  };

  if (loading) {
    return (
      <Layout userRole="customer">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="customer">
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            ברוך הבא למערכת
          </h1>
          <p className="text-xl text-gray-400">{profile.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profile.servicePoints.map((point, index) => (
            <div 
              key={point.id} 
              className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm">
                    {point.device_type}
                  </div>
                  {point.isEditing ? (
                    <button
                      onClick={() => toggleEditing(index)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleEditing(index)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="flex-grow">
                  {point.isEditing ? (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-300">
                        סוג ריח
                      </label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={point.scent_type}
                          onChange={(e) => handleScentTypeChange(point.id, index, e.target.value)}
                          className="flex-grow rounded-lg bg-gray-700 border-gray-600 text-white text-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                        >
                          {SCENT_TYPES.map((scent) => (
                            <option key={scent} value={scent}>{scent}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleScentTypeChange(point.id, index, point.scent_type)}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-2"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-gray-400 text-sm mb-2">סוג ריח</div>
                      <div className="text-white text-lg font-medium">
                        {point.scent_type}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {profile.servicePoints.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <p className="text-gray-400">אין נקודות שירות</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}