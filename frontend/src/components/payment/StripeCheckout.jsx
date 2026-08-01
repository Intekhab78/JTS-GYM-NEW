import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useSettings } from '../../context/SettingsContext.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';

// The form component that actually submits to Stripe
const CheckoutForm = ({ orderId, totalAmount, onCancel, onSuccess, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { currency } = useSettings();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setLoading(false);
      return;
    }

    // Since we handle the result on the same page, we use confirmPayment with redirect: 'if_required'
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // This won't be used if redirect is 'if_required' and it succeeds
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message);
      toast.error(confirmError.message);
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success('Payment successful!');
      onSuccess({
        stripe_payment_id: paymentIntent.id,
        stripe_order_id: orderId,
        stripe_signature: 'stripe_handled'
      });
    } else {
      setError('Unexpected state');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-shake">
          ⚠️ {error}
        </div>
      )}
      
      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-3 text-sm tracking-wide uppercase"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Processing...
          </>
        ) : (
          `Pay ${currency} ${totalAmount.toLocaleString()}`
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="text-sm font-bold text-ink/40 hover:text-ink transition-colors py-2 text-center"
      >
        Cancel and go back
      </button>
    </form>
  );
};

// The wrapper component that initializes Stripe and creates the order
export default function StripeCheckout({ totalAmount, onSubmit, onCancel, prefillName = '', prefillEmail = '', prefillPhone = '', publicKey }) {
  const { currency } = useSettings();
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (publicKey) {
      setStripePromise(loadStripe(publicKey));
    }
  }, [publicKey]);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const orderRes = await api.post('/payments/gateway/order', {
          amount: totalAmount,
          currency: currency || 'USD'
        });
        const order = orderRes.data.order;
        setOrderId(order.orderId);
        setClientSecret(order.clientSecret);
      } catch (err) {
        const errMsg = err?.response?.data?.message || err.message || 'Payment initiation failed';
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    };

    if (totalAmount > 0) {
      initializePayment();
    }
  }, [totalAmount, currency]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-500">Initializing secure payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center">
        ⚠️ {error}
        <button onClick={onCancel} className="block w-full mt-4 text-indigo-600 underline">Go Back</button>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#4f46e5', // indigo-600
    },
  };

  return (
    <div className="w-full">
      {clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <CheckoutForm 
            orderId={orderId}
            totalAmount={totalAmount} 
            onCancel={onCancel} 
            onSuccess={onSubmit}
            clientSecret={clientSecret}
          />
        </Elements>
      )}
    </div>
  );
}
