import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader.jsx';

const statusLabels = {
  all: 'All leads',
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed'
};

export default function LeadsManagement() {
  const { roleSlug } = useParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/leads')
      .then((res) => setLeads(res.data || []))
      .catch(() => toast.error('Failed to load leads'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/leads/${id}/status`, { status });
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      load();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  const filtered = useMemo(() => {
    return leads.filter(lead => {
      const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
      const text = `${lead.name} ${lead.email} ${lead.phone} ${lead.message}`.toLowerCase();
      const matchQuery = text.includes(query.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [leads, statusFilter, query]);

  const counts = useMemo(() => {
    return leads.reduce((acc, lead) => {
      acc.all += 1;
      if (acc[lead.status] !== undefined) acc[lead.status] += 1;
      return acc;
    }, { all: 0, new: 0, contacted: 0, closed: 0 });
  }, [leads]);

  return (
    <div>
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <AdminHeader 
          title="General Inquiries" 
          description="Manage messages from the contact form. Keep track of customer leads here."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8 mb-8">
          {/* Header content moved to AdminHeader */}
          <div className="relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(statusLabels).map(([key, label]) => (
              <div key={key} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/40">{label}</p>
                <p className="mt-2 text-2xl font-black text-ink">{counts[key]}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="mt-8 soft-card rounded-3xl p-5 shadow-glow">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/50">Search</label>
              <input
                className="mt-2 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm"
                placeholder="Search by name, email, or content..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="min-w-[200px]">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/50">Status</label>
              <select
                className="mt-2 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4">
          {loading ? (
             <div className="py-12 text-center text-ink/40">Loading inquiries...</div>
          ) : filtered.length === 0 ? (
             <div className="py-12 text-center text-ink/40">No inquiries found matching your criteria.</div>
          ) : (
            filtered.map((lead) => (
              <div key={lead._id} className="soft-card rounded-3xl p-6 transition-all hover:shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[300px]">
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-xl">{lead.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        lead.status === 'new' ? 'bg-orange-100 text-orange-600' :
                        lead.status === 'contacted' ? 'bg-blue-100 text-blue-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink/70">
                      <span>📧 {lead.email}</span>
                      {lead.phone && <span>📞 {lead.phone}</span>}
                      <span>📅 {new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-4 rounded-2xl bg-rose-50/50 p-4 text-sm text-ink/80 italic">
                      "{lead.message}"
                    </div>
                    {(lead.interestedClassId || lead.interestedPlanId) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {lead.interestedClassId && (
                           <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-3 py-1 rounded-xl text-xs font-bold shadow-sm">
                             🏋️ Class: {lead.interestedClassId.title}
                           </span>
                        )}
                        {lead.interestedPlanId && (
                           <span className="bg-coral/10 text-coral border border-coral/20 px-3 py-1 rounded-xl text-xs font-bold shadow-sm">
                             🎟️ Plan: {lead.interestedPlanId.name}
                           </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      className="rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-semibold"
                      value={lead.status}
                      onChange={(e) => updateStatus(lead._id, e.target.value)}
                    >
                      <option value="new">Mark as New</option>
                      <option value="contacted">Mark as Contacted</option>
                      <option value="closed">Mark as Closed</option>
                    </select>
                    <button 
                      onClick={() => deleteLead(lead._id)}
                      className="mt-2 text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Delete inquiry
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
