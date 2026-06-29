import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';

const UATManagement = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState({ 
    classes: [], 
    plans: [], 
    promotions: [],
    counts: {
      users: 0,
      children: 0,
      bookings: 0,
      memberships: 0,
      payments: 0,
      invoices: 0,
      sessions: 0,
      attendance: 0,
      trials: 0,
      leads: 0,
      extensionRequests: 0
    }
  });
  const [isUATEnabled, setIsUATEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const [configRes, settingsRes] = await Promise.all([
        api.get('/uat/configs'),
        api.get('/settings/global')
      ]);
      setConfigs(configRes.data);
      
      const uatSetting = settingsRes.data.find(s => s.key === 'is_uat_enabled');
      setIsUATEnabled(uatSetting ? !!uatSetting.value : false);
    } catch (err) {
      console.error('Failed to fetch UAT configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleClearTransactions = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL UAT bookings, payments, and attendance. Live data will NOT be affected. Proceed?')) return;
    
    try {
      setActionLoading(true);
      const res = await api.delete('/uat/clear-transactions');
      setMessage({ type: 'success', text: 'Transactional UAT data cleared successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear data: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncOldData = async () => {
    if (!window.confirm('This will tag all your historical data as "Live Mode". It is recommended to do this once after the UAT update. Proceed?')) return;

    try {
      setActionLoading(true);
      const res = await api.post('/uat/sync-old-data');
      setMessage({ type: 'success', text: res.data.message });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Sync failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async (type, id, name) => {
    if (!window.confirm(`Are you sure you want to push "${name}" to the LIVE environment?`)) return;

    try {
      setActionLoading(true);
      await api.post('/uat/promote', { type, id });
      setMessage({ type: 'success', text: `"${name}" pushed to Live environment!` });
      fetchConfigs();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Promotion failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async (type, id, name) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE "${name}"? This cannot be undone.`)) return;

    try {
      setActionLoading(true);
      await api.delete('/uat/discard', { data: { type, id } });
      setMessage({ type: 'success', text: `"${name}" has been deleted.` });
      fetchConfigs();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Discard failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMasterUAT = async () => {
    const newState = !isUATEnabled;
    const action = newState ? 'ENABLE' : 'DISABLE';
    if (!window.confirm(`Are you sure you want to ${action} UAT mode for the entire system? ${!newState ? 'This will hide the UAT toggle for all users and default everyone to Live mode.' : ''}`)) return;

    try {
      setActionLoading(true);
      await api.put('/settings/global/is_uat_enabled', { 
        value: newState,
        description: 'Global master toggle for UAT/Live environment isolation' 
      });
      setIsUATEnabled(newState);
      setMessage({ type: 'success', text: `UAT System Mode ${newState ? 'ENABLED' : 'DISABLED'} successfully.` });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update master toggle: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-8 text-center">
        <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-ink/60">Only Superadmins can access UAT Management tools.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="UAT Management" 
          description="Manage test data isolation and promote configurations to Live."
          backTo="/superadmin"
        />

        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            {/* Header content moved to AdminHeader */}
          </div>

        <div className="flex gap-3">
          <button
            onClick={handleSyncOldData}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Old Data
          </button>
          <button
            onClick={handleClearTransactions}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-rose-200 active:scale-95 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Wipe {Object.values(configs.counts || {}).reduce((a, b) => a + b, 0)} Transactions
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {message.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* Master Toggle Banner */}
      <div className={`mb-8 p-6 rounded-3xl border transition-all ${
        isUATEnabled 
          ? 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-100' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isUATEnabled ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-200 text-slate-400'
            }`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Global UAT Environment
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isUATEnabled ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isUATEnabled ? 'Active' : 'Offline'}
                </span>
              </h2>
              <p className="text-sm text-ink/60 mt-1 max-w-xl">
                When enabled, all users can toggle between Live and UAT modes. When disabled, the entire system is locked to Live mode and the environment switcher is hidden.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleToggleMasterUAT}
            disabled={actionLoading}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              isUATEnabled ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            <span className="sr-only">Toggle UAT</span>
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform shadow-sm ${
                isUATEnabled ? 'translate-x-11' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Classes Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Draft Classes (UAT)</h2>
          </div>

          <div className="space-y-3">
            {configs.classes.length === 0 ? (
              <p className="text-ink/30 italic text-center py-8">No draft classes found in UAT mode.</p>
            ) : configs.classes.map(c => (
              <div key={c._id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                <div>
                  <h3 className="font-bold">{c.title}</h3>
                  <p className="text-xs text-ink/40">Created {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleDiscard('class', c._id, c.title)}
                    className="bg-slate-200 text-slate-600 p-1.5 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    title="Discard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePromote('class', c._id, c.title)}
                    className="bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 hover:bg-indigo-600 shadow-sm"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    PUSH TO LIVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center text-coral">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Draft Plans (UAT)</h2>
          </div>

          <div className="space-y-3">
            {configs.plans.length === 0 ? (
              <p className="text-ink/30 italic text-center py-8">No draft plans found in UAT mode.</p>
            ) : configs.plans.map(p => (
              <div key={p._id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                <div>
                  <h3 className="font-bold">{p.name}</h3>
                  <p className="text-xs text-ink/40">AED {p.price} • {p.type}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleDiscard('plan', p._id, p.name)}
                    className="bg-slate-200 text-slate-600 p-1.5 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    title="Discard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePromote('plan', p._id, p.name)}
                    className="bg-coral text-white px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 hover:bg-coral-dark shadow-sm"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    PUSH TO LIVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary / Stats Card */}
        <div className="md:col-span-2 bg-ink text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
           <svg className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
           </svg>
           <div className="relative z-10">
              <h2 className="text-2xl font-display mb-6">UAT Status Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Test Users</p>
                  <p className="text-xl font-black">{configs.counts?.users || 0}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Test Bookings</p>
                  <p className="text-xl font-black">{configs.counts?.bookings || 0}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Test Memberships</p>
                  <p className="text-xl font-black">{configs.counts?.memberships || 0}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Safety Lock</p>
                  <p className="text-xl font-black text-emerald-400">ENABLED</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Test Sessions</p>
                  <p className="text-xl font-black">{configs.counts?.sessions || 0}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Test Attendance</p>
                  <p className="text-xl font-black">{configs.counts?.attendance || 0}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">CRM (Trials/Leads)</p>
                  <p className="text-xl font-black">{(configs.counts?.trials || 0) + (configs.counts?.leads || 0)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Total UAT Records</p>
                  <p className="text-xl font-black text-amber-400">{Object.values(configs.counts || {}).reduce((a, b) => a + b, 0)}</p>
                </div>
              </div>
           </div>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
};

export default UATManagement;
