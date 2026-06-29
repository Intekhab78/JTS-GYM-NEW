import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import api from '../api/api.js';

import { getSelectedLocation } from '../utils/location.js';

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const formatTime = (value) =>
  new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export default function Calendar() {
  const [sessions, setSessions] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSessions = () => {
    setLoading(true);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30); // Show next 30 days

    const loc = getSelectedLocation();
    const params = { start: start.toISOString(), end: end.toISOString() };
    if (loc?._id && loc._id !== 'all') {
      params.locationId = loc._id;
    }

    api
      .get('/sessions', { params })
      .then((res) => {
        setSessions(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setSessions([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessions();

    const handleChange = () => fetchSessions();
    window.addEventListener('location-change', handleChange);
    return () => window.removeEventListener('location-change', handleChange);
  }, []);

  useEffect(() => {
    api
      .get('/children/mine')
      .then((res) => {
        setChildren(res.data || []);
        if (res.data?.length) {
          setSelectedChildren([res.data[0]._id]);
        }
      })
      .catch(() => { });
  }, []);

  const grouped = useMemo(() => {
    return sessions.reduce((acc, session) => {
      const key = formatDate(session.startTime);
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {});
  }, [sessions]);

  const toggleChildSelection = (childId) => {
    setSelectedChildren(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const handleBook = async (sessionId) => {
    setMessage('');
    if (selectedChildren.length === 0) {
      setMessage('Please select at least one child.');
      return;
    }

    const participants = [];
    for (const childId of selectedChildren) {
      const child = children.find(c => c._id === childId);
      if (child) {
        participants.push({
          name: child.name,
          age: child.age,
          gender: child.gender,
          childId: child._id
        });
      }
    }

    if (participants.length === 0) {
      setMessage('Selected children not found.');
      return;
    }

    try {
      await api.post('/bookings', { sessionId, participants });
      setMessage('Booking confirmed. Check your dashboard.');
      fetchSessions(); // Refresh to update spots
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.message || 'Unable to book this session.');
    }
  };

  return (
    <div className="text-brand-black">
      <Navbar />
      <main className="page-shell py-12">
        <SectionTitle
          kicker="Class calendar"
          title="Book from the monthly schedule"
          subtitle="Pick a session and reserve your spot in the studio."
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
          <LocationPicker compact />

          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-brand-blue/60">
              Booking for:
            </span>
            <div className="flex flex-wrap gap-2">
              {children.length === 0 ? (
                <span className="text-sm italic text-brand-black/40">No children registered</span>
              ) : (
                children.map((child) => (
                  <button
                    key={child._id}
                    onClick={() => toggleChildSelection(child._id)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${selectedChildren.includes(child._id)
                        ? 'border-brand-blue bg-brand-blue text-white shadow-md'
                        : 'border-brand-navy/10 bg-white text-brand-black/60 hover:border-brand-blue/30'
                      }`}
                  >
                    {child.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 p-4 text-center">
            <p className="text-sm font-bold text-brand-blue">{message}</p>
          </div>
        )}

        <div className="mt-12 space-y-12">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-white/40" />
            ))
          ) : Object.keys(grouped).length > 0 ? (
            Object.entries(grouped).map(([day, daySessions]) => (
              <div key={day}>
                <h3 className="font-display text-2xl font-black text-brand-blue">{day}</h3>
                <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {daySessions.map((session) => {
                    const spotsLeft = (session.capacity || 0) - (session.bookedParticipants || 0);
                    const isFull = spotsLeft <= 0;
                    
                    return (
                      <div
                        key={session._id}
                        className={`soft-card group flex flex-col justify-between rounded-3xl p-6 transition-all hover:scale-[1.02] hover:shadow-glow ${isFull ? 'opacity-60 bg-slate-50' : ''}`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue/60">
                              {session.classId?.ageGroup || 'All Ages'}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isFull ? 'bg-coral/10 text-coral border-coral/20' : 'bg-moss/10 text-moss border-moss/20'}`}>
                              {isFull ? 'FULL' : `${spotsLeft} Spots Left`}
                            </span>
                          </div>
                          <h4 className="mt-3 font-display text-xl font-bold leading-tight">
                            {session.classId?.title}
                          </h4>
                          <div className="mt-6 space-y-2">
                            <div className="flex items-center gap-3 text-brand-black/60">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm font-bold">{formatTime(session.startTime)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-brand-black/60">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-sm font-bold truncate">
                                {session.trainerId?.name || 'Coach TBD'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={isFull}
                          className={`mt-8 w-full rounded-full py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${isFull ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-coral hover:scale-105'}`}
                          onClick={() => handleBook(session._id)}
                        >
                          {isFull ? 'Session Full' : 'Reserve Spot'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl bg-white/40 p-16 text-center">
              <p className="text-brand-black/60 font-bold">
                No classes available for booking in the next 7 days.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
