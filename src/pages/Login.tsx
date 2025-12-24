import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useLoading } from '../components/LoadingProvider';
import { useAuth } from '../components/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsLoading } = useLoading();
  const { setUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (userError || !userData) {
        console.error('Login error:', userError);
        toast.error('מספר טלפון לא קיים במערכת');
        setIsLoading(false);
        return;
      }

      if (userData.password !== password) {
        toast.error('סיסמה שגויה');
        setIsLoading(false);
        return;
      }

      // Set user in context
      setUser(userData);

      // Get the redirect path from location state or use default based on role
      const from = location.state?.from?.pathname || `/${userData.role}`;
      
      // Show success message
      toast.success('התחברת בהצלחה!');
      
      // Important: Navigate after a short delay to ensure the toast is visible
      // and the user state is properly set
      setTimeout(() => {
        navigate(from, { replace: true });
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('התחברות נכשלה. אנא נסה שוב מאוחר יותר.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-heebo">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="https://wlzreoiumzmfbskzuywj.supabase.co/storage/v1/object/public/logo//ocd%20logo-02.png" 
            alt="לוגו שירותי ריח" 
            className="h-32 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          התחברות למערכת
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400 font-light">
          מלאו את הפרטים למטה כדי להתחבר למערכת
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 py-8 px-6 mx-4 sm:mx-0 shadow-xl rounded-lg sm:px-10 border border-gray-800">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="form-group">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                מספר טלפון
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pr-10 py-3 sm:text-sm bg-gray-800 border-gray-700 text-white rounded-md focus:ring-gray-600 focus:border-gray-600"
                  placeholder="מספר פלאפון"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                סיסמה
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 py-3 sm:text-sm bg-gray-800 border-gray-700 text-white rounded-md focus:ring-gray-600 focus:border-gray-600"
                  placeholder="סיסמא"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                התחבר
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}