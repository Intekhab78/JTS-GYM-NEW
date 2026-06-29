import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader.jsx';

export default function ExtensionPanel() {
  const { roleSlug } = useParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/extensions')
      .then(res => setRequests(res.data || []))
      .catch(() => toast.error('Failed to load extension requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleProcess = async (id, status, notes) => {
    try {
      await api.post(`/extensions/${id}/process`, { status, adminNotes: notes });
      toast.success(`Request ${status} successfully`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Extension Panel" 
          description="Review and process membership extension requests from customers."
          backTo={`/${roleSlug}`}
        />

        <header className="mt-8 mb-10">
          {/* Header content moved to AdminHeader */}
        </header>

        <div className="grid gap-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl" />)}
            </div>
          ) : requests.length > 0 ? (
            requests.map(req => (
              <div key={req._id} className="rounded-[2.5rem] bg-white p-8 shadow-xl border border-slate-100 flex flex-wrap items-start justify-between gap-6 transition-all hover:shadow-2xl">
                <div className="flex-1 min-w-[300px]">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      req.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {req.status}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      {req.type}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-black text-ink mb-1">
                    {req.userId?.name || 'Customer'}
                  </h3>
                  <p className="text-xs font-bold text-ink/40 mb-4 uppercase tracking-widest">
                     {req.membershipId?.planId?.name || 'Active Plan'} · Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </p>

                  {/* Specific Session Details for Reschedule */}
                  {req.type === 'reschedule' && req.targetSessionId && (
                    <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl shrink-0">
                        🗓️
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-ink/20 leading-none mb-1">Original Session</p>
                        <p className="text-sm font-black text-ink leading-tight">
                           {req.targetSessionId.classId?.title || req.targetSessionId.classId?.name || 'Session'}
                        </p>
                        <p className="text-[10px] font-bold text-brand-blue uppercase mt-1">
                           {new Date(req.targetSessionId.startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-medium text-ink/70 bg-slate-50 p-4 rounded-2xl italic border-l-4 border-slate-200">
                    "{req.reason || 'No reason provided.'}"
                  </p>
                  {req.newDate && (
                    <div className={`mt-4 p-4 rounded-2xl border ${req.type === 'extend' ? 'bg-indigo-50 border-indigo-100' : 'bg-brand-blue/5 border-brand-blue/10'}`}>
                      <p className={`text-[10px] font-black uppercase mb-1 ${req.type === 'extend' ? 'text-indigo-600' : 'text-brand-blue'}`}>
                        {req.type === 'extend' ? 'Proposed New End Date' : 'Proposed Reschedule'}
                      </p>
                      <p className={`text-sm font-black ${req.type === 'extend' ? 'text-indigo-600' : 'text-brand-blue'}`}>
                        {new Date(req.newDate).toLocaleDateString()}
                        {req.type === 'reschedule' && req.newSlot && ` at ${req.newSlot}`}
                      </p>
                    </div>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <button
                      onClick={() => handleProcess(req._id, 'approved', 'Approved by admin')}
                      className="rounded-2xl bg-brand-blue px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => handleProcess(req._id, 'rejected', 'Declined by admin')}
                      className="rounded-2xl border-2 border-slate-100 px-8 py-3.5 text-sm font-black text-ink/40 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
              <p className="text-xl font-bold text-ink/20 italic">No pending requests at the moment.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
