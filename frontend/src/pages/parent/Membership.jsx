import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import ExtensionRequestForm from '../../components/ExtensionRequestForm.jsx';

// --- Sub-components for Schedule Views ---

function CalendarView({ sessions }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getSessionsForDay = (day) => {
    if (!day) return [];
    return sessions.filter(s => {
      const d = new Date(s.startTime);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <h4 className="font-display text-xl font-black text-ink">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full transition-all text-ink/40 hover:text-ink">←</button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full transition-all text-ink/40 hover:text-ink">→</button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-ink/20 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const daySessions = getSessionsForDay(day);
          const hasSessions = daySessions.length > 0;

          return (
            <div key={i} className={`aspect-square relative rounded-xl border transition-all flex flex-col items-center justify-center ${!day ? 'border-transparent' :
              isToday(day) ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-50 hover:border-brand-blue/20'
              }`}>
              {day && (
                <>
                  <span className={`text-xs font-black ${isToday(day) ? 'text-brand-blue' : 'text-ink/40'}`}>{day}</span>
                  {hasSessions && (
                    <div className="flex gap-0.5 mt-1">
                      {daySessions.map((_, si) => (
                        <div key={si} className={`w-1 h-1 rounded-full ${daySessions[si].attendanceStatus === 'present' ? 'bg-emerald-400' :
                          daySessions[si].attendanceStatus === 'absent' ? 'bg-rose-400' : 'bg-brand-blue'
                          }`} />
                      ))}
                    </div>
                  )}
                  {hasSessions && (
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-white/95 rounded-xl flex items-center justify-center p-1 z-10 transition-all shadow-xl border border-brand-blue/10">
                      <p className="text-[8px] font-black text-brand-blue text-center leading-tight">
                        {daySessions.map(s => new Date(s.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })).join('\n')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeView({ sessions }) {
  const today = new Date();
  const next14Days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    next14Days.push(d);
  }

  return (
    <div className="space-y-8 py-4">
      {next14Days.map((date, di) => {
        const daySessions = sessions.filter(s => new Date(s.startTime).toDateString() === date.toDateString());
        if (daySessions.length === 0) return null;

        return (
          <div key={di} className="relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100 ml-3" />
            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-4 border-brand-blue flex items-center justify-center z-10 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
            </div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/20 mb-4">{date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h5>
            <div className="grid gap-3">
              {daySessions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).map(s => (
                <div key={s._id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <p className="text-sm font-black text-ink">{new Date(s.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    <div>
                      <p className="text-xs font-black text-ink">{s.trainerId?.name || 'Assigned Trainer'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${s.attendanceStatus === 'present' ? 'bg-emerald-50 text-emerald-500' :
                          s.attendanceStatus === 'absent' ? 'bg-rose-50 text-rose-500' : 'bg-brand-blue/5 text-brand-blue'
                          }`}>
                          {s.attendanceStatus === 'trainer-cancelled' ? 'Protected' : s.attendanceStatus}
                        </span>
                        {s.attendanceStatus === 'trainer-cancelled' && (
                          <span className="text-[7px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded shadow-sm">Trainer Cancelled</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Membership Page Component ---

export default function Membership() {
  const { currency } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [children, setChildren] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [claimBogo, setClaimBogo] = useState(false);
  const [bogoChildId, setBogoChildId] = useState('');
  const [preferredDays, setPreferredDays] = useState(['Monday', 'Wednesday']);
  const [preferredSlots, setPreferredSlots] = useState(['16:00']);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(2);
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [showScheduleMembership, setShowScheduleMembership] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', 'time'
  const [showExtensionRequest, setShowExtensionRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponAmount, setCouponAmount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({});

  // Search and Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [membershipsPerPage] = useState(10);

  const fetchMemberships = () => {
    setLoading(true);
    api.get('/memberships/mine').then((res) => {
      const data = res.data || [];
      setMemberships(data);
      if (showScheduleMembership) {
        const updated = data.find(m => m._id === showScheduleMembership._id);
        if (updated) setShowScheduleMembership(updated);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const fetchPlans = () => {
    setLoading(true);
    api.get('/plans').then((res) => {
      setPlans(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const fetchChildren = () => {
    setLoading(true);
    api.get('/children/mine').then((res) => {
      setChildren(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMemberships();
    fetchPlans();
    fetchChildren();

    // Fetch global settings
    api.get('/settings/global').then(res => {
      const settingsMap = {};
      res.data.forEach(s => { settingsMap[s.key] = s.value; });
      setGlobalSettings(settingsMap);
    }).catch(() => {});

    const handleChange = () => fetchPlans();
    window.addEventListener('location-change', handleChange);
    return () => window.removeEventListener('location-change', handleChange);
  }, []);

  const openCheckout = (plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
    setSelectedChildId('');
    setMessage('');
    setError('');
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setSelectedPlan(null);
  };

  const handleCardChange = (e) => {
    setCardForm({ ...cardForm, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    if (!selectedPlan) return;

    // GENDER VALIDATION
    if (selectedPlan.gender && selectedPlan.gender !== 'mixed') {
      let pGender = '';
      if (!selectedChildId) {
        pGender = user?.gender;
      } else {
        const child = children.find(c => c._id === selectedChildId);
        pGender = child?.gender;
      }

      if (pGender && pGender !== 'other' && pGender !== selectedPlan.gender) {
        setError(`Gender Mismatch: This membership is restricted to ${selectedPlan.gender}s only.`);
        setLoading(false);
        return;
      }
    }

    if (!selectedChildId && children.length > 0) {
      setError('Please select a child or choose Individual.');
      setLoading(false);
      return;
    }

    if (!cardForm.name || !cardForm.number || !cardForm.expiry || !cardForm.cvc) {
      setError('Please complete card details.');
      setLoading(false);
      return;
    }

    try {
      const payableAmount = Math.max(0, (selectedPlan.price || 0) - (couponAmount || 0));

      // 1. Create Payment
      const payment = await api.post('/payments', {
        planId: selectedPlan._id,
        amount: Math.round(payableAmount * 100) / 100,
        paymentMethod: 'card',
        reference: `mock_dash_${Date.now()}`,
        last4: cardForm.number.slice(-4),
        couponCode,
        couponAmount
      });

      // 2. Create Membership (New Atomic Flow)
      const membership = await api.post('/memberships', {
        planId: selectedPlan._id,
        paymentId: payment.data._id,
        childId: selectedChildId || null,
        preferredDays,
        preferredSlots,
        sessionsPerWeek,
        claimBogo,
        bogoChildId: bogoChildId || selectedChildId || null,
        couponCode,
        couponAmount
      });

      setMemberships((prev) => [membership.data, ...prev]);
      setShowCheckout(false);
      setMessage('Enrollment successful! Your schedule has been generated.');
      fetchMemberships();
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please check your card details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFreeze = async (mId) => {
    try {
      setLoading(true);
      const res = await api.post(`/memberships/${mId}/freeze`);
      setMessage(res.data.message);
      fetchMemberships();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredMemberships = memberships.filter(m => {
    const search = searchTerm.toLowerCase();
    const bookingRef = m.bookingId?.bookingNumber?.toLowerCase() || '';
    const planName = m.planId?.name?.toLowerCase() || '';
    const childName = m.childId?.name?.toLowerCase() || '';
    const parentName = m.userId?.name?.toLowerCase() || '';
    const refId = m._id?.toString().toLowerCase() || '';

    return bookingRef.includes(search) ||
      planName.includes(search) ||
      childName.includes(search) ||
      parentName.includes(search) ||
      refId.includes(search);
  });

  const indexOfLast = currentPage * membershipsPerPage;
  const indexOfFirst = indexOfLast - membershipsPerPage;
  const currentMemberships = filteredMemberships.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredMemberships.length / membershipsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/30 font-display">
      <Navbar />
      <main className="page-shell py-12">
        <header className="mb-12">
          <h1 className="font-display text-4xl font-black text-ink tracking-tight">Membership</h1>
          <p className="mt-2 text-sm font-bold text-ink/40 uppercase tracking-widest">View plan status and renewal options.</p>
        </header>

        {message ? <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold">{message}</div> : null}
        {error ? <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold">{error}</div> : null}

        {/* Memberships Section */}
        <section className="mb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h2 className="text-[10px] font-black text-ink/20 uppercase tracking-[0.3em]">Active Memberships</h2>

            {/* Search Box */}
            <div className="relative w-full max-w-md">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg grayscale opacity-30">🔍</span>
              <input
                type="text"
                placeholder="Search plan, child, or reference..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-14 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-ink placeholder:text-ink/20 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-ink/20 hover:text-ink transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1.5fr_2fr_1fr_1.5fr_1.5fr] gap-6 px-12 py-8 border-b-2 border-slate-50 bg-slate-50/10">
              <div className="text-[9px] font-black text-ink/20 uppercase tracking-[0.3em]">Reference</div>
              <div className="text-[9px] font-black text-ink/20 uppercase tracking-[0.3em]">Customer</div>
              <div className="text-[9px] font-black text-ink/20 uppercase tracking-[0.3em]">Plan Details</div>
              <div className="text-[9px] font-black text-ink/20 uppercase tracking-[0.3em] text-center">Status</div>
              <div className="text-[9px] font-black text-ink/20 uppercase tracking-[0.3em]">Timeline</div>
              <div className="text-[9px] font-black text-ink/20 uppercase tracking-[0.3em] text-right">Actions</div>
            </div>

            <div className="divide-y divide-slate-50 font-display">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1.5fr_1.5fr_2fr_1fr_1.5fr_1.5fr] gap-6 px-12 py-10 items-center animate-pulse">
                    <div className="h-8 bg-slate-50 rounded-lg w-3/4" />
                    <div className="h-10 bg-slate-50 rounded-xl w-1/2" />
                    <div className="h-12 bg-slate-50 rounded-2xl w-full" />
                    <div className="h-6 bg-slate-50 rounded-full w-20 mx-auto" />
                    <div className="h-8 bg-slate-50 rounded-lg w-3/4" />
                    <div className="h-10 bg-slate-50 rounded-xl w-full" />
                  </div>
                ))
              ) : filteredMemberships.length === 0 ? (
                <div className="p-20 text-center">
                  <span className="text-4xl mb-4 block grayscale opacity-30">📂</span>
                  <p className="text-sm font-bold text-ink/30 uppercase tracking-widest">
                    {searchTerm ? `No memberships found for "${searchTerm}"` : 'No active memberships found'}
                  </p>
                </div>
              ) : (
                <>
                  {currentMemberships.map((m) => {
                    const totalSessions = (m.planId?.classesIncluded || 0) * (m.membershipUnits || 1);
                    const remaining = m.classesRemaining ?? 0;
                    const used = Math.max(0, totalSessions - remaining);

                    return (
                      <div key={m._id} className="grid grid-cols-[1.5fr_1.5fr_2fr_1fr_1.5fr_1.5fr] gap-6 px-12 py-10 items-center hover:bg-slate-50/30 transition-colors group">
                        {/* Reference Column */}
                        <div className="space-y-2">
                          {m.bookingId?.bookingNumber ? (
                            <div className="px-3 py-1 bg-brand-blue/5 rounded-lg inline-block">
                              <span className="text-[10px] font-black text-brand-blue uppercase tracking-tight">{m.bookingId.bookingNumber}</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1 bg-amber-50 rounded-lg inline-block">
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight leading-none overflow-hidden">REF-TBD</span>
                            </div>
                          )}
                          <p className="text-[9px] font-bold text-ink/20 uppercase tracking-tighter">ID: {m._id.slice(-8).toUpperCase()}</p>
                        </div>

                        {/* Parent & Child Column */}
                        <div className="space-y-4">
                          <p className="text-sm font-black text-ink tracking-tight">{m.userId?.name || user?.name || 'Valued Member'}</p>
                          {m.childId && (
                            <div className="flex items-center gap-3">
                              <span className="w-4 h-4 rounded-full bg-brand-blue/10 flex items-center justify-center text-[10px] grayscale">👦</span>
                              <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{m.childId.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Plan Details Column */}
                        <div className="space-y-4">
                          <p className="text-sm font-black text-ink tracking-tight">{m.planId?.name || 'Standard Package'}</p>
                          <div className="space-y-2">
                            {m.classesRemaining === -1 ? (
                              /* Unlimited / Time plan */
                              <div className="flex flex-col gap-2">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${m.planId?.type === 'time-based' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                  {m.planId?.type === 'time-based' ? '⌛ Time Access' : '∞ Unlimited'}
                                </span>
                                {m.planId?.dailyBookingLimit > 0 && (
                                  <p className="text-[8px] font-bold text-ink/20 uppercase tracking-widest">Limit: {m.planId.dailyBookingLimit}/day</p>
                                )}
                              </div>
                            ) : m.planId?.type === 'credit-based' ? (
                              /* Credit-based plan */
                              <div className="space-y-2">
                                <div className="flex justify-between items-center pr-12">
                                  <span className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Credits</span>
                                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                    {m.creditsRemaining}/{(m.planId.creditsIncluded || 0) * (m.membershipUnits || 1)}
                                  </span>
                                </div>
                                <div className="w-full max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-700 shadow-sm"
                                    style={{ width: `${((m.planId.creditsIncluded || 0) * (m.membershipUnits || 1)) > 0 ? (m.creditsRemaining / ((m.planId.creditsIncluded || 0) * (m.membershipUnits || 1))) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              /* Standard Session-based plan */
                              <>
                                <div className="flex justify-between items-center pr-12">
                                  <span className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Usage</span>
                                  <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest">
                                    {remaining}/{totalSessions}
                                  </span>
                                </div>
                                <div className="w-full max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden flex" title={`Attended: ${m.attendedCount}, Missed: ${m.absentCount}, Remaining: ${remaining}`}>
                                  {/* Attended Part (Green) */}
                                  {m.attendedCount > 0 && (
                                    <div
                                      className="h-full bg-emerald-500 transition-all duration-700"
                                      style={{ width: `${(m.attendedCount / totalSessions) * 100}%` }}
                                    />
                                  )}
                                  {/* Missed Part (Red) */}
                                  {m.absentCount > 0 && (
                                    <div
                                      className="h-full bg-red-500 transition-all duration-700"
                                      style={{ width: `${(m.absentCount / totalSessions) * 100}%` }}
                                    />
                                  )}
                                  {/* Remaining Part (Blue) */}
                                  <div
                                    className={`h-full transition-all duration-700 ${used === 0 ? 'bg-brand-blue' : 'bg-brand-blue/20'}`}
                                    style={{ width: `${(remaining / totalSessions) * 100}%` }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Column */}
                        <div className="text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${m.status === 'active' ? 'bg-emerald-50 text-emerald-500 shadow-sm shadow-emerald-500/10 border border-emerald-100' :
                            m.status === 'frozen' ? 'bg-indigo-50 text-indigo-500 border border-indigo-200 animate-pulse' :
                              m.status === 'expired' ? 'bg-rose-50 text-rose-500 border border-rose-100' :
                                'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                            {m.status || 'Active'}
                          </span>
                        </div>

                        {/* Timeline Column */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-6">
                            <span className="text-[9px] font-black text-ink/20 uppercase tracking-[0.2em] w-8">Start</span>
                            <span className="text-[10px] font-black text-ink">{new Date(m.startDate || m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="text-[9px] font-black text-ink/20 uppercase tracking-[0.2em] w-8">End</span>
                            <div className="flex flex-col gap-1">
                              {/* Show old date crossed out if membership was extended */}
                              {m.previousEndDate && (
                                <span className="text-[10px] font-black text-rose-400 line-through decoration-rose-400 decoration-2">
                                  {new Date(m.previousEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black ${m.previousEndDate ? 'text-emerald-600' : 'text-ink'}`}>
                                  {new Date(m.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {m.previousEndDate && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[7px] font-black uppercase tracking-widest border border-emerald-100">
                                    Extended
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions Column */}
                        <div className="flex flex-col gap-3 items-end">
                          <button
                            onClick={() => setShowScheduleMembership(m)}
                            className="w-full max-w-[120px] px-4 py-2 bg-brand-blue text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all hover:-translate-y-0.5"
                          >
                            View Schedule
                          </button>
                          {globalSettings?.allow_plan_upgrade && m.status === 'active' && (
                            <button
                              onClick={() => navigate(`/pricing?upgrade=${m._id}`)}
                              className="w-full max-w-[120px] px-4 py-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                              <span>⭐</span> Upgrade
                            </button>
                          )}
                          {m.status === 'active' && m.planId?.allowFreezing && (
                            <button
                              onClick={() => handleToggleFreeze(m._id)}
                              className="w-full max-w-[120px] px-4 py-2 border border-slate-100 text-ink/30 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
                            >
                              <span>⏸</span> Pause
                            </button>
                          )}
                          {m.status === 'frozen' && (
                            <button
                              onClick={() => handleToggleFreeze(m._id)}
                              className="w-full max-w-[120px] px-4 py-2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
                            >
                              Resume
                            </button>
                          )}
                          {m.status === 'active' && (
                            <button
                              onClick={() => setShowExtensionRequest({ membershipId: m._id, endDate: m.endDate, type: 'extend' })}
                              className="w-full max-w-[120px] px-4 py-2 border border-slate-100 text-ink/30 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
                            >
                              <span>⏳</span> Extend
                            </button>
                          )}
                          {m.bookingId && (
                            <button
                              onClick={() => navigate(`/invoice/booking/${m.bookingId._id || m.bookingId}`)}
                              className="w-full max-w-[120px] px-4 py-2 border border-slate-100 text-ink/30 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:text-brand-blue transition-all flex items-center justify-center gap-2"
                            >
                              <span>📄</span> Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="px-12 py-8 bg-slate-50/10 flex items-center justify-between border-t border-slate-50">
                      <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest">
                        Showing {indexOfFirst + 1} to {Math.min(indexOfLast, filteredMemberships.length)} of {filteredMemberships.length} memberships
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-ink disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-all shadow-sm"
                        >
                          ←
                        </button>
                        <div className="flex items-center gap-2">
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1
                                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                : 'bg-white border border-slate-100 text-ink/40 hover:bg-slate-50'
                                }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-ink disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-all shadow-sm"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Plans Section */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="font-display text-4xl font-black text-ink tracking-tight">Available Plans</h2>
              <p className="mt-2 text-sm font-bold text-ink/40 uppercase tracking-widest">Pricing per location & program type.</p>
            </div>
            <LocationPicker compact />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="soft-card h-[600px] rounded-[3rem] p-8 animate-pulse bg-white/50 border border-slate-50 flex flex-col">
                  <div className="h-4 bg-slate-100 rounded-lg w-1/4 mb-2" />
                  <div className="h-10 bg-slate-100 rounded-2xl w-3/4 mb-8" />
                  <div className="h-20 bg-slate-100 rounded-3xl w-full mb-8" />
                  <div className="space-y-4 flex-1">
                    <div className="h-4 bg-slate-100 rounded-lg w-5/6" />
                    <div className="h-4 bg-slate-100 rounded-lg w-4/6" />
                    <div className="h-4 bg-slate-100 rounded-lg w-5/6" />
                  </div>
                  <div className="h-16 bg-slate-100 rounded-[2rem] w-full mt-10" />
                </div>
              ))
            ) : plans.map((plan) => (
              <div key={plan._id} className={`soft-card relative overflow-hidden rounded-[3rem] p-8 transition-all hover:scale-[1.02] active:scale-[0.98] ${plan.isFeatured ? 'border-4 border-coral bg-white shadow-2xl' : 'bg-white/80'}`}>
                {plan.isFeatured && (
                  <div className="absolute top-6 right-6 rounded-full bg-coral px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg">
                    Recommended
                  </div>
                )}
                <div className="flex flex-col h-full uppercase">
                  <p className="text-[10px] font-black tracking-[0.2em] text-ink/30">
                    {plan.tagline || plan.validity || (plan.type === 'subscription' ? 'Plan' : '')}
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-black text-ink leading-tight">{plan.name}</h3>

                  <div className="mt-8 mb-8 pb-8 border-b border-slate-100">
                    <div className="flex items-baseline">
                      <span className="text-sm font-black text-ink/20 mr-2">{currency}</span>
                      <span className="text-6xl font-black text-brand-blue tracking-tighter">
                        {plan.price}
                      </span>
                      {plan.type === 'subscription' && plan.billingCycle && plan.billingCycle !== 'none' && (
                        <span className="text-xs font-black text-ink/30 ml-2 tracking-widest">
                          / {plan.billingCycle === 'm' ? 'mo' : plan.billingCycle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 mb-10">
                    {plan.benefits?.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-[10px]">✅</div>
                        <span className="text-[11px] font-black text-ink/60 tracking-tight lowercase first-letter:uppercase">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full rounded-[2rem] bg-brand-blue py-5 text-sm font-black text-white shadow-2xl shadow-brand-blue/20 transition-all hover:-translate-y-1 hover:shadow-brand-blue/30 active:translate-y-0"
                    onClick={() => openCheckout(plan)}
                  >
                    Subscribe Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="bg-brand-blue p-10 text-white relative flex justify-between items-center">
              <div>
                <h3 className="font-display text-3xl font-black mb-1">Complete Enrollment</h3>
                <p className="text-xs text-white/60 font-black uppercase tracking-widest">{selectedPlan?.name} · {currency} {selectedPlan?.price}</p>
              </div>
              <button onClick={closeCheckout} className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-10 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleCheckout} className="space-y-10 text-left">
                {/* 1. Selection */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 ml-2">1. Select Participant</label>
                  <div className="grid grid-cols-2 gap-3">
                    {children.map(c => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => setSelectedChildId(c._id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${selectedChildId === c._id ? 'border-brand-blue bg-brand-blue/5 shadow-lg shadow-brand-blue/5' : 'border-slate-50 hover:border-slate-100'}`}
                      >
                        <span className="text-xl">👶</span>
                        <div>
                          <p className="text-xs font-black text-ink">{c.name}</p>
                          <p className="text-[9px] font-bold text-ink/30 uppercase">{c.age} years</p>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedChildId('')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${selectedChildId === '' ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-50 hover:border-slate-100'}`}
                    >
                      <span className="text-xl">👤</span>
                      <p className="text-xs font-black text-ink">Individual</p>
                    </button>
                  </div>
                </div>

                {/* 2. Scheduling */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 ml-2">2. Scheduling Preference {selectedPlan?.sessionsPerWeek > 0 ? `(Max ${selectedPlan.sessionsPerWeek} days/week)` : ''}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest ml-1">Preferred Days</p>
                      <select
                        multiple
                        value={preferredDays}
                        onChange={(e) => {
                          const newDays = Array.from(e.target.selectedOptions, option => option.value);
                          if (selectedPlan?.sessionsPerWeek > 0 && newDays.length > selectedPlan.sessionsPerWeek) {
                            return; // Fallback prevention
                          }
                          setPreferredDays(newDays);
                        }}
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none text-xs font-bold outline-none ring-brand-blue/5 focus:ring-4"
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => {
                           const isLimitReached = !preferredDays.includes(d) && selectedPlan?.sessionsPerWeek > 0 && preferredDays.length >= selectedPlan.sessionsPerWeek;
                           return <option key={d} value={d} disabled={isLimitReached}>{d}</option>;
                        })}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest ml-1">Start Time</p>
                      <select
                        value={preferredSlots[0]}
                        onChange={(e) => setPreferredSlots([e.target.value])}
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none text-xs font-bold outline-none ring-brand-blue/5 focus:ring-4"
                      >
                        {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. BOGO Check */}
                <div className="p-6 bg-brand-blue/5 rounded-[2rem] border border-brand-blue/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Special Enrollment Offer</p>
                      <p className="text-xs font-black text-ink/60 mt-1">Claim BOGO Benefits?</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClaimBogo(!claimBogo);
                        if (!claimBogo && !bogoChildId) setBogoChildId(selectedChildId);
                      }}
                      className={`w-12 h-6 rounded-full transition-all relative ${claimBogo ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${claimBogo ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {claimBogo && (
                    <div className="pt-4 border-t border-brand-blue/10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest ml-1">Recipient for Free Item:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {children.map(c => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => setBogoChildId(c._id)}
                            className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2 ${bogoChildId === c._id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                          >
                            <span className="text-sm">👧</span>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-ink leading-none">{c.name}</p>
                              <p className="text-[8px] font-bold text-ink/30 uppercase mt-1">{c.age} yrs</p>
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setBogoChildId('')}
                          className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2 ${bogoChildId === '' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                        >
                          <span className="text-sm">👤</span>
                          <p className="text-[10px] font-black text-ink">Individual</p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Voucher Redemption */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 ml-2">4. Redeem Voucher</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all uppercase placeholder:normal-case"
                      placeholder="Voucher Code (CPN-XXXX)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={couponAmount > 0 || isValidatingCoupon}
                    />
                    {couponAmount > 0 ? (
                      <button
                        type="button"
                        onClick={() => { setCouponAmount(0); setCouponCode(''); }}
                        className="bg-rose-50 text-rose-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase"
                      >Remove</button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsValidatingCoupon(true);
                          try {
                            const res = await api.post('/coupons/validate', { code: couponCode });
                            setCouponAmount(res.data.data.amount);
                          } catch (err) {
                            setError(err.response?.data?.message || 'Invalid coupon');
                          } finally {
                            setIsValidatingCoupon(false);
                          }
                        }}
                        disabled={!couponCode || isValidatingCoupon}
                        className="bg-brand-blue text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase disabled:opacity-50 shadow-lg"
                      >Validate</button>
                    )}
                  </div>
                  {couponAmount > 0 && (
                    <p className="mt-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {currency} {couponAmount} applied to this transaction!
                    </p>
                  )}
                </div>

                {/* 5. Payment */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 ml-2">5. Payment Details</label>
                  <div className="space-y-3">
                    <input
                      className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-xs"
                      placeholder="Name on Card"
                      name="name"
                      value={cardForm.name}
                      onChange={handleCardChange}
                    />
                    <input
                      className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-xs"
                      placeholder="Card Number"
                      name="number"
                      value={cardForm.number}
                      onChange={handleCardChange}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-xs"
                        placeholder="MM/YY"
                        name="expiry"
                        value={cardForm.expiry}
                        onChange={handleCardChange}
                      />
                      <input
                        className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-xs"
                        placeholder="CVC"
                        name="cvc"
                        value={cardForm.cvc}
                        onChange={handleCardChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-blue text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-brand-blue/20 hover:shadow-brand-blue/40 transition-all hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : `Pay {currency} ${Math.max(0, (selectedPlan?.price || 0) - couponAmount)}`}
                    {!loading && <span>➜</span>}
                  </button>
                  <p className="mt-4 text-center text-[8px] font-black text-ink/20 uppercase tracking-[0.2em]">Secure 256-bit SSL Encrypted Transaction</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleMembership && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-blue p-10 text-white flex justify-between items-start shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Class Schedule</p>
                <h3 className="font-display text-4xl font-black text-white leading-none">{showScheduleMembership.planId?.name}</h3>
              </div>
              <div className="flex gap-2 p-1 bg-white/10 rounded-2xl border border-white/10">
                {['list', 'calendar', 'time'].map(m => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-white text-brand-blue shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
              {(!showScheduleMembership.generatedSessions || showScheduleMembership.generatedSessions.length === 0) ? (
                <div className="py-20 text-center">
                  <p className="text-sm font-bold text-ink/20">Scheduling in progress. Your sessions will appear here soon.</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-3">
                  {showScheduleMembership.generatedSessions.map((s, i) => (
                    <div key={s._id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all font-display">
                      <div className="flex items-center gap-6 text-left">
                        <span className="text-[10px] font-black text-brand-blue/30 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                        <div>
                          <p className="text-sm font-black text-ink">{new Date(s.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                          <p className="text-[10px] font-bold text-ink/30 uppercase tracking-widest leading-none mt-1">
                            {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Coach {s.trainerId?.name || 'TBD'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.rescheduleRequestStatus ? (
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            s.rescheduleRequestStatus === 'approved' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                            s.rescheduleRequestStatus === 'rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                            'bg-amber-50 text-amber-500 border-amber-100'
                          }`}>
                            {s.rescheduleRequestStatus === 'pending' ? 'PENDING' : 
                             s.rescheduleRequestStatus === 'approved' ? 'ACCEPTED' : 
                             s.rescheduleRequestStatus === 'rejected' ? 'REJECTED' : s.rescheduleRequestStatus.toUpperCase()}
                          </span>
                        ) : (() => {
                          const isPast = new Date(s.startTime) < new Date();
                          const displayStatus = (['pending', 'booked'].includes(s.attendanceStatus) && isPast) ? 'absent' : (s.attendanceStatus || 'pending');
                          
                          return (
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              displayStatus === 'present' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                              displayStatus === 'absent' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                              'bg-brand-blue/5 text-brand-blue border-brand-blue/10'
                            }`}>
                              {displayStatus === 'booked' ? 'pending' : displayStatus}
                            </span>
                          );
                        })()}
                        
                        {(!s.rescheduleRequestStatus || s.rescheduleRequestStatus === 'rejected') && (['pending', 'booked'].includes(s.attendanceStatus) || (s.attendanceStatus === 'absent' && new Date(s.startTime) < new Date())) && (showScheduleMembership.rescheduleCount < showScheduleMembership.maxReschedules) && (
                          <button
                            onClick={() => setShowExtensionRequest({ 
                              membershipId: showScheduleMembership._id, 
                              sessionId: s._id, 
                              type: 'reschedule',
                              timeSlots: showScheduleMembership.planId?.timeSlots || []
                            })}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-ink/40 hover:text-brand-blue text-[8px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-100"
                          >
                            Reschedule
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : viewMode === 'calendar' ? (
                <CalendarView sessions={showScheduleMembership.generatedSessions} />
              ) : (
                <TimeView sessions={showScheduleMembership.generatedSessions} />
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-white text-center shrink-0">
              <button
                onClick={() => setShowScheduleMembership(null)}
                className="px-10 py-4 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-black uppercase tracking-widest transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension/Reschedule Form Modal */}
      {showExtensionRequest && (
        <ExtensionRequestForm
          {...showExtensionRequest}
          onClose={() => setShowExtensionRequest(null)}
          onSuccess={() => {
            fetchMemberships();
          }}
        />
      )}

      <Footer />
    </div>
  );
}
