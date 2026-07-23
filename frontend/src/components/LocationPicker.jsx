import { getImageUrl  } from '../api/api.js';
import { useEffect, useState } from 'react';
import api from '../api/api.js';
import { getSelectedLocation, setSelectedLocation } from '../utils/location.js';

export default function LocationPicker({ compact = false, allowAll = false }) {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(getSelectedLocation());

  useEffect(() => {
    api
      .get('/locations?activeClasses=true')
      .then((res) => {
        const list = res.data || [];
        const options = allowAll ? [{ _id: 'all', slug: 'all', name: 'All locations' }, ...list] : list;
        setLocations(options);

        // Smarter default selection
        const saved = getSelectedLocation();
        if (!saved && options.length) {
          const user = JSON.parse(localStorage.getItem('kfb_user') || 'null');
          const userLoc = user?.locationId ? options.find(l => l._id === user.locationId) : null;
          const defaultLoc = userLoc || options[0];
          setSelected(defaultLoc);
          setSelectedLocation(defaultLoc);
        }
      })
      .catch(() => { });
  }, [allowAll, selected]);

  useEffect(() => {
    const handleChange = () => setSelected(getSelectedLocation());
    window.addEventListener('location-change', handleChange);
    return () => window.removeEventListener('location-change', handleChange);
  }, []);

  const handleSelect = (loc) => {
    setSelected(loc);
    setSelectedLocation(loc);
  };

  if (!locations.length) return null;

  if (compact) {
    return (
      <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar pb-1 sm:pb-0 w-full">
        {locations.map((loc) => (
          <button
            key={loc._id}
            type="button"
            onClick={() => handleSelect(loc)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition ${selected?._id === loc._id ? 'border-coral bg-coral/10 text-coral shadow-sm' : 'border-ink/10 text-ink/70 bg-white sm:bg-transparent'
              }`}
          >
            {loc.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {locations.map((loc) => (
        <button
          key={loc._id}
          type="button"
          onClick={() => handleSelect(loc)}
          className={`group overflow-hidden rounded-3xl border text-left transition hover:-translate-y-1 ${selected?._id === loc._id ? 'border-coral shadow-glow' : 'border-white/70 bg-white/70'
            }`}
        >
          <div className="h-36 w-full bg-gradient-to-r from-sky-200 via-blue-200 to-emerald-100">
            {loc.imageUrl ? (
              <img
                src={getImageUrl(loc.imageUrl)}
                alt={loc.name}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-ink">{loc.name}</p>
            <p className="text-xs text-ink/60">{loc.city || 'Location'} {loc.isOnline ? '· Online' : ''}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
