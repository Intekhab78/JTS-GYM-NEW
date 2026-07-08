import React, { useState, useEffect } from 'react';
import api from '../../api/api.js';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';

const PaymentSettings = () => {
  const { user } = useAuth();
  const { roleSlug } = useParams();
  const [brands, setBrands] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all'); // 'all' means configuring the Brand level
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Default settings template
  const defaultSettings = {
    cash: true,
    coupon: true,
    voucher: true,
    card: {
      visa: true,
      mastercard: true,
      amex: true,
      discover: false,
      unionpay: false,
      jcb: false,
      rupay: false,
      classic: false,
      gold: false,
      platinum: false,
      titanium: false,
      signature_visa: false,
      infinite_visa: false,
      world_mastercard: false,
      world_elite_mastercard: false,
      standard: false,
      business: false,
      corporate: false,
      student: false,
      secured: false,
      rewards: false,
      cashback: false,
      travel: false,
      premium: false,
      other: false
    }
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchLocations(selectedBrand);
      loadSettings(selectedBrand, 'all');
      setSelectedLocation('all');
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand) {
      loadSettings(selectedBrand, selectedLocation);
    }
  }, [selectedLocation]);

  const fetchBrands = async () => {
    try {
      const res = await api.get('/brands');
      const brandData = res.data?.data || res.data || [];
      setBrands(brandData);
      if (brandData.length > 0 && !selectedBrand) {
        setSelectedBrand(brandData[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load companies');
    }
  };

  const fetchLocations = async (brandId) => {
    try {
      const res = await api.get(`/locations?brandId=${brandId}&all=true`);
      setLocations(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load locations');
    }
  };

  const loadSettings = async (brandId, locId) => {
    setLoading(true);
    try {
      let data = null;
      if (locId === 'all') {
        const res = await api.get(`/brands/${brandId}`);
        data = res.data?.data || res.data;
      } else {
        const res = await api.get(`/locations/${locId}`);
        data = res.data?.data || res.data;
      }
      
      if (data && data.paymentSettings) {
        setSettings({
          ...defaultSettings,
          ...data.paymentSettings,
          card: {
            ...defaultSettings.card,
            ...(data.paymentSettings.card || {})
          }
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (err) {
      toast.error('Failed to load payment settings');
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedLocation === 'all') {
        await api.put(`/brands/${selectedBrand}`, { paymentSettings: settings });
        toast.success('Company payment settings saved!');
      } else {
        await api.put(`/locations/${selectedLocation}`, { paymentSettings: settings });
        toast.success('Location payment settings saved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCardSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      card: {
        ...prev.card,
        [key]: !prev.card[key]
      }
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      <main className="page-shell py-6">
        <AdminHeader 
          title="Payment Settings" 
          description="Configure accepted payment methods globally or per location."
          backTo={`/${roleSlug}`}
          actions={
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-5 py-2 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <span>💾</span>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          }
        />
        
    <div className="px-4 md:px-8 w-full space-y-4 animate-fade-in mt-4">
      {/* Selectors */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            🏢 Company / Brand
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700"
          >
            {brands.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            📍 Location Override
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700"
          >
            <option value="all">-- Use Company Defaults --</option>
            {locations.map(l => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Payment Methods */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Standard Methods</h2>
              <p className="text-sm text-slate-500">Enable or disable primary payment options.</p>
            </div>
            <div className="p-2">
              <ToggleRow 
                icon={<span className="text-xl">💵</span>}
                title="Cash Payments"
                description="Accept physical cash at the center."
                enabled={settings.cash}
                onToggle={() => toggleSetting('cash')}
              />
              <ToggleRow 
                icon={<span className="text-xl">🎫</span>}
                title="Coupons"
                description="Allow customers to redeem promotional coupons."
                enabled={settings.coupon}
                onToggle={() => toggleSetting('coupon')}
              />
              <ToggleRow 
                icon={<span className="text-xl">🎟️</span>}
                title="Vouchers"
                description="Accept prepaid vouchers as a payment method."
                enabled={settings.voucher}
                onToggle={() => toggleSetting('voucher')}
              />
            </div>
          </div>

          {/* Credit Card Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Credit / Debit Cards</h2>
                <p className="text-sm text-slate-500">Configure accepted card networks.</p>
              </div>
            </div>
            <div className="p-2 space-y-1">
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Visa" enabled={settings.card.visa} onToggle={() => toggleCardSetting('visa')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Mastercard" enabled={settings.card.mastercard} onToggle={() => toggleCardSetting('mastercard')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="American Express" enabled={settings.card.amex} onToggle={() => toggleCardSetting('amex')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Discover" enabled={settings.card.discover} onToggle={() => toggleCardSetting('discover')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="China UnionPay" enabled={settings.card.unionpay} onToggle={() => toggleCardSetting('unionpay')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="JCB" enabled={settings.card.jcb} onToggle={() => toggleCardSetting('jcb')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="RuPay" enabled={settings.card.rupay} onToggle={() => toggleCardSetting('rupay')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Classic" enabled={settings.card.classic} onToggle={() => toggleCardSetting('classic')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Gold" enabled={settings.card.gold} onToggle={() => toggleCardSetting('gold')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Platinum" enabled={settings.card.platinum} onToggle={() => toggleCardSetting('platinum')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Titanium" enabled={settings.card.titanium} onToggle={() => toggleCardSetting('titanium')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Signature (Visa)" enabled={settings.card.signature_visa} onToggle={() => toggleCardSetting('signature_visa')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Infinite (Visa)" enabled={settings.card.infinite_visa} onToggle={() => toggleCardSetting('infinite_visa')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="World (Mastercard)" enabled={settings.card.world_mastercard} onToggle={() => toggleCardSetting('world_mastercard')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="World Elite (Mastercard)" enabled={settings.card.world_elite_mastercard} onToggle={() => toggleCardSetting('world_elite_mastercard')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Standard" enabled={settings.card.standard} onToggle={() => toggleCardSetting('standard')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Business" enabled={settings.card.business} onToggle={() => toggleCardSetting('business')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Corporate" enabled={settings.card.corporate} onToggle={() => toggleCardSetting('corporate')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Student" enabled={settings.card.student} onToggle={() => toggleCardSetting('student')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Secured" enabled={settings.card.secured} onToggle={() => toggleCardSetting('secured')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Rewards" enabled={settings.card.rewards} onToggle={() => toggleCardSetting('rewards')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Cashback" enabled={settings.card.cashback} onToggle={() => toggleCardSetting('cashback')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Travel" enabled={settings.card.travel} onToggle={() => toggleCardSetting('travel')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Premium" enabled={settings.card.premium} onToggle={() => toggleCardSetting('premium')} />
              <ToggleRow icon={<span className="text-xl">💳</span>} title="Other Cards" enabled={settings.card.other} onToggle={() => toggleCardSetting('other')} />
            </div>
          </div>
        </div>
      )}
    </div>
      </main>
    </div>
  );
};

// Helper component for toggle rows
const ToggleRow = ({ icon, title, description, enabled, onToggle }) => {
  return (
    <div 
      className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-100 ${enabled ? 'bg-white' : 'bg-slate-50 opacity-60 grayscale-[0.5]'}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-lg ${enabled ? 'bg-slate-100' : 'bg-slate-200'}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      
      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </div>
  );
};

export default PaymentSettings;
