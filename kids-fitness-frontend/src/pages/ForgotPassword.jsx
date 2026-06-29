import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-black text-brand-black">Forgot Password?</h1>
            <p className="mt-3 text-brand-black/50 font-medium">No worries! Enter your email and we'll send you a link to reset your password.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-[40px] shadow-2xl shadow-brand-blue/5 border border-brand-blue/10 p-10 overflow-hidden relative">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-black/40 mb-2 px-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-brand-black/5 bg-slate-50 px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-brand-blue py-4 text-sm font-black text-white shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-4 text-center animate-fadeIn">
              <p className="text-sm font-bold text-green-600">{message}</p>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-4 text-center animate-fadeIn">
              <p className="text-sm font-bold text-red-500">{error}</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <NavLink to="/login" className="text-sm font-bold text-brand-black/40 hover:text-brand-blue transition-colors">
              Remembered your password? <span className="text-brand-blue">Login here</span>
            </NavLink>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
