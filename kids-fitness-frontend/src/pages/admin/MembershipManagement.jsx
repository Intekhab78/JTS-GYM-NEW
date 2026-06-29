import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import { toast } from 'react-hot-toast';

export default function MembershipManagement() {
  const { roleSlug } = useParams();
  const [memberships, setMemberships] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const { can } = usePermissions();

  const canEdit = can('memberships:edit');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, tRes] = await Promise.all([
        api.get('/memberships'),
        api.get('/users/trainers')
      ]);
      setMemberships(mRes.data || []);
      setTrainers(tRes.data || []);
    } catch (err) {
      toast.error('Failed to load memberships.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/memberships/${id}`, { status });
      setMemberships(prev => prev.map(m => m._id === id ? { ...m, status } : m));
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateTrainer = async (id, trainerId) => {
    try {
      await api.put(`/memberships/${id}/trainer`, { trainerId });
      setMemberships(prev => prev.map(m => m._id === id ? { ...m, trainerId } : m));
      toast.success('Trainer updated for all upcoming sessions');
    } catch (err) {
      toast.error('Failed to update trainer');
    }
  };

  const handleUpdateSessions = async (id, sessionsPerWeek) => {
    try {
      await api.put(`/memberships/${id}`, { sessionsPerWeek });
      setMemberships(prev => prev.map(m => m._id === id ? { ...m, sessionsPerWeek } : m));
      toast.success('Sessions per week updated');
    } catch (err) {
      toast.error('Failed to update sessions');
    }
  };

  const filteredMemberships = memberships.filter(m => {
    const parentName = m.userId?.name?.toLowerCase() || '';
    const childName = m.childId?.name?.toLowerCase() || '';
    const planName = m.planId?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return parentName.includes(query) || childName.includes(query) || planName.includes(query);
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMemberships.length / ITEMS_PER_PAGE);
  const paginatedMemberships = filteredMemberships.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Membership Management" 
          description="Monitor active subscriptions and reassign trainers to ensure consistent session delivery."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8 mb-12">
          {/* Header content moved to AdminHeader */}
        </div>

        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl grayscale opacity-30">🔍</span>
            <input 
              type="text"
              placeholder="Search by name or plan..."
              className="w-full pl-12 pr-4 py-4 rounded-[2rem] border-none bg-white shadow-sm focus:ring-4 focus:ring-coral/5 transition-all outline-none font-bold text-ink"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <p className="text-xs font-black text-ink/30 uppercase tracking-widest">{filteredMemberships.length} Subscriptions Found</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 rounded-[2.5rem] bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {paginatedMemberships.map((m) => (
              <div key={m._id} className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black text-coral uppercase tracking-widest bg-coral/5 px-2 py-0.5 rounded-lg border border-coral/10">#{m._id.slice(-6).toUpperCase()}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                          m.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          m.status === 'frozen' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-ink">{m.childId?.name || m.userId?.name}</h3>
                      <p className="text-xs font-bold text-ink/40 uppercase tracking-widest mt-1">
                        Customer: <span className="text-ink/60">{m.userId?.name || 'Unknown'}</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 space-y-3 border border-slate-100">
                      <p className="text-[11px] font-black text-ink/80 flex items-center justify-between">
                        <span>Plan:</span>
                        <span className="text-coral">{m.planId?.name}</span>
                      </p>
                      
                      <div className="pt-2 border-t border-slate-200/50">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black text-ink/40 uppercase tracking-widest">Consumption</span>
                           <span className="text-[10px] font-black text-ink uppercase">
                             {m.sessionsUsed} Used / {m.classesRemaining === -1 ? '∞' : (m.classesRemaining + m.sessionsUsed)} Total
                           </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-coral transition-all duration-500" 
                            style={{ 
                              width: m.classesRemaining === -1 ? '100%' : `${(m.sessionsUsed / (m.classesRemaining + m.sessionsUsed)) * 100}%` 
                            }}
                          />
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-ink/60 italic">
                          {m.classesRemaining === -1 ? 'Unlimited Access' : `${m.classesRemaining} Sessions Remaining`}
                        </p>
                      </div>

                      <p className="text-[11px] font-black text-ink/80 flex items-center justify-between pt-2 border-t border-slate-200/50">
                        <span>Valid Until:</span>
                        <span className="text-ink">{m.endDate ? new Date(m.endDate).toLocaleDateString() : 'N/A'}</span>
                      </p>
                    </div>

                    {canEdit && (
                      <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-ink/30 uppercase tracking-[0.2em] ml-1 text-left block">Assigned Trainer</label>
                          <select
                            className="w-full rounded-xl bg-white border border-slate-200 p-2 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-coral/20"
                            value={m.trainerId || ''}
                            onChange={(e) => handleUpdateTrainer(m._id, e.target.value)}
                          >
                            <option value="">No Trainer Assigned</option>
                            {trainers.map(t => (
                              <option key={t._id} value={t._id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-ink/30 uppercase tracking-[0.2em] ml-1 text-left block">Sessions/Week</label>
                          <input
                            type="text"
                            className="w-full rounded-xl bg-white border border-slate-200 p-2 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-coral/20"
                            value={m.sessionsPerWeek || ''}
                            onChange={(e) => handleUpdateSessions(m._id, e.target.value)}
                            placeholder="e.g. 2 or Flexible"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-ink/30 uppercase tracking-[0.2em] ml-1 text-left block">Account Status</label>
                          <select
                            className="w-full rounded-xl bg-white border border-slate-200 p-2 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-coral/20"
                            value={m.status}
                            onChange={(e) => handleUpdateStatus(m._id, e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="frozen">Frozen</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="expired">Expired</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-between border-t border-slate-200/50 pt-8">
            <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'bg-slate-100 text-ink/10 cursor-not-allowed' : 'bg-white border border-slate-200 text-coral hover:bg-coral hover:text-white hover:border-coral shadow-sm active:scale-95'}`}
              >
                ← Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'bg-slate-100 text-ink/10 cursor-not-allowed' : 'bg-white border border-slate-200 text-coral hover:bg-coral hover:text-white hover:border-coral shadow-sm active:scale-95'}`}
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

