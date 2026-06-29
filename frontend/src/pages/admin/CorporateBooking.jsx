import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';

export default function CorporateBooking() {
  const { roleSlug } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [participants, setParticipants] = useState([{ name: '', age: '', gender: 'male' }]);
  const [corporateName, setCorporateName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/sessions?start=' + new Date().toISOString());
      setSessions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const addParticipant = () => setParticipants([...participants, { name: '', age: '', gender: 'male' }]);
  const removeParticipant = (index) => setParticipants(participants.filter((_, i) => i !== index));
  const updateParticipant = (index, field, value) => {
    const next = [...participants];
    next[index][field] = value;
    setParticipants(next);
  };

  const toggleSession = (id) => {
    setSelectedSessions(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (!corporateName) {
      setError('Please enter a Corporate / Group Name.');
      return;
    }
    if (participants.some(p => !p.name || !p.age)) {
      setError('Please fill in all participant details.');
      return;
    }
    if (selectedSessions.length === 0) {
      setError('Please select at least one session.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings/group', {
        corporateName,
        participants,
        sessions: selectedSessions,
        paymentMethod: `center_${paymentMethod}`
      });
      navigate('/admin/bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group booking');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.classId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pricePerSlot = sessions.length > 0 && selectedSessions.length > 0 
    ? (sessions.find(s => s._id === selectedSessions[0])?.classId?.price || 0)
    : 0;
  const totalPrice = pricePerSlot * participants.length * selectedSessions.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <AdminHeader 
          title="Corporate Group Booking" 
          description="Manage multi-session registrations for your corporate clients and large groups."
          backTo={`/${roleSlug}/bookings`}
        />

        <header className="mt-8 mb-12">
          {/* Header content moved to AdminHeader */}
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <label className="block text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] mb-4 px-2">1. Client Identification</label>
              <input 
                type="text" 
                placeholder="Enter Company or Group Name…"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 text-lg font-black text-ink focus:border-brand-blue/20 outline-none transition-all placeholder:text-ink/10"
                value={corporateName}
                onChange={e => setCorporateName(e.target.value)}
              />
            </section>

            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8 px-2">
                <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">2. Staff / Participants ({participants.length})</label>
                <button 
                  onClick={addParticipant}
                  className="bg-brand-blue/10 text-brand-blue px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all shadow-sm"
                >
                  + Add Participant
                </button>
              </div>
              <div className="space-y-4">
                {participants.map((p, i) => (
                  <div key={i} className="flex gap-4 items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-ink/20 border border-slate-100">{i + 1}</div>
                    <div className="flex-1 grid grid-cols-12 gap-4">
                      <div className="col-span-6">
                        <input type="text" placeholder="Full Name" className="w-full bg-white border border-slate-100 text-sm font-bold p-3 rounded-xl outline-none" value={p.name} onChange={e => updateParticipant(i, 'name', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <input type="number" placeholder="Age" className="w-full bg-white border border-slate-100 text-sm font-bold p-3 rounded-xl outline-none" value={p.age} onChange={e => updateParticipant(i, 'age', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <select className="w-full bg-white border border-slate-100 text-sm font-bold p-3 rounded-xl outline-none" value={p.gender} onChange={e => updateParticipant(i, 'gender', e.target.value)}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>
                    {participants.length > 1 && (
                      <button onClick={() => removeParticipant(i)} className="p-2 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 px-2 gap-4">
                <label className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">3. Select Sessions ({selectedSessions.length})</label>
                <input type="text" placeholder="Search sessions…" className="bg-slate-50 border-none rounded-xl py-2 px-4 text-xs font-bold text-ink outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {sessionsLoading ? (
                  <div className="col-span-full py-20 text-center animate-pulse text-ink/10 font-black uppercase tracking-widest">Loading sessions…</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-ink/20 font-bold italic">No matching sessions found.</div>
                ) : (
                  filteredSessions.map(s => (
                    <button
                      key={s._id}
                      onClick={() => toggleSession(s._id)}
                      className={`text-left p-5 rounded-2xl border-2 transition-all flex flex-col justify-between group h-32 ${
                        selectedSessions.includes(s._id) ? 'border-brand-blue bg-brand-blue text-white shadow-lg' : 'border-slate-50 bg-slate-50 hover:border-slate-200 text-ink'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[10px] font-black uppercase tracking-widest truncate ${selectedSessions.includes(s._id) ? 'text-white/60' : 'text-brand-blue'}`}>{s.classId?.title}</p>
                          {selectedSessions.includes(s._id) && <span>✓</span>}
                        </div>
                        <h4 className="mt-1 text-sm font-black leading-tight">{new Date(s.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
                        <p className={`text-[10px] font-bold mt-1 ${selectedSessions.includes(s._id) ? 'text-white/70' : 'text-ink/40'}`}>{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {s.location || 'Studio'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-ink rounded-[40px] p-10 text-white shadow-2xl sticky top-8 animate-in fade-in slide-in-from-right-10 duration-700">
              <h3 className="font-display text-2xl font-black mb-8">Review Summary</h3>
              <div className="space-y-6 mb-10 pb-8 border-b border-white/10 uppercase tracking-widest font-black text-[10px]">
                <div className="flex justify-between items-center text-white/40"><span>Sessions</span><span className="text-lg text-white">{selectedSessions.length}</span></div>
                <div className="flex justify-between items-center text-white/40"><span>Staff</span><span className="text-lg text-white">{participants.length}</span></div>
                <div className="flex justify-between items-center text-white/40"><span>Price</span><span className="text-lg text-white">AED {pricePerSlot?.toFixed(2)}</span></div>
              </div>
              <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">Payment Method</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${paymentMethod === 'cash' ? 'bg-brand-blue border-brand-blue' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                  >
                    💵 Cash
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${paymentMethod === 'card' ? 'bg-brand-blue border-brand-blue' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                  >
                    💳 Card
                  </button>
                </div>
              </div>

              <div className="mb-12">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Grand Total</p>
                <span className="text-4xl font-black">AED {totalPrice.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="w-full bg-white text-ink py-6 rounded-[24px] font-black shadow-xl hover:scale-105 transition-all text-sm uppercase tracking-widest"
              >
                {loading ? 'Confirming...' : 'Book All Now 🚀'}
              </button>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
