import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api.js';
import toast from 'react-hot-toast';

export default function VoucherPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/coupons')
      .then(res => {
        const found = res.data.find(c => c._id === id);
        if (found) {
          setCoupon(found);
          // Auto print after a small delay to ensure rendering
          setTimeout(() => {
            window.print();
          }, 1000);
        } else {
          toast.error('Voucher not found');
        }
        setLoading(false);
      })
      .catch(err => {
        toast.error('Failed to load voucher');
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-display">
       <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-black text-ink/20 uppercase tracking-widest">Preparing Voucher...</p>
       </div>
    </div>
  );

  if (!coupon) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-display">
       <div className="text-center">
          <p className="text-xl font-bold text-ink">Voucher not found</p>
          <button onClick={() => window.close()} className="mt-4 text-brand-blue font-bold uppercase text-[10px] tracking-widest">Close Window</button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-12 print:p-0 font-display">
      <style>{`
        @media print {
          @page { margin: 0; }
          body { margin: 1.6cm; }
          .no-print { display: none; }
        }
      `}</style>
      
      <div className="no-print mb-8 flex justify-center">
         <button 
           onClick={() => window.print()}
           className="bg-brand-blue text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
         >
           🖨️ Click to Print Voucher
         </button>
      </div>

      <div className="max-w-[800px] mx-auto">
        <div className="relative overflow-hidden bg-brand-blue rounded-[3rem] p-16 text-white shadow-2xl">
          {/* Decorative Accents */}
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-teal-400/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-16">
              <div>
                <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Kids Fitness Booking</p>
                <h1 className="text-5xl font-black tracking-tighter">PREMIUM GIFT</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Voucher Number</p>
                <p className="text-xl font-black font-mono tracking-wider">#{coupon._id.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-2 gap-12 items-end">
              <div>
                <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-4">Value</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-8xl font-black leading-tight tracking-tighter">AED {coupon.amount}</span>
                </div>
                {coupon.description && (
                  <p className="mt-8 text-sm font-medium text-white/60 italic leading-relaxed">
                    "{coupon.description}"
                  </p>
                )}
              </div>

              <div className="text-right">
                <div className="bg-white p-8 rounded-[2.5rem] inline-block mb-4 shadow-xl border border-white/10">
                  <p className="text-[10px] font-black text-brand-blue/30 uppercase tracking-[0.2em] mb-4 text-center">Redeem using this code</p>
                  <p className="text-4xl font-black text-brand-blue tracking-widest font-mono border-2 border-brand-blue/10 rounded-2xl px-8 py-4">
                    {coupon.code}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer / Terms */}
            <div className="mt-20 pt-12 border-t border-white/10 grid grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Issue Date</p>
                    <p className="text-xs font-black">{new Date(coupon.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div>
                    <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Expires On</p>
                    <p className="text-xs font-black text-rose-50">{new Date(coupon.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-relaxed text-right">
                Valid for all class & membership bookings.<br />
                Non-transferable and cannot be exchanged for cash.
              </div>
            </div>
          </div>

          {/* Notch Cuts (Ticket Look) */}
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full"></div>
          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full"></div>
        </div>

        <p className="mt-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.5em] print:hidden">
          Kids Fitness Official Voucher · System Generated
        </p>
      </div>
    </div>
  );
}
