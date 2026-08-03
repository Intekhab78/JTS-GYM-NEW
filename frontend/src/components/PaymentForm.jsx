import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import api from '../api/api.js';
import { getUser } from '../utils/auth.js';
import toast from 'react-hot-toast';
import StripeCheckout from './payment/StripeCheckout.jsx';
import PayPalCheckout from './payment/PayPalCheckout.jsx';

// We extract the original Razorpay logic into its own component for cleanliness
const RazorpayCheckout = ({ totalAmount, onSubmit, onCancel, prefillName = '', prefillEmail = '', prefillPhone = '', publicKey }) => {
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
      // 2. Create order on backend
      const orderRes = await api.post('/payments/gateway/order', {
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
        key: publicKey,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: 'JTS Kids Gym',
        description: 'Kids Fitness Booking & Membership Payment',
        image: 'https://gymapi.jtsonline.shop/uploads/logo.png', // Logo path
        order_id: order.orderId,
        handler: async function (response) {
          setLoading(true);
          try {
            await onSubmit({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
          } catch (err) {
            setLoading(false);
            const errMsg = err?.response?.data?.message || err.message || 'Verification failed';
            setError(errMsg);
            toast.error(errMsg);
          }
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
    <div className="flex flex-col gap-3 w-full">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold mb-4 border border-red-100 animate-shake">
          ⚠️ {error}
        </div>
      )}
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
        className="text-sm font-bold text-ink/40 hover:text-ink transition-colors py-2 text-center"
      >
        Go back and choose another method
      </button>
    </div>
  );
};

export default function PaymentForm(props) {
  const { currency } = useSettings();
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRes = await api.get('/payments/gateway/config');
        setGatewayConfig({
          provider: configRes.data.provider || 'razorpay',
          keyId: configRes.data.keyId
        });
      } catch (err) {
        setConfigError('Failed to load payment gateway configuration.');
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const renderGatewayCheckout = () => {
    if (loadingConfig) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
        </div>
      );
    }

    if (configError) {
      return (
        <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center">
          ⚠️ {configError}
          <button onClick={props.onCancel} className="block w-full mt-4 text-brand-blue underline">Go Back</button>
        </div>
      );
    }

    const { provider, keyId } = gatewayConfig;

    switch (provider) {
      case 'stripe':
        return <StripeCheckout {...props} publicKey={keyId} />;
      case 'paypal':
        return <PayPalCheckout {...props} publicKey={keyId} />;
      case 'razorpay':
        return <RazorpayCheckout {...props} publicKey={keyId} />;
      default:
        return (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center">
            ⚠️ Provider {provider} is not supported.
            <button onClick={props.onCancel} className="block w-full mt-4 text-brand-blue underline">Go Back</button>
          </div>
        );
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
            <span className="text-xs font-black text-brand-blue uppercase bg-brand-blue/10 px-3 py-1.5 rounded-full">
              {gatewayConfig ? `${gatewayConfig.provider} Secure` : 'Loading...'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-bold text-ink/40 uppercase tracking-wider">Total Amount</span>
            <span className="text-2xl font-black text-ink">{currency} {props.totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {renderGatewayCheckout()}

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
