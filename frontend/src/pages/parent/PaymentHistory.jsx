import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';

/* ── helpers ── */
function formatDateLabel(iso) {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString('en-AE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' });
}
function formatDateKey(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : 'unknown';
}
function formatCurrency(amount, currencySymbol = 'AED') {
  return `${currencySymbol} ${Number(amount || 0).toFixed(2)}`;
}

const STATUS_COLORS = {
  paid:    { bg: 'rgba(16,185,129,0.12)', text: '#059669', dot: '#10b981', label: 'Paid' },
  pending: { bg: 'rgba(245,158,11,0.12)', text: '#b45309', dot: '#f59e0b', label: 'Pending' },
  failed:  { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', dot: '#ef4444', label: 'Failed' },
};
const METHOD_LABELS = {
  card: '💳 Card',
  cash: '💵 Cash',
  online: '🌐 Online',
  center: '🏫 At Center'
};

const formatPaymentMethod = (payment) => {
  const method = payment.paymentMethod;
  if (!method) return '💳 Card';
  
  const refText = payment.reference ? ` (#${payment.reference})` : '';

  if (method.startsWith('center_')) {
    const actualMethod = method.split('_')[1];
    const icon = actualMethod === 'cash' ? '💵' : actualMethod === 'card' ? '💳' : '🌐';
    return `${icon} Pay at Center: ${actualMethod.charAt(0).toUpperCase() + actualMethod.slice(1)}${refText}`;
  }
  
  if (method === 'online' || method === 'card') {
    return `${METHOD_LABELS[method] || '💳 Card'}${refText}`;
  }

  return METHOD_LABELS[method] || '💳 Card';
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all'); // all | paid | pending | failed
  const { currency } = useSettings();

  useEffect(() => {
    setLoading(true);
    api.get('/payments/mine')
      .then((res) => setPayments(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [expandedId, setExpandedId] = useState(null);

  /* ── summary stats ── */
  const totalPaid    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const countPaid    = payments.filter(p => p.status === 'paid').length;
  const countPending = payments.filter(p => p.status === 'pending').length;

  /* ── filtered ── */
  const filtered = useMemo(() =>
    filter === 'all' ? payments : payments.filter(p => p.status === filter),
    [payments, filter]
  );

  /* ── group by date ── */
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = formatDateKey(p.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 pb-16 pt-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/dashboard" className="text-xs font-bold text-brand-black/40 hover:text-brand-blue transition-colors">
            Dashboard
          </Link>
          <svg className="w-3 h-3 text-brand-black/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-bold text-brand-black/60">Payment History</span>
        </div>

        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-blue mb-1">My Account</p>
          <h1 className="font-display text-3xl font-black text-brand-black">Payment History</h1>
          <p className="mt-1 text-sm text-brand-black/50">Track your membership payments, bookings, and receipts.</p>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: 'rgba(26,107,255,0.07)', border: '1px solid rgba(26,107,255,0.2)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-blue">Total Spent</p>
            <p className="text-2xl font-black text-brand-black">{formatCurrency(totalPaid, currency)}</p>
            <p className="text-xs text-brand-black/40">{countPaid} successful payment{countPaid !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Completed</p>
            <p className="text-2xl font-black text-brand-black">{countPaid}</p>
            <p className="text-xs text-brand-black/40">payments confirmed</p>
          </div>
          <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Pending</p>
            <p className="text-2xl font-black text-brand-black">{countPending}</p>
            <p className="text-xs text-brand-black/40">awaiting confirmation</p>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'paid', 'pending', 'failed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all ${
                filter === f
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'bg-white border border-brand-black/10 text-brand-black/50 hover:border-brand-blue/30 hover:text-brand-blue'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-4 border-brand-blue/20 border-t-brand-blue animate-spin" />
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-brand-black/30">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg font-bold">No payments found</p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="mt-3 text-sm font-bold text-brand-blue hover:underline">
                Show all payments
              </button>
            )}
          </div>
        )}

        {/* ── Date-wise groups ── */}
        {!loading && (
          <div className="space-y-8">
            {grouped.map(([dateKey, dayPayments]) => {
              const dayTotal = dayPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
              const isToday  = dateKey === todayKey;

              return (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: isToday ? '#1a6bff' : '#cbd5e1' }} />
                      <h2 className="text-xs font-black uppercase tracking-widest text-brand-black/50">
                        {isToday ? '📅 Today — ' : ''}{formatDateLabel(dateKey)}
                      </h2>
                    </div>
                    {dayTotal > 0 && (
                      <span className="text-sm font-black text-brand-blue">{formatCurrency(dayTotal, currency)}</span>
                    )}
                  </div>

                  {/* Transactions */}
                  <div className="flex flex-col gap-3">
                    {dayPayments.map((payment) => {
                      const sc = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;
                      const isExpanded = expandedId === payment._id;

                      return (
                        <div key={payment._id} className="flex flex-col">
                          {/* Main Row */}
                          <div
                            onClick={() => setExpandedId(isExpanded ? null : payment._id)}
                            className={`flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border px-6 py-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${isExpanded ? 'border-brand-blue ring-1 ring-brand-blue/10 bg-white' : 'border-brand-black/5 hover:border-brand-blue/20'}`}
                          >
                            {/* Left - type icon + info */}
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Icon */}
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                                style={{ background: sc.bg }}
                              >
                                {payment.bookingId ? '🏃' : payment.planId ? '📋' : payment.membershipId ? '🎫' : '💳'}
                              </div>
                              {/* Details */}
                              <div className="min-w-0">
                                <p className="font-bold text-brand-black text-sm leading-tight">
                                  {payment.planId?.name
                                    ? `Plan: ${payment.planId.name}`
                                    : payment.bookingId?.classId?.title
                                    ? `Class: ${payment.bookingId.classId.title}`
                                    : payment.membershipId?.planId?.name
                                    ? `Membership: ${payment.membershipId.planId.name}`
                                    : payment.bookingId
                                    ? 'Class Booking'
                                    : payment.membershipId
                                    ? 'Membership'
                                    : 'Payment'}
                                </p>
                                <p className="text-xs text-brand-black/40 mt-0.5">
                                  {formatPaymentMethod(payment)}
                                  {payment.last4 ? ` •••• ${payment.last4}` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Right - amount, status, arrow */}
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <p className="text-lg font-black" style={{ color: sc.text }}>
                                  {formatCurrency(payment.amount, currency)}
                                </p>
                                <StatusBadge status={payment.status} />
                              </div>
                              <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-5 h-5 text-brand-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Expansion */}
                          {isExpanded && (
                            <div className="mx-6 -mt-2 p-6 bg-white border-x border-b border-brand-black/5 rounded-b-2xl shadow-inner animate-in slide-in-from-top-2 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Enrollment */}
                                {payment.bookingId ? (
                                  <div className="space-y-4">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Enrollment Info</h5>
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-brand-black/40 font-bold">Booking #</span>
                                        <span className="font-black text-brand-black">{payment.bookingId.bookingNumber || 'Pending'}</span>
                                      </div>
                                      <div className="flex justify-between items-start text-sm">
                                        <span className="text-brand-black/40 font-bold">Participants</span>
                                        <div className="text-right">
                                          {payment.bookingId.participants?.map((p, i) => (
                                            <p key={i} className="font-black text-brand-black">{p.name} ({p.age}y)</p>
                                          ))}
                                        </div>
                                      </div>
                                      {payment.bookingId.sessionId && (
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-brand-black/40 font-bold">Session</span>
                                          <span className="font-black text-brand-black">
                                            {new Date(payment.bookingId.sessionId.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center bg-slate-50 rounded-xl p-6 text-center italic text-xs text-brand-black/30">
                                    Transactional payment without enrollment details.
                                  </div>
                                )}

                                {/* Invoice */}
                                <div className="space-y-4">
                                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Receipt & Invoice</h5>
                                  {payment.invoice ? (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-brand-black/40 font-bold">Invoice #</span>
                                        <span className="font-black text-brand-black">{payment.invoice.invoiceNumber}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-brand-black/40 font-bold">Total Amount</span>
                                        <span className="font-black text-brand-black">{formatCurrency(payment.invoice.amount, payment.currency || currency)}</span>
                                      </div>
                                      <div className="pt-2">
                                        <Link 
                                          to={`/invoice/${payment.invoice._id}`}
                                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue transition-all"
                                        >
                                          View Official Receipt
                                        </Link>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 rounded-xl p-6 text-center italic text-xs text-brand-black/30">
                                      {payment.bookingId ? (
                                        <Link to={`/invoice/booking/${payment.bookingId._id}`} className="text-brand-blue font-bold hover:underline">
                                          Generate Receipt →
                                        </Link>
                                      ) : 'Invoice not available.'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 h-px w-full bg-brand-black/5" />
                </div>
              );
            })}
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
