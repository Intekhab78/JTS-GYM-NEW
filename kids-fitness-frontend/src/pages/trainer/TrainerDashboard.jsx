import { useEffect, useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import { getUser, setAuth } from '../../utils/auth.js';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext.jsx';

export default function TrainerDashboard() {
  const { currency } = useSettings();
  const [activeTab, setActiveTab] = useState('schedule');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [viewType, setViewType] = useState('upcoming'); // 'upcoming', 'past', or 'cancelled'
  const [profileError, setProfileError] = useState(false);
  const [cancellingSession, setCancellingSession] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [now, setNow] = useState(new Date());
  const [sessionCategory, setSessionCategory] = useState('all'); // 'all', 'one-day', 'membership'
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { socket } = useSocket();

  // Listen for real-time booking updates
  useEffect(() => {
    if (socket) {
      const handleUpdate = (data) => {
        console.log('Real-time update received:', data);
        const user = getUser();
        if (user) {
          loadSessions(user.trainerId, user.name, user.email);
          loadAllBookings(user.trainerId);
        }
      };

      socket.on('booking_updated', handleUpdate);
      socket.on('attendance_updated', handleUpdate);
      
      return () => {
        socket.off('booking_updated', handleUpdate);
        socket.off('attendance_updated', handleUpdate);
      };
    }
  }, [socket]);

  // Live updates to the dashboard time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const user = getUser();

  const loadSessions = (trainerId, trainerName, trainerEmail) => {
    if (!trainerId && !trainerName && !trainerEmail) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = { all: true };
    if (trainerId) params.trainerId = trainerId;
    if (trainerName) params.trainerName = trainerName;
    if (trainerEmail) params.trainerEmail = trainerEmail;

    api.get('/sessions', { params })
      .then((res) => {
        setSessions(res.data || []);
        setLoading(false);
        if (!trainerId && res.data?.length > 0) {
          setProfileError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch schedule:', err);
        setLoading(false);
      });
  };

  const loadAllBookings = (trainerId) => {
    if (trainerId) {
      api.get(`/bookings?trainerId=${trainerId}`)
        .then(res => setAllBookings(res.data || []))
        .catch(err => console.error('Failed to fetch all bookings:', err));
    }
  };

  const loadTrials = () => {
    api.get('/trials')
      .then(res => setTrials(res.data || []))
      .catch(err => console.error('Failed to fetch trials:', err));
  };

  const loadLocations = (locationIds) => {
    api.get('/locations')
      .then(res => {
        const allLocs = res.data || [];
        if (locationIds) {
          const myLocs = allLocs.filter(l => locationIds.includes(l._id));
          setLocations(myLocs);
        }
      })
      .catch(() => { });
  };

  const syncUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data) {
        // Update local storage so the rest of the app knows about the update
        setAuth(res.data);
        // Refresh session data using fresh data
        loadLocations(res.data.locationIds);
        loadSessions(res.data.trainerId, res.data.name, res.data.email);
        loadAllBookings(res.data.trainerId);
        loadTrials();

        // If trainerId is missing but role is trainer, we have a profile issue
        if (res.data.role === 'trainer' && !res.data.trainerId) {
          setProfileError(true);
        }
      }
    } catch (err) {
      console.error('Failed to sync profile:', err);
      // Fallback to local data if sync fails
      loadSessions(user?.trainerId, user?.name, user?.email);
      loadLocations(user?.locationIds);
      loadAllBookings(user?.trainerId);
      loadTrials();
    }
  };

  useEffect(() => {
    syncUserProfile();
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        const isLocationMatch = locationFilter === 'all' || (s.locationId?._id || s.locationId) === locationFilter;
        if (s.status === 'cancelled') {
          return viewType === 'cancelled' && isLocationMatch;
        }

        if (viewType === 'cancelled') return false; // Non-cancelled sessions shouldn't show in cancelled tab

        const sStart = new Date(s.startTime);
        const sEnd = s.endTime ? new Date(s.endTime) : new Date(sStart.getTime() + 60 * 60000); // 1h default

        // Refined categorization
        // 1. Current: Strictly in progress or just about to start (15-min check-in grace)
        const checkInWindow = new Date(sStart.getTime() - 15 * 60000);
        const currentEndWindow = new Date(sEnd.getTime() + 5 * 60000); // Give 5 mins after official end

        const isCurrent = now >= checkInWindow && now <= currentEndWindow;
        const isPast = now > currentEndWindow;
        const isUpcoming = now < checkInWindow;

        let isTimeMatch = true;
        if (viewType === 'current') isTimeMatch = isCurrent;
        else if (viewType === 'past') isTimeMatch = isPast;
        else if (viewType === 'upcoming') isTimeMatch = isUpcoming;

        const isMembershipSession =
          !!s.membershipId ||
          s.classType === 'Membership' ||
          s.classType === 'Plan' ||
          (Array.isArray(s.classId?.packageNames) && s.classId.packageNames.length > 0);

        const isCategoryMatch = sessionCategory === 'all' || 
          (sessionCategory === 'one-day' && !isMembershipSession) || 
          (sessionCategory === 'membership' && isMembershipSession);

        const query = searchQuery.toLowerCase();
        const isSearchMatch = !query || 
          s.classId?.title?.toLowerCase().includes(query) ||
          s.locationId?.name?.toLowerCase().includes(query);

        return isLocationMatch && isTimeMatch && isCategoryMatch && isSearchMatch;
      })
      .sort((a, b) => {
        if (viewType === 'upcoming' || viewType === 'current') {
          return new Date(a.startTime) - new Date(b.startTime);
        } else {
          return new Date(b.startTime) - new Date(a.startTime);
        }
      });
  }, [sessions, locationFilter, viewType, now, sessionCategory]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return allBookings.filter(b => {
      const isLocationMatch = locationFilter === 'all' || (b.locationId?._id || b.locationId) === locationFilter;
      const isSearchMatch = !query || 
        b.classId?.title?.toLowerCase().includes(query) ||
        b.userId?.name?.toLowerCase().includes(query) ||
        b.guestDetails?.name?.toLowerCase().includes(query) ||
        b.participants?.some(p => p.name?.toLowerCase().includes(query));
      
      return isLocationMatch && isSearchMatch;
    });
  }, [allBookings, locationFilter, searchQuery]);

  const filteredTrials = useMemo(() => {
    return trials.filter(t => locationFilter === 'all' || (t.locationId?._id || t.locationId) === locationFilter);
  }, [trials, locationFilter]);

  // Close roster modal on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setShowRosterModal(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleViewRoster = async (session) => {
    if (session.status === 'cancelled') return;
    setSelectedSession(session);
    setLoadingRoster(true);
    setRoster([]);
    setShowRosterModal(true);
    try {
      const res = await api.get(`/bookings?sessionId=${session._id}`);
      setRoster(res.data || []);
      setLoadingRoster(false);
    } catch (err) {
      toast.error('Failed to load roster');
      setLoadingRoster(false);
    }
  };

  const handleCancelSession = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    setIsSubmittingCancel(true);
    try {
      await api.delete(`/sessions/${cancellingSession._id}`, { data: { reason: cancelReason } });
      toast.success('Session cancelled successfully');
      setCancellingSession(null);
      setCancelReason('');
      syncUserProfile(); // Refresh data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel session');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleApproveAttendance = async (bookingId) => {
    // Optimistically update the local roster state immediately
    setRoster(prev =>
      prev.map(b =>
        b._id === bookingId ? { ...b, status: 'attended' } : b
      )
    );
    try {
      await api.put(`/bookings/${bookingId}/status`, { status: 'attended' });
      toast.success('Attendance approved');
    } catch (err) {
      // Revert on failure
      setRoster(prev =>
        prev.map(b =>
          b._id === bookingId ? { ...b, status: 'confirmed' } : b
        )
      );
      toast.error(err.response?.data?.message || 'Failed to approve attendance');
    }
  };

  const handleUpdateTrainerStatus = async (sessionId, trainerStatus) => {
    try {
      await api.put(`/sessions/${sessionId}/trainer-status`, { trainerStatus });
      toast.success(`Session ${trainerStatus === 'accepted' ? 'accepted' : 'rejected'}`);
      syncUserProfile(); // Refresh data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#1e293b] p-10 text-white shadow-2xl mb-10 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-coral/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-coral/20 transition-all duration-700"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32 group-hover:bg-blue-500/20 transition-all duration-700"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-4">
                <span className="w-2 h-2 rounded-full bg-coral animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Trainer Dashboard</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                Welcome back, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral to-orange-300">{user?.name}</span>!
              </h1>
            </div>

            <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
              {[
                { id: 'schedule', label: 'Schedule', icon: '📅' },
                { id: 'bookings', label: 'All Bookings', icon: '👥' },
                { id: 'trials', label: 'Trials', icon: '✨' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSelectedSession(null); }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {profileError && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-[32px] p-6 flex flex-col md:flex-row items-center gap-6 animate-rise">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">⚠️</div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-1">Profile Link Warning</h3>
              <p className="text-xs font-bold text-amber-700/70 leading-relaxed">
                Your login account is not correctly linked to your professional Trainer Profile.
                While you can still see your sessions, some features like Roster management might be limited.
                <span className="block mt-2 font-black">Please contact an administrator to link your account.</span>
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {activeTab === 'schedule' && (
            <>
              {/* Sessions List — full width now, roster opens as modal */}
              <div className="lg:col-span-3 rounded-[32px] bg-white p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex flex-col gap-4 w-full md:w-auto">
                    <h2 className="font-display text-2xl text-ink">
                      {viewType === 'upcoming' ? 'Upcoming Sessions' : 'Session History'}
                    </h2>
                    
                    <div className="relative group/search">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg grayscale opacity-30 group-focus-within/search:opacity-100 transition-opacity">🔍</span>
                      <input 
                        type="text"
                        placeholder="Search sessions or students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-96 pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none font-bold text-ink focus:ring-4 focus:ring-coral/5 transition-all outline-none"
                      />
                    </div>

                    {/* View Type Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1 self-start">
                      <button
                        onClick={() => setViewType('current')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewType === 'current' ? 'bg-white text-emerald-500 shadow-sm' : 'text-ink/30 hover:text-ink/60'}`}
                      >
                        Current
                      </button>
                      <button
                        onClick={() => setViewType('upcoming')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewType === 'upcoming' ? 'bg-white text-coral shadow-sm' : 'text-ink/30 hover:text-ink/60'}`}
                      >
                        Upcoming
                      </button>
                      <button
                        onClick={() => setViewType('past')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewType === 'past' ? 'bg-white text-coral shadow-sm' : 'text-ink/30 hover:text-ink/60'}`}
                      >
                        Past
                      </button>
                      <button
                        onClick={() => setViewType('cancelled')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewType === 'cancelled' ? 'bg-white text-coral shadow-sm' : 'text-ink/30 hover:text-ink/60'}`}
                      >
                        Cancelled
                      </button>
                    </div>

                    {/* Session Type Filter */}
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1 self-start">
                      <button
                        onClick={() => setSessionCategory('all')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sessionCategory === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-ink/30 hover:text-ink/60'}`}
                      >
                        📂 All
                      </button>
                      <button
                        onClick={() => setSessionCategory('one-day')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sessionCategory === 'one-day' ? 'bg-white text-blue-500 shadow-sm' : 'text-ink/30 hover:text-ink/60'}`}
                      >
                        🎫 One-Day
                      </button>
                      <button
                        onClick={() => setSessionCategory('membership')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sessionCategory === 'membership' ? 'bg-white text-purple-600 shadow-sm' : 'text-ink/30 hover:text-ink/60'}`}
                      >
                        📦 Membership
                      </button>
                    </div>
                  </div>

                  {locations.length > 1 && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-ink/30">Branch:</span>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="bg-slate-50 border-none rounded-xl py-2 px-4 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-coral/20 cursor-pointer transition-all"
                      >
                        <option value="all">All Locations</option>
                        {locations.map(loc => (
                          <option key={loc._id} value={loc._id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-coral border-t-transparent" />
                  </div>
                ) : filteredSessions.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                    {filteredSessions.map((session) => (
                      <div key={session._id} className={`rounded-2xl border p-6 transition-all ${selectedSession?._id === session._id ? 'border-coral bg-coral/5 shadow-md' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="rounded-lg bg-white px-3 py-1 text-[10px] font-bold text-coral uppercase tracking-wider shadow-sm">
                              {session.classId?.title || 'Class'}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {!session.trainerId && (
                                <span className="text-[8px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded-md uppercase tracking-widest inline-block self-start shadow-sm">
                                  🔔 Needs Trainer
                                </span>
                              )}
                              {(session.membershipId || session.classType === 'Plan' || (Array.isArray(session.classId?.packageNames) && session.classId.packageNames.length > 0)) ? (
                                <span className="text-[8px] font-black text-white bg-purple-600 px-2 py-0.5 rounded-md uppercase tracking-widest inline-block self-start shadow-sm">
                                  📦 Membership
                                </span>
                              ) : (
                                <span className="text-[8px] font-black text-white bg-blue-500 px-2 py-0.5 rounded-md uppercase tracking-widest inline-block self-start shadow-sm">
                                  🎫 One-Day Session
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`h-2 w-2 rounded-full ${session.status === 'scheduled' ? 'bg-green-500' : 'bg-red-500'}`} title={session.status} />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-ink/70">
                            <span className="text-sm">📅</span>
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {new Date(session.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-ink/70">
                            <span className="text-sm">⏰</span>
                            <span className="text-xs font-bold">
                              {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-ink/70">
                            <span className="text-sm">📍</span>
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {session.locationId?.name || 'Central'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center">
                          <span className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">
                            {session.bookedParticipants} {session.classType === 'Class' && `/ ${session.capacity}`} Attendees
                          </span>
                          <div className="flex gap-2">
                            {viewType === 'upcoming' && session.status !== 'cancelled' && (
                              <>
                                {session.trainerStatus === 'pending' ? (
                                  <div className="flex gap-1.5 mr-2 pr-2 border-r border-slate-200">
                                    <button
                                      onClick={() => handleUpdateTrainerStatus(session._id, 'accepted')}
                                      className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10"
                                    >
                                      {!session.trainerId ? 'Claim & Accept' : 'Accept'}
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border mr-2 ${session.trainerStatus === 'accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {session.trainerStatus}
                                  </span>
                                )}
                                <button
                                  onClick={() => setCancellingSession(session)}
                                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-all border border-red-100"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleViewRoster(session)}
                              disabled={session.status === 'cancelled'}
                              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${session.status === 'cancelled' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : selectedSession?._id === session._id ? 'bg-coral text-white' : 'text-coral hover:bg-coral/10'}`}
                            >
                              {session.status === 'cancelled' ? 'Cancelled' : selectedSession?._id === session._id ? 'Selected' : 'View Roster'}
                            </button>
                          </div>
                        </div>
                        {session.status === 'cancelled' && session.cancellationReason && (
                          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100">
                            <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Cancellation Reason</p>
                            <p className="text-[10px] font-bold text-red-700 leading-relaxed italic">"{session.cancellationReason}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl mb-4 grayscale opacity-50">
                      {viewType === 'upcoming' ? '📅' : '📜'}
                    </div>
                    <p className="text-slate-400 font-bold italic">No {viewType} sessions found.</p>
                  </div>
                )}


              </div>
            </>
          )}

          {/* ===== ROSTER FULL-SCREEN MODAL ===== */}
          {showRosterModal && selectedSession && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
              onClick={(e) => { if (e.target === e.currentTarget) setShowRosterModal(false); }}
            >
              <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Modal Header */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white flex items-start justify-between shrink-0">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Attendee Roster</p>
                    <h2 className="text-2xl font-black text-white leading-tight">{selectedSession.classId?.title || 'Session'}</h2>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                        📅 {new Date(selectedSession.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                        ⏰ {new Date(selectedSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(selectedSession.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                        📍 {selectedSession.locationId?.name || 'Central'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRosterModal(false)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all font-black text-xl border border-white/10"
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                  {loadingRoster ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-coral border-t-transparent" />
                      <p className="text-xs font-bold text-ink/30 uppercase tracking-widest">Loading roster...</p>
                    </div>
                  ) : roster.length > 0 ? (
                    <div className="space-y-5">
                      {roster.map((booking) => (
                        <div key={booking._id} className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest leading-none">Customer / Contact</p>
                                <span className="text-[9px] font-black text-coral border border-coral/20 bg-coral/5 px-1.5 py-0.5 rounded-md leading-none">#{booking.bookingNumber}</span>
                              </div>
                              <h4 className="text-sm font-black text-ink mt-1.5">{booking.userId?.name || booking.guestDetails?.name || 'Guest User'}</h4>
                              <p className="text-[10px] font-bold text-ink/50 mt-1">{booking.userId?.phone || booking.guestDetails?.phone || booking.userId?.email || 'No contact'}</p>
                            </div>
                            <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${(booking.status === 'attended' || booking.status === 'completed') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              booking.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                              {(booking.status === 'attended' || booking.status === 'completed') ? '✔ Verified' : booking.status}
                            </span>
                          </div>

                          <div className="space-y-3 mb-4">
                            <p className="text-[9px] font-black text-coral uppercase tracking-widest">Participants ({booking.participants?.length})</p>
                            {booking.participants?.map((p, idx) => (
                              <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-black text-ink/30">
                                  {p.name?.charAt(0) || p.childId?.name?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-black text-ink">{p.name || p.childId?.name}</p>
                                  <div className="flex gap-3 mt-0.5">
                                    <span className="text-[10px] font-bold text-ink/30 uppercase">{p.age || p.childId?.age} Years</span>
                                    <span className="text-[10px] font-bold text-ink/30 uppercase">{p.gender || p.childId?.gender}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-ink/20 uppercase tracking-[0.2em]">{booking.paymentMethod === 'online' ? 'Paid Online' : 'Pay at Center'}</span>
                              {(viewType === 'current' || viewType === 'past') && booking.status === 'confirmed' && (
                                <button
                                  onClick={() => handleApproveAttendance(booking._id)}
                                  className="px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-all shadow-md active:scale-95"
                                >
                                  Approve Attendance
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-ink/70">{currency} {booking.totalAmount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 text-center flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-white rounded-[28px] shadow-lg flex items-center justify-center text-4xl mb-6 grayscale opacity-40">👥</div>
                      <p className="text-sm font-bold text-ink/30 uppercase tracking-widest">No attendees yet</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
                  <button
                    onClick={() => setShowRosterModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-ink/50 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                  >
                    🖨 Print Full Roster
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="lg:col-span-3 rounded-[32px] bg-white p-10 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
                <h2 className="font-display text-3xl font-black text-ink">Complete Program Roster</h2>
                <div className="px-5 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-ink/40">
                  {filteredBookings.length} Active Bookings
                </div>
              </div>

              {filteredBookings.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBookings.map((booking) => (
                    <div key={booking._id} className="p-8 rounded-[40px] border border-slate-100 bg-slate-50/50 relative overflow-hidden group hover:bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <span className="text-6xl italic">JTS</span>
                      </div>

                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 rounded-md bg-coral/10 text-coral text-[8px] font-black uppercase tracking-widest">Class</span>
                          <span className="text-[10px] font-black text-ink/60 bg-white shadow-sm border border-slate-100 px-2 py-0.5 rounded-lg">#{booking.bookingNumber}</span>
                        </div>
                        <h4 className="text-xl font-black text-ink leading-tight">{booking.classId?.title}</h4>
                        <p className="text-[10px] font-black text-coral uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                          <span className="w-4 h-[1px] bg-coral"></span>
                          {new Date(booking.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </p>
                      </div>

                      <div className="space-y-3 mb-8">
                        {booking.participants?.map((p, i) => (
                          <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                            <div className="h-12 w-12 rounded-[20px] bg-slate-50 flex items-center justify-center text-sm font-black text-ink/20">
                              {p.name?.charAt(0) || p.childId?.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-ink leading-none">{p.name || p.childId?.name}</p>
                              <span className="text-[10px] font-bold text-ink/30 uppercase mt-1 inline-block">{p.age || p.childId?.age}Y • {p.gender || p.childId?.gender}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-ink/80">{booking.status}</span>
                        </div>
                        <span className="text-xs font-black text-ink/40">{currency} {booking.totalAmount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                  <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center text-4xl mb-8 grayscale opacity-50">👥</div>
                  <h3 className="text-xl font-black text-ink mb-2">No Bookings Yet</h3>
                  <p className="text-slate-400 font-bold italic max-w-xs">No students have booked sessions with you in this location.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trials' && (
            <div className="lg:col-span-3 rounded-[32px] bg-white p-10 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
                <h2 className="font-display text-3xl font-black text-ink">New Trial Requests</h2>
                <div className="px-5 py-2 rounded-2xl bg-orange-50 border border-orange-100 text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {filteredTrials.length} Potential Members
                </div>
              </div>

              {filteredTrials.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTrials.map((trial) => (
                    <div key={trial._id} className="p-8 rounded-[40px] border border-slate-100 bg-slate-50/50 relative overflow-hidden group hover:bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                      <div className="absolute top-0 right-0 p-8 rotate-12 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                        <span className="text-8xl">✨</span>
                      </div>

                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 rounded-md bg-orange-400/10 text-orange-400 text-[8px] font-black uppercase tracking-widest">Trial</span>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-blue-100 text-blue-600`}>
                            {trial.status}
                          </span>
                        </div>
                        <h4 className="text-2xl font-black text-ink leading-tight">{trial.childName}</h4>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mt-2">
                          Age: {trial.childAge} • Preference: {trial.preferredClass}
                        </p>
                      </div>

                      <div className="space-y-4 mb-8 bg-white p-6 rounded-[32px] border border-slate-100">
                        <div>
                          <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest mb-1">Customer</p>
                          <p className="text-sm font-black text-ink">{trial.parentName}</p>
                        </div>
                        <div className="flex justify-between border-t border-slate-50 pt-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-xs">📞</div>
                            <span className="text-xs font-bold text-ink/70">{trial.parentPhone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-xs">✉️</div>
                            <span className="text-xs font-bold text-ink/70">Email</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-black text-ink/20 uppercase tracking-widest">
                          {new Date(trial.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </span>
                        <button className="text-[10px] font-black text-orange-400 uppercase tracking-widest hover:underline">View Details</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                  <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center text-4xl mb-8 grayscale opacity-50">✨</div>
                  <h3 className="text-xl font-black text-ink mb-2">No Trials Scheduled</h3>
                  <p className="text-slate-400 font-bold italic max-w-xs">There are no trial requests for this branch at the moment.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cancellation Modal */}
        {cancellingSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-ink">Cancel Session</h3>
                <button onClick={() => setCancellingSession(null)} className="text-3xl text-ink/20 hover:text-ink/60 transition-colors">×</button>
              </div>

              <div className="mb-8">
                <p className="text-xs font-bold text-ink/50 leading-relaxed">
                  Please provide a reason for cancelling the <span className="text-coral font-black">{cancellingSession.classId?.title}</span> session on <span className="font-black">{new Date(cancellingSession.startTime).toLocaleDateString()}</span>.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-3 block">Reason for Cancellation</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g., Staff emergency, Maintenance, Low occupancy..."
                    className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-sm font-medium text-ink outline-none focus:border-coral/30 focus:ring-4 focus:ring-coral/5 transition-all resize-none"
                    autoFocus
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setCancellingSession(null)}
                    className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-ink/40 hover:bg-slate-50 transition-all"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleCancelSession}
                    disabled={isSubmittingCancel}
                    className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
