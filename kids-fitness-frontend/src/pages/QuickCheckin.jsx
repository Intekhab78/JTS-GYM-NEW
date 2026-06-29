import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import api from '../api/api.js';

export default function QuickCheckin() {
  const [token, setToken] = useState('');
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    api
      .get('/children/mine')
      .then((res) => {
        setChildren(res.data || []);
        if (res.data?.length) {
          setChildId(res.data[0]._id);
        }
      })
      .catch(() => {});

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    setError('');
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader');
    }

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          setToken(decodedText);
          setScannerActive(false);
          scannerRef.current.stop().catch(() => {});
        }
      );
      setScannerActive(true);
    } catch (err) {
      setError('Unable to access camera. Please allow camera permission.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }
    setScannerActive(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.post('/attendance/qr-checkin', { token, childId });
      setMessage('Checked in successfully.');
      setToken('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to check in.');
    }
  };

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <SectionTitle
          kicker="Quick check-in"
          title="Scan and register in seconds"
          subtitle="Scan the QR code or paste the token to check in."
        />
        {message ? <p className="mb-3 text-sm text-moss">{message}</p> : null}
        {error ? <p className="mb-3 text-sm text-coral">{error}</p> : null}

        <div className="mb-4 rounded-3xl bg-white/80 p-4 shadow-glow">
          <div id="qr-reader" className="mx-auto max-w-sm" />
          <div className="mt-4 flex gap-3">
            {!scannerActive ? (
              <button
                type="button"
                className="rounded-full bg-coral px-4 py-2 text-xs font-semibold text-white"
                onClick={startScanner}
              >
                Start camera
              </button>
            ) : (
              <button
                type="button"
                className="rounded-full border border-ink/10 px-4 py-2 text-xs font-semibold text-ink"
                onClick={stopScanner}
              >
                Stop camera
              </button>
            )}
          </div>
        </div>

        <form className="grid gap-4 rounded-3xl bg-white/80 p-6 shadow-glow" onSubmit={handleSubmit}>
          <input
            className="rounded-xl border border-orange-200/70 p-3"
            placeholder="QR token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          <select
            className="rounded-xl border border-orange-200/70 p-3"
            value={childId}
            onChange={(event) => setChildId(event.target.value)}
            required
          >
            <option value="">Select child</option>
            {children.map((child) => (
              <option key={child._id} value={child._id}>
                {child.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white">
            Check in
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
