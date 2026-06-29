import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useSettings } from '../../context/SettingsContext.jsx';

/* ── helpers ── */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' });
}
function formatPaymentMethod(payment) {
  const method = payment.paymentMethod;
  if (!method) return 'N/A';
  
  const refText = payment.reference ? ` (#${payment.reference})` : '';

  if (method.startsWith('center_')) {
    const actualMethod = method.split('_')[1];
    return `Pay at Center: ${actualMethod.charAt(0).toUpperCase() + actualMethod.slice(1)}${refText}`;
  }
  
  if (method === 'online' || method === 'card') {
    return `${method.charAt(0).toUpperCase() + method.slice(1)}${refText}`;
  }

  if (method === 'center') return 'Pay at Center';
  return method.charAt(0).toUpperCase() + method.slice(1);
}
function formatDateKey(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD for grouping
}
function formatCurrency(amount, currencySymbol = 'AED') {
  return `${currencySymbol} ${Number(amount || 0).toFixed(2)}`;
}
function isToday(iso) {
  const d = new Date(iso).toISOString().slice(0, 10);
  return d === new Date().toISOString().slice(0, 10);
}
function isThisMonth(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

const STATUS_COLORS = {
  paid:    { bg: 'rgba(16,185,129,0.12)', text: '#059669', dot: '#10b981' },
  pending: { bg: 'rgba(245,158,11,0.12)', text: '#b45309', dot: '#f59e0b' },
  failed:  { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', dot: '#ef4444' },
};
const METHOD_ICONS = {
  card:   '💳',
  cash:   '💵',
  center: '🏢',
  online: '🌐',
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full capitalize"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{
        background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
        border: `1px solid ${accent}30`
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>{label}</p>
      <p className="text-2xl font-black text-brand-black">{value}</p>
      {sub && <p className="text-xs text-brand-black/50">{sub}</p>}
    </div>
  );
}

export default function PaymentsManagement() {
  const { roleSlug } = useParams();
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [methodFilter, setMethod] = useState('all');
  const [typeFilter, setType]     = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { can } = usePermissions();
  const { currency } = useSettings();

  const canExport = can('payments:view'); // Assuming if they can view, they can export, or we can use another perm.

  useEffect(() => {
    setLoading(true);
    api.get('/payments')
      .then((res) => setPayments(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      
      if (methodFilter !== 'all') {
        const method = p.paymentMethod || '';
        if (methodFilter === 'center') {
          if (!method.startsWith('center')) return false;
        } else if (methodFilter === 'cash') {
          if (method !== 'cash' && method !== 'center_cash') return false;
        } else if (methodFilter === 'card') {
          if (method !== 'card' && method !== 'center_card') return false;
        } else if (methodFilter === 'online') {
          if (method !== 'online' && method !== 'center_online') return false;
        } else if (p.paymentMethod !== methodFilter) {
          return false;
        }
      }

      if (typeFilter !== 'all') {
        if (typeFilter === 'booking' && !p.bookingId) return false;
        if (typeFilter === 'plan' && !p.planId) return false;
        if (typeFilter === 'membership' && !p.membershipId) return false;
      }

      if (fromDate && new Date(p.createdAt) < new Date(fromDate)) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(p.createdAt) > end) return false;
      }

      if (q) {
        const name  = p.userId?.name?.toLowerCase() || p.bookingId?.guestDetails?.name?.toLowerCase() || '';
        const email = p.userId?.email?.toLowerCase() || p.bookingId?.guestDetails?.email?.toLowerCase() || '';
        const plan  = (p.planId?.name || p.membershipId?.planId?.name || '').toLowerCase();
        const classTitle = (p.bookingId?.classId?.title || '').toLowerCase();
        const ref   = (p.reference || '').toLowerCase();
        if (
          !name.includes(q) && 
          !email.includes(q) && 
          !plan.includes(q) && 
          !ref.includes(q) && 
          !classTitle.includes(q)
        ) return false;
      }
      return true;
    });
  }, [payments, search, statusFilter, methodFilter, typeFilter, fromDate, toDate]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, methodFilter, typeFilter, fromDate, toDate]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const paid = filtered.filter(p => p.status === 'paid');
    const today = paid.filter(p => isToday(p.createdAt));
    const month = paid.filter(p => isThisMonth(p.createdAt));
    return {
      total: paid.length,
      totalRevenue: paid.reduce((s, p) => s + (p.amount || 0), 0),
      todayRevenue: today.reduce((s, p) => s + (p.amount || 0), 0),
      monthRevenue: month.reduce((s, p) => s + (p.amount || 0), 0),
      pending: filtered.filter(p => p.status === 'pending').length,
      failed:  filtered.filter(p => p.status === 'failed').length,
    };
  }, [filtered]);

  /* ── group by date ── */
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = formatDateKey(p.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    // sort keys descending
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  /* ── pagination ── */
  const totalPages = Math.ceil(grouped.length / ITEMS_PER_PAGE);
  const paginatedGroups = grouped.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportCsv = async () => {
    try {
      const res = await api.get('/payments/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'payments.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) { /* silent */ }
  };

  return (
    <div>
      <Navbar />
      <main className="page-shell py-10">
        <AdminHeader 
          title="Payment Monitoring" 
          description="Review revenue, track transactions, and manage center-level payments."
          backTo={`/${roleSlug}`}
        />

        {/* ── Header ── */}
        <div className="mt-8 flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            {/* Title moved to AdminHeader */}
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full border-2 border-brand-black/10 px-5 py-2 text-sm font-bold hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Total Revenue"  value={formatCurrency(stats.totalRevenue, currency)} sub={`${stats.total} paid`}       accent="#1a6bff" />
          <StatCard label="This Month"     value={formatCurrency(stats.monthRevenue, currency)} sub="current month"               accent="#8b5cf6" />
          <StatCard label="Today"          value={formatCurrency(stats.todayRevenue, currency)} sub="today's earnings"            accent="#10b981" />
          <StatCard label="Paid"           value={stats.total}                        sub="transactions"                accent="#059669" />
          <StatCard label="Pending"        value={stats.pending}                      sub="awaiting payment"            accent="#f59e0b" />
          <StatCard label="Failed"         value={stats.failed}                       sub="unsuccessful"                accent="#ef4444" />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, plan, reference…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-brand-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="rounded-xl border border-brand-black/10 bg-white px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          {/* Method filter */}
          <select
            value={methodFilter}
            onChange={e => setMethod(e.target.value)}
            className="rounded-xl border border-brand-black/10 bg-white px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="all">All Methods</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="center">At Center</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setType(e.target.value)}
            className="rounded-xl border border-brand-black/10 bg-white px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="all">All Types</option>
            <option value="booking">Enrollments</option>
            <option value="plan">Paid Plans</option>
            <option value="membership">Memberships</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="rounded-xl border border-brand-black/10 bg-white px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            <span className="text-brand-black/20 text-xs font-bold uppercase">to</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="rounded-xl border border-brand-black/10 bg-white px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            {(fromDate || toDate) && (
              <button 
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="p-2.5 text-brand-black/40 hover:text-brand-blue transition-colors"
                title="Clear Dates"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Count ── */}
        {!loading && (
          <p className="text-xs text-brand-black/40 font-semibold mb-4">
            Showing {filtered.length} of {payments.length} transactions
          </p>
        )}

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
            <p className="text-lg font-bold">No transactions found</p>
            <p className="text-sm">Try adjusting the filters</p>
          </div>
        )}

        {/* ── Date-wise groups with Pagination ── */}
        <div className="space-y-8">
          {paginatedGroups.map(([dateKey, dayPayments]) => {
            const dayTotal = dayPayments
              .filter(p => p.status === 'paid')
              .reduce((s, p) => s + (p.amount || 0), 0);
            const today = dateKey === new Date().toISOString().slice(0, 10);

            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: today ? '#1a6bff' : '#94a3b8' }}
                    />
                    <h2 className="text-sm font-black text-brand-black/70 uppercase tracking-wider">
                      {today ? '📅 Today — ' : ''}{formatDate(dateKey)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-black/40">{dayPayments.length} txn{dayPayments.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-black text-brand-blue">{formatCurrency(dayTotal, currency)}</span>
                  </div>
                </div>

                {/* Transaction cards */}
                <div className="flex flex-col gap-2">
                  {dayPayments.map((payment) => {
                    const sc = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;
                    
                    let methodIcon = '💳';
                    const method = payment.paymentMethod || '';
                    if (method === 'cash' || method === 'center_cash') methodIcon = '💵';
                    else if (method === 'card' || method === 'center_card') methodIcon = '💳';
                    else if (method === 'online' || method === 'center_online') methodIcon = '🌐';
                    else if (method === 'center') methodIcon = '🏢';
                    
                    const isGuest = !payment.userId;
                    const displayName = payment.userId?.name || payment.bookingId?.guestDetails?.name || 'Guest User';
                    const displayEmail = payment.userId?.email || payment.bookingId?.guestDetails?.email || 'No email provided';

                    return (
                      <div key={payment._id} className="flex flex-col">
                        <div
                          onClick={() => setExpandedId(expandedId === payment._id ? null : payment._id)}
                          className={`group flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/90 border px-5 py-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${expandedId === payment._id ? 'border-brand-blue ring-1 ring-brand-blue/10' : 'border-brand-black/5 hover:border-brand-blue/20'}`}
                        >
                          {/* Left: user + type */}
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                              style={{ background: '#1a6bff' }}
                            >
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 truncate">
                                  {displayName}
                                </h4>
                                {isGuest && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-[10px] font-black text-amber-600 uppercase tracking-widest border border-amber-100">
                                    Guest
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-brand-black/45 truncate">
                                {displayEmail}
                              </p>
                              {/* Type tags */}
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {payment.planId?.name && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                                    Plan: {payment.planId.name}
                                  </span>
                                )}
                                {payment.bookingId && payment.bookingId.bookingType !== 'package' && (
                                  <>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                      Class: {payment.bookingId.classId?.title || 'Enrollment'}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                      📅 {new Date(payment.bookingId.sessionId?.startTime || payment.bookingId.date).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Middle: method icon (desktop) */}
                          <div className="hidden md:flex flex-col items-center gap-1 text-center">
                            <span className="text-xl">{methodIcon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-black/40">
                              {formatPaymentMethod(payment)}
                            </span>
                          </div>

                          {/* Right: amount + status */}
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <p className="text-lg font-black" style={{ color: sc.text }}>
                                {formatCurrency(payment.amount, currency)}
                              </p>
                              <StatusBadge status={payment.status} />
                              <p className="text-[10px] text-brand-black/35">{formatTime(payment.createdAt)}</p>
                            </div>
                            <div className={`transition-transform duration-200 ${expandedId === payment._id ? 'rotate-180' : ''}`}>
                              <svg className="w-5 h-5 text-brand-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === payment._id && (
                          <div className="mx-4 -mt-2 p-6 bg-white border-x border-b border-brand-black/5 rounded-b-2xl shadow-inner animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Enrollment Details */}
                              {payment.bookingId ? (
                                <div className="space-y-4">
                                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Enrollment Details</h5>
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-brand-black/40 font-bold">Booking Reference</span>
                                      <span className="font-black text-brand-black">{payment.bookingId.bookingNumber || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-brand-black/40 font-bold">Class / Program</span>
                                      <span className="font-black text-brand-black">{payment.bookingId.classId?.title}</span>
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
                                        <span className="text-brand-black/40 font-bold">Session Time</span>
                                        <span className="font-black text-brand-black">
                                          {new Date(payment.bookingId.sessionId.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                          {new Date(payment.bookingId.sessionId.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center bg-slate-50 rounded-xl p-8 text-center">
                                  <p className="text-xs font-bold text-brand-black/30 italic">No enrollment info linked to this payment.</p>
                                </div>
                              )}

                              {/* Invoice Details */}
                              <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Financial Context</h5>
                                {payment.invoice ? (
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-brand-black/40 font-bold">Invoice Number</span>
                                      <span className="font-black text-brand-black">{payment.invoice.invoiceNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-brand-black/40 font-bold">Invoice Status</span>
                                      <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-md ${payment.invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {payment.invoice.status}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-brand-black/40 font-bold">Billed Amount</span>
                                      <span className="font-black text-brand-black">{formatCurrency(payment.invoice.amount, currency)}</span>
                                    </div>
                                    <div className="pt-2">
                                      <a 
                                        href={`/invoice/${payment.invoice._id || (payment.bookingId?._id ? `booking/${payment.bookingId._id}` : '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue transition-all"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        View Full Invoice
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 rounded-xl p-6 text-center">
                                     <p className="text-xs font-bold text-brand-black/30 italic mb-3">No invoice found for this payment reference.</p>
                                     {payment.bookingId && (
                                       <a 
                                         href={`/invoice/booking/${payment.bookingId._id}`}
                                         className="text-[10px] font-black uppercase text-brand-blue hover:underline"
                                       >
                                          Generate / View Receipt →
                                       </a>
                                     )}
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

                {/* Day divider */}
                <div className="mt-4 h-px w-full bg-brand-black/5" />
              </div>
            );
          })}
        </div>

        {/* ── Pagination Controls ── */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-between border-t border-brand-black/5 pt-8">
            <p className="text-[10px] font-black text-brand-black/30 uppercase tracking-widest">
              Page {currentPage} of {totalPages} — Showing {paginatedGroups.length} days
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'text-brand-black/20 cursor-not-allowed' : 'bg-white border-2 border-brand-black/10 text-brand-blue hover:bg-brand-blue hover:text-white hover:border-brand-blue shadow-sm'}`}
              >
                ← Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'text-brand-black/20 cursor-not-allowed' : 'bg-white border-2 border-brand-black/10 text-brand-blue hover:bg-brand-blue hover:text-white hover:border-brand-blue shadow-sm'}`}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
