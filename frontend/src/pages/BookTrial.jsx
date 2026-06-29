import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import api from '../api/api.js';
import { getLocationId } from '../utils/location.js';

const initialForm = {
  childName: '',
  childAge: '',
  preferredClass: '',
  preferredTime: '',
  parentName: '',
  parentEmail: '',
  parentPhone: ''
};

export default function BookTrial() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(getLocationId());

  useEffect(() => {
    const handleLocationChange = () => {
      setSelectedLocationId(getLocationId());
      // Reset selections when location changes
      setForm(prev => ({ ...prev, preferredClass: '', preferredTime: '' }));
    };
    window.addEventListener('location-change', handleLocationChange);
    return () => window.removeEventListener('location-change', handleLocationChange);
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      // Fetch upcoming sessions for the selected location
      const today = new Date().toISOString();
      api.get(`/sessions?locationId=${selectedLocationId}&start=${today}`)
        .then((res) => {
          setAvailableSessions(res.data || []);
        })
        .catch((err) => {
          console.error('Error fetching sessions:', err);
        });
    }
  }, [selectedLocationId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // If class changes, reset time selection
      if (name === 'preferredClass') {
        updated.preferredTime = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/trials', {
        ...form,
        childAge: form.childAge ? Number(form.childAge) : undefined,
        locationId: selectedLocationId
      });
      const smsStatus = res.data?.smsSent ? 'SMS sent.' : 'SMS not sent yet.';
      setMessage(`Trial request submitted. ${smsStatus}`);
      setSubmitted(true);
      setForm(initialForm);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique classes from sessions
  const uniqueClasses = Array.from(new Set(availableSessions.map(s => s.classId?.title))).filter(Boolean);

  // Filter sessions by selected class to get available times
  const availableTimes = availableSessions
    .filter(s => s.classId?.title === form.preferredClass && (s.capacity - (s.bookedParticipants || 0)) > 0)
    .map(s => {
      const date = new Date(s.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const time = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${date} at ${time}`;
    });

  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <SectionTitle
          kicker="Book trial"
          title="Reserve a complimentary session"
          subtitle="Pick a class and we will confirm your slot by SMS."
        />

        {submitted ? (
          <div className="mx-auto max-w-xl text-center py-12 px-6 rounded-3xl bg-white/80 shadow-glow animate-in fade-in zoom-in duration-500">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-moss/10 p-4 text-moss">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-ink">Request Received!</h2>
            <p className="mb-8 text-ink/70">
              Thank you for choosing JTS. We have received your request for <strong>{message.split('.')[0].replace('Trial request submitted', '') || 'a trial session'}</strong>.
              Our team will contact you shortly via SMS to confirm your slot.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="/" className="rounded-full bg-coral px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 active:scale-95">
                Back to Home
              </a>
              <button onClick={() => setSubmitted(false)} className="rounded-full border border-ink/10 px-8 py-3 text-sm font-semibold text-ink/70 transition hover:bg-ink/5">
                Book another trial
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <LocationPicker compact />
            </div>
            {error ? <p className="mb-3 text-sm text-coral bg-coral/10 p-3 rounded-xl">{error}</p> : null}
            <form className="grid gap-4 rounded-3xl bg-white/80 p-6 shadow-glow" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-xl border border-orange-200/70 p-3"
                  name="childName"
                  placeholder="Customer / Dependent Name"
                  value={form.childName}
                  onChange={handleChange}
                  required
                />
                <input
                  className="rounded-xl border border-orange-200/70 p-3"
                  name="childAge"
                  type="number"
                  placeholder="Age"
                  value={form.childAge}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  className="rounded-xl border border-orange-200/70 p-3 bg-white"
                  name="preferredClass"
                  value={form.preferredClass}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Class</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-orange-200/70 p-3 bg-white"
                  name="preferredTime"
                  value={form.preferredTime}
                  onChange={handleChange}
                  required
                  disabled={!form.preferredClass}
                >
                  <option value="">{form.preferredClass ? 'Select Time' : 'First pick a class'}</option>
                  {availableTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-xl border border-orange-200/70 p-3"
                  name="parentName"
                  placeholder="Customer name"
                  value={form.parentName}
                  onChange={handleChange}
                  required
                />
                <input
                  className="rounded-xl border border-orange-200/70 p-3"
                  name="parentPhone"
                  placeholder="Customer phone"
                  value={form.parentPhone}
                  onChange={handleChange}
                />
              </div>
              <input
                className="rounded-xl border border-orange-200/70 p-3"
                name="parentEmail"
                type="email"
                placeholder="Customer email"
                value={form.parentEmail}
                onChange={handleChange}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className={`rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Booking...
                  </>
                ) : 'Book trial'}
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
