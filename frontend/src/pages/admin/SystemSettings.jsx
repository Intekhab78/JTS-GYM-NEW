import { getImageUrl  } from '../../api/api.js';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions.js';
import Select from 'react-select';
import { countries } from '../../utils/countries.js';

const defaultCompanyInfo = {
  name: 'JTS Booking',
  tagline: 'Building confidence and coordination through joyful movement.',
  address: 'SRTIP Free Zone,Block B - B20-017, Sharjah, UAE',
  email: 'info@jtsmiddleeast.com',
  phone: '+971 522542550',
  hoursMonFri: '9am to 7pm',
  hoursSatSun: '9am to 3pm',
  footerText: 'Family lounge · Free parking',
  invoiceTerms: 'Thank you for choosing us. Please present this invoice for entry.',
  logoUrl: ''
};

export default function SystemSettings() {
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValues, setInputValues] = useState({});
  const [globalSettings, setGlobalSettings] = useState({});
  const [companyInfo, setCompanyInfo] = useState(defaultCompanyInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const { can } = usePermissions();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [countersRes, globalRes] = await Promise.all([
        api.get('/settings/counters'),
        api.get('/settings/global')
      ]);
      
      setCounters(countersRes.data || []);
      const vals = {};
      countersRes.data.forEach(c => { vals[c.name] = c.seq; });
      setInputValues(vals);

      const settingsMap = {};
      globalRes.data.forEach(s => { settingsMap[s.key] = s.value; });
      setGlobalSettings(settingsMap);

      if (settingsMap.company_info) {
        setCompanyInfo({ ...defaultCompanyInfo, ...settingsMap.company_info });
      }
    } catch (err) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
      };
      const { data } = await api.post('/upload', formData, config);
      setCompanyInfo(prev => ({ ...prev, logoUrl: data.image }));
      toast.success('Logo uploaded! Don\'t forget to Save changes.');
    } catch (err) {
      toast.error('Logo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateCounter = async (name) => {
    const newSeq = inputValues[name];
    if (newSeq === undefined || isNaN(newSeq)) {
      toast.error('Please enter a valid number');
      return;
    }

    const currentCounter = counters.find(c => c.name === name);
    if (Number(newSeq) === currentCounter?.seq) {
       toast.info('No changes made');
       return;
    }

    if (!window.confirm(`Are you sure you want to change the next sequence for ${name}? Setting this incorrectly may lead to duplicate numbers.`)) return;
    
    setIsSaving(true);
    try {
      await api.put(`/settings/counters/${name}`, { seq: Number(newSeq) });
      toast.success(`${name} sequence updated`);
      loadSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update sequence');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleGlobal = async (key, currentValue) => {
     setIsSaving(true);
     const newValue = !currentValue;
     try {
        await api.put(`/settings/global/${key}`, { value: newValue });
        setGlobalSettings({ ...globalSettings, [key]: newValue });
        toast.success('Setting updated successfully');
     } catch (err) {
        toast.error('Failed to update setting');
     } finally {
        setIsSaving(false);
     }
  };

  const handleSaveCompanyInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings/global/company_info', { 
        value: companyInfo,
        description: 'Global company Branding and contact information'
      });
      toast.success('Company settings saved successfully');
      setGlobalSettings(prev => ({ ...prev, company_info: companyInfo }));
    } catch (err) {
      toast.error('Failed to save company settings');
    } finally {
      setIsSaving(false);
    }
  };

  const logoPreview = companyInfo.logoUrl ? (
    getImageUrl(companyInfo.logoUrl)
  ) : null;

  return (
    <div>
      <Navbar />
      <main className="page-shell py-12 min-h-[80vh]">
        <AdminHeader 
          title="Company Setup" 
          description="Manage branding, company logo, footer info, and invoice numbering."
        />

        <div className="mt-8 grid gap-8 max-w-4xl">
          {/* Company Setup Section */}
          <section className="soft-card rounded-[40px] p-8 border-2 border-slate-50 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl">
                🏢
              </div>
              <div>
                <h2 className="text-2xl font-display text-ink">Branding & Logo</h2>
                <p className="text-sm text-ink/40">Upload your logo and change company identity</p>
              </div>
            </div>

            <form onSubmit={handleSaveCompanyInfo} className="grid gap-6">
              
              <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                 <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {logoPreview ? (
                      <img src={logoPreview} className="w-full h-full object-contain p-2" alt="Logo Preview" />
                    ) : (
                      <span className="text-xs font-black text-ink/20 uppercase tracking-widest text-center px-2">No Logo</span>
                    )}
                    {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>}
                 </div>
                 
                 <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-ink/40 uppercase tracking-[0.2em]">Company Logo</label>
                    <div className="flex gap-3">
                       <input 
                         type="file" 
                         accept="image/*"
                         onChange={handleFileUpload}
                         className="hidden" 
                         id="logo-upload"
                       />
                       <label 
                         htmlFor="logo-upload"
                         className="px-6 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold text-ink cursor-pointer hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-95"
                       >
                         {companyInfo.logoUrl ? 'Change Logo' : 'Upload Logo'}
                       </label>
                       {companyInfo.logoUrl && (
                         <button 
                           type="button"
                           onClick={() => setCompanyInfo({...companyInfo, logoUrl: ''})}
                           className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                         >
                           Remove
                         </button>
                       )}
                    </div>
                    <p className="text-[10px] text-ink/30 italic">Recommended: Transparent PNG, 512x512px or Landscape format.</p>
                 </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Company Name</label>
                  <input 
                    className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Tagline (Under Name)</label>
                  <input 
                    className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                    value={companyInfo.tagline}
                    onChange={(e) => setCompanyInfo({...companyInfo, tagline: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 uppercase px-1">Studio Address</label>
                <input 
                  className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Country</label>
                  <Select
                    options={countries.map(c => ({ value: c.name, label: c.name, currency: c.currency }))}
                    value={countries.find(c => c.name === companyInfo.country) ? { value: companyInfo.country, label: companyInfo.country, currency: companyInfo.currency } : null}
                    onChange={(selected) => {
                      if (selected) {
                        setCompanyInfo({...companyInfo, country: selected.value, currency: selected.currency});
                      } else {
                        setCompanyInfo({...companyInfo, country: '', currency: ''});
                      }
                    }}
                    placeholder="Search country..."
                    isClearable
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderRadius: '1rem',
                        border: state.isFocused ? '2px solid #1a6bff' : '2px solid #f1f5f9',
                        padding: '2px',
                        boxShadow: 'none',
                        '&:hover': {
                          border: state.isFocused ? '2px solid #1a6bff' : '2px solid #f1f5f9'
                        }
                      }),
                      menu: (base) => ({
                        ...base,
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        zIndex: 50
                      })
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Currency Symbol</label>
                  <input 
                    className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none bg-slate-50 text-ink/50"
                    value={companyInfo.currency || ''}
                    readOnly
                    placeholder="Auto-filled"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Contact Email</label>
                  <input 
                    className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Contact Phone</label>
                  <input 
                    className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Hours: Mon - Fri</label>
                  <input 
                    className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                    value={companyInfo.hoursMonFri}
                    onChange={(e) => setCompanyInfo({...companyInfo, hoursMonFri: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ink/30 uppercase px-1">Hours: Sat - Sun</label>
                  <input 
                    className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                    value={companyInfo.hoursSatSun}
                    onChange={(e) => setCompanyInfo({...companyInfo, hoursSatSun: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 uppercase px-1">Footer Notes (Amenities)</label>
                <input 
                  className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue"
                  value={companyInfo.footerText}
                  onChange={(e) => setCompanyInfo({...companyInfo, footerText: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-ink/30 uppercase px-1">Invoice Terms & Conditions</label>
                <textarea 
                  className="w-full rounded-2xl border-2 border-slate-100 p-3 outline-none focus:border-brand-blue min-h-[80px]"
                  value={companyInfo.invoiceTerms}
                  onChange={(e) => setCompanyInfo({...companyInfo, invoiceTerms: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="mt-2 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl shadow-lg hover:shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving Changes...' : 'Save Company Settings'}
              </button>
            </form>
          </section>

          {/* Invoice Settings Section */}
          <section className="soft-card rounded-[40px] p-8 border-2 border-slate-50 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-2xl">
                📄
              </div>
              <div>
                <h2 className="text-2xl font-display text-ink">Invoice Numbering</h2>
                <p className="text-sm text-ink/40">Adjust consecutive numbering for billing</p>
              </div>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="h-24 bg-slate-50 animate-pulse rounded-2xl" />
              ) : (
                <div className="grid gap-6">
                  {counters.filter(c => c.name === 'invoice').map(c => (
                    <div key={c.name} className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <h4 className="font-bold text-ink mb-1">Next Sequence Number</h4>
                        <p className="text-xs text-ink/50 leading-relaxed max-w-sm">
                          Set the current high-water mark.
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1">
                          <input 
                            type="number"
                            className="w-full md:w-40 bg-white rounded-2xl border-2 border-slate-200 p-4 font-black text-xl text-brand-blue focus:border-brand-blue outline-none transition-all"
                            value={inputValues[c.name] || ''}
                            onChange={(e) => setInputValues({ ...inputValues, [c.name]: e.target.value })}
                          />
                        </div>
                        <button 
                          onClick={() => handleUpdateCounter(c.name)}
                          disabled={isSaving}
                          className="p-4 rounded-2xl bg-brand-blue text-white shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all font-bold text-sm px-6"
                        >
                          {isSaving ? '...' : 'Update'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Feature Toggles Section */}
          <section className="soft-card rounded-[40px] p-8 border-2 border-slate-50 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">
                ⚙️
              </div>
              <div>
                <h2 className="text-2xl font-display text-ink">Feature Toggles</h2>
                <p className="text-sm text-ink/40">Enable or disable specific features for users</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-ink mb-1">Allow Plan Upgrades</h4>
                  <p className="text-xs text-ink/50 leading-relaxed max-w-sm">
                    Allow parents to see the option to upgrade their plans from their dashboard.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleGlobal('allow_plan_upgrade', globalSettings.allow_plan_upgrade)}
                    disabled={isSaving}
                    className={`w-14 h-8 rounded-full transition-all relative ${globalSettings.allow_plan_upgrade ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${globalSettings.allow_plan_upgrade ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                    {globalSettings.allow_plan_upgrade ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-ink mb-1">Enable Proration</h4>
                  <p className="text-xs text-ink/50 leading-relaxed max-w-sm">
                    When enabled, users upgrading their subscription receive credit for the unused portion of their current plan. When disabled, users pay the full price of the new plan.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleGlobal('enable_proration', globalSettings.enable_proration)}
                    disabled={isSaving}
                    className={`w-14 h-8 rounded-full transition-all relative ${globalSettings.enable_proration ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${globalSettings.enable_proration ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                    {globalSettings.enable_proration ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-ink mb-1">Allow Refund Requests</h4>
                  <p className="text-xs text-ink/50 leading-relaxed max-w-sm">
                    Allow customers to see the 'Refund' option for their bookings on their dashboard.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleGlobal('allow_refund_request', globalSettings.allow_refund_request !== false)}
                    disabled={isSaving}
                    className={`w-14 h-8 rounded-full transition-all relative ${globalSettings.allow_refund_request !== false ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${globalSettings.allow_refund_request !== false ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                    {globalSettings.allow_refund_request !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
