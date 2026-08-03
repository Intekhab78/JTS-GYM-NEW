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
  
  // Tab State
  const [activeTab, setActiveTab] = useState('methods'); // 'methods' or 'gateway'

  // Method Settings State
  const [brands, setBrands] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all'); // 'all' means configuring the Brand level
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Gateway Settings State
  const [gatewaySettings, setGatewaySettings] = useState({
    activeProvider: 'razorpay',
    isActive: true,
    razorpay: { keyId: '', keySecret: '', webhookSecret: '' },
    stripe: { keyId: '', keySecret: '', webhookSecret: '' },
    paypal: { keyId: '', keySecret: '', webhookSecret: '' },
    ccavenue: { merchantId: '', accessCode: '', workingKey: '' },
    chase: { keyId: '', keySecret: '', webhookSecret: '' },
    bofa: { keyId: '', keySecret: '', webhookSecret: '' },
    barclays: { keyId: '', keySecret: '', webhookSecret: '' },
    citi: { keyId: '', keySecret: '', webhookSecret: '' },
    wellsfargo: { keyId: '', keySecret: '', webhookSecret: '' }
  });
  const [loadingGateway, setLoadingGateway] = useState(false);

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
    fetchGatewaySettings();
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

  const fetchGatewaySettings = async () => {
    setLoadingGateway(true);
    try {
      const res = await api.get('/settings/global');
      const settingsList = res.data?.data || res.data || [];
      const paymentConf = settingsList.find(s => s.key === 'payment_gateway_settings');
      if (paymentConf && paymentConf.value) {
        setGatewaySettings(prev => ({
          ...prev,
          activeProvider: paymentConf.value.activeProvider || 'razorpay',
          isActive: paymentConf.value.isActive !== false,
          razorpay: { ...prev.razorpay, ...(paymentConf.value.razorpay || {}) },
          stripe: { ...prev.stripe, ...(paymentConf.value.stripe || {}) },
          paypal: { ...prev.paypal, ...(paymentConf.value.paypal || {}) },
          ccavenue: { ...prev.ccavenue, ...(paymentConf.value.ccavenue || {}) },
          chase: { ...prev.chase, ...(paymentConf.value.chase || {}) },
          bofa: { ...prev.bofa, ...(paymentConf.value.bofa || {}) },
          barclays: { ...prev.barclays, ...(paymentConf.value.barclays || {}) },
          citi: { ...prev.citi, ...(paymentConf.value.citi || {}) },
          wellsfargo: { ...prev.wellsfargo, ...(paymentConf.value.wellsfargo || {}) }
        }));
      } else {
        // Fallback to legacy razorpay settings
        const razorpayConf = settingsList.find(s => s.key === 'razorpay_settings');
        if (razorpayConf && razorpayConf.value) {
           setGatewaySettings(prev => ({
             ...prev,
             activeProvider: razorpayConf.value.provider || 'razorpay',
             isActive: razorpayConf.value.isActive !== false,
             razorpay: {
               keyId: razorpayConf.value.keyId || '',
               keySecret: razorpayConf.value.keySecret || '',
               webhookSecret: razorpayConf.value.webhookSecret || ''
             }
           }));
        }
      }
    } catch (err) {
      toast.error('Failed to load gateway configuration');
    } finally {
      setLoadingGateway(false);
    }
  };

  const handleSaveMethods = async () => {
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

  const handleSaveGateway = async () => {
    setSaving(true);
    try {
      const payload = {
        value: {
          activeProvider: gatewaySettings.activeProvider,
          isActive: gatewaySettings.isActive,
          razorpay: gatewaySettings.razorpay,
          stripe: gatewaySettings.stripe,
          paypal: gatewaySettings.paypal,
          ccavenue: gatewaySettings.ccavenue,
          chase: gatewaySettings.chase,
          bofa: gatewaySettings.bofa,
          barclays: gatewaySettings.barclays,
          citi: gatewaySettings.citi,
          wellsfargo: gatewaySettings.wellsfargo
        },
        description: 'Global Payment Gateway credentials and configuration'
      };

      const res = await api.put('/settings/global/payment_gateway_settings', payload);
      
      // Update form with the returned masked data
      if (res.data?.value) {
        setGatewaySettings(prev => ({
          ...prev,
          razorpay: { ...prev.razorpay, ...(res.data.value.razorpay || {}) },
          stripe: { ...prev.stripe, ...(res.data.value.stripe || {}) },
          paypal: { ...prev.paypal, ...(res.data.value.paypal || {}) },
          ccavenue: { ...prev.ccavenue, ...(res.data.value.ccavenue || {}) },
          chase: { ...prev.chase, ...(res.data.value.chase || {}) },
          bofa: { ...prev.bofa, ...(res.data.value.bofa || {}) },
          barclays: { ...prev.barclays, ...(res.data.value.barclays || {}) },
          citi: { ...prev.citi, ...(res.data.value.citi || {}) },
          wellsfargo: { ...prev.wellsfargo, ...(res.data.value.wellsfargo || {}) }
        }));
      }

      toast.success('Gateway configuration saved securely!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save gateway config');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (activeTab === 'methods') {
      handleSaveMethods();
    } else {
      handleSaveGateway();
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
          description="Configure accepted payment methods and payment gateway integrations."
          backTo={`/${roleSlug}`}
          actions={
            <button
              onClick={handleSave}
              disabled={saving || (activeTab === 'methods' ? loading : loadingGateway)}
              className="bg-brand-blue hover:bg-brand-blue/90 border border-brand-blue text-white px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          }
        />
        
        {/* Tabs Navigation */}
        <div className="px-4 md:px-8 mt-6">
          <div className="flex space-x-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('methods')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'methods' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Accepted Methods
            </button>
            <button
              onClick={() => setActiveTab('gateway')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'gateway' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <span>Gateway Config</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest">Global</span>
            </button>
          </div>
        </div>
        
        <div className="px-4 md:px-8 w-full space-y-4 animate-fade-in mt-6">
          {activeTab === 'methods' && (
            <>
              {/* Selectors */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    🏢 Company / Brand
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-700 font-medium outline-none"
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
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-700 font-medium outline-none"
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
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
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
            </>
          )}

          {activeTab === 'gateway' && (
            <div className="max-w-3xl">
              {loadingGateway ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Payment Gateway Configuration</h2>
                      <p className="text-sm text-slate-500 mt-1">Configure credentials for online transactions. These settings are applied globally.</p>
                    </div>
                    
                    {/* Global Online Payments Toggle */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-sm font-bold text-slate-700">Online Payments:</span>
                      <button
                        type="button"
                        onClick={() => setGatewaySettings(p => ({ ...p, isActive: !p.isActive }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gatewaySettings.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gatewaySettings.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`text-xs font-black uppercase tracking-widest ${gatewaySettings.isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {gatewaySettings.isActive ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Active Provider Configuration</label>
                      <p className="text-xs text-slate-500">Select the payment gateway you want to use. Whichever provider is selected here when you click "Save Settings" will become the active gateway for checkout.</p>
                      <select 
                        value={gatewaySettings.activeProvider}
                        onChange={(e) => setGatewaySettings(p => ({ ...p, activeProvider: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-medium text-slate-800"
                      >
                        <option value="razorpay">Razorpay</option>
                        <option value="stripe">Stripe</option>
                        <option value="paypal">PayPal</option>
                        <option value="ccavenue">CCAvenue</option>
                        <option value="chase">Chase Paymentech</option>
                        <option value="bofa">Bank of America Merchant Services</option>
                        <option value="barclays">Barclays Barclaycard</option>
                        <option value="citi">Citi Merchant Services</option>
                        <option value="wellsfargo">Wells Fargo Merchant Services</option>
                      </select>
                    </div>

                    {gatewaySettings.activeProvider === 'ccavenue' ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Merchant ID</label>
                          <input 
                            type="text" 
                            value={gatewaySettings.ccavenue?.merchantId || ''}
                            onChange={(e) => setGatewaySettings(p => ({ ...p, ccavenue: { ...p.ccavenue, merchantId: e.target.value } }))}
                            placeholder="e.g., 1234567"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800"
                          />
                          <p className="text-xs text-slate-500">Your unique CCAvenue Merchant ID.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex justify-between">
                              <span>Access Code</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Hidden</span>
                            </label>
                            <input 
                              type="password" 
                              value={gatewaySettings.ccavenue?.accessCode || ''}
                              onChange={(e) => setGatewaySettings(p => ({ ...p, ccavenue: { ...p.ccavenue, accessCode: e.target.value } }))}
                              placeholder="••••••••••••••••"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800 placeholder:text-slate-300"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">The Access Code provided by CCAvenue.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex justify-between">
                              <span>Working Key</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Hidden</span>
                            </label>
                            <input 
                              type="password" 
                              value={gatewaySettings.ccavenue?.workingKey || ''}
                              onChange={(e) => setGatewaySettings(p => ({ ...p, ccavenue: { ...p.ccavenue, workingKey: e.target.value } }))}
                              placeholder="••••••••••••••••••••••••••••••••"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800 placeholder:text-slate-300"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">32-character alphanumeric key used for encryption.</p>
                          </div>
                        </div>
                      </>
                    ) : ['chase', 'bofa', 'barclays', 'citi', 'wellsfargo'].includes(gatewaySettings.activeProvider) ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Merchant ID / Organization ID</label>
                          <input 
                            type="text" 
                            value={gatewaySettings[gatewaySettings.activeProvider]?.keyId || ''}
                            onChange={(e) => setGatewaySettings(p => ({ ...p, [p.activeProvider]: { ...p[p.activeProvider], keyId: e.target.value } }))}
                            placeholder="e.g., 987654321"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800"
                          />
                          <p className="text-xs text-slate-500">The account identifier assigned to you by the bank.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex justify-between">
                              <span>API Password / Secret Key</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Hidden</span>
                            </label>
                            <input 
                              type="password" 
                              value={gatewaySettings[gatewaySettings.activeProvider]?.keySecret || ''}
                              onChange={(e) => setGatewaySettings(p => ({ ...p, [p.activeProvider]: { ...p[p.activeProvider], keySecret: e.target.value } }))}
                              placeholder="••••••••••••••••"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800 placeholder:text-slate-300"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">The API password or secret key for your merchant account.</p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex justify-between">
                              <span>Hash / Shared Secret</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Hidden</span>
                            </label>
                            <input 
                              type="password" 
                              value={gatewaySettings[gatewaySettings.activeProvider]?.webhookSecret || ''}
                              onChange={(e) => setGatewaySettings(p => ({ ...p, [p.activeProvider]: { ...p[p.activeProvider], webhookSecret: e.target.value } }))}
                              placeholder="••••••••••••••••"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800 placeholder:text-slate-300"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">The hash key or shared secret used to encrypt/verify payloads.</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Key ID / Publishable Key</label>
                          <input 
                            type="text" 
                            value={gatewaySettings[gatewaySettings.activeProvider]?.keyId || ''}
                            onChange={(e) => setGatewaySettings(p => ({ ...p, [p.activeProvider]: { ...p[p.activeProvider], keyId: e.target.value } }))}
                            placeholder="e.g., rzp_live_... or pk_live_..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800"
                          />
                          <p className="text-xs text-slate-500">The public identifier for your payment gateway account.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex justify-between">
                              <span>Key Secret / Secret Key</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Hidden</span>
                            </label>
                            <input 
                              type="password" 
                              value={gatewaySettings[gatewaySettings.activeProvider]?.keySecret || ''}
                              onChange={(e) => setGatewaySettings(p => ({ ...p, [p.activeProvider]: { ...p[p.activeProvider], keySecret: e.target.value } }))}
                              placeholder="••••••••••••••••"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800 placeholder:text-slate-300"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">Leave unchanged to keep existing secret. The backend preserves existing credentials securely.</p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex justify-between">
                              <span>Webhook Secret</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Hidden</span>
                            </label>
                            <input 
                              type="password" 
                              value={gatewaySettings[gatewaySettings.activeProvider]?.webhookSecret || ''}
                              onChange={(e) => setGatewaySettings(p => ({ ...p, [p.activeProvider]: { ...p[p.activeProvider], webhookSecret: e.target.value } }))}
                              placeholder="••••••••••••••••"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-mono text-sm text-slate-800 placeholder:text-slate-300"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">Used to verify that webhook payloads are originating directly from the provider securely.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
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
