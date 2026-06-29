import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';

const parseDurationToMinutes = (duration) => {
  if (!duration) return 60;
  const str = String(duration).toLowerCase().trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 60;
  if (str.includes('hour') || str.includes('hr')) {
    return Math.round(num * 60);
  }
  return Math.round(num);
};

const addMinutesToDateTime = (dateTimeString, minutes) => {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() + minutes);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const addMinutesToTime = (timeString, minutes) => {
  if (!timeString) return '';
  const [hours, mins] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const emptyForm = {
  classId: '',
  trainerId: '',
  startTime: '',
  endTime: '',
  capacity: '',
  location: '',
  status: 'scheduled'
};

const formatLocalDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export default function SessionsManagement() {
  const { roleSlug } = useParams();
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [view, setView] = useState('active'); // 'active' or 'expired'
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [cancellingSession, setCancellingSession] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [viewingParticipantsSession, setViewingParticipantsSession] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [sendingTrainerReminderId, setSendingTrainerReminderId] = useState(null);
  const [sendingAllReminders, setSendingAllReminders] = useState(false);

  const { can } = usePermissions();
  const { selectedBranch } = useBranch();

  const canCreate = can('sessions:create');
  const canEdit = can('sessions:edit');
  const canDelete = can('sessions:delete');

  const [dateFilterOption, setDateFilterOption] = useState('all');
  const [customDateFilter, setCustomDateFilter] = useState('');
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const getLocalDateString = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Filter by Active vs Expired view
    const now = new Date();
    result = result.filter(s => {
      const isPast = new Date(s.startTime) < now;
      return view === 'active' ? !isPast : isPast;
    });

    // Filter by Selected Date Option
    if (dateFilterOption === 'today') {
      const todayStr = getLocalDateString(now);
      result = result.filter(s => getLocalDateString(s.startTime) === todayStr);
    } else if (dateFilterOption === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowStr = getLocalDateString(tomorrow);
      result = result.filter(s => getLocalDateString(s.startTime) === tomorrowStr);
    } else if (dateFilterOption === 'week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      result = result.filter(s => {
        const time = new Date(s.startTime);
        return time >= startOfWeek && time <= endOfWeek;
      });
    } else if (dateFilterOption === 'month') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      result = result.filter(s => {
        const time = new Date(s.startTime);
        return time.getFullYear() === currentYear && time.getMonth() === currentMonth;
      });
    } else if (dateFilterOption === 'custom' && customDateFilter) {
      result = result.filter(s => getLocalDateString(s.startTime) === customDateFilter);
    }

    // Filter by Trainer
    if (selectedTrainerFilter !== 'all') {
      result = result.filter(s => {
        const tId = s.trainerId?._id || s.trainerId;
        return tId === selectedTrainerFilter;
      });
    }

    // Filter by Class
    if (selectedClassFilter !== 'all') {
      result = result.filter(s => {
        const cId = s.classId?._id || s.classId;
        return cId === selectedClassFilter;
      });
    }

    // Filter by Category
    if (selectedCategoryFilter !== 'all') {
      result = result.filter(s => {
        const catId = s.classId?.categoryId;
        return catId === selectedCategoryFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (view === 'active') {
        return new Date(a.startTime) - new Date(b.startTime);
      } else {
        return new Date(b.startTime) - new Date(a.startTime);
      }
    });

    return result;
  }, [sessions, view, dateFilterOption, customDateFilter, selectedTrainerFilter, selectedClassFilter, selectedCategoryFilter]);

  const load = () => {
    setLoading(true);
    const p1 = api.get('/sessions?all=true&includeMemberships=true').then((res) => {
      const data = res.data || [];
      setSessions(data);
    });
    const p2 = api.get('/classes').then((res) => setClasses(res.data || []));
    const p3 = api.get('/trainers').then((res) => setTrainers(res.data || []));
    const p4 = api.get('/locations').then((res) => setLocations(res.data || []));
    const p5 = api.get('/plans?all=true').then((res) => setPlans(res.data || []));
    const p6 = api.get('/categories').then((res) => setCategories(res.data || []));
    Promise.all([p1, p2, p3, p4, p5, p6]).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const selectedClass = classes.find(c => c._id === form.classId);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      // Autofill capacity if class is selected and capacity is empty
      if (name === 'classId' && value) {
        const cls = classes.find(c => c._id === value);
        if (cls) {
          if (!prev.capacity) updated.capacity = cls.capacity || '';
          if (cls.locationId) updated.locationId = cls.locationId?._id || cls.locationId;
          if (prev.startTime && cls.duration) {
            const durationMins = parseDurationToMinutes(cls.duration);
            updated.endTime = addMinutesToDateTime(prev.startTime, durationMins);
          }
        }
      }

      if (name === 'startTime' && value) {
        const cls = prev.classId ? classes.find(c => c._id === prev.classId) : null;
        if (cls && cls.duration) {
          const durationMins = parseDurationToMinutes(cls.duration);
          updated.endTime = addMinutesToDateTime(value, durationMins);
        }
      }

      return updated;
    });
  };

  const filteredTrainers = useMemo(() => {
    if (!selectedClass || !selectedClass.availableTrainers) return trainers;
    const availableIds = selectedClass.availableTrainers.map(t => t._id || t);
    return trainers.filter(t => availableIds.includes(t._id));
  }, [selectedClass, trainers]);

  const handleEdit = (session) => {
    setEditingId(session._id);
    setForm({
      classId: session.classId?._id || session.classId || '',
      trainerId: session.trainerId?._id || session.trainerId || '',
      locationId: session.locationId?._id || session.locationId || '',
      startTime: formatLocalDateForInput(session.startTime),
      endTime: formatLocalDateForInput(session.endTime),
      capacity: session.capacity ?? '',
      location: session.location || '',
      status: session.status || 'scheduled'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId('');
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.classId) {
      return toast.error('Please select a class from the search results');
    }

    if (!selectedBranch || selectedBranch === 'all') {
      return toast.error('Please select a specific branch in the header to create a session');
    }

    const payload = {
      ...form,
      startTime: new Date(form.startTime).toISOString(),
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined
    };

    try {
      if (editingId) {
        await api.put(`/sessions/${editingId}`, payload);
      } else {
        await api.post('/sessions', {
          ...payload,
          locationIds: selectedBranch && selectedBranch !== 'all' ? [selectedBranch] : []
        });
      }
      toast.success(editingId ? 'Session updated successfully!' : 'Session created successfully!');
      handleCancel();
      load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save session';
      toast.error(msg);
    }
  };

  const handleToggleStatus = async (session) => {
    const action = session.status === 'scheduled' ? 'cancel' : 'restore';

    if (action === 'cancel') {
      setCancellingSession(session);
      return;
    }

    if (!window.confirm(`Are you sure you want to restore this session?`)) return;
    try {
      await api.delete(`/sessions/${session._id}`);
      toast.success(`Session restored successfully`);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to restore session`;
      toast.error(msg);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      return toast.error('Please provide a reason for cancellation');
    }
    setIsSubmittingCancel(true);
    try {
      await api.delete(`/sessions/${cancellingSession._id}`, { data: { reason: cancelReason } });
      toast.success('Session cancelled successfully');
      setCancellingSession(null);
      setCancelReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel session');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleShowParticipants = async (session) => {
    if (session.bookedParticipants === 0) {
      return toast.error('No participants booked for this session');
    }
    setViewingParticipantsSession(session);
    setLoadingParticipants(true);
    setParticipantsList([]);
    try {
      const res = await api.get(`/bookings?sessionId=${session._id}`);
      setParticipantsList(res.data || []);
      setLoadingParticipants(false);
    } catch (err) {
      toast.error('Failed to load participant list');
      setLoadingParticipants(false);
      setViewingParticipantsSession(null);
    }
  };

  const handleSendTrainerReminder = async (sessionId) => {
    setSendingTrainerReminderId(sessionId);
    try {
      await api.post(`/sessions/${sessionId}/trainer-reminder`);
      toast.success('Trainer reminder sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send trainer reminder');
    } finally {
      setSendingTrainerReminderId(null);
    }
  };

  const handleSendAllReminders = async () => {
    const eligibleParticipants = participantsList.filter(b => b.status === 'confirmed' || b.status === 'scheduled');
    if (!viewingParticipantsSession || eligibleParticipants.length === 0) return;
    if (!window.confirm(`Send reminder emails to ${eligibleParticipants.length} booked participant(s)?`)) return;
    
    setSendingAllReminders(true);
    try {
      await Promise.all(eligibleParticipants.map(booking => 
        api.post(`/bookings/${booking._id}/reminder`)
      ));
      toast.success('Reminders sent successfully!');
    } catch (err) {
      toast.error('Failed to send some reminders');
    } finally {
      setSendingAllReminders(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <AdminHeader
          title="Session Manager"
          description="Schedule specific time slots for trainers and classes."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8 flex items-center justify-between mb-8">
          <div>
            {/* Header info moved to AdminHeader */}
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-ink text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-ink/90 transition-all flex items-center gap-2 shadow-lg shadow-ink/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Bulk Generator
            </button>
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
              <button
                type="button"
                onClick={() => setView('active')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'active' ? 'bg-brand-blue text-white shadow-md' : 'text-ink/30 hover:text-ink'}`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setView('expired')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'expired' ? 'bg-brand-blue text-white shadow-md' : 'text-ink/30 hover:text-ink'}`}
              >
                Expired / Closed
              </button>
            </div>
          </div>
        </div>

        {canCreate || (editingId && canEdit) ? (
          <div className="soft-card rounded-[48px] p-8 md:p-10 mb-10">
            <form className="grid gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Class Path</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                      placeholder="Search and select class..."
                      value={classSearchQuery || (classes.find(c => c._id === form.classId)?.title || '')}
                      onChange={(e) => {
                        setClassSearchQuery(e.target.value);
                        if (!showClassDropdown) setShowClassDropdown(true);
                        if (form.classId) setForm(prev => ({ ...prev, classId: '' }));
                      }}
                      onFocus={() => setShowClassDropdown(true)}
                    />
                    {showClassDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-[300px] overflow-y-auto overflow-x-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                        {classes
                          .filter(c => !classSearchQuery || c.title?.toLowerCase().includes(classSearchQuery.toLowerCase()))
                          .map((item) => (
                            <button
                              key={item._id}
                              type="button"
                              onClick={() => {
                                setForm(prev => {
                                  const updated = {
                                    ...prev,
                                    classId: item._id,
                                    capacity: prev.capacity || item.capacity || ''
                                  };
                                  if (prev.startTime && item.duration) {
                                    const durationMins = parseDurationToMinutes(item.duration);
                                    updated.endTime = addMinutesToDateTime(prev.startTime, durationMins);
                                  }
                                  return updated;
                                });
                                setClassSearchQuery(item.title);
                                setShowClassDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-all group"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-ink group-hover:text-brand-blue">{item.title}</span>
                                <span className="text-[10px] font-bold text-ink/20">{item.ageGroup}</span>
                              </div>
                            </button>
                          ))
                        }
                        {classes.filter(c => !classSearchQuery || c.title?.toLowerCase().includes(classSearchQuery.toLowerCase())).length === 0 && (
                          <div className="p-4 text-center">
                            <p className="text-xs font-bold text-ink/30 italic">No classes found matching "{classSearchQuery}"</p>
                          </div>
                        )}
                      </div>
                    )}
                    {showClassDropdown && (
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                          setShowClassDropdown(false);
                          setClassSearchQuery(''); 
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Assigned Trainer</label>
                  <select
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    name="trainerId"
                    value={form.trainerId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select trainer</option>
                    {filteredTrainers.map((trainer) => (
                      <option key={trainer._id} value={trainer._id}>{trainer.name}</option>
                    ))}
                  </select>
                  {form.classId && filteredTrainers.length === 0 && (
                    <p className="text-[10px] text-coral font-bold mt-1 ml-4 italic">No trainers linked to this class!</p>
                  )}
                </div>
              </div>

              {selectedBranch === 'all' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-bold text-amber-700">
                    "All locations" is selected in the header. Please select a specific branch (e.g. Dubai Al Wasl) in the top switcher to create a session.
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Start Time & Date</label>
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    name="startTime"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-ink/30">End Time (Auto-calculated)</label>
                    {selectedClass && (
                      <span className="text-[10px] font-bold text-brand-blue">Class Duration: {selectedClass.duration || 'N/A'}</span>
                    )}
                  </div>
                  <input
                    className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink/50 cursor-not-allowed outline-none transition-all"
                    name="endTime"
                    type="datetime-local"
                    value={form.endTime}
                    disabled
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Slot Capacity</label>
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    name="capacity"
                    type="number"
                    placeholder="Inherits from class"
                    value={form.capacity}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Studio / Room Name (Optional)</label>
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    name="location"
                    placeholder="Studio A, etc."
                    value={form.location}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  className={`bg-brand-blue text-white px-10 py-4 rounded-full font-black shadow-lg transition-all ${selectedBranch === 'all' && !editingId ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'hover:scale-105 active:scale-95'}`}
                  type="submit"
                  disabled={selectedBranch === 'all' && !editingId}
                >
                  {editingId ? 'Update Session' : 'Create Session'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="text-sm font-bold text-ink/40 hover:text-ink transition-all px-6"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="soft-card rounded-[48px] p-8 md:p-10 mb-10 bg-white/50 border border-dashed border-slate-200 text-center">
            <p className="text-sm font-bold text-ink/30 italic">You don't have permission to {editingId ? 'edit' : 'create'} sessions.</p>
          </div>
        )}

        {/* Search and Date Filter Bar */}
        <div className="mb-6 flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">Trainer:</span>
              </div>
              <select
                value={selectedTrainerFilter}
                onChange={(e) => setSelectedTrainerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-[85px] pr-8 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all cursor-pointer min-w-[180px] max-w-[220px] truncate"
              >
                <option value="all">All Trainers</option>
                {trainers.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">Program:</span>
              </div>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-[85px] pr-8 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all cursor-pointer min-w-[180px] max-w-[220px] truncate"
              >
                <option value="all">All Programs</option>
                <optgroup label="Classes">
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </optgroup>
                {plans && plans.length > 0 && (
                  <optgroup label="Memberships">
                    {plans.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'tomorrow', label: 'Tomorrow' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setDateFilterOption(opt.id);
                  setCustomDateFilter(''); 
                }}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilterOption === opt.id
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/15'
                    : 'bg-slate-50 text-ink/40 hover:bg-slate-100 hover:text-ink/60'
                  }`}
              >
                {opt.label}
              </button>
            ))}
            
            <div className="flex items-center gap-3 ml-2">
              <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">Or Select Date:</span>
              <input
                type="date"
                value={customDateFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomDateFilter(val);
                  if (val) {
                    setDateFilterOption('custom');
                  } else {
                    setDateFilterOption('all');
                  }
                }}
                className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200 flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
              <p className="text-sm font-bold text-ink/30 uppercase tracking-widest">Fetching sessions...</p>
            </div>
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <div key={session._id} className={`soft-card rounded-[32px] p-6 hover:shadow-xl transition-all group flex flex-col md:flex-row items-center justify-between gap-6 border ${new Date(session.startTime) < new Date() ? 'bg-slate-50/50 border-slate-200/50' : 'border-slate-100/50'}`}>
                <div className="flex items-center gap-6 flex-1">
                  <div className={`w-16 h-16 rounded-[24px] flex flex-col items-center justify-center ${new Date(session.startTime) < new Date() ? 'bg-slate-200/50 text-ink/20' : 'bg-brand-blue/5 text-brand-blue'}`}>
                    <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(session.startTime).toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-xl font-black leading-none">{new Date(session.startTime).getDate()}</span>
                  </div>
                  <div>
                    <h3 className={`font-display text-xl ${new Date(session.startTime) < new Date() ? 'text-ink/30' : 'text-ink'}`}>{session.classId?.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <p className="text-xs font-bold text-ink/60 flex items-center gap-1.5 leading-none">
                        <span className={`w-1.5 h-1.5 rounded-full ${new Date(session.startTime) < new Date() ? 'bg-slate-300' : 'bg-ocean'}`}></span>
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {session.endTime && (
                          <span className="text-ink/30 ml-1">
                            - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-bold text-ink/40">Trainer: <span className={new Date(session.startTime) < new Date() ? 'text-ink/20' : 'text-brand-blue'}>{session.trainerId?.name || 'TBA'}</span></p>
                      <button
                        onClick={() => handleShowParticipants(session)}
                        className={`text-xs font-bold transition-all group/occ ${session.bookedParticipants > 0 ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
                      >
                        Occupancy: <span className={`${session.bookedParticipants >= session.capacity ? 'text-coral' : 'text-green-500'} ${session.bookedParticipants > 0 ? 'group-hover/occ:text-brand-blue' : ''}`}>
                          {session.bookedParticipants || 0}
                          {session.classType === 'Class' && ` / ${session.capacity}`}
                        </span>
                      </button>
                    </div>
                    <div className="mt-3 text-[10px] font-black uppercase tracking-widest flex flex-wrap gap-2">
                      {new Date(session.startTime) < new Date() ? (
                        <span className="text-ink/30 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                          Closed / Expired
                        </span>
                      ) : (
                        <span className="text-moss bg-moss/10 px-3 py-1 rounded-full border border-moss/20">
                          Active
                        </span>
                      )}
                      {session.status === 'cancelled' && (
                        <span className="text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                          Cancelled
                        </span>
                      )}
                      {session.trainerId && (
                        <span className={`px-3 py-1 rounded-full border ${session.trainerStatus === 'accepted' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' :
                            session.trainerStatus === 'rejected' ? 'text-red-500 bg-red-50 border-red-100' :
                              'text-amber-500 bg-amber-50 border-amber-100'
                          }`}>
                          Trainer: {session.trainerStatus || 'pending'}
                        </span>
                      )}
                    </div>
                    {session.status === 'cancelled' && session.cancellationReason && (
                      <div className="mt-3 p-3 rounded-xl bg-red-50/50 border border-red-100/50 max-w-md">
                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-0.5">Reason</p>
                        <p className="text-[10px] font-bold text-red-700/70 leading-relaxed italic">"{session.cancellationReason}"</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-slate-100 justify-start md:justify-end">
                  {canEdit && (
                    <button
                      className={`rounded-full px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${new Date(session.startTime) < new Date()
                        ? 'bg-white border border-slate-200 text-ink/40 hover:bg-slate-50'
                        : 'bg-brand-blue text-white hover:bg-brand-blue/90 shadow-md shadow-brand-blue/10'
                        }`}
                      onClick={() => handleEdit(session)}
                    >
                      Edit
                    </button>
                  )}
                  {session.trainerId && session.status !== 'cancelled' && new Date(session.startTime) >= new Date() && (
                    <button
                      className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-100 text-brand-blue hover:bg-brand-blue hover:text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendTrainerReminder(session._id);
                      }}
                      disabled={sendingTrainerReminderId === session._id}
                      title="Send Trainer Reminder"
                    >
                      {sendingTrainerReminderId === session._id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      )}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className={`h-10 px-4 flex items-center justify-center rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${session.status === 'scheduled' ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'}`}
                      onClick={() => handleToggleStatus(session)}
                    >
                      {session.status === 'scheduled' ? 'Cancel Slot' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
              <p className="font-display text-xl text-ink/30 italic font-black">No {view} sessions found.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Cancellation Reason Modal */}
      {cancellingSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-ink">Cancel Session</h3>
              <button
                onClick={() => {
                  setCancellingSession(null);
                  setCancelReason('');
                }}
                className="text-3xl text-ink/20 hover:text-ink/60 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="mb-8">
              <p className="text-xs font-bold text-ink/50 leading-relaxed">
                Provide a reason for cancelling the <span className="text-brand-blue font-black">{cancellingSession.classId?.title}</span> session on <span className="font-black text-ink">{new Date(cancellingSession.startTime).toLocaleDateString()}</span>.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-3 block">Cancellation Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Trainer unavailable, Low occupancy, Facility maintenance..."
                  className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-sm font-medium text-ink outline-none focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/5 transition-all resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => {
                    setCancellingSession(null);
                    setCancelReason('');
                  }}
                  className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-ink/40 hover:bg-slate-50 transition-all font-black"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={isSubmittingCancel}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {isSubmittingCancel ? 'Processing...' : 'Cancel Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participant List Pop-up */}
      {viewingParticipantsSession && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-ink">Participants List</h3>
                <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mt-1">
                  {viewingParticipantsSession.classId?.title} • {new Date(viewingParticipantsSession.startTime).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {new Date(viewingParticipantsSession.startTime) >= new Date() && participantsList.some(b => b.status === 'confirmed' || b.status === 'scheduled') && (
                  <button
                    onClick={handleSendAllReminders}
                    disabled={sendingAllReminders}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all disabled:opacity-50"
                  >
                    {sendingAllReminders ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    )}
                    Remind All
                  </button>
                )}
                <button
                  onClick={() => setViewingParticipantsSession(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-ink/20 hover:text-ink/60 shadow-sm border border-slate-100 transition-all font-black text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {loadingParticipants ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
                  <p className="text-xs font-bold text-ink/30 uppercase tracking-widest leading-none">Loading participants...</p>
                </div>
              ) : participantsList.length > 0 ? (
                <div className="space-y-4">
                  {participantsList.map((booking) => (
                    <div key={booking._id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest leading-none mb-1">Customer / Contact</p>
                          <h4 className="text-sm font-black text-ink">{booking.userId?.name || booking.guestDetails?.name || booking.packageInfo?.parentName || 'Guest'}</h4>
                          <p className="text-[10px] font-bold text-ink/40 mt-0.5">{booking.userId?.phone || booking.guestDetails?.phone || 'No phone'}</p>
                          {(booking.planId?.name || booking.packageInfo?.name) && (
                            <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-brand-blue bg-brand-blue/5 border border-brand-blue/10 px-2 py-0.5 rounded-lg inline-block">
                              📦 {booking.planId?.name || booking.packageInfo?.name}
                            </div>
                          )}
                          {booking.isVirtualMembership && (
                            <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-ocean/60 bg-ocean/5 border border-ocean/10 px-2 py-0.5 rounded-lg inline-block ml-1">
                              🆔 {booking.bookingNumber}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${booking.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {booking.status}
                          </span>
                          {booking.refundStatus && booking.refundStatus !== 'none' && (
                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${booking.refundStatus === 'requested' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                booking.refundStatus === 'refunded' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                  'bg-red-50 text-red-400 border-red-100'
                              }`}>
                              {booking.refundStatus === 'requested' ? 'Refund Req.' : booking.refundStatus}
                            </span>
                          )}
                          {new Date(viewingParticipantsSession.startTime) >= new Date() && (booking.status === 'confirmed' || booking.status === 'scheduled') && (
                            <button
                              onClick={() => handleSendReminder(booking)}
                              disabled={sendingReminderId === booking._id}
                              className="text-[8px] font-black uppercase tracking-widest text-brand-blue hover:text-brand-blue/70 flex items-center gap-1 transition-all disabled:opacity-50"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              {sendingReminderId === booking._id ? 'Sending...' : 'Send Reminder'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {booking.participants?.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-brand-blue/30 uppercase">
                              {p.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-black text-ink leading-none">{p.name || p.childId?.name || booking.packageInfo?.childName}</p>
                              <p className="text-[9px] font-bold text-ink/30 uppercase mt-1">{p.age || p.childId?.age || ''}Y • {p.gender || p.childId?.gender || ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-ink/30 italic">No bookings found for this session.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingParticipantsSession(null)}
                className="px-8 py-3 rounded-2xl bg-white border border-slate-200 text-ink/40 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all font-black"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <BulkSessionModal
          onClose={() => setShowBulkModal(false)}
          classes={classes}
          trainers={trainers}
          plans={plans}
          onCreated={load}
          selectedBranch={selectedBranch}
        />
      )}
    </div>
  );
}

function BulkSessionModal({ onClose, classes, trainers, plans, onCreated, selectedBranch }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    classId: '',
    trainerId: '',
    timeSlots: [{ startTime: '', endTime: '' }], // Support multiple slots
    durationMinutes: 60,
    days: [], // 0 = Sun, 1 = Mon ...
    startDate: '',
    endDate: '',
    occurences: 10,
    room: ''
  });
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedClass = classes.find(c => c._id === form.classId);

  const filteredTrainers = useMemo(() => {
    if (!form.classId) return trainers;
    const cls = classes.find(c => c._id === form.classId);
    if (!cls || !cls.availableTrainers) return trainers;
    const availableIds = cls.availableTrainers.map(t => t._id || t);
    return trainers.filter(t => availableIds.includes(t._id));
  }, [form.classId, classes, trainers]);

  useEffect(() => {
    if (selectedClass) {
      const duration = parseDurationToMinutes(selectedClass.duration);
      setForm(prev => {
        const updatedSlots = prev.timeSlots.map(slot => ({
          ...slot,
          endTime: slot.startTime ? addMinutesToTime(slot.startTime, duration) : ''
        }));
        return { 
          ...prev, 
          durationMinutes: duration,
          timeSlots: updatedSlots
        };
      });
    }
  }, [selectedClass]);

  const handleTimeSlotChange = (index, value) => {
    setForm(prev => {
      const updatedSlots = [...prev.timeSlots];
      updatedSlots[index] = {
        startTime: value,
        endTime: value ? addMinutesToTime(value, prev.durationMinutes) : ''
      };
      return { ...prev, timeSlots: updatedSlots };
    });
  };

  const addTimeSlot = () => {
    setForm(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { startTime: '', endTime: '' }]
    }));
  };

  const removeTimeSlot = (index) => {
    setForm(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, idx) => idx !== index)
    }));
  };

  const generatePreview = () => {
    const validSlots = form.timeSlots.filter(slot => slot.startTime);
    if (!form.classId || !form.startDate || form.days.length === 0 || validSlots.length === 0) {
      return toast.error('Please fill all required fields (Class, Days, Start Date, and at least one Start Time)');
    }

    const sessions = [];
    const maxOccurrences = parseInt(form.occurences) || 10;
    
    for (const slot of validSlots) {
      const start = new Date(form.startDate + 'T00:00:00');
      const endLimit = form.endDate ? new Date(form.endDate + 'T23:59:59') : null;
      let current = new Date(start);
      const timeArr = slot.startTime.split(':');
      
      const slotSessions = [];
      const maxSessionsForSlot = endLimit ? 500 : maxOccurrences;
      let iterations = 0;
      
      while (slotSessions.length < maxSessionsForSlot && iterations < 500) {
        iterations++;
        if (endLimit && current > endLimit) {
          break;
        }
        const day = current.getDay();
        if (form.days.includes(day)) {
          const sessionStart = new Date(current);
          sessionStart.setHours(parseInt(timeArr[0]), parseInt(timeArr[1]), 0, 0);
          
          const sessionEnd = new Date(sessionStart);
          if (slot.endTime) {
            const endTimeArr = slot.endTime.split(':');
            sessionEnd.setHours(parseInt(endTimeArr[0]), parseInt(endTimeArr[1]), 0, 0);
          } else {
            sessionEnd.setMinutes(sessionEnd.getMinutes() + (parseInt(form.durationMinutes) || 60));
          }

          slotSessions.push({
            classId: form.classId,
            trainerId: form.trainerId,
            startTime: sessionStart.toISOString(),
            endTime: sessionEnd.toISOString(),
            location: form.room,
            locationId: selectedBranch && selectedBranch !== 'all' ? selectedBranch : selectedClass?.locationId
          });
        }
        current.setDate(current.getDate() + 1);
      }
      sessions.push(...slotSessions);
    }
    
    sessions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    setPreview(sessions);
    setStep(2);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/sessions/bulk', { sessions: preview });
      const { message, results } = res.data;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount > 0) {
        toast.success(`Created ${successCount} sessions. ${failCount} failed (conflicts).`);
      } else {
        toast.success(`Successfully created ${successCount} sessions!`);
      }
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-ink/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden border border-white/20">
        <div className="p-8 md:p-10 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="font-display text-3xl font-black text-ink">Bulk Session Generator</h2>
            <p className="text-sm text-ink/40 font-medium tracking-wide">Generate a full term schedule in seconds.</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-ink/20 hover:bg-slate-100 hover:text-ink transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-10">
          {step === 1 ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Choose Class</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink"
                    value={form.classId}
                    onChange={e => setForm({...form, classId: e.target.value})}
                  >
                    <option value="">Select Class...</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Trainer</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink"
                    value={form.trainerId}
                    onChange={e => setForm({...form, trainerId: e.target.value})}
                  >
                    <option value="">Select Trainer...</option>
                    {filteredTrainers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Multiple Time Slots Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30">Time Slots</label>
                  {selectedClass && (
                    <span className="text-[10px] font-bold text-brand-blue">Duration: {selectedClass.duration}</span>
                  )}
                </div>
                
                <div className="space-y-3">
                  {form.timeSlots.map((slot, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-end gap-4 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 animate-in fade-in duration-200">
                      <div className="flex-1 space-y-2 w-full">
                        <label className="text-[9px] font-black uppercase tracking-widest text-ink/30 ml-4">Start Time #{index + 1}</label>
                        <input 
                          type="time" 
                          className="w-full bg-white border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand-blue/20" 
                          value={slot.startTime}
                          onChange={e => handleTimeSlotChange(index, e.target.value)}
                        />
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <label className="text-[9px] font-black uppercase tracking-widest text-ink/30 ml-4">End Time (Auto-calculated)</label>
                        <input 
                          type="time" 
                          className="w-full bg-slate-100 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-ink/50 cursor-not-allowed outline-none" 
                          value={slot.endTime}
                          disabled
                        />
                      </div>
                      {form.timeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="mb-2 h-12 px-6 rounded-2xl bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="bg-brand-blue/10 text-brand-blue px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all flex items-center gap-2 self-start"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Time Slot
                  </button>
                  <div className="space-y-2 w-full md:w-64">
                    <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4 block">Total Occurrences</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none" 
                      value={form.occurences}
                      onChange={e => setForm({...form, occurences: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4 block border-b border-slate-100 pb-2">Select Days of Week</label>
                <div className="flex flex-wrap gap-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const next = form.days.includes(idx) 
                          ? form.days.filter(d => d !== idx)
                          : [...form.days, idx];
                        setForm({...form, days: next});
                      }}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.days.includes(idx) ? 'bg-brand-blue text-white shadow-lg' : 'bg-slate-50 text-ink/20 hover:bg-slate-100'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink" 
                    value={form.startDate}
                    onChange={e => setForm({...form, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">End Date (Optional)</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink" 
                    value={form.endDate}
                    onChange={e => setForm({...form, endDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Studio / Room</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink" 
                    placeholder="e.g. Studio A"
                    value={form.room}
                    onChange={e => setForm({...form, room: e.target.value})}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-ink/40">Preview ({preview.length} sessions)</h3>
                <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:underline">Back to Edit</button>
              </div>
              <div className="space-y-2">
                {preview.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                       <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-ink/30">{i + 1}</span>
                       <div>
                         <p className="text-sm font-black text-ink">{new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                         <p className="text-[10px] font-bold text-ink/30">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-brand-blue bg-brand-blue/5 px-3 py-1 rounded-full">{selectedClass?.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 md:p-10 border-t border-slate-100 bg-slate-50/30 flex items-center justify-end gap-4">
          <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-ink/40 hover:text-ink transition-all">Cancel</button>
          {step === 1 ? (
            <button 
              onClick={generatePreview}
              className="bg-ink text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 shadow-xl transition-all"
            >
              Generate Preview
            </button>
          ) : (
            <button 
              onClick={handleCreate}
              disabled={loading}
              className="bg-brand-blue text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 shadow-xl transition-all flex items-center gap-2"
            >
              {loading ? 'Creating...' : <>Confirm & Create Sessions <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

