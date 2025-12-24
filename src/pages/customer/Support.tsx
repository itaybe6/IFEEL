import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import toast from 'react-hot-toast';
import { LifeBuoy } from 'lucide-react';

export default function CustomerSupport() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.description) {
      toast.error('נא למלא את כל השדות');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert([
          {
            customer_name: formData.name,
            phone: formData.phone,
            description: formData.description,
            is_new: true
          }
        ]);
      
      if (error) throw error;
      
      toast.success('פנייתך התקבלה בהצלחה');
      setFormData(prev => ({
        ...prev,
        description: ''
      }));
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error('אירעה שגיאה בשליחת הפנייה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout userRole="customer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">תמיכה טכנית</h1>
          <LifeBuoy className="h-8 w-8 text-blue-400" />
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  שם מלא
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  מספר טלפון
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  required
                  dir="ltr"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                תיאור הבעיה
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'שולח...' : 'שלח פנייה'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">מידע נוסף</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              מערכת התמיכה הטכנית שלנו זמינה 24/7 לסייע לך בכל בעיה או שאלה.
            </p>
            <p>
              לאחר שליחת הפנייה, צוות התמיכה שלנו יצור איתך קשר בהקדם האפשרי.
            </p>
            <p>
              ניתן גם ליצור קשר ישירות בטלפון: <span className="text-blue-400 font-medium" dir="ltr">08-6422822</span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}