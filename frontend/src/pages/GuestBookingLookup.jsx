import { useState } from 'react';
import api from '../api/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function GuestBookingLookup() {
  const [email, setEmail] = useState('');
  const [bookingNumber, setBookingNumber] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBooking(null);

    try {
      const res = await api.get(`/bookings/lookup?email=${email}&bookingNumber=${bookingNumber}`);
      setBooking(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking not found. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-black text-brand-black">My Booking</h1>
            <p className="mt-2 text-brand-black/50">Enter your details to view your enrollment status.</p>
          </div>

          <form onSubmit={handleLookup} className="bg-white rounded-3xl shadow-xl shadow-brand-blue/5 border border-brand-blue/10 p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-brand-black/40 mb-2 px-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter the email used for booking"
                  className="w-full rounded-2xl border border-brand-black/5 bg-slate-50 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-brand-black/40 mb-2 px-1">Booking Number</label>
                <input
                  type="text"
                  required
                  value={bookingNumber}
                  onChange={(e) => setBookingNumber(e.target.value)}
                  placeholder="e.g. BK-260330-XXXX"
                  className="w-full rounded-2xl border border-brand-black/5 bg-slate-50 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-brand-blue py-4 text-sm font-black text-white shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                {loading ? 'Finding record...' : 'Find My Booking'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-red-500">{error}</p>
            </div>
          )}

          {booking && (
            <div className="mt-8 animate-fadeIn">
              <div className="bg-white rounded-3xl shadow-xl border border-brand-blue/10 overflow-hidden text-center p-8">
                <div className="inline-flex items-center gap-2 bg-brand-blue/5 border border-brand-blue/10 px-4 py-1.5 rounded-full mb-6 text-[10px] font-black tracking-widest text-brand-blue uppercase">
                  #{booking.bookingNumber}
                </div>
                
                <h2 className="text-2xl font-black text-brand-black mb-1">{booking.classId?.title}</h2>
                <p className="text-sm text-brand-black/40 mb-6">{booking.locationId?.name || 'Main Center'}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-brand-black/30 uppercase tracking-widest mb-1">Status</p>
                    <p className={`text-sm font-black uppercase ${booking.status === 'confirmed' ? 'text-green-500' : 'text-amber-500'}`}>
                       {booking.status}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-brand-black/30 uppercase tracking-widest mb-1">Payment</p>
                    <p className={`text-sm font-black uppercase ${booking.paymentStatus === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                       {booking.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-left bg-slate-50 rounded-2xl p-5 border border-brand-black/5">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-brand-black/40">Participants</span>
                      <span className="text-sm font-black text-brand-black">
                        {booking.participants?.map(p => p.name).join(', ')}
                      </span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-brand-black/40">Date</span>
                      <span className="text-sm font-black text-brand-black">
                        {new Date(booking.date).toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                   </div>
                   {booking.sessionId?.startTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-brand-black/40">Time</span>
                        <span className="text-sm font-black text-brand-black">{booking.sessionId.startTime}</span>
                      </div>
                   )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
