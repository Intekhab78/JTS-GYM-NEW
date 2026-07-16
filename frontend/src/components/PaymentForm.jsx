import { useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import api from '../api/api.js';
import { getUser } from '../utils/auth.js';
import toast from 'react-hot-toast';

export default function PaymentForm({ totalAmount, onSubmit, onCancel, prefillName = '', prefillEmail = '', prefillPhone = '' }) {
  const { currency } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!window.Razorpay) {
      toast.error('Razorpay SDK is not loaded. Please check your internet connection.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Fetch Razorpay key ID from backend
      const keyRes = await api.get('/payments/razorpay/key');
      const keyId = keyRes.data.keyId;

      // 2. Create Razorpay order on backend
      const orderRes = await api.post('/payments/razorpay/order', {
        amount: totalAmount,
        currency: currency || 'INR'
      });
      const order = orderRes.data.order;

      const user = getUser();
      const name = prefillName || user?.name || '';
      const email = prefillEmail || user?.email || '';
      const phone = prefillPhone || user?.phone || '';

      // 3. Configure Razorpay checkout options
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'JTS Kids Gym',
        description: 'Kids Fitness Booking & Membership Payment',
        image: 'https://gymapi.jtsonline.shop/uploads/logo.png', // Logo path
        order_id: order.id,
        handler: function (response) {
          // On payment success: verify on backend
          onSubmit({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        prefill: {
          name: name,
          email: email,
          contact: phone
        },
        notes: {
          website_source: 'JTS Kids Gym',
          address: 'JTS Gym Center'
        },
        theme: {
          color: '#1E40AF' // Deep blue theme to match UI
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.error('Payment cancelled by user');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setLoading(false);
        setError(response.error.description || 'Payment failed');
        toast.error(response.error.description || 'Payment failed');
      });
      rzp.open();

    } catch (err) {
      setLoading(false);
      const errMsg = err?.response?.data?.message || err.message || 'Payment initiation failed';
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  return (
    <div className="animate-rise max-w-md mx-auto">
      <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[36px] p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
        
        <div className="mb-8 text-center relative z-10">
          <div className="inline-block p-4 rounded-3xl bg-brand-blue/10 text-brand-blue mb-4 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-black text-ink">Secure Gateway</h2>
          <p className="text-ink/50 mt-2 font-medium">Verify your summary & proceed with online checkout.</p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
            <span className="text-xs font-bold text-ink/40 uppercase tracking-wider">Transaction Type</span>
            <span className="text-xs font-black text-brand-blue uppercase bg-brand-blue/10 px-3 py-1.5 rounded-full">Razorpay Secure</span>
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-bold text-ink/40 uppercase tracking-wider">Total Amount</span>
            <span className="text-2xl font-black text-ink">{currency} {totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100 animate-shake">
            ⚠️ {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-brand-blue text-white py-5 rounded-full font-black shadow-glow hover:shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-base"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Initializing...
              </>
            ) : (
              <>
                <span>Pay securely with Razorpay</span>
                <span className="text-lg">→</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-sm font-bold text-ink/40 hover:text-ink transition-colors py-2"
          >
            Go back and choose another method
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 border-t border-slate-100 pt-6">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">PCI-DSS Compliant Gateway</span>
        </div>
      </div>
    </div>
  );
}
