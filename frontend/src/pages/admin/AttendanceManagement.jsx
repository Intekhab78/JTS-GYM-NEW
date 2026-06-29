import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useSocket } from '../../context/SocketContext.jsx';
import toast from 'react-hot-toast';

export default function AttendanceManagement() {
  const { roleSlug } = useParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  
  // States for Manual Checkin Modal
  const [showManualCheckin, setShowManualCheckin] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [form, setForm] = useState({ sessionId: '', childId: '', participantName: '', status: 'present', bookingId: '' });
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  
  // States for Roster Modal
  const [viewRosterSession, setViewRosterSession] = useState(null);
  const [rosterAttendees, setRosterAttendees] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  const { can } = usePermissions();
  const { socket } = useSocket();

  const canCreate = can('attendance:create');

  const loadSessions = () => {
    setLoading(true);
    const start = new Date(currentDate);
    start.setDate(start.getDate() - 1);
    const end = new Date(currentDate);
    end.setDate(end.getDate() + 2);

    const params = {
      start: start.toISOString(),
      end: end.toISOString(),
      all: true,
      includeMemberships: true
    };

    api.get('/sessions', { params })
      .then((res) => {
        setSessions(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load sessions.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSessions();
  }, [currentDate]);

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        loadSessions();
        if (form.sessionId) {
          loadAttendeesForSession(form.sessionId);
        }
      };
      socket.on('booking_updated', handleUpdate);
      socket.on('attendance_updated', handleUpdate);
      return () => {
        socket.off('booking_updated', handleUpdate);
        socket.off('attendance_updated', handleUpdate);
      };
    }
  }, [socket, form.sessionId]);

  const loadAttendeesForSession = (sessionId) => {
    setLoadingAttendees(true);
    api.get(`/bookings?sessionId=${sessionId}`)
      .then((res) => {
        const bookings = res.data || [];
        const relevantBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
        const list = [];
        relevantBookings.forEach(b => {
          b.participants.forEach(p => {
            list.push({
              id: p.childId?._id || p._id,
              childId: p.childId?._id || null,
              name: p.name || p.childId?.name || 'Unknown',
              age: p.age || p.childId?.age || '',
              bookingId: b._id,
              status: b.status,
              packageName: b.packageInfo?.name || b.planId?.name || ''
            });
          });
        });

        const uniqueItems = [];
        const seen = new Set();
        list.forEach(item => {
          const key = item.childId || item.name;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueItems.push(item);
          }
        });

        setAttendees(uniqueItems);
        setLoadingAttendees(false);
      })
      .catch(() => {
        setLoadingAttendees(false);
      });
  };

  const handleViewRoster = (session) => {
    setViewRosterSession(session);
    setLoadingRoster(true);
    
    Promise.all([
      api.get(`/bookings?sessionId=${session._id}`),
      api.get(`/attendance?sessionId=${session._id}`)
    ])
      .then(([resBookings, resAttendance]) => {
        const bookings = resBookings.data || [];
        const attendances = resAttendance.data || [];
        
        const relevantBookings = bookings.filter(b => ['confirmed', 'pending', 'attended', 'completed'].includes(b.status));
        const list = [];
        relevantBookings.forEach(b => {
          b.participants.forEach(p => {
            const childIdStr = p.childId?._id || p.childId || p._id;
            const participantNameStr = p.name || p.childId?.name || 'Unknown';
            
            const attendanceRecord = attendances.find(a => 
              (a.childId?._id === childIdStr || a.childId === childIdStr) ||
              (a.participantName && a.participantName === participantNameStr)
            );
            
            let attendanceState = 'not_checked_in';
            if (attendanceRecord) {
              attendanceState = attendanceRecord.status;
            } else if (b.status === 'attended') {
              attendanceState = 'present';
            }
            
            list.push({
              id: childIdStr,
              name: participantNameStr,
              age: p.age || p.childId?.age || '',
              status: b.status === 'attended' ? 'confirmed' : b.status,
              attendanceState: attendanceState,
              packageName: b.packageInfo?.name || b.planId?.name || '',
              relation: p.relation || 'N/A'
            });
          });
        });

        // Deduplicate
        const uniqueItems = [];
        const seen = new Set();
        list.forEach(item => {
          if (!seen.has(item.name)) {
            seen.add(item.name);
            uniqueItems.push(item);
          }
        });

        setRosterAttendees(uniqueItems);
        setLoadingRoster(false);
      })
      .catch(() => {
        setLoadingRoster(false);
      });
  };

  useEffect(() => {
    if (form.sessionId) {
      loadAttendeesForSession(form.sessionId);
    } else {
      setAttendees([]);
    }
  }, [form.sessionId]);

  const handleManualChange = (e) => {
    if (e.target.name === 'attendeeKey') {
      const selection = attendees.find(a => (a.childId || a.name) === e.target.value);
      if (selection) {
        setForm(prev => ({
          ...prev,
          childId: selection.childId || '',
          participantName: selection.childId ? '' : selection.name,
          bookingId: selection.bookingId
        }));
      } else {
        setForm(prev => ({ ...prev, childId: '', participantName: '', bookingId: '' }));
      }
      return;
    }
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === 'sessionId') {
      setForm(prev => ({ ...prev, childId: '', participantName: '', bookingId: '' }));
    }
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    try {
      await api.post('/attendance/checkin', { ...form, method: 'manual' });
      toast.success('Attendance logged successfully.');
      setForm(prev => ({ ...prev, childId: '', participantName: '', bookingId: '', status: 'present' }));
      loadSessions();
      setShowManualCheckin(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Check-in failed. This attendee might already be logged.');
    }
  };

  const groupedSessions = useMemo(() => {
    const groups = {};
    sessions.forEach(session => {
      const dateValue = new Date(session.startTime);
      dateValue.setHours(0,0,0,0);
      const dateStr = dateValue.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      
      if (!groups[dateStr]) {
        groups[dateStr] = {
           date: dateStr,
           dateValue: dateValue,
           sessions: [],
           totalCheckedIn: 0,
           totalBooked: 0,
           totalUnpaid: 0,
           capacity: 0,
        };
      }
      
      groups[dateStr].sessions.push(session);
      groups[dateStr].totalCheckedIn += (session.attendedParticipants || 0);
      groups[dateStr].totalBooked += (session.bookedParticipants || 0);
      groups[dateStr].totalUnpaid += (session.unpaidParticipants || 0);
      groups[dateStr].capacity += (session.capacity || session.classId?.capacity || 0);
    });
    
    // Filter groups to only show the one matching currentDate
    const currentDateStr = currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const currentGroup = groups[currentDateStr] ? [groups[currentDateStr]] : [];

    return currentGroup;
  }, [sessions, currentDate]);

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    setCurrentDate(d);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Attendance Tracker" 
          description="Monitor daily session attendance, capacity, and check-ins."
          backTo={`/${roleSlug}`}
        />

        {error && (
          <div className="mt-8 rounded-2xl bg-rose-50 p-4 text-rose-700 border border-rose-100 flex items-center gap-3 font-bold text-sm shadow-sm">
            <span className="text-xl">⚠️</span> {error}
          </div>
        )}

        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex bg-brand-blue text-white rounded-lg shadow-sm overflow-hidden">
              <button onClick={handlePrevDay} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue/90 border-r border-white/20 transition-colors">
                &lsaquo; Previous
              </button>
              <button onClick={handleNextDay} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue/90 transition-colors">
                Next &rsaquo;
              </button>
            </div>
            <button onClick={handleToday} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-ink bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
              TODAY
            </button>
          </div>
          
          <button 
            onClick={() => setShowManualCheckin(true)}
            className="bg-brand-blue text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            + Manual Check-in
          </button>
        </div>

        {loading ? (
           <div className="py-20 text-center">
             <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
             <p className="mt-4 text-xs font-bold text-ink/30 uppercase tracking-widest">Loading Schedule...</p>
           </div>
        ) : groupedSessions.length === 0 ? (
           <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
             <p className="text-sm font-bold text-ink/30 italic">No classes scheduled in this timeframe.</p>
           </div>
        ) : (
          <div className="space-y-8">
            {groupedSessions.map(group => (
              <div key={group.date} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                {/* Group Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50/50 border-b border-slate-100 gap-4">
                  <h3 className="font-display text-xl font-bold text-ink">{group.date}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                      Checked In 
                      <span className="bg-white px-2 py-0.5 rounded-md shadow-sm">{group.totalCheckedIn}</span>
                    </div>
                    <div className="bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg border border-sky-100 flex items-center gap-2">
                      Booked
                      <span className="bg-white px-2 py-0.5 rounded-md shadow-sm">{group.totalBooked} / {group.capacity}</span>
                    </div>
                    {group.totalUnpaid > 0 && (
                      <div className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-2">
                        Unpaid
                        <span className="bg-white px-2 py-0.5 rounded-md shadow-sm">{group.totalUnpaid}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Time</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Service Item</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Booked</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Checked In</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Unpaid</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Coach</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Room</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {group.sessions.map(session => {
                        const startTime = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const endTime = session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        const capacity = session.capacity || session.classId?.capacity || 0;
                        const booked = session.bookedParticipants || 0;
                        const attended = session.attendedParticipants || 0;
                        const unpaid = session.unpaidParticipants || 0;
                        
                        return (
                          <tr key={session._id} className="hover:bg-slate-50/50 transition-colors group/row">
                            <td className="px-6 py-4 text-[11px] font-bold text-ink/70">
                              {startTime} {endTime && `- ${endTime}`}
                            </td>
                            <td className="px-6 py-4 text-[11px] font-black text-brand-blue">
                              {session.classId?.title || 'Unknown Class'}
                            </td>
                            <td className="px-6 py-4 text-[11px] font-bold text-ink/60">
                              {booked} / {capacity}
                            </td>
                            <td className="px-6 py-4 text-[11px] font-bold">
                              <span className={attended > 0 ? 'text-emerald-600' : 'text-ink/40'}>
                                {attended} / {booked}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[11px] font-bold">
                              <span className={unpaid > 0 ? 'text-rose-500' : 'text-ink/20'}>{unpaid}</span>
                            </td>
                            <td className="px-6 py-4 text-[11px] font-bold text-ink/70 flex items-center gap-2">
                              {session.trainerId?.name || '-'}
                              {session.trainerVerified && (
                                <span className="bg-sky-50 text-sky-600 text-[8px] uppercase px-2 py-0.5 rounded-md border border-sky-100" title="Attendance verified by Trainer">
                                  Verified ✓
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-[11px] font-bold text-ink/50">
                              {session.location || session.locationId?.name || 'Gym'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleViewRoster(session)}
                                className="text-[9px] font-black uppercase tracking-widest text-ink/20 hover:text-brand-blue transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
                              >
                                View Roster
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Manual Check-in Modal */}
      {showManualCheckin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-brand-blue text-white flex justify-between items-center relative overflow-hidden">
               <h3 className="font-display text-2xl font-black relative z-10">Log Manual Attendance</h3>
               <button onClick={() => setShowManualCheckin(false)} className="relative z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-xl">×</button>
               <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            </div>
            
            <form onSubmit={handleCheckin} className="p-8 grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-2">Select Session</label>
                <select
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-ink focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  name="sessionId"
                  value={form.sessionId}
                  onChange={handleManualChange}
                  required
                >
                  <option value="">Choose a class session...</option>
                  {sessions.map((session) => (
                    <option key={session._id} value={session._id}>
                      {session.classId?.title} · {new Date(session.startTime).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-2">
                  {loadingAttendees ? 'Finding Attendees...' : 'Select Attendee'}
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-ink focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all disabled:opacity-50"
                  name="attendeeKey"
                  value={form.childId || form.participantName}
                  onChange={handleManualChange}
                  required
                  disabled={!form.sessionId || loadingAttendees}
                >
                  <option value="">{form.sessionId ? (attendees.length > 0 ? 'Select a name...' : 'No attendees found for this session') : 'Select session first'}</option>
                  {attendees.map((a) => (
                    <option key={a.id} value={a.childId || a.name}>
                      {a.name} {a.age ? `(${a.age} yrs)` : ''} {a.status === 'pending' ? '⚠️ UNPAID' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-2">Attendance Status</label>
                <select
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-ink focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  name="status"
                  value={form.status}
                  onChange={handleManualChange}
                >
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                 <button type="button" onClick={() => setShowManualCheckin(false)} className="px-6 py-3 rounded-2xl font-bold text-ink/40 hover:bg-slate-50">Cancel</button>
                 <button
                   type="submit"
                   disabled={!form.childId && !form.participantName}
                   className="px-8 py-3 rounded-2xl bg-brand-blue text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-blue/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                 >
                   Log Check-in
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {viewRosterSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center relative overflow-hidden">
               <div>
                 <h3 className="font-display text-2xl font-black relative z-10 text-ink">Class Roster</h3>
                 <p className="text-xs font-bold text-ink/40 uppercase tracking-widest mt-1">
                   {viewRosterSession.classId?.title} • {new Date(viewRosterSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
               </div>
               <button onClick={() => setViewRosterSession(null)} className="relative z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-ink/40 hover:bg-slate-300 transition text-xl">×</button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              {loadingRoster ? (
                <div className="py-12 text-center text-ink/40 font-bold text-xs uppercase tracking-widest animate-pulse">Loading Roster...</div>
              ) : rosterAttendees.length === 0 ? (
                <div className="py-12 text-center text-ink/40 font-bold text-sm italic">No participants booked for this session yet.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Participant Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Age</th>
                      <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Relation</th>
                      <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Attendance</th>
                      <th className="px-6 py-4 text-[10px] font-black text-ink/40 uppercase tracking-widest">Booking Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rosterAttendees.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-ink">{a.name}</p>
                          {a.packageName && <p className="text-[10px] text-brand-blue font-black tracking-widest mt-0.5">{a.packageName}</p>}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-ink/60">{a.age || '-'}</td>
                        <td className="px-6 py-4 text-xs font-bold text-ink/60">{a.relation}</td>
                        <td className="px-6 py-4">
                          {a.attendanceState === 'present' ? (
                             <span className="bg-sky-50 text-sky-600 text-[10px] uppercase font-black px-2 py-1 rounded-md border border-sky-100">Present</span>
                          ) : a.attendanceState === 'absent' ? (
                             <span className="bg-rose-50 text-rose-600 text-[10px] uppercase font-black px-2 py-1 rounded-md border border-rose-100">Absent</span>
                          ) : a.attendanceState === 'late' ? (
                             <span className="bg-orange-50 text-orange-600 text-[10px] uppercase font-black px-2 py-1 rounded-md border border-orange-100">Late</span>
                          ) : (
                             <span className="bg-slate-100 text-ink/30 text-[10px] uppercase font-black px-2 py-1 rounded-md border border-slate-200">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {a.status === 'pending' ? (
                            <span className="bg-rose-50 text-rose-600 text-[10px] uppercase font-black px-2 py-1 rounded-md border border-rose-100">Unpaid</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] uppercase font-black px-2 py-1 rounded-md border border-emerald-100">Confirmed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button type="button" onClick={() => setViewRosterSession(null)} className="px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] text-ink/40 hover:bg-slate-200 transition-colors bg-white shadow-sm border border-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
