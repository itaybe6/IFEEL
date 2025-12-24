import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { PenTool as Tool, SprayCan as Spray, Plus, X, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Device {
  id: string;
  name: string;
  refill_amount: number;
  isEditing?: boolean;
}

interface Scent {
  id: string;
  name: string;
  isEditing?: boolean;
}

interface DeleteConfirmModalProps {
  device: Device;
  servicePointCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ device, servicePointCount, onClose, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4 text-yellow-400">
          <AlertTriangle className="h-6 w-6 ml-2" />
          <h2 className="text-xl font-bold">אזהרה</h2>
        </div>
        
        <p className="text-white mb-4">
          המכשיר "{device.name}" נמצא בשימוש ב-{servicePointCount} נקודות שירות.
          מחיקת המכשיר תמחק גם את כל נקודות השירות המשויכות אליו.
        </p>
        
        <p className="text-gray-400 mb-6">
          האם אתה בטוח שברצונך למחוק את המכשיר?
        </p>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            מחק מכשיר
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDevicesAndScents() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [scents, setScents] = useState<Scent[]>([]);
  const [newDevice, setNewDevice] = useState('');
  const [newDeviceRefill, setNewDeviceRefill] = useState<number>(0);
  const [newScent, setNewScent] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    device: Device;
    servicePointCount: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      console.error('Error loading data:', error);
      toast.error('טעינת הנתונים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.trim()) {
      toast.error('נא להזין שם מכשיר');
      return;
    }

    if (newDeviceRefill <= 0) {
      toast.error('נא להזין כמות מילוי חוקית');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .insert([{ 
          name: newDevice,
          refill_amount: newDeviceRefill
        }])
        .select()
        .single();

      if (error) throw error;

      setDevices(prev => [...prev, data]);
      setNewDevice('');
      setNewDeviceRefill(0);
      toast.success('המכשיר נוסף בהצלחה');
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('הוספת המכשיר נכשלה');
    }
  };

  const handleAddScent = async () => {
    if (!newScent.trim()) {
      toast.error('נא להזין שם ניחוח');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('scents')
        .insert([{ name: newScent }])
        .select()
        .single();

      if (error) throw error;

      setScents(prev => [...prev, data]);
      setNewScent('');
      toast.success('הניחוח נוסף בהצלחה');
    } catch (error) {
      console.error('Error adding scent:', error);
      toast.error('הוספת הניחוח נכשלה');
    }
  };

  const handleEditDevice = async (id: string, updates: Partial<Device>) => {
    if ('refill_amount' in updates && updates.refill_amount && updates.refill_amount <= 0) {
      toast.error('כמות המילוי חייבת להיות גדולה מ-0');
      return;
    }

    try {
      const { error } = await supabase
        .from('devices')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setDevices(prev =>
        prev.map(device =>
          device.id === id ? { ...device, ...updates, isEditing: false } : device
        )
      );
      toast.success('המכשיר עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('עדכון המכשיר נכשל');
    }
  };

  const handleEditScent = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('scents')
        .update({ name: newName })
        .eq('id', id);

      if (error) throw error;

      setScents(prev =>
        prev.map(scent =>
          scent.id === id ? { ...scent, name: newName, isEditing: false } : scent
        )
      );
      toast.success('הניחוח עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating scent:', error);
      toast.error('עדכון הניחוח נכשל');
    }
  };

  const handleDeleteDevice = async (device: Device) => {
    try {
      // First check if the device is being used by any service points
      const { count, error: countError } = await supabase
        .from('service_points')
        .select('*', { count: 'exact', head: true })
        .eq('device_type', device.name);

      if (countError) throw countError;

      if (count && count > 0) {
        // Show confirmation modal if service points exist
        setDeleteConfirmation({ device, servicePointCount: count });
        return;
      }

      // If no service points, proceed with deletion
      await performDeviceDeletion(device.id);
    } catch (error) {
      console.error('Error checking device usage:', error);
      toast.error('בדיקת השימוש במכשיר נכשלה');
    }
  };

  const performDeviceDeletion = async (deviceId: string) => {
    try {
      // First delete all service points using this device
      const { error: servicePointsError } = await supabase
        .from('service_points')
        .delete()
        .eq('device_type', devices.find(d => d.id === deviceId)?.name || '');

      if (servicePointsError) throw servicePointsError;

      // Then delete the device
      const { error: deviceError } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (deviceError) throw deviceError;

      setDevices(prev => prev.filter(device => device.id !== deviceId));
      setDeleteConfirmation(null);
      toast.success('המכשיר נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('מחיקת המכשיר נכשלה');
    }
  };

  const handleDeleteScent = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הניחוח?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setScents(prev => prev.filter(scent => scent.id !== id));
      toast.success('הניחוח נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting scent:', error);
      toast.error('מחיקת הניחוח נכשלה');
    }
  };

  const toggleEditing = (id: string, type: 'device' | 'scent') => {
    if (type === 'device') {
      setDevices(prev =>
        prev.map(device =>
          device.id === id ? { ...device, isEditing: !device.isEditing } : device
        )
      );
    } else {
      setScents(prev =>
        prev.map(scent =>
          scent.id === id ? { ...scent, isEditing: !scent.isEditing } : scent
        )
      );
    }
  };

  if (loading) {
    return (
      <Layout userRole="admin">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="admin">
      <div className="space-y-8">
        {/* Devices Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Tool className="h-6 w-6 text-blue-400 ml-2" />
              <h2 className="text-xl font-bold text-white">מכשירי בישום</h2>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-grow grid grid-cols-2 gap-4">
              <input
                type="text"
                value={newDevice}
                onChange={(e) => setNewDevice(e.target.value)}
                placeholder="שם המכשיר החדש..."
                className="rounded-lg bg-gray-800 border-gray-700 text-white px-4 py-2"
              />
              <input
                type="number"
                value={newDeviceRefill || ''}
                onChange={(e) => setNewDeviceRefill(parseInt(e.target.value) || 0)}
                placeholder="כמות מילוי..."
                className="rounded-lg bg-gray-800 border-gray-700 text-white px-4 py-2"
              />
            </div>
            <button
              onClick={handleAddDevice}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 ml-2" />
              הוסף מכשיר
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                {device.isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 gap-2">
                      <input
                        type="text"
                        defaultValue={device.name}
                        className="flex-grow rounded-lg bg-gray-700 border-gray-600 text-white px-3 py-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditDevice(device.id, { name: e.currentTarget.value });
                          }
                        }}
                      />
                      <button
                        onClick={() => toggleEditing(device.id, 'device')}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 gap-2">
                      <input
                        type="number"
                        defaultValue={device.refill_amount}
                        className="flex-grow rounded-lg bg-gray-700 border-gray-600 text-white px-3 py-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = parseInt(e.currentTarget.value);
                            if (value > 0) {
                              handleEditDevice(device.id, { refill_amount: value });
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => toggleEditing(device.id, 'device')}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white">{device.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleEditing(device.id, 'device')}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      כמות מילוי: {device.refill_amount}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scents Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Spray className="h-6 w-6 text-purple-400 ml-2" />
              <h2 className="text-xl font-bold text-white">סוגי ניחוחות</h2>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={newScent}
              onChange={(e) => setNewScent(e.target.value)}
              placeholder="שם הניחוח החדש..."
              className="flex-grow rounded-lg bg-gray-800 border-gray-700 text-white px-4 py-2"
            />
            <button
              onClick={handleAddScent}
              className="bg-purple-600 text-white rounded-lg px-4 py-2 flex items-center hover:bg-purple-700"
            >
              <Plus className="h-5 w-5 ml-2" />
              הוסף ניחוח
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scents.map((scent) => (
              <div
                key={scent.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                {scent.isEditing ? (
                  <div className="flex items-center space-x-2 gap-2">
                    <input
                      type="text"
                      defaultValue={scent.name}
                      className="flex-grow rounded-lg bg-gray-700 border-gray-600 text-white px-3 py-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEditScent(scent.id, e.currentTarget.value);
                        }
                      }}
                    />
                    <button
                      onClick={() => toggleEditing(scent.id, 'scent')}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-white">{scent.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEditing(scent.id, 'scent')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteScent(scent.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {deleteConfirmation && (
        <DeleteConfirmModal
          device={deleteConfirmation.device}
          servicePointCount={deleteConfirmation.servicePointCount}
          onClose={() => setDeleteConfirmation(null)}
          onConfirm={() => performDeviceDeletion(deleteConfirmation.device.id)}
        />
      )}
    </Layout>
  );
}