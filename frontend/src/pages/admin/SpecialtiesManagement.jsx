import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';

const emptyForm = {
  name: '',
  description: '',
  status: 'active'
};

export default function SpecialtiesManagement() {
  const { roleSlug } = useParams();
  const [specialties, setSpecialties] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions();

  const canCreate = can('specialties:create');
  const canEdit = can('specialties:edit');
  const canDelete = can('specialties:delete');

  const load = () => {
    setLoading(true);
    api.get('/specialties?all=true')
      .then((res) => setSpecialties(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleEdit = (spec) => {
    setEditingId(spec._id);
    setForm({
      name: spec.name || '',
      description: spec.description || '',
      status: spec.status || 'active'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId('');
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api.put(`/specialties/${editingId}`, form);
      } else {
        await api.post('/specialties', form);
      }
      handleCancel();
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save specialty');
    }
  };

  const handleToggleStatus = async (spec) => {
    const action = spec.status === 'active' ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this specialty?`)) return;
    try {
      await api.delete(`/specialties/${spec._id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} specialty`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Specialty Master" 
          description="Configure the specific expertise areas that trainers can be assigned to."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8">
          {/* Header content moved to AdminHeader */}
        </div>

        <div className={`grid gap-8 ${canCreate || editingId ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          {/* Form Section */}
          {(canCreate || editingId) && (
            <div className="lg:col-span-1">
            <div className="sticky top-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-display text-xl text-ink mb-6">
                {editingId ? 'Edit Specialty' : 'Add New Specialty'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Specialty Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm font-bold focus:border-coral focus:ring-0"
                    name="name"
                    placeholder="e.g. Swimming, Yoga, Karate"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Description</label>
                  <textarea
                    className="w-full min-h-[100px] rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm font-medium focus:border-coral focus:ring-0"
                    name="description"
                    placeholder="Short description of this specialty..."
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Status</label>
                  <select
                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm font-bold focus:border-coral focus:ring-0 appearance-none"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button className="flex-1 rounded-full bg-coral py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-coral/20 hover:bg-coral-dark" type="submit">
                    {editingId ? 'Update' : 'Register'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="px-6 rounded-full bg-slate-100 py-3 text-xs font-black uppercase tracking-widest text-ink/40 hover:bg-slate-200"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
          )}

          {/* List Section */}
          <div className={canCreate || editingId ? 'lg:col-span-2' : 'lg:col-span-1'}>
            <div className={`grid gap-4 ${canCreate || editingId ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-200" />
                ))
              ) : specialties.length > 0 ? (
                specialties.map((spec) => (
                  <div key={spec._id} className="group relative rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-display text-lg font-black text-ink">{spec.name}</h3>
                        <p className="mt-1 text-xs text-ink/60 line-clamp-2">{spec.description || 'No description provided.'}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter ${spec.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {spec.status || 'Active'}
                      </span>
                    </div>
                    
                    <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && (
                        <button
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white"
                          onClick={() => handleEdit(spec)}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${spec.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'}`}
                          onClick={() => handleToggleStatus(spec)}
                        >
                          {spec.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center">
                  <p className="text-slate-400 italic">No specialties registered yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
