import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import { abortedBookingApi } from '../../api/abortedBookingApi.js';
import { toast } from 'react-hot-toast';

export default function AbortedBookings() {
  const { roleSlug } = useParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await abortedBookingApi.getAbortedBookings({ page, limit: 10, type: filterType });
      setBookings(res.abortedBookings);
      setTotalPages(res.totalPages);
    } catch (error) {
      toast.error('Failed to load aborted bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, filterType]);

  const getTypeStyle = (type) => {
    switch(type) {
      case 'Void': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Discard': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Cancel': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <AdminHeader 
          title="Aborted Bookings" 
          description="View all Cancelled, Discarded, and Voided booking attempts."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8 flex gap-3">
           <button 
             onClick={() => { setFilterType(''); setPage(1); }}
             className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${filterType === '' ? 'bg-brand-blue text-white shadow-md' : 'bg-white text-ink/60 border border-slate-200 hover:bg-slate-50'}`}
           >
             All
           </button>
           {['Cancel', 'Discard', 'Void'].map(t => (
              <button 
                key={t}
                onClick={() => { setFilterType(t); setPage(1); }}
                className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${filterType === t ? 'bg-brand-blue text-white shadow-md' : 'bg-white text-ink/60 border border-slate-200 hover:bg-slate-50'}`}
              >
                {t}
              </button>
           ))}
        </div>

        <div className="mt-6 soft-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-100 text-ink/40 font-black uppercase tracking-widest text-xs">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Customer Info</th>
                  <th className="px-6 py-4">Booking Info</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-ink/40 font-bold">
                      Loading...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-ink/40 font-bold">
                      No aborted bookings found.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-ink">{new Date(booking.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-ink/40 font-bold mt-1">{new Date(booking.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-ink">{booking.cashierId?.name || 'Unknown'}</div>
                        <div className="text-xs text-ink/40 font-bold mt-1">{booking.cashierId?.role}</div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="font-bold text-ink">{booking.attemptData?.customerName || 'N/A'}</div>
                         <div className="text-xs text-ink/40 font-bold mt-1">{booking.attemptData?.customerPhone || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="font-bold text-ink capitalize">{booking.attemptData?.bookingMode || 'Unknown'}</div>
                         <div className="text-xs text-brand-blue font-black mt-1 truncate max-w-[200px]">{booking.attemptData?.className || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getTypeStyle(booking.type)}`}>
                          {booking.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <p className="text-sm font-medium text-ink max-w-sm leading-relaxed">{booking.reason}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-ink/60">Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}
