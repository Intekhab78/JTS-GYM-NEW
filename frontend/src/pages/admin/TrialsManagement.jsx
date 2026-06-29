import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';

const statusLabels = {
  all: 'All requests',
  new: 'New',
  contacted: 'Contacted',
  booked: 'Booked',
  closed: 'Closed'
};

export default function TrialsManagement() {
  const { roleSlug } = useParams();
  const [trials, setTrials] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { can } = usePermissions();

  const canEdit = can('trials:edit');

  const load = () => {
    api.get('/trials').then((res) => setTrials(res.data || [])).catch(() => { });
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/trials/${id}/status`, { status });
    load();
  };

  const exportCsv = async () => {
    const res = await api.get('/trials/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trials.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => {
    return trials.reduce(
      (acc, trial) => {
        acc.all += 1;
        if (acc[trial.status] !== undefined) {
          acc[trial.status] += 1;
        }
        return acc;
      },
      { all: 0, new: 0, contacted: 0, booked: 0, closed: 0 }
    );
  }, [trials]);

  const filtered = useMemo(() => {
    return trials.filter((trial) => {
      const matchStatus = statusFilter === 'all' || trial.status === statusFilter;
      const text = `${trial.childName} ${trial.parentName} ${trial.parentEmail} ${trial.preferredClass || ''}`.toLowerCase();
      const matchQuery = text.includes(query.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [trials, query, statusFilter]);

  return (
    <div>
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <AdminHeader 
          title="Trial Requests" 
          description="Track trial submissions, update statuses, and follow up with customers from one place."
          backTo={`/${roleSlug}`}
          actions={(
            <button
              className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
              onClick={exportCsv}
            >
              Export CSV
            </button>
          )}
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
                className="mt-2 w-full rounded-2xl border border-orange-200/70 bg-white px-4 py-3 text-sm"
                placeholder="Search by customer, email, class"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="min-w-[220px]">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/50">Status</label>
              <select
                className="mt-2 w-full rounded-2xl border border-orange-200/70 bg-white px-4 py-3 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="booked">Booked</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {filtered.map((trial) => (
            <div key={trial._id} className="soft-card min-h-[170px] rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-ink/50">{trial.preferredClass || 'Class TBA'}</p>
                  <h3 className="mt-2 font-display text-lg">{trial.childName}</h3>
                  <p className="mt-2 text-sm text-ink/70">Customer: {trial.parentName}</p>
                  <p className="text-sm text-ink/70">Email: {trial.parentEmail}</p>
                  {trial.parentPhone ? <p className="text-sm text-ink/70">Phone: {trial.parentPhone}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className="rounded-full bg-ink/5 px-4 py-1 text-xs font-semibold text-ink">
                    {trial.status}
                  </span>
                  {canEdit && (
                    <select
                      className="rounded-2xl border border-orange-200/70 bg-white px-3 py-2 text-xs"
                      value={trial.status}
                      onChange={(event) => updateStatus(trial._id, event.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="booked">Booked</option>
                      <option value="closed">Closed</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}


