import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { SupportTicket } from '../../types/database';
import { Trash2, Phone, Calendar, Search, X, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface DescriptionModalProps {
  description: string;
  onClose: () => void;
}

function DescriptionModal({ description, onClose }: DescriptionModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">תיאור מלא</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-300 whitespace-pre-wrap">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('support_tickets_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'support_tickets' 
      }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Mark all new tickets as read
      const newTicketIds = data?.filter(ticket => ticket.is_new).map(ticket => ticket.id) || [];
      
      if (newTicketIds.length > 0) {
        await supabase
          .from('support_tickets')
          .update({ is_new: false })
          .in('id', newTicketIds);
      }
      
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast.error('טעינת פניות התמיכה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק פנייה זו?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTickets(tickets.filter(ticket => ticket.id !== id));
      toast.success('הפנייה נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting support ticket:', error);
      toast.error('מחיקת הפנייה נכשלה');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      ticket.customer_name.toLowerCase().includes(query) ||
      ticket.phone.includes(query) ||
      ticket.description.toLowerCase().includes(query)
    );
  });

  // Function to render ticket card for mobile view
  const renderTicketCard = (ticket: SupportTicket) => {
    return (
      <div key={ticket.id} className="bg-gray-800 rounded-lg p-5 border border-gray-700 mb-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium text-white">{ticket.customer_name}</h3>
          <button
            onClick={() => handleDeleteTicket(ticket.id)}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-300 text-sm">
            <Phone className="h-4 w-4 ml-2" />
            <span dir="ltr">{ticket.phone}</span>
          </div>
          <div className="flex items-center text-gray-300 text-sm">
            <Calendar className="h-4 w-4 ml-2" />
            {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
        
        <div className="bg-gray-700 p-3 rounded-lg text-gray-300 text-sm relative">
          <p className="line-clamp-3">{ticket.description}</p>
          <button
            onClick={() => setSelectedDescription(ticket.description)}
            className="absolute bottom-1 left-1 text-blue-400 hover:text-blue-300"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Layout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">ניהול פניות תמיכה</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="חיפוש לפי שם, טלפון או תוכן..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pr-10 py-3 px-4 rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-white transition ease-in-out duration-150 cursor-not-allowed">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              טוען פניות...
            </div>
          </div>
        ) : (
          <>
            {/* Mobile view - cards */}
            <div className="sm:hidden">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-400">לא נמצאו פניות תמיכה</p>
                </div>
              ) : (
                filteredTickets.map(ticket => renderTicketCard(ticket))
              )}
            </div>
            
            {/* Desktop view - table */}
            <div className="hidden sm:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">לקוח</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">טלפון</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">תאריך</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">תיאור</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          לא נמצאו פניות תמיכה
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-700">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                            {ticket.customer_name}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300" dir="ltr">
                            {ticket.phone}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                            {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-300 max-w-md relative">
                            <div className="flex items-center">
                              <p className="truncate">{ticket.description}</p>
                              <button
                                onClick={() => setSelectedDescription(ticket.description)}
                                className="ml-2 text-blue-400 hover:text-blue-300"
                                title="הצג תיאור מלא"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
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

      {selectedDescription && (
        <DescriptionModal
          description={selectedDescription}
          onClose={() => setSelectedDescription(null)}
        />
      )}
    </Layout>
  );
}