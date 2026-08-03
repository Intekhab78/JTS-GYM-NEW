import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useSettings } from '../../context/SettingsContext.jsx';
import api from '../../api/api.js';
import toast from 'react-hot-toast';

export default function PayPalCheckout({ totalAmount, onSubmit, onCancel, publicKey }) {
  const { currency } = useSettings();
  const [error, setError] = useState('');

  if (!publicKey) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center">
        ⚠️ PayPal Client ID is missing.
        <button onClick={onCancel} className="block w-full mt-4 text-indigo-600 underline">Go Back</button>
      </div>
    );
  }

  const initialOptions = {
    "client-id": publicKey,
    currency: currency || "USD",
    intent: "capture",
  };

  const createOrder = async () => {
    try {
      const orderRes = await api.post('/payments/gateway/order', {
        amount: totalAmount,
        currency: currency || 'USD'
      });
      return orderRes.data.order.orderId; // Returning the PayPal order ID to the button
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Payment initiation failed';
      setError(errMsg);
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  const onApprove = async (data, actions) => {
    try {
      // In a real app, you would verify the capture via your backend here
      // but the frontend PayPal SDK handles the redirect/success state
      toast.success('Payment successful!');
      await onSubmit({
        paypal_order_id: data.orderID,
        paypal_payer_id: data.payerID,
        paypal_payment_source: data.paymentSource
      });
    } catch (err) {
      toast.error('Failed to complete payment.');
    }
  };

  const onError = (err) => {
    setError('PayPal button failed to load or process payment.');
    toast.error('PayPal payment failed.');
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-shake">
          ⚠️ {error}
        </div>
      )}
      
      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <PayPalScriptProvider options={initialOptions}>
          <PayPalButtons 
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onError}
            onCancel={onCancel}
            style={{ layout: "vertical", shape: "rect", color: "blue" }}
          />
        </PayPalScriptProvider>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-bold text-ink/40 hover:text-ink transition-colors py-2 text-center"
      >
        Cancel and go back
      </button>
    </div>
  );
}
