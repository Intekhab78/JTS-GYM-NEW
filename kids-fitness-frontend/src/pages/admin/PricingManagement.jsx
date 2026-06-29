import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';

const emptyForm = {
  name: '',
  price: '',
  b2bPrice: '',
  validity: '',
  validityValue: '',
  validityUnit: 'weeks',
  type: 'pack',
  classesIncluded: '',
  bonusQuantity: 0,
  bonusItemType: 'same',
  bonusItemId: '',
  durationWeeks: '',
  durationValue: '',
  durationUnit: 'weeks',
  billingCycle: 'none',
  benefits: '',
  tagline: '',
  isFeatured: false,
  isUnlimited: false,
  sessionType: 'group',
  validDays: 'both',
  sessionDuration: '',
  sessionDurationUnit: 'minutes',
  timeSlots: '',
  trainerAllocation: 'random',
  trainerId: '',
  maxAllowedMissed: 2,
  expiryBufferDays: 7,
  taxId: '',
  creditsIncluded: 0,
  dailyBookingLimit: 0,
  sessionsPerWeek: 0,
  cancellationWindow: 6,
  allowFreezing: false,
  gender: 'mixed',
  categoryId: '',
  replicateToLocations: [],
  bonuses: [],
  vendorPrices: []
};

export default function PricingManagement() {
  const { roleSlug } = useParams();
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);

  const { can } = usePermissions();

  const canCreate = can('pricing:create');
  const canEdit = can('pricing:edit');
  const canDelete = can('pricing:delete');
  const canToggle = can('pricing:edit');

  const load = () => {
    setLoading(true);
    const p1 = api.get('/plans?all=true').then((res) => setPlans(res.data || [])).catch(() => { });
    const p2 = api.get('/locations?all=true').then((res) => setLocations(res.data || [])).catch(() => { });
    const p3 = api.get('/classes?all=true').then((res) => setClasses(res.data || [])).catch(() => { });
    const p4 = api.get('/categories?status=active&type=membership').then((res) => setCategories(res.data || [])).catch(() => { });
    const p5 = api.get('/vendors?status=active').then((res) => setVendors(res.data || [])).catch(() => { });
    Promise.all([p1, p2, p3, p4, p5]).finally(() => setLoading(false));
  };

  const loadTrainers = () => {
    api.get('/trainers')
      .then(res => setTrainers(res.data || []))
      .catch(() => { });
  };

  const loadTaxes = () => {
    api.get('/taxes')
      .then(res => setTaxes(res.data.data || []))
      .catch(() => { });
  };

  useEffect(() => {
    load();
    loadTrainers();
    loadTaxes();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleEdit = (plan) => {
    setEditingId(plan._id);
    setForm({
      name: plan.name || '',
      price: plan.price ?? '',
      b2bPrice: plan.b2bPrice ?? '',
      validity: plan.validity || '',
      validityValue: plan.validityValue ?? '',
      validityUnit: plan.validityUnit || 'weeks',
      type: plan.type || 'pack',
      classesIncluded: plan.classesIncluded ?? '',
      bonusQuantity: plan.bonusQuantity || 0,
      bonusItemType: plan.bonusItemType || 'same',
      bonusItemId: plan.bonusItemId?._id || plan.bonusItemId || '',
      durationWeeks: plan.durationWeeks ?? '',
      durationValue: plan.durationValue ?? '',
      durationUnit: plan.durationUnit || 'weeks',
      billingCycle: plan.billingCycle || 'none',
      benefits: (plan.benefits || []).join(', '),
      tagline: plan.tagline || '',
      isFeatured: !!plan.isFeatured,
      isUnlimited: plan.classesIncluded === 0,
      sessionType: plan.sessionType || 'group',
      validDays: plan.validDays || 'both',
      sessionDuration: plan.sessionDuration || '',
      sessionDurationUnit: plan.sessionDurationUnit || 'minutes',
      timeSlots: (plan.timeSlots || []).join(', '),
      trainerAllocation: plan.trainerAllocation || 'random',
      trainerId: plan.trainerId?._id || plan.trainerId || '',
      maxAllowedMissed: plan.extensionRules?.maxAllowedMissed ?? 2,
      expiryBufferDays: plan.extensionRules?.expiryBufferDays ?? 7,
      cancellationWindow: plan.extensionRules?.cancellationWindow ?? 6,
      allowFreezing: !!plan.extensionRules?.allowFreezing,
      taxId: plan.taxId?._id || plan.taxId || '',
      creditsIncluded: plan.creditsIncluded ?? 0,
      dailyBookingLimit: plan.dailyBookingLimit ?? 0,
      sessionsPerWeek: plan.sessionsPerWeek ?? 0,
      gender: plan.gender || 'mixed',
      categoryId: plan.categoryId?._id || plan.categoryId || '',
      replicateToLocations: [],
      bonuses: plan.bonuses?.map(b => ({
        quantity: b.quantity || 0,
        itemType: b.itemType || 'same',
        itemId: b.itemId?._id || b.itemId || ''
      })) || [],
      vendorPrices: plan.vendorPrices?.map(vp => ({
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

    const payload = {
      ...form,
      price: Number(form.price),
      b2bPrice: form.b2bPrice ? Number(form.b2bPrice) : undefined,
      vendorPrices: (form.vendorPrices || []).filter(vp => vp.vendorId && vp.price).map(vp => ({
        vendorId: vp.vendorId,
        price: Number(vp.price),
        startDate: vp.startDate ? new Date(vp.startDate) : undefined,
        endDate: vp.endDate ? new Date(vp.endDate) : undefined
      })),
      classesIncluded: form.isUnlimited ? 0 : (form.classesIncluded ? Number(form.classesIncluded) : undefined),
      bonusQuantity: Number(form.bonusQuantity || 0),
      bonusItemType: form.bonusItemType,
      bonusItemId: form.bonusItemId || undefined,
      bonuses: (form.bonuses || []).map(b => ({
        quantity: Number(b.quantity || 0),
        itemType: b.itemType,
        itemId: b.itemId || undefined
      })),
      durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : undefined,
      durationValue: form.durationValue ? Number(form.durationValue) : undefined,
      durationUnit: form.durationUnit,
      validityValue: form.validityValue ? Number(form.validityValue) : undefined,
      validityUnit: form.validityUnit,
      sessionDuration: form.sessionDuration ? Number(form.sessionDuration) : undefined,
      sessionDurationUnit: form.sessionDurationUnit,
      benefits: form.benefits.split(',').map((item) => item.trim()).filter(Boolean),
      timeSlots: form.timeSlots.split(',').map((item) => item.trim()).filter(Boolean),
      extensionRules: {
        maxAllowedMissed: Number(form.maxAllowedMissed),
        expiryBufferDays: Number(form.expiryBufferDays),
        cancellationWindow: Number(form.cancellationWindow),
        allowFreezing: Boolean(form.allowFreezing)
      },
      creditsIncluded: Number(form.creditsIncluded || 0),
      dailyBookingLimit: parseInt(form.dailyBookingLimit) || 0,
      sessionsPerWeek: form.sessionsPerWeek,
      categoryId: form.categoryId || null,
      trainerId: (form.trainerAllocation === 'fixed' && form.trainerId) ? form.trainerId : null,
      replicateToLocations: form.replicateToLocations || []
    };

    console.log("PAYLOAD BEING SENT:", payload);

    try {
      if (editingId) {
        await api.put(`/plans/${editingId}`, payload);
        setMessage('Plan updated.');
      } else {
        await api.post('/plans', payload);
        setMessage('Plan created.');
      }
      handleCancel();
      await load();
      // Force a hard reload to ensure all location-wise variations and UI states are freshly synced
      window.location.reload();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Unable to save plan.');
    }
  };

  const handleToggleStatus = async (plan) => {
    const action = plan.status === 'active' ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this plan?`)) return;
    try {
      await api.patch(`/plans/${plan._id}/status`, { status: action === 'disable' ? 'inactive' : 'active' });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || `Failed to ${action} plan`);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader
          title="Membership Pricing"
          description="Update plan pricing, benefits, and membership terms."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8">
          {/* Header content moved to AdminHeader */}
        </div>
        {message ? <p className="mt-3 text-sm text-coral">{message}</p> : null}

        {canCreate || (editingId && canEdit) ? (
          <form className="mt-6 grid gap-3 rounded-3xl bg-white/80 p-6 shadow-glow" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-xl border border-orange-200/70 p-3"
                name="name"
                placeholder="Plan name"
                value={form.name}
                onChange={handleChange}
                required
              />
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Validity</label>
                  <input
                    className="w-full rounded-xl border border-orange-200/70 p-3"
                    name="validityValue"
                    type="number"
                    placeholder="Val"
                    value={form.validityValue}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Unit</label>
                  <select
                    className="w-full rounded-xl border border-orange-200/70 p-3"
                    name="validityUnit"
                    value={form.validityUnit}
                    onChange={handleChange}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Plan Category</label>
                  <select
                    className="w-full rounded-xl border border-orange-200/70 p-3"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                  >
                    <option value="dropin">Drop-in</option>
                    <option value="pack">Pack / Packaged</option>
                    <option value="term">Term / Weekly</option>
                    <option value="subscription">Subscription</option>
                    <option value="time-based">Time-Based Access</option>
                    <option value="credit-based">Credit-Based</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Category Master</label>
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
            </div>

            <div className="grid gap-3 md:grid-cols-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Duration</label>
                  <input
                    className="w-full rounded-xl border border-orange-200/70 p-3"
                    name="durationValue"
                    type="number"
                    placeholder="Dur"
                    value={form.durationValue}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Unit</label>
                  <select
                    className="w-full rounded-xl border border-orange-200/70 p-3"
                    name="durationUnit"
                    value={form.durationUnit}
                    onChange={handleChange}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Sessions</label>
                <input
                  className={`w-full rounded-xl border border-orange-200/70 p-3 ${form.isUnlimited || form.type === 'credit-based' ? 'bg-slate-50 text-ink/20' : ''}`}
                  name="classesIncluded"
                  type="number"
                  placeholder="Classes included"
                  value={form.isUnlimited || form.type === 'credit-based' ? '' : form.classesIncluded}
                  onChange={handleChange}
                  disabled={form.isUnlimited || form.type === 'credit-based'}
                />
                <div className="mt-2 flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="isUnlimited"
                    checked={form.isUnlimited}
                    onChange={(e) => setForm(prev => ({ ...prev, isUnlimited: e.target.checked }))}
                    className="h-4 w-4 rounded border-orange-200 text-coral focus:ring-coral"
                  />
                  <label htmlFor="isUnlimited" className="text-[10px] font-bold uppercase text-ink/40">Unlimited Sessions</label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-ink/40">Bonus/Free Classes</p>
                <button type="button" className="text-xs font-bold text-ocean hover:text-ocean/70" onClick={() => setForm(prev => ({ ...prev, bonuses: [...(prev.bonuses || []), { quantity: 0, itemType: 'same', itemId: '' }] }))}>
                  + Add Bonus
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Bonus Quantity</label>
                  <input
                    className="w-full rounded-xl border border-indigo-200/70 p-3"
                    name="bonusQuantity"
                    type="number"
                    placeholder="e.g. 3"
                    value={form.bonusQuantity}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Bonus Item Type</label>
                  <select
                    className="w-full rounded-xl border border-indigo-200/70 p-3"
                    name="bonusItemType"
                    value={form.bonusItemType}
                    onChange={handleChange}
                  >
                    <option value="same">Same Class/Plan</option>
                    <option value="class">Specific Class</option>
                    <option value="plan">Specific Plan</option>
                  </select>
                </div>
                {form.bonusItemType !== 'same' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Specific Bonus Item</label>
                    <select
                      className="w-full rounded-xl border border-indigo-200/70 p-3"
                      name="bonusItemId"
                      value={form.bonusItemId}
                      onChange={handleChange}
                    >
                      <option value="">Select Item...</option>
                      {form.bonusItemType === 'class' ? classes.map(c => <option key={c._id} value={c._id}>{c.title}</option>) : plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {form.bonuses && form.bonuses.map((bonus, idx) => (
                <div key={idx} className="grid gap-3 md:grid-cols-3 border-t border-indigo-200/30 pt-3 relative">
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, bonuses: prev.bonuses.filter((_, i) => i !== idx) }))} className="absolute -top-3 -right-2 text-[10px] text-coral font-bold p-1 bg-white rounded-full border border-coral/30 hover:bg-red-50 w-5 h-5 flex items-center justify-center leading-none z-10" title="Remove bonus">×</button>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Bonus Quantity</label>
                    <input className="w-full rounded-xl border border-indigo-200/70 p-3" type="number" placeholder="e.g. 3" value={bonus.quantity} onChange={e => {
                      const newBonuses = [...form.bonuses];
                      newBonuses[idx].quantity = e.target.value;
                      setForm(prev => ({ ...prev, bonuses: newBonuses }));
                    }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Bonus Item Type</label>
                    <select className="w-full rounded-xl border border-indigo-200/70 p-3" value={bonus.itemType} onChange={e => {
                      const newBonuses = [...form.bonuses];
                      newBonuses[idx].itemType = e.target.value;
                      newBonuses[idx].itemId = '';
                      setForm(prev => ({ ...prev, bonuses: newBonuses }));
                    }}>
                      <option value="same">Same Class/Plan</option>
                      <option value="class">Specific Class</option>
                      <option value="plan">Specific Plan</option>
                    </select>
                  </div>
                  {bonus.itemType !== 'same' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Specific Bonus Item</label>
                      <select className="w-full rounded-xl border border-indigo-200/70 p-3" value={bonus.itemId} onChange={e => {
                        const newBonuses = [...form.bonuses];
                        newBonuses[idx].itemId = e.target.value;
                        setForm(prev => ({ ...prev, bonuses: newBonuses }));
                      }}>
                        <option value="">Select Item...</option>
                        {bonus.itemType === 'class' ? classes.map(c => <option key={c._id} value={c._id}>{c.title}</option>) : plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-4 border-t border-slate-50 pt-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-ink/40 uppercase ml-2">Daily Booking Limit</label>
                <input
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="dailyBookingLimit"
                  type="number"
                  placeholder="Daily Limit (0=∞)"
                  value={form.dailyBookingLimit}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-ink/40 uppercase ml-2">Sessions Per Week</label>
                <input
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="sessionsPerWeek"
                  type="text"
                  placeholder="Weekly Limit (0=∞, or Flexible)"
                  value={form.sessionsPerWeek}
                  onChange={(e) => setForm(prev => ({ ...prev, sessionsPerWeek: e.target.value }))}
                />
              </div>

              {form.type === 'credit-based' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-ink/40 uppercase ml-2">Total Credits</label>
                  <input
                    className="w-full rounded-xl border border-orange-200/70 p-3 bg-indigo-50/30"
                    name="creditsIncluded"
                    type="number"
                    placeholder="Credits"
                    value={form.creditsIncluded}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-ink/40 uppercase ml-2">Cancel Window (hrs)</label>
                <input
                  className="w-full rounded-xl border border-orange-200/70 p-3"
                  name="cancellationWindow"
                  type="number"
                  placeholder="Window (e.g. 6)"
                  value={form.cancellationWindow}
                  onChange={handleChange}
                />
              </div>

              <div className="flex items-center gap-3 px-3 pt-4">
                <input
                  type="checkbox"
                  id="allowFreezing"
                  checked={form.allowFreezing}
                  onChange={(e) => setForm(prev => ({ ...prev, allowFreezing: e.target.checked }))}
                  className="h-5 w-5 rounded border-orange-200 text-brand-blue"
                />
                <label htmlFor="allowFreezing" className="text-[10px] font-bold uppercase text-ink/40">Allow Freezing</label>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-1" />
              {form.type === 'subscription' && (
                <select
                  className="rounded-xl border border-orange-200/70 p-3"
                  name="billingCycle"
                  value={form.billingCycle}
                  onChange={handleChange}
                >
                  <option value="none">Cycle (None)</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
              <input
                className={`rounded-xl border border-orange-200/70 p-3 ${form.type === 'subscription' ? '' : 'md:col-span-2'}`}
                name="tagline"
                placeholder="Tagline (e.g. Family favorite)"
                value={form.tagline}
                onChange={handleChange}
              />
              <div className={`flex items-center gap-3 px-3 ${form.type === 'subscription' ? '' : 'md:col-span-1'}`}>
                <input
                  type="checkbox"
                  name="isFeatured"
                  id="isFeatured"
                  checked={form.isFeatured}
                  onChange={(e) => setForm(prev => ({ ...prev, isFeatured: e.target.checked }))}
                  className="h-5 w-5 rounded border-orange-200 text-coral focus:ring-coral"
                />
                <label htmlFor="isFeatured" className="text-sm font-medium text-ink/70">Featured (Best Value)</label>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Session Type</label>
                <select className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" name="sessionType" value={form.sessionType} onChange={handleChange}>
                  <option value="group">Group Session</option>
                  <option value="personal">Personal Training</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Valid Days</label>
                <select className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" name="validDays" value={form.validDays} onChange={handleChange}>
                  <option value="weekday">Weekdays (Mon-Fri)</option>
                  <option value="weekend">Weekends (Sat-Sun)</option>
                  <option value="both">All Days</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Target Gender</label>
                <select className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="mixed">Mixed (All)</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Trainer allocation</label>
                <select className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" name="trainerAllocation" value={form.trainerAllocation} onChange={handleChange}>
                  <option value="random">Random (Auto)</option>
                  <option value="fixed">Fixed (Manual)</option>
                </select>
              </div>
              {form.trainerAllocation === 'fixed' ? (
                <div className="space-y-1 animate-rise">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Select Fixed Trainer</label>
                  <select
                    className="w-full rounded-xl border border-orange-200/70 p-3 text-sm"
                    name="trainerId"
                    value={form.trainerId}
                    onChange={handleChange}
                    required={form.trainerAllocation === 'fixed'}
                  >
                    <option value="">Choose a trainer...</option>
                    {trainers.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Time Slots (comma separated)</label>
                  <input className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" name="timeSlots" placeholder="10:00 AM, 04:00 PM" value={form.timeSlots} onChange={handleChange} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Session Duration</label>
                  <input className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" type="number" name="sessionDuration" placeholder="e.g. 45" value={form.sessionDuration} onChange={handleChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Unit</label>
                  <select className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" name="sessionDurationUnit" value={form.sessionDurationUnit} onChange={handleChange}>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>
            </div>

            {form.trainerAllocation === 'fixed' && (
              <div className="grid gap-3 md:grid-cols-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Time Slots (comma separated)</label>
                  <input className="w-full rounded-xl border border-orange-200/70 p-3 text-sm" name="timeSlots" placeholder="10:00 AM, 04:00 PM" value={form.timeSlots} onChange={handleChange} />
                </div>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Max Missed Sessions (Allow rescue)</label>
                <input className="w-full rounded-xl border border-orange-200/70 p-3" name="maxAllowedMissed" type="number" value={form.maxAllowedMissed} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Expiry Buffer (Days)</label>
                <input className="w-full rounded-xl border border-orange-200/70 p-3" name="expiryBufferDays" type="number" value={form.expiryBufferDays} onChange={handleChange} />
              </div>
              <div className="space-y-1 md:col-span-1">
                <label className="text-[10px] font-bold uppercase text-ink/40 px-1">Applied Tax Rule</label>
                <select
                  className="w-full rounded-xl border border-orange-200/70 p-3 text-sm"
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
            </div>
            <textarea
              className="min-h-[90px] rounded-xl border border-orange-200/70 p-3"
              name="benefits"
              placeholder="Benefits (comma separated)"
              value={form.benefits}
              onChange={handleChange}
            />
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
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white" type="submit">
                {editingId ? 'Update plan' : 'Create plan'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="mt-6 p-6 bg-white/50 rounded-3xl border border-dashed border-slate-200 text-center">
            <p className="text-sm font-bold text-ink/30 italic">You don't have permission to {editingId ? 'edit' : 'create'} plans.</p>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {loading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="h-32 animate-pulse bg-white rounded-2xl" />)
          ) : plans.map((plan) => (
            <div key={plan._id} className="rounded-2xl bg-white/80 p-4 shadow-glow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-xs text-ink/70">{plan.validity}</p>
                  <p className="text-xs text-ink/70">
                    {plan.classesIncluded === 0 ? '∞ Unlimited Classes' : (plan.type === 'credit-based' ? `${plan.creditsIncluded} Total Credits` : `${plan.classesIncluded} Classes`)}
                  </p>
                  <p className="text-xs text-ink/70">
                    Type: <span className="capitalize">{plan.type?.replace('-', ' ')}</span>
                    {plan.type === 'subscription' && plan.billingCycle !== 'none' && ` (${plan.billingCycle})`}
                  </p>
                  {plan.dailyBookingLimit > 0 && (
                    <p className="text-[9px] font-bold text-coral uppercase tracking-tighter">Max {plan.dailyBookingLimit} bookings/day</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ocean">AED {plan.price}</p>
                  {plan.b2bPrice && <p className="text-xs font-bold text-indigo-500">B2B: AED {plan.b2bPrice}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-3">
                {canEdit && (
                  <button
                    className="rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold"
                    onClick={() => handleEdit(plan)}
                  >
                    Edit
                  </button>
                )}
                {canToggle && (
                  <button
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${plan.status === 'active' ? 'bg-red-50 text-red-400 border border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-500 border border-green-100 hover:bg-green-100'}`}
                    onClick={() => handleToggleStatus(plan)}
                  >
                    {plan.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
