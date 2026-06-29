import { getImageUrl  } from '../../api/api.js';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useSettings } from '../../context/SettingsContext.jsx';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  bio: '',
  specialties: '',
  locationIds: [],
  avatarUrl: '',
  gallery: [],
  status: 'active',
  password: '',
  compensationType: 'SALARY',
  compensationRate: 0
};

export default function TrainersManagement() {
  const [trainers, setTrainers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const { can } = usePermissions();
  const { currency } = useSettings();

  const canCreate = can('trainers:create');
  const canEdit = can('trainers:edit');
  const canDelete = can('trainers:delete');

  const load = () => {
    setLoading(true);
    api.get('/trainers?all=true').then((res) => setTrainers(res.data || [])).catch(() => { });
    api.get('/locations?all=true').then((res) => setLocations(res.data || [])).catch(() => { });
    api.get('/specialties?all=true').then((res) => setSpecialtiesList(res.data || [])).catch(() => { }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileUpload = async (e, isGallery = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      const { data } = await api.post('/upload', formData, config);
      if (isGallery) {
        setForm((prev) => ({ ...prev, gallery: [...(prev.gallery || []), data.image] }));
      } else {
        setForm((prev) => ({ ...prev, avatarUrl: data.image }));
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'File upload failed';
      alert(`Upload Failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleEdit = (trainer) => {
    setEditingId(trainer._id);
    setForm({
      name: trainer.name || '',
      email: trainer.email || '',
      phone: trainer.phone || '',
      bio: trainer.bio || '',
      specialties: (trainer.specialties || []).join(', '),
      locationIds: trainer.locationIds || (trainer.locationId ? [trainer.locationId?._id || trainer.locationId] : []),
      status: trainer.status || 'active',
      avatarUrl: trainer.avatarUrl || '',
      gallery: trainer.gallery || [],
      password: '',
      compensationType: trainer.compensationType || 'SALARY',
      compensationRate: trainer.compensationRate || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId('');
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      specialties: form.specialties.split(',').map((item) => item.trim()).filter(Boolean)
    };

    try {
      if (editingId) {
        await api.put(`/trainers/${editingId}`, payload);
      } else {
        await api.post('/trainers', payload);
      }
      handleCancel();
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save trainer');
    }
  };

  const handleToggleStatus = async (trainer) => {
    const action = trainer.status === 'active' ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this trainer?`)) return;
    try {
      await api.delete(`/trainers/${trainer._id}`);
      toast.success(`Trainer ${action}d successfully`);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${action} trainer`;
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <AdminHeader 
          title="Trainer Master" 
          description="Manage your coaching team, their specialties, and center assignments."
          actions={(
            <button
              onClick={() => handleCancel()}
              className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
            >
              Clear Form
            </button>
          )}
        />

        {(canCreate || (canEdit && editingId)) ? (
          <div className="mb-10 rounded-[32px] bg-white p-8 shadow-sm border border-slate-100">
            <h2 className="font-display text-2xl text-ink mb-6">
              {editingId ? 'Edit Trainer Profile' : 'Register New Trainer'}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-6">
              {/* Form contents... */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Trainer Name</label>
                  <input
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                    name="name"
                    placeholder="Full Name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Email Address</label>
                  <input
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Phone Number</label>
                  <input
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                    name="phone"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
                    {editingId ? 'Reset Password' : 'Initial Password'}
                  </label>
                  <input
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                    name="password"
                    type="password"
                    placeholder={editingId ? "Leave blank to keep current" : "Password"}
                    value={form.password}
                    onChange={handleChange}
                    required={!editingId}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3 col-span-full">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Assigned Branches</label>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {locations.map(loc => (
                      <label 
                        key={loc._id} 
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${form.locationIds.includes(loc._id) ? 'border-coral bg-coral/5 text-coral' : 'border-slate-100 bg-slate-50 text-ink/60 hover:border-slate-200'}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-coral focus:ring-coral"
                          checked={form.locationIds.includes(loc._id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm(prev => ({
                              ...prev,
                              locationIds: checked 
                                ? [...(prev.locationIds || []), loc._id]
                                : (prev.locationIds || []).filter(id => id !== loc._id)
                            }));
                          }}
                        />
                        <span className="text-sm font-semibold">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                  {form.locationIds.length === 0 && <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Please select at least one branch</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Duty Status</label>
                  <select
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Compensation Type</label>
                  <select
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                    name="compensationType"
                    value={form.compensationType}
                    onChange={handleChange}
                  >
                    <option value="SALARY">Salary (Fixed)</option>
                    <option value="PER_SESSION">Per Session (Freelance)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
                    {form.compensationType === 'SALARY' ? 'Monthly Salary' : 'Rate Per Session'}
                  </label>
                  <input
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
                    name="compensationRate"
                    type="number"
                    min="0"
                    placeholder="Rate"
                    value={form.compensationRate}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Avatar / Photo</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-xs file:font-semibold
                        file:bg-ocean file:text-white
                        hover:file:bg-ocean-dark
                        cursor-pointer"
                    />
                    {form.avatarUrl && (
                      <img 
                        src={getImageUrl(form.avatarUrl)} 
                        className="h-10 w-10 rounded-full object-cover border" 
                        alt="Preview" 
                      />
                    )}
                    {uploading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-ocean border-t-transparent" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Gallery Photos (Multi)</label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, true)}
                        className="block w-full text-xs text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-xs file:font-semibold
                          file:bg-moss file:text-white
                          hover:file:bg-moss-dark
                          cursor-pointer"
                      />
                      {uploading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-moss border-t-transparent" />}
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      {(form.gallery || []).map((img, idx) => (
                        <div key={idx} className="relative group/img w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                          <img 
                            src={getImageUrl(img)} 
                            className="w-full h-full object-cover" 
                            alt={`Gallery ${idx}`} 
                          />
                          <button 
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }))}
                            className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <span className="text-[10px] font-bold">Delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/50 flex justify-between">
                  <span>Specialties</span>
                  <span className="text-[10px] text-ocean normal-case font-medium">Tip: Managed in Specialty Master</span>
                </label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <select
                      className="flex-1 rounded-2xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0 appearance-none cursor-pointer"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const current = form.specialties.split(',').map(s => s.trim()).filter(Boolean);
                        if (!current.includes(val)) {
                          setForm({ ...form, specialties: [...current, val].join(', ') });
                        }
                        e.target.value = ""; // Reset dropdown
                      }}
                    >
                      <option value="">Select Specialty to Add...</option>
                      {specialtiesList.filter(s => s.status === 'active').map(spec => (
                        <option key={spec._id} value={spec.name}>{spec.name}</option>
                      ))}
                    </select>
                    <input
                      className="w-1/3 rounded-2xl border-slate-200 bg-slate-100 p-3 text-sm text-ink/40 cursor-not-allowed"
                      name="specialties"
                      placeholder="Selected specialties"
                      value={form.specialties}
                      readOnly
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.specialties.split(',').map(s => s.trim()).filter(Boolean).map((specName, i) => (
                      <span 
                        key={i} 
                        className="group/tag inline-flex items-center gap-1.5 rounded-lg bg-coral/10 px-2.5 py-1 text-[10px] font-bold text-coral"
                      >
                        {specName}
                        <button
                          type="button"
                          onClick={() => {
                            const current = form.specialties.split(',').map(s => s.trim()).filter(Boolean);
                            setForm({ ...form, specialties: current.filter(s => s !== specName).join(', ') });
                          }}
                          className="hover:scale-125 transition-transform"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {form.specialties.trim() === "" && <p className="text-[10px] text-ink/20 italic">No specialties selected yet.</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/50">Professional Bio</label>
                <textarea
                  className="min-h-[100px] w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm focus:border-coral focus:ring-0"
                  name="bio"
                  placeholder="Briefly describe the trainer's background and coaching philosophy..."
                  value={form.bio}
                  onChange={handleChange}
                />
              </div>

              <div className="flex gap-4">
                <button className="flex-1 rounded-2xl bg-coral py-4 text-sm font-bold text-white shadow-lg transition hover:bg-coral-dark active:scale-[0.98]" type="submit">
                  {editingId ? 'Update Trainer' : 'Add Trainer to Roster'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="px-10 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-ink/40 hover:bg-slate-200 transition-all"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-10 rounded-[32px] bg-white p-8 text-center border border-slate-100 italic text-slate-400 text-sm">
            You do not have permission to add or edit trainer profiles.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
             Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-64 animate-pulse bg-white rounded-[32px] border border-slate-100 shadow-sm" />
             ))
          ) : trainers.map((trainer) => (
            <div key={trainer._id} className="group relative overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-xl overflow-hidden shrink-0">
                    {trainer.avatarUrl ? (
                      <img 
                        src={getImageUrl(trainer.avatarUrl)} 
                        className="h-full w-full object-cover" 
                        alt={trainer.name} 
                      />
                    ) : '🏆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg text-ink truncate">{trainer.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue truncate" title={trainer.locationIds?.map(id => locations.find(l => l._id === (id?._id || id))?.name).filter(Boolean).join(', ') || 'Unassigned'}>
                       {trainer.locationIds?.map(id => locations.find(l => l._id === (id?._id || id))?.name).filter(Boolean).join(', ') || 'Unassigned'}
                    </p>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${trainer.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(trainer.specialties || []).length > 0 ? trainer.specialties.map((spec, i) => (
                      <span key={i} className="rounded-md bg-ocean/5 px-2 py-0.5 text-[9px] font-bold text-ocean uppercase tracking-wider">
                        {spec}
                      </span>
                    )) : <span className="text-[10px] text-ink/20 italic">No specialties</span>}
                  </div>
                  <p className="text-xs text-ink/60 line-clamp-2 leading-relaxed h-8">
                    {trainer.bio || 'Detailed coaching profile pending...'}
                  </p>
                  
                  <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-medium text-ink/40">
                    <div className="flex flex-col">
                      <span>{trainer.email || 'No email'}</span>
                      <span className="text-coral font-bold">
                        {trainer.compensationType === 'SALARY' ? `Salary: ${currency}${trainer.compensationRate || 0}` : `Session Rate: ${currency}${trainer.compensationRate || 0}`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {canEdit && (
                        <>
                          <button
                            className="text-ocean hover:underline"
                            onClick={() => handleEdit(trainer)}
                          >
                            Edit
                          </button>
                          {(canDelete) && <span className="text-slate-200">|</span>}
                        </>
                      )}
                      {canDelete && (
                        <button
                          className={`${trainer.status === 'active' ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-600'}`}
                          onClick={() => handleToggleStatus(trainer)}
                        >
                          {trainer.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      )}
                      {!canEdit && !canDelete && <span className="italic opacity-50">View Only</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && trainers.length === 0 && (
            <div className="col-span-full py-20 text-center">
               <p className="text-slate-400 italic">No trainers found. Use the form above to add your first coach.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

