import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import api from '../api/api.js';
import { getRoleSlug } from '../utils/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  useEffect(() => {
    if (user) {
      const isStaff = user.role === 'admin' || user.role === 'superadmin' || (user.permissions && user.permissions.length > 0);
      if (isStaff || user.role === 'trainer') {
        navigate(`/${getRoleSlug(user.role)}`);
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data);
      if (redirect) {
        navigate(redirect);
      } else {
        const isStaff = res.data.role === 'admin' || res.data.role === 'superadmin' || (res.data.permissions && res.data.permissions.length > 0);
        if (isStaff || res.data.role === 'trainer') {
          navigate(`/${getRoleSlug(res.data.role)}`);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-3xl bg-white/80 p-6 shadow-glow">
          <h1 className="font-display text-3xl">Member login</h1>
          <p className="mt-2 text-sm text-ink/70">Access your child schedule and memberships.</p>
          {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <input
              className="rounded-xl border border-orange-200/70 p-3"
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              className="rounded-xl border border-orange-200/70 p-3"
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <div className="text-right -mt-2">
              <Link to="/forgot-password" size="sm" className="text-xs font-bold text-coral/80 hover:text-coral transition-colors">
                Forgot Password?
              </Link>
            </div>
            <button
              className="rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
          <p className="mt-4 text-sm text-ink/70">
            New here? <Link className="text-coral font-bold" to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"}>Create an account</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
