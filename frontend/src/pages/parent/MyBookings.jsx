import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import ReviewModal from '../../components/ReviewModal.jsx';

// - [x] Populate `planId` in `getMyBookings` (Backend) <!-- id: 67 -->
// - [/] Update `MyBookings.jsx` UI to display package names <!-- id: 68 -->
// - [/] Update search logic in `MyBookings.jsx` to include plans <!-- id: 69 -->

export default function MyBookings() {
  const { currency, globalSettings } = useSettings();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState({ targetType: '', targetId: '' });

  const openDetail = async (booking) => {
    setDetailBooking(booking);
    setSchedule([]);
    if (booking.bookingType === 'package') {
      setLoadingSchedule(true);
      try {
        const res = await api.get(`/bookings/${booking._id}/schedule`);
        setSchedule(res.data);
      } catch (err) {
        console.error('Failed to load schedule', err);
      } finally {
        setLoadingSchedule(false);
      }
    }
  };

  const load = () => {
    setLoading(true);
    api.get('/bookings/mine').then((res) => {
      const result = [];
      const grouped = {};
      res.data.forEach(b => {
        if (b.groupId) {
          if (!grouped[b.groupId]) {
            grouped[b.groupId] = { ...b, sessions: b.sessionId ? [b.sessionId] : [], groupedIds: [b._id] };
            result.push(grouped[b.groupId]);
          } else {
            const group = grouped[b.groupId];
            const pIds = new Set(group.participants.map(p => p.name + p.age));
            b.participants?.forEach(p => {
              if (!pIds.has(p.name + p.age)) {
                 group.participants.push(p);
                 pIds.add(p.name + p.age);
              }
            });
            if (b.sessionId && !group.sessions.some(s => String(s._id) === String(b.sessionId._id || b.sessionId))) {
              group.sessions.push(b.sessionId);
            }
            group.groupedIds.push(b._id);
          }
        } else {
          result.push({ ...b, sessions: b.sessionId ? [b.sessionId] : [], groupedIds: [b._id] });
        }
      });
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(result);
      setFilteredBookings(result);
      setLoading(false);
    }).catch((err) => {
      setError(err?.response?.data?.message || 'Failed to load bookings. Please check your connection.');
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let result = [...bookings];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.classId?.title?.toLowerCase().includes(q) ||
        b.planId?.name?.toLowerCase().includes(q) ||
        b.participants?.some(p => p.name?.toLowerCase().includes(q)) ||
        b.bookingNumber?.toLowerCase().includes(q) ||
        b.paymentReference?.toLowerCase().includes(q) ||
        b._id.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    if (dateFilter) {
      result = result.filter(b => new Date(b.date).toISOString().split('T')[0] === dateFilter);
    }

    setFilteredBookings(result);
  }, [searchQuery, statusFilter, dateFilter, bookings]);

  const openPayment = (booking) => {
    setSelectedBooking(booking);
    setCardForm({ name: '', number: '', expiry: '', cvc: '' });
    setMessage('');
    setError('');
  };

  const closePayment = () => {
    setSelectedBooking(null);
  };

  const handleCardChange = (event) => {
    let { name, value } = event.target;
    if (name === 'number') {
      value = value.replace(/\D/g, '').slice(0, 16);
      value = value.match(/.{1,4}/g)?.join(' ') || value;
    }
    if (name === 'expiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (name === 'cvc') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setCardForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePay = async (event) => {
    event.preventDefault();
    if (!selectedBooking) return;

    if (!cardForm.name || !cardForm.number || !cardForm.expiry || !cardForm.cvc) {
      setError('Please complete card details.');
      return;
    }

    const last4 = cardForm.number.replace(/\s/g, '').slice(-4);
    const reference = `mock_${Date.now()}`;

    try {
      setIsSubmitting(true);
      await api.post('/payments/booking', {
        bookingId: selectedBooking._id,
        paymentMethod: 'card',
        reference,
        last4
      });
      setMessage('Payment successful. Booking confirmed.');
      closePayment();
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Payment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefundRequest = async (bookingId) => {
    if (!window.confirm('Are you sure you want to request a refund?')) return;
    try {
      await api.post(`/bookings/${bookingId}/refund-request`);
      setMessage('Refund request submitted successfully.');
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to request refund.');
    }
  };

  const isRefundable = (booking) => {
    if (globalSettings?.allow_refund_request === false) return false;

    if (booking.refundStatus !== 'none') return false;
    if (['attended', 'completed', 'cancelled'].includes(booking.status)) return false;

    const isPaid = booking.paymentStatus === 'completed' || booking.status === 'confirmed';
    if (!isPaid) return false;

    // Center payments must be completed before they can be refunded
    if (booking.paymentMethod === 'center' && booking.paymentStatus !== 'completed') return false;

    const now = new Date();
    const sessionDate = new Date(booking.date);

    // Allow refund if paid AND session is in the future
    return booking.paymentStatus === 'completed' && now < sessionDate;
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="page-shell py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl">My Booking</h1>
            <p className="mt-2 text-sm text-ink/70">Pay and manage your class bookings.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral"
            />
          </div>
        </div>

        {message ? <p className="mt-3 text-sm text-moss font-bold">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-coral font-bold">{error}</p> : null}

        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-white/50 border border-dashed border-ink/10">
              <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-ink/50 font-bold">Loading your bookings...</p>
            </div>
          ) : filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <div key={booking._id} className="relative overflow-hidden rounded-[32px] bg-white shadow-sm border border-black/5 transition hover:shadow-md group">
                {booking.refundStatus && booking.refundStatus !== 'none' && (
                  <div className={`py-2.5 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] shadow-sm ${
                    booking.refundStatus === 'refunded' ? 'bg-rose-500 text-white' : 'bg-amber-400 text-ink'
                  }`}>
                    {booking.refundStatus === 'refunded' ? '✨ Order Processed & Refunded ✨' : '⏳ Refund Request Under Review ⏳'}
                  </div>
                )}
                <div className="p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-semibold text-ink">
                        {booking.classId?.title || booking.planId?.name || 'Package Membership'}
                      </p>
                      {booking.bookingNumber && (
                        <span className="rounded bg-brand-blue/10 px-2 py-0.5 text-[10px] font-black text-brand-blue uppercase">
                          {booking.bookingNumber}
                        </span>
                      )}
                      {booking.paymentReference && (
                        <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600 uppercase">
                          Ref: {booking.paymentReference}
                        </span>
                      )}
                      {/* Booking Type Badge */}
                      <span className={`rounded px-2  py-0.5 text-[10px] font-bold uppercase tracking-tight ${booking.bookingType === 'package' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                        {booking.bookingType === 'package' ? '📦 Membership / Package' : booking.groupId ? '🧑‍🤝‍🧑 Group / Multi-Session' : '🎟️ Single Session'}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="flex items-center gap-2 text-xs text-ink/70">
                        <span className="font-medium">Participant(s):</span> {booking.participants?.map(p => `${p.name} (${p.relation || 'N/A'})`).join(', ')}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-ink/70">
                        <span className="font-medium">Date:</span> {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-ink/40">ID: {booking._id}</p>
                    </div>

                    {['attended', 'completed'].includes(booking.status) && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 animate-in zoom-in-95 duration-500">
                        <span className="text-[10px]">✅</span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Attendance Verified</span>
                      </div>
                    )}

                    {/* Cancellation Notice (Only shown for trainer/admin cancellations, hidden if already refunded) */}
                    {booking.status === 'cancelled' && booking.refundStatus !== 'refunded' && booking.cancellationReason && (
                      <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <span>📢</span> Session Status: Cancelled
                        </p>
                        <p className="text-[11px] font-bold text-red-700 leading-relaxed italic">
                          "{booking.cancellationReason}"
                        </p>
                        <p className="mt-2 text-[8px] font-medium text-red-400 uppercase tracking-[0.05em]">
                          Please contact support or check-in at the center for reschedule options.
                        </p>
                      </div>
                    )}

                    {booking.refundStatus && booking.refundStatus !== 'none' && booking.refundStatus === 'declined' && booking.refundRejectionReason && (
                      <p className="text-[10px] text-red-500 font-medium max-w-[150px] text-right">
                        Reason: {booking.refundRejectionReason}
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-4">
                      <Link
                        to={`/invoice/booking/${booking._id}`}
                        className="text-[9px] font-black text-brand-blue/40 uppercase tracking-widest hover:text-brand-blue transition-colors flex items-center gap-1.5"
                      >
                        <span>📜</span> View Invoice
                      </Link>
                      <button
                        onClick={() => openDetail(booking)}
                        className="text-[9px] font-black text-coral/40 uppercase tracking-widest hover:text-coral transition-colors flex items-center gap-1.5"
                      >
                        <span>🔍</span> View Detail
                      </button>
                      {['attended', 'completed'].includes(booking.status) && (
                        <button
                          onClick={() => {
                            setReviewTarget({
                              targetType: booking.bookingType === 'package' ? 'Plan' : 'Class',
                              targetId: booking.planId?._id || booking.classId?._id
                            });
                            setReviewModalOpen(true);
                          }}
                          className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest hover:text-amber-500 transition-colors flex items-center gap-1.5 ml-2"
                        >
                          <span>⭐</span> Leave Review
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 min-w-[120px]">
                    <div className="flex flex-col items-end gap-2">
                       <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm border transition-all ${
                          booking.refundStatus === 'refunded' ? 'bg-rose-100 text-rose-600 border-rose-200 shadow-rose-100/20' :
                          booking.status === 'confirmed' ? 'bg-moss/10 text-moss border-transparent' :
                          (booking.status === 'pending' || (booking.paymentMethod === 'center' && booking.status === 'pending')) ? 'bg-amber-100 text-amber-600 border-amber-200' :
                          'bg-red-100 text-red-600 border-red-200'
                       }`}>
                         {booking.refundStatus === 'refunded' ? 'Refunded' : (booking.paymentMethod === 'center' && booking.status === 'pending' ? 'Pending Payment' : booking.status)}
                       </span>

                       {booking.refundStatus && booking.refundStatus !== 'none' && booking.refundStatus !== 'refunded' && (
                         <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm border ${
                            booking.refundStatus === 'requested' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                            booking.refundStatus === 'refunded' ? 'bg-rose-100 text-rose-600 border-rose-200' :
                            'bg-red-50 text-red-400 border-red-100'
                         }`}>
                           {booking.refundStatus === 'requested' ? 'Refund Requested' : booking.refundStatus === 'refunded' ? 'Refunded' : `Refund: ${booking.refundStatus}`}
                         </span>
                       )}
                    </div>

                    <div className="mt-auto">
                      {booking.status !== 'confirmed' && booking.status !== 'cancelled' && booking.paymentStatus !== 'completed' && booking.paymentMethod !== 'center' ? (
                        <button
                          className="rounded-full bg-coral px-5 py-2 text-xs font-bold text-white shadow-lg shadow-coral/20 transition hover:scale-105 active:scale-95"
                          onClick={() => openPayment(booking)}
                        >
                          Pay now
                        </button>
                      ) : booking.paymentMethod === 'center' && booking.paymentStatus === 'pending' ? (
                        <p className="text-[10px] font-bold text-ink/30 italic">Please pay at the center</p>
                      ) : isRefundable(booking) ? (
                        <button
                          className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 hover:scale-105 active:scale-95"
                          onClick={() => handleRefundRequest(booking._id)}
                        >
                          Request Refund
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

                {/* Full-Width Milestone Indicator */}
                <div className="mt-2 pt-8 border-t border-slate-100/50 flex flex-col gap-2 bg-slate-50/30">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-ink/20 px-8">
                    <span>Paid</span>
                    <span>Attended</span>
                    <span>Finalized</span>
                    <span>Refund</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100/50 flex shadow-inner">
                    <div className={`h-full w-1/4 transition-all duration-700 ${(booking.status !== 'pending' && booking.status !== 'cancelled') || booking.refundStatus === 'refunded' || booking.refundStatus === 'requested' ? 'bg-emerald-400' : 'bg-transparent'}`} />
                    <div className={`h-full w-1/4 transition-all duration-700 border-l border-white ${['attended', 'completed'].includes(booking.status) ? 'bg-sky-400' : 'bg-transparent'}`} />
                    <div className={`h-full w-1/4 transition-all duration-700 border-l border-white ${booking.status === 'completed' ? 'bg-indigo-400' : 'bg-transparent'}`} />
                    <div className={`h-full w-1/4 transition-all duration-700 border-l border-white ${
                      booking.refundStatus === 'refunded' ? 'bg-rose-400' :
                      booking.refundStatus === 'requested' ? 'bg-amber-400' : 
                      booking.refundStatus === 'declined' ? 'bg-red-200' : 'bg-transparent'
                    }`} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-white/50 border border-dashed border-ink/10">
              <p className="text-sm text-ink/50">No bookings found matching your criteria.</p>
              {(searchQuery || statusFilter !== 'all' || dateFilter) && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDateFilter(''); }}
                  className="mt-4 text-xs font-semibold text-coral underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {selectedBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-brand-blue p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-display text-3xl font-black">Complete Payment</h3>
                <p className="mt-1 text-sm text-white/80 font-medium italic">Pay for {selectedBooking.classId?.title} • {currency} {selectedBooking.totalAmount || selectedBooking.classId?.price || 0}</p>
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="p-6">
              <div className="mb-6 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                <p>This is a secure simulation. No real money will be charged.</p>
              </div>

              <form className="grid gap-4" onSubmit={handlePay}>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50 px-1">Cardholder Name</label>
                  <input
                    className="w-full rounded-xl border border-ink/10 bg-slate-50 p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral/20 transition"
                    name="name"
                    placeholder="e.g. John Doe"
                    value={cardForm.name}
                    onChange={handleCardChange}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50 px-1">Card Number</label>
                  <input
                    className="w-full rounded-xl border border-ink/10 bg-slate-50 p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral/20 transition"
                    name="number"
                    placeholder="0000 0000 0000 0000"
                    value={cardForm.number}
                    onChange={handleCardChange}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50 px-1">Expiry Date</label>
                    <input
                      className="w-full rounded-xl border border-ink/10 bg-slate-50 p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral/20 transition"
                      name="expiry"
                      placeholder="MM/YY"
                      value={cardForm.expiry}
                      onChange={handleCardChange}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50 px-1">CVC</label>
                    <input
                      className="w-full rounded-xl border border-ink/10 bg-slate-50 p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral/20 transition"
                      name="cvc"
                      placeholder="123"
                      value={cardForm.cvc}
                      onChange={handleCardChange}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    className="w-full rounded-2xl bg-brand-blue py-5 text-sm font-black text-white shadow-xl shadow-brand-blue/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      `Pay {currency} ${selectedBooking.totalAmount || selectedBooking.classId?.price || 0}`
                    )}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border-2 border-slate-100 py-4 text-[10px] font-black uppercase tracking-widest text-ink/30 transition-all hover:bg-slate-50 hover:text-ink/50"
                    onClick={closePayment}
                  >
                    Cancel Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      {detailBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setDetailBooking(null)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-brand-blue p-8 text-white relative">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-2xl font-black">Booking Details</h3>
                  <p className="mt-1 text-sm text-white/80 font-medium">#{detailBooking.bookingNumber || detailBooking._id.slice(-8).toUpperCase()}</p>
                </div>
                <button onClick={() => setDetailBooking(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition">
                  <span className="text-xl">✕</span>
                </button>
              </div>
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid gap-8">
                {/* Status & Timing */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Status</p>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm border ${
                      detailBooking.status === 'confirmed' ? 'bg-moss/10 text-moss border-transparent' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {detailBooking.status}
                    </span>
                  </div>
                  <div className="text-right flex items-center justify-end gap-3">
                    <div className="h-10 w-10 rounded-xl bg-coral/10 flex items-center justify-center text-coral">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-0.5">Session Timing</p>
                      <p className="text-sm font-bold text-ink">
                        {detailBooking.sessions && detailBooking.sessions.length > 1 ? (
                           `${detailBooking.sessions.length} Sessions Selected`
                        ) : detailBooking.date ? (
                           `${new Date(detailBooking.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(detailBooking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        ) : 'Date TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Multi-Session List (if applicable) */}
                {detailBooking.sessions && detailBooking.sessions.length > 1 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-ink/30 mb-4 px-1">Selected Sessions</h4>
                    <div className="grid gap-2 mb-6">
                      {detailBooking.sessions.map((sess, idx) => {
                        const sessDate = sess.startTime || sess; // handle populated vs unpopulated
                        return (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-sm font-bold text-ink">
                              {new Date(sessDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-ink/50">
                              {new Date(sessDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Course/Plan Info */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-ink/30 mb-4 px-1">Order Information</h4>
                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100">
                    <div className="h-12 w-12 rounded-xl bg-coral/10 flex items-center justify-center text-xl">
                      {detailBooking.bookingType === 'package' ? '📦' : '🎟️'}
                    </div>
                    <div>
                      <p className="font-bold text-ink">{detailBooking.classId?.title || detailBooking.planId?.name}</p>
                      <p className="text-xs text-ink/50">{detailBooking.bookingType === 'package' ? 'Membership Package' : 'Single Session'}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="font-black text-brand-blue">{currency} {detailBooking.totalAmount}</p>
                      <p className="text-[10px] text-ink/30 uppercase font-bold">{detailBooking.paymentMethod?.replace('center_', '') || 'Card'}</p>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-ink/30 mb-4 px-1">Participants ({detailBooking.participants?.length || 0})</h4>
                  <div className="grid gap-3">
                    {detailBooking.participants?.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                            {p.gender === 'female' ? '👧' : '👦'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink">{p.name}</p>
                            <p className="text-[10px] text-ink/50 uppercase font-black">{p.relation || 'Customer'} • {p.age} Years • {p.gender}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Membership Schedule */}
                {detailBooking.bookingType === 'package' && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-ink/30 mb-4 px-1">Class Schedule</h4>
                    {loadingSchedule ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 animate-pulse">
                            <div className="h-3 w-32 bg-slate-100 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : schedule.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {schedule.map((s, idx) => (
                          <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-ink/20">{idx + 1}</span>
                              <div>
                                <p className="text-xs font-bold text-ink">
                                  {new Date(s.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-ink/50 uppercase font-bold">
                                  {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {s.trainerId?.name || 'Coach'}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${
                              s.attendanceStatus === 'present' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                              s.attendanceStatus === 'absent' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                              'bg-brand-blue/5 text-brand-blue border-brand-blue/10'
                            }`}>
                              {s.attendanceStatus === 'present' ? 'Present' : s.attendanceStatus === 'absent' ? 'Absent' : 'Upcoming'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-ink/30 italic px-1">No sessions generated yet.</p>
                    )}
                  </div>
                )}

                {/* Branch Info */}
                {detailBooking.locationId && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Branch Location</p>
                      <p className="text-sm font-bold text-indigo-900">{detailBooking.locationId.name || 'JTS Fitness Center'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Link
                to={`/invoice/booking/${detailBooking._id}`}
                className="rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest text-brand-blue hover:bg-brand-blue/5 transition"
              >
                View Invoice
              </Link>
              <button
                onClick={() => setDetailBooking(null)}
                className="rounded-xl bg-brand-blue px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand-blue/20 hover:scale-105 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ReviewModal 
        isOpen={reviewModalOpen} 
        onClose={() => setReviewModalOpen(false)} 
        targetType={reviewTarget.targetType} 
        targetId={reviewTarget.targetId} 
      />

      <Footer />
    </div>
  );
}

