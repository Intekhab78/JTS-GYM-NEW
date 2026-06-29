import { useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

export default function PaymentForm({ totalAmount, onSubmit, onCancel }) {
  const { currency } = useSettings();
  const [form, setForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);

  const formatCardNumber = (value) => {
    return value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  };

  const getCardBrand = (cardNumber) => {
    const raw = cardNumber.replace(/\D/g, '');
    if (raw.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(raw)) return 'mastercard';
    if (/^3[47]/.test(raw)) return 'amex';
    return 'other';
  };

  const formatExpiry = (value) => {
    return value.replace(/\W/gi, '').replace(/(.{2})/g, '$1/').trim().slice(0, 5);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cardNumber') value = formatCardNumber(value);
    if (name === 'expiry') value = formatExpiry(value);
    if (name === 'cvv') value = value.replace(/\D/g, '').slice(0, 4);
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock processing delay
    setTimeout(() => {
      setLoading(false);
      const cardBrand = getCardBrand(form.cardNumber);
      onSubmit({ ...form, cardBrand });
    }, 2000);
  };

  return (
    <div className="animate-rise">
      <div className="mb-8 text-center">
        <div className="inline-block p-4 rounded-3xl bg-brand-blue/5 text-brand-blue mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="font-display text-3xl font-black text-ink">Secure Payment</h2>
        <p className="text-ink/60 mt-1">Total to pay: <span className="text-brand-blue font-black">{currency} {totalAmount}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Cardholder Name</label>
          <input
            required
            name="name"
            placeholder="John Doe"
            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Card Number</label>
          <div className="relative">
            <input
              required
              name="cardNumber"
              placeholder="0000 0000 0000 0000"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
              value={form.cardNumber}
              onChange={handleChange}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
               {getCardBrand(form.cardNumber) === 'visa' && (
                 <div className="w-8 h-5 bg-blue-100 rounded-sm flex items-center justify-center text-[8px] font-black text-blue-800">VISA</div>
               )}
               {getCardBrand(form.cardNumber) === 'mastercard' && (
                 <div className="w-8 h-5 bg-orange-100 rounded-sm flex items-center justify-center text-[8px] font-black text-orange-800">MC</div>
               )}
               {getCardBrand(form.cardNumber) !== 'visa' && getCardBrand(form.cardNumber) !== 'mastercard' && (
                 <>
                   <div className="w-8 h-5 bg-slate-200 rounded-sm opacity-50"></div>
                   <div className="w-8 h-5 bg-slate-200 rounded-sm opacity-50"></div>
                 </>
               )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">Expiry</label>
            <input
              required
              name="expiry"
              placeholder="MM/YY"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
              value={form.expiry}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 ml-4">CVV</label>
            <input
              required
              name="cvv"
              type="password"
              placeholder="***"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
              value={form.cvv}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="pt-6 flex flex-col gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-blue text-white py-4 rounded-full font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : `Pay ${currency} ${totalAmount}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-bold text-ink/40 hover:text-ink transition-colors py-2"
          >
            Cancel and go back
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
           <svg className="w-3 h-3 text-moss" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
           </svg>
           <span className="text-[10px] font-bold text-ink/30 uppercase tracking-widest">SSL Encrypted Secure Payment</span>
        </div>
      </form>
    </div>
  );
}
