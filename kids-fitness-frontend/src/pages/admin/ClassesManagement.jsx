import { getImageUrl  } from '../../api/api.js';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';

const emptyForm = {
  title: '',
  description: '',
  ageGroup: '',
  minAge: '',
  maxAge: '',
  genderRestriction: 'any',
  duration: '',
  availableTrainers: [],
  price: '',
  b2bPrice: '',
  capacity: '',
  imageUrl: '',
  taxId: '',
  creditCost: 1,
  status: 'active',
  categoryId: '',
  color: '',
  replicateToLocations: [],
  vendorPrices: []
};

export default function ClassesManagement() {
  const { roleSlug } = useParams();
  const [classes, setClasses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [taxes, setTaxes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const { can } = usePermissions();

  const canCreate = can('classes:create');
  const canEdit = can('classes:edit');
  const canDelete = can('classes:delete');

  const load = () => {
    setLoading(true);
    const p1 = api.get('/classes?all=true').then((res) => setClasses(res.data || [])).catch(() => { });
    const p2 = api.get('/trainers?all=true').then((res) => setTrainers(res.data || [])).catch(() => { });
    const p3 = api.get('/taxes').then(res => setTaxes(res.data.data || [])).catch(() => {});
    const p4 = api.get('/locations?all=true').then((res) => setLocations(res.data || [])).catch(() => { });
    const p5 = api.get('/categories?status=active&type=class').then((res) => setCategories(res.data || [])).catch(() => { });
    const p6 = api.get('/vendors?status=active').then((res) => setVendors(res.data || [])).catch(() => { });
    Promise.all([p1, p2, p3, p4, p5, p6]).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || '',
      description: item.description || '',
      ageGroup: item.ageGroup || '',
      minAge: item.minAge ?? '',
      maxAge: item.maxAge ?? '',
      genderRestriction: item.genderRestriction || 'any',
      duration: item.duration || '',
      availableTrainers: (item.availableTrainers || []).filter(t => t).map(t => t._id || t),
      price: item.price ?? '',
      b2bPrice: item.b2bPrice ?? '',
      capacity: item.capacity ?? '',
      imageUrl: item.imageUrl || '',
      taxId: item.taxId?._id || item.taxId || '',
      categoryId: item.categoryId?._id || item.categoryId || '',
      creditCost: item.creditCost ?? 1,
      status: item.status || 'active',
      color: item.color || '',
      replicateToLocations: [],
      vendorPrices: item.vendorPrices?.map(vp => ({
        vendorId: vp.vendorId?._id || vp.vendorId || '',
        price: vp.price || 0,
        startDate: vp.startDate ? new Date(vp.startDate).toISOString().split('T')[0] : '',
        endDate: vp.endDate ? new Date(vp.endDate).toISOString().split('T')[0] : ''
      })) || []
    });
  };

  const handleAddVendorPrice = () => {
    setForm({ ...form, vendorPrices: [...(form.vendorPrices || []), { vendorId: '', price: '', startDate: '', endDate: '' }] });
  };

  const handleVendorPriceChange = (index, field, value) => {
    const updated = [...(form.vendorPrices || [])];
    updated[index][field] = value;
    setForm({ ...form, vendorPrices: updated });
  };

  const handleRemoveVendorPrice = (index) => {
    const updated = [...(form.vendorPrices || [])];
    updated.splice(index, 1);
    setForm({ ...form, vendorPrices: updated });
  };

  const handleCancel = () => {
    setEditingId('');
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    
    const validTrainers = (form.availableTrainers || []).filter(t => t);
    if (validTrainers.length === 0) {
      toast.error('Please select at least one trainer');
      setMessage('Please select at least one trainer.');
      return;
    }

    const payload = {
      ...form,
      availableTrainers: validTrainers,
      price: Number(form.price),
      b2bPrice: form.b2bPrice ? Number(form.b2bPrice) : undefined,
      capacity: form.capacity !== '' ? Number(form.capacity) : null,
      categoryId: form.categoryId || null,
      creditCost: Number(form.creditCost || 1),
      replicateToLocations: form.replicateToLocations || [],
      vendorPrices: (form.vendorPrices || []).filter(vp => vp.vendorId && vp.price).map(vp => ({
        vendorId: vp.vendorId,
        price: Number(vp.price),
        startDate: vp.startDate ? new Date(vp.startDate) : undefined,
        endDate: vp.endDate ? new Date(vp.endDate) : undefined
      }))
    };

    try {
      if (editingId) {
        await api.put(`/classes/${editingId}`, payload);
        setMessage('Class updated.');
      } else {
        await api.post('/classes', payload);
        setMessage('Class created.');
      }
      handleCancel();
      load();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Unable to save class.');
    }
  };

  const handleToggleStatus = async (item) => {
    const action = item.status === 'active' ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this class?`)) return;
    try {
      await api.delete(`/classes/${item._id}`);
      toast.success(`Class ${action}d successfully`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} class`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(prev => ({ ...prev, imageUrl: res.data.image }));
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Class Definitions" 
          description="Create and manage activities, age requirements, and base pricing."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8">
          {/* Header content moved to AdminHeader */}
        </div>
        {message ? <p className="mt-3 text-sm text-coral">{message}</p> : null}

        {canCreate || (editingId && canEdit) ? (
          <form className="mt-6 grid gap-3 rounded-3xl bg-white/80 p-6 shadow-glow" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-xl border border-orange-200/70 p-3"
                name="title"
                placeholder="Class title"
                value={form.title}
                onChange={handleChange}
                required
              />
              <input
                className="rounded-xl border border-orange-200/70 p-3"
                name="ageGroup"
                placeholder="Age group"
                value={form.ageGroup}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Min Age</label>
                <input
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="minAge"
                  type="number"
                  placeholder="Min Age"
                  value={form.minAge}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Max Age</label>
                <input
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="maxAge"
                  type="number"
                  placeholder="Max Age"
                  value={form.maxAge}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Gender</label>
                <select
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="genderRestriction"
                  value={form.genderRestriction}
                  onChange={handleChange}
                >
                  <option value="any">Any</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>
            </div>
            <textarea
              className="min-h-[90px] rounded-xl border border-orange-200/70 p-3"
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={handleChange}
            />
            <div className="grid gap-3 md:grid-cols-4">
              <input
                className="rounded-xl border border-orange-200/70 p-3"
                name="duration"
                placeholder="Duration (e.g. 45 min)"
                value={form.duration}
                onChange={handleChange}
              />
              <div className="rounded-xl border border-orange-200/70 p-3">
                <p className="text-[10px] font-bold text-ink/40 uppercase mb-2">Available Trainers <span className="text-coral">*</span></p>
                <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                  {trainers.map(t => (
                    <label key={t._id} className="flex items-center gap-2 text-xs font-bold text-ink/70 bg-slate-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-100 transition-all">
                      <input
                        type="checkbox"
                        checked={form.availableTrainers.includes(t._id)}
                        onChange={(e) => {
                          const newTrainers = e.target.checked
                            ? [...form.availableTrainers, t._id]
                            : form.availableTrainers.filter(id => id !== t._id);
                          setForm({ ...form, availableTrainers: newTrainers });
                        }}
                        className="accent-brand-blue"
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
              <input
                className="rounded-xl border border-orange-200/70 p-3"
                name="price"
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={handleChange}
                required
              />
              <input
                className="rounded-xl border border-orange-200/70 p-3 bg-indigo-50/50 placeholder:text-indigo-900/30"
                name="b2bPrice"
                type="number"
                placeholder="Global B2B Price (Optional)"
                value={form.b2bPrice}
                onChange={handleChange}
              />
            </div>

            {/* Vendor Specific Prices */}
            <div className="flex flex-col gap-3 pt-1 p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-ink/40">Vendor-Specific B2B Pricing</p>
                <button type="button" className="text-xs font-bold text-ocean hover:text-ocean/70" onClick={handleAddVendorPrice}>
                  + Add Vendor Price
                </button>
              </div>
              {(form.vendorPrices || []).map((vp, index) => (
                <div key={index} className="flex flex-col md:flex-row items-center gap-3">
                  <select
                    className="flex-1 w-full rounded-xl border border-indigo-200/70 p-3"
                    value={vp.vendorId}
                    onChange={(e) => handleVendorPriceChange(index, 'vendorId', e.target.value)}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v._id} value={v._id}>{v.name} {v.companyName ? `(${v.companyName})` : ''}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="w-full md:w-32 rounded-xl border border-indigo-200/70 p-3"
                    placeholder="Price"
                    value={vp.price}
                    onChange={(e) => handleVendorPriceChange(index, 'price', e.target.value)}
                  />
                  <div className="flex gap-2 w-full md:w-auto">
                    <input
                      type="date"
                      className="w-full rounded-xl border border-indigo-200/70 p-3 text-xs"
                      title="Start Date"
                      value={vp.startDate}
                      onChange={(e) => handleVendorPriceChange(index, 'startDate', e.target.value)}
                    />
                    <input
                      type="date"
                      className="w-full rounded-xl border border-indigo-200/70 p-3 text-xs"
                      title="End Date"
                      value={vp.endDate}
                      onChange={(e) => handleVendorPriceChange(index, 'endDate', e.target.value)}
                    />
                  </div>
                  <button type="button" onClick={() => handleRemoveVendorPrice(index)} className="p-2 text-coral hover:bg-coral/10 rounded-lg">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
               <input
                className="rounded-xl border border-orange-200/70 p-3"
                name="capacity"
                type="number"
                placeholder="Capacity"
                value={form.capacity}
                onChange={handleChange}
              />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Credit Cost</label>
                <input
                  className="w-full rounded-xl border border-orange-200/70 p-3 bg-indigo-50/10"
                  name="creditCost"
                  type="number"
                  placeholder="Credits per session"
                  value={form.creditCost}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Visibility Status</label>
                <select
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="active">Active (Visible)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Applied Tax Rule</label>
                <select
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="taxId"
                  value={form.taxId}
                  onChange={handleChange}
                >
                  <option value="">No Tax (Tax Exempt)</option>
                  {taxes.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.value}{t.type === 'percentage' ? '%' : ' AED'}) - {t.locationId?.name || 'All'}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Category</label>
                <select
                  className="w-full rounded-xl border border-orange-200/70 p-3 bg-emerald-50/30"
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                >
                  <option value="">No Category</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ink/30 px-3 uppercase tracking-widest">Class Image</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    className="w-full rounded-xl border border-orange-200/70 p-3"
                    name="imageUrl"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={form.imageUrl}
                    onChange={handleChange}
                  />
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    id="class-image-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                  <label 
                    htmlFor="class-image-upload"
                    className={`block px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'bg-slate-100 text-ink/20 cursor-wait' : 'bg-brand-blue text-white shadow-lg hover:shadow-brand-blue/20 hover:scale-105 active:scale-95'}`}
                  >
                    {isUploading ? 'Uploading...' : 'Upload File'}
                  </label>
                </div>
              </div>
              <p className="text-[8px] text-ink/20 px-3">Enter a URL or upload a local photo for the class cover.</p>
            </div>
            {/* Replicate to other locations */}
            {locations.length > 1 && (
              <div className="rounded-xl border border-orange-200/70 p-3 bg-slate-50/50">
                <p className="text-[10px] font-bold text-ink/40 uppercase mb-2">Also Add / Copy to Other Locations</p>
                <div className="flex flex-wrap gap-2">
                  {locations
                    .filter(loc => loc._id !== localStorage.getItem('selectedBranch') && loc.status === 'active')
                    .map(loc => (
                      <label key={loc._id} className="flex items-center gap-2 text-xs font-bold text-ink/70 bg-white px-3 py-1.5 rounded-full cursor-pointer border border-slate-100 hover:bg-slate-50 transition-all">
                        <input
                          type="checkbox"
                          checked={form.replicateToLocations?.includes(loc._id) || false}
                          onChange={(e) => {
                            const newLocations = e.target.checked
                              ? [...(form.replicateToLocations || []), loc._id]
                              : (form.replicateToLocations || []).filter(id => id !== loc._id);
                            setForm({ ...form, replicateToLocations: newLocations });
                          }}
                          className="accent-brand-blue"
                        />
                        {loc.name}
                      </label>
                    ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              <button className="rounded-full bg-brand-blue px-8 py-3 text-sm font-black text-white shadow-lg hover:scale-105 transition-all" type="submit">
                {editingId ? 'Update class' : 'Create class'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="rounded-full border border-ink/10 px-8 py-3 text-sm font-black text-ink hover:bg-slate-50 transition-all"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="mt-6 p-6 bg-white/50 rounded-3xl border border-dashed border-slate-200 text-center">
            <p className="text-sm font-bold text-ink/30 italic">You don't have permission to {editingId ? 'edit' : 'create'} classes.</p>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {loading ? (
             Array(4).fill(0).map((_, i) => <div key={i} className="h-48 animate-pulse bg-white rounded-3xl" />)
          ) : classes.map((item) => (
            <div key={item._id} className="soft-card rounded-[32px] p-6 transition-all hover:shadow-xl group flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-32 h-32 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img 
                    src={getImageUrl(item.imageUrl)} 
                    alt={item.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl text-ink leading-tight">{item.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-ocean bg-ocean/5 px-2 py-0.5 rounded-full">{item.ageGroup}</span>
                    {item.minAge || item.maxAge ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {item.minAge || 0}-{item.maxAge || '∞'} yrs
                      </span>
                    ) : null}
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{item.genderRestriction}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-ink/30 bg-slate-50 px-2 py-0.5 rounded-full">{item.duration}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Available Trainers</p>
                    <div className="flex flex-wrap gap-1">
                      {item.availableTrainers?.length > 0 ? item.availableTrainers.map(t => (
                        <span key={t._id} className="text-[10px] font-bold text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-full">{t.name}</span>
                      )) : <span className="text-[10px] font-bold text-ink/20">None linked</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xl font-black text-brand-blue">AED {item.price}</p>
                  {item.b2bPrice && <p className="text-xs font-bold text-indigo-500">B2B: AED {item.b2bPrice}</p>}
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{item.creditCost || 1} Credits</p>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status === 'inactive' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-green-50 text-green-500 border border-green-100'}`}>
                    {item.status || 'Active'}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-50 flex gap-3">
                {canEdit && (
                  <button
                    className="rounded-full bg-slate-50 px-6 py-2 text-xs font-black uppercase tracking-widest text-ink/60 hover:bg-slate-100 transition-all"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    className={`rounded-full px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${item.status === 'active' ? 'bg-red-50 text-red-400 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}
                    onClick={() => handleToggleStatus(item)}
                  >
                    {item.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

