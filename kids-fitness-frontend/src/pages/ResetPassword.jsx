import { useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import api from '../api/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'The reset link is invalid or has expired.');
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
            <h1 className="font-display text-4xl font-black text-brand-black">Set New Password</h1>
            <p className="mt-3 text-brand-black/50 font-medium">Please enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-[40px] shadow-2xl shadow-brand-blue/5 border border-brand-blue/10 p-10 overflow-hidden relative">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-black/40 mb-2 px-1">New Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  className="w-full rounded-2xl border border-brand-black/5 bg-slate-50 px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-black/40 mb-2 px-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
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
                {loading ? 'Changing password...' : 'Update Password'}
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-4 text-center animate-fadeIn">
              <p className="text-sm font-bold text-green-600">{message}</p>
              <p className="text-xs text-green-600/60 mt-2">Redirecting you to login...</p>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-4 text-center animate-fadeIn">
              <p className="text-sm font-bold text-red-500">{error}</p>
              <p className="text-xs text-red-500/60 mt-2">
                <NavLink to="/forgot-password" className="font-black underline scale-105 active:scale-95">Request a new link</NavLink>
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
