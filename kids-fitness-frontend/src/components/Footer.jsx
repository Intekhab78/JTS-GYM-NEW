import React, { useEffect, useState } from 'react';
import api from '../api/api';

const defaultCompanyInfo = {
  name: 'JTS Booking',
  tagline: 'Building confidence and coordination through joyful movement.',
  address: 'SRTIP Free Zone,Block B - B20-017, Sharjah, UAE',
  email: 'info@jtsmiddleeast.com',
  phone: '+971 522542550',
  hoursMonFri: '9am to 7pm',
  hoursSatSun: '9am to 3pm',
  footerText: 'Family lounge · Free parking'
};

export default function Footer({ className }) {
  const [info, setInfo] = useState(defaultCompanyInfo);

  useEffect(() => {
    // Fetch global settings to get company info
    api.get('/settings/global')
      .then(res => {
        const companySetting = res.data.find(s => s.key === 'company_info');
        if (companySetting && companySetting.value) {
          setInfo({ ...defaultCompanyInfo, ...companySetting.value });
        }
      })
      .catch(() => {
        // Fallback to default if API fails
      });
  }, []);

  return (
    <footer className={`site-footer mt-12 border-t border-white/70 bg-white/80 ${className || ''}`}>
      <div className="page-shell grid gap-6 py-10 md:grid-cols-3">
        <div>
          <h3 className="font-display text-lg">{info.name}</h3>
          <p className="mt-2 text-sm text-ink/70">
            {info.tagline}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/60">Studio</h4>
          <p className="mt-3 text-sm text-ink/70">{info.address}</p>
          <p className="text-sm text-ink/70">{info.email}</p>
          <p className="mt-2 text-sm text-ink/70">{info.phone}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/60">Hours</h4>
          <p className="mt-3 text-sm text-ink/70">Mon - Fri: {info.hoursMonFri}</p>
          <p className="text-sm text-ink/70">Sat - Sun: {info.hoursSatSun}</p>
          <p className="mt-2 text-sm text-ink/70">{info.footerText}</p>
        </div>
      </div>
      <div className="border-t border-ink/5">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-ink/60">
          <span>© {new Date().getFullYear()} {info.name}. All rights reserved.</span>
          <span>Instagram · WhatsApp · FAQ</span>
        </div>
      </div>
    </footer>
  );
}
