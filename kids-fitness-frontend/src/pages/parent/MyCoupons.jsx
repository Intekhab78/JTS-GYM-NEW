import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';

export default function MyCoupons() {
  const { currency } = useSettings();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/coupons/mine');
      setCoupons(data);
    } catch (err) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <header className="mb-12 relative overflow-hidden rounded-[40px] bg-ink p-10 text-white shadow-2xl">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">Rewards & Vouchers</p>
            <h1 className="font-display text-4xl font-black">My Cash Coupons</h1>
            <p className="mt-4 max-w-xl text-sm text-white/60 leading-relaxed font-medium">
              Earn vouchers by participating in deposit promotions. Use them at checkout to save on your next booking!
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <span className="text-[180px] font-black rotate-12 select-none">🎟️</span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-blue border-t-transparent"></div>
          </div>
        ) : coupons.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => (
              <div 
                key={coupon._id} 
                className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6">
                  <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-brand-blue/5 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                    🎟️
                  </div>
                  <div>
                    <p className="text-3xl font-black text-ink">{currency} {coupon.amount}</p>
                    <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Voucher Value</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center mb-6 relative">
                  <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] mb-2">Coupon Code</p>
                  <p className="text-xl font-mono font-black text-brand-blue tracking-[0.1em]">
                    {coupon.code}
                  </p>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(coupon.code);
                        toast.success('Code copied!');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg transition-all"
                  >
                    📋
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-ink/40">
                  <div className="flex items-center gap-2">
                    <span className="opacity-30">⏳</span>
                    <span>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[48px] border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">🎟️</div>
            <h3 className="font-display text-2xl font-black text-ink mb-2">No active coupons</h3>
            <p className="text-ink/40 max-w-xs mx-auto text-sm font-medium">Earn cash vouchers by booking during "Cash Deposit" promotional events.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
