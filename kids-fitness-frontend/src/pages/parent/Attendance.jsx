import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';

export default function Attendance() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api
      .get('/attendance/mine')
      .then((res) => setRecords(res.data || []))
      .catch(() => setRecords([]));
  }, []);

  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <h1 className="font-display text-3xl">Attendance</h1>
        <p className="mt-2 text-sm text-ink/70">Track check-ins and attendance history.</p>
        <div className="mt-6 space-y-4">
          {records.map((record) => (
            <div key={record._id} className="rounded-2xl bg-white/80 p-4 shadow-glow">
              <p className="text-sm font-semibold">
                {record.childId?.name} · {record.sessionId?.classId?.title}
              </p>
              <p className="text-xs text-ink/70">
                {new Date(record.checkedInAt).toLocaleString()} · {record.status}
              </p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

