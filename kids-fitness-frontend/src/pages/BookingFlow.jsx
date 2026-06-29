import { getImageUrl } from '../api/api.js';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../api/api.js';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { getUser } from '../utils/auth.js';
import PaymentForm from '../components/PaymentForm.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function BookingFlow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currency } = useSettings();
  const classIdFromUrl = searchParams.get('classId');
  const locationIdFromUrl = searchParams.get('locationId');
  const sessionIdFromUrl = searchParams.get('sessionId');
  const isRestoringParam = searchParams.get('restoring') === 'true';

  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [applicablePromos, setApplicablePromos] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponAmount, setCouponAmount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [activeTax, setActiveTax] = useState(null);

  // Reset selected sessions when class, location or trainer changes
  useEffect(() => {
    if (!isRestoring) {
      setSelectedSessions([]);
    }
  }, [selectedClass?._id, selectedLocation, selectedTrainer]);
  const [participants, setParticipants] = useState(() => {
    const user = getUser();
    if (user) {
      return [{ name: user.name || '', age: '', gender: user.gender === 'female' ? 'female' : 'male', relation: 'Self' }];
    }
    return [{ name: '', age: '', gender: 'male', relation: '' }];
  });
  const [paymentType, setPaymentType] = useState(''); // 'online' or 'center'
  const [guestDetails, setGuestDetails] = useState({ name: '', email: '', phone: '' });
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState('');
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [createdBookings, setCreatedBookings] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [myChildren, setMyChildren] = useState([]);
  const [isCorporateMode, setIsCorporateMode] = useState(false);
  const [corporateName, setCorporateName] = useState('');
  const [globalSettings, setGlobalSettings] = useState({});

  const calculateDiscount = (promo, price) => {
    if (!promo || !price) return 0;
    let disc = 0;

    // Helper: calc based on discountType
    const calcByType = (discountType, discountValue) => {
      if (discountType === 'percentage') {
        return price * (discountValue / 100);
      }
      return Math.min(price, discountValue); // flat AED
    };

    if (promo.promoType === 'percentage') {
      // 'percentage' type always uses percentage
      disc = price * (promo.discountValue / 100);
    } else if (promo.promoType === 'cash') {
      // 'cash' type respects discountType: can be % or flat AED
      disc = calcByType(promo.discountType || 'flat', promo.discountValue);
    } else if (promo.promoType === 'flash') {
      disc = calcByType(promo.discountType || 'percentage', promo.discountValue);
    } else if (promo.promoType === 'tiered') {
      const tier = promo.discountTiers
        ?.filter(t => price >= t.minAmount)
        .sort((a, b) => b.minAmount - a.minAmount)[0];
      if (tier) {
        disc = tier.type === 'percentage' ? (price * (tier.value / 100)) : Math.min(price, tier.value);
      }
    } else if (promo.promoType === 'lifestyle' || promo.promoType === 'bulk') {
      disc = calcByType(promo.discountType || 'percentage', promo.discountValue);
    } else if (promo.promoType === 'bogo') {
      const units = (participants?.length || 1) * (selectedSessions?.length || 1);
      if (units < 2) return 0;
      const numFree = Math.floor(units / 2);
      disc = numFree * (selectedClass?.price || 0);
    }
    return Math.round(disc * 100) / 100;
  };

  const totalPrice = useMemo(() => {
    return (selectedClass?.price || 0) * participants.length * selectedSessions.length;
  }, [selectedClass, participants.length, selectedSessions.length]);

  useEffect(() => {
    if (selectedPromo) {
      setDiscountAmount(calculateDiscount(selectedPromo, totalPrice));
    } else {
      setDiscountAmount(0);
    }
  }, [selectedPromo, totalPrice]);

  // Fetch promos when summary step is reached
  useEffect(() => {
    if (step === 5 && selectedClass && selectedLocation) {
      const itemId = selectedClass._id;
      const itemType = 'class';
      api.get(`/promotions/active?locationId=${selectedLocation}&itemId=${itemId}&itemType=${itemType}`)
        .then(res => setApplicablePromos(res.data || []))
        .catch(err => console.error("Error fetching promos:", err));
    } else if (step < 5) {
      setApplicablePromos([]);
      setSelectedPromo(null);
    }
  }, [step, selectedClass?._id, selectedLocation]);

  // Fetch tax rule for location/class
  useEffect(() => {
    if (selectedLocation) {
      const fetchTax = async () => {
        try {
          if (selectedClass?.taxId) {
            const res = await api.get(`/taxes/${selectedClass.taxId}`);
            setActiveTax(res.data.data);
          } else {
            const res = await api.get(`/taxes?locationId=${selectedLocation}&status=active`);
            // Pick the first active tax for this location
            setActiveTax(res.data.data?.[0] || null);
          }
        } catch (err) {
          console.error("Error fetching tax:", err);
          setActiveTax(null);
        }
      };
      fetchTax();
    }
  }, [selectedLocation, selectedClass?._id]);

  const taxAmount = useMemo(() => {
    if (!activeTax || !totalPrice) return 0;

    // TAX CALCULATION AFTER DISCOUNTS (Net Price)
    const netBasePrice = Math.max(0, totalPrice - discountAmount - couponAmount);

    let taxAmt = 0;
    if (activeTax.type === 'percentage') {
      if (activeTax.calculationMethod === 'inclusive') {
        // Extraction from net total
        taxAmt = netBasePrice - (netBasePrice / (1 + (activeTax.value / 100)));
      } else {
        // Addition to net base
        taxAmt = netBasePrice * (activeTax.value / 100);
      }
    } else {
      taxAmt = activeTax.value;
    }
    return Math.round(taxAmt * 100) / 100;
  }, [activeTax, totalPrice, discountAmount, couponAmount]);

  // Persistence: Save to sessionStorage
  useEffect(() => {
    if (step > 1 && step < 8 && !isRestoring) {
      const bookingState = {
        step,
        selectedClass,
        selectedLocation,
        selectedTrainer,
        selectedSessions,
        participants,
        guestDetails,
        showGuestForm
      };
      sessionStorage.setItem('booking_pending_state', JSON.stringify(bookingState));

      // Auto-add restoring=true to URL to ensure progress is kept on refresh
      if (!isRestoringParam) {
        const params = new URLSearchParams(window.location.search);
        params.set('restoring', 'true');
        setSearchParams(params, { replace: true });
      }
    }
  }, [step, selectedClass, selectedLocation, selectedTrainer, selectedSessions, participants, isRestoring]);

  // Persistence: If logged in during step 6, move to 7
  useEffect(() => {
    if (step === 6 && getUser()) {
      setStep(7);
    }
  }, [step]);

  // Persistence: Restore from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('booking_pending_state');

    if (!isRestoringParam) {
      // Fresh entry - clear any old state to avoid jump-to-payment
      sessionStorage.removeItem('booking_pending_state');
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore if we are not already in a fresh flow from URL with a DIFFERENT class
        if (!classIdFromUrl || classIdFromUrl === parsed.selectedClass?._id) {
          setIsRestoring(true);
          setStep(parsed.step);
          setSelectedClass(parsed.selectedClass);
          setSelectedLocation(parsed.selectedLocation);
          setSelectedTrainer(parsed.selectedTrainer);
          setSelectedSessions(parsed.selectedSessions);
          setParticipants(parsed.participants);
          if (parsed.guestDetails) setGuestDetails(parsed.guestDetails);
          if (parsed.showGuestForm !== undefined) setShowGuestForm(parsed.showGuestForm);
          setTimeout(() => setIsRestoring(false), 100);
        }
      } catch (e) {
        console.error("Failed to restore booking state", e);
      }
    }
  }, [isRestoringParam]);

  // Step 1: Fetch Classes
  useEffect(() => {
    if (step > 1 && !selectedClass && !loadingClasses && !isRestoring && !sessionIdFromUrl) {
      setStep(1);
    }
  }, [step, selectedClass, loadingClasses, isRestoring, sessionIdFromUrl]);

  useEffect(() => {
    setLoadingClasses(true);

    // Fetch global settings
    api.get('/settings/global').then(res => {
      const settingsMap = {};
      res.data.forEach(s => { settingsMap[s.key] = s.value; });
      setGlobalSettings(settingsMap);
    }).catch(() => { });

    const params = {
      locationId: locationIdFromUrl || undefined
    };
    api.get('/classes', { params })
      .then(res => {
        setClasses(res.data);
        if (classIdFromUrl) {
          const found = res.data.find(c => c._id === classIdFromUrl);
          if (found) {
            setSelectedClass(found);
            // If we have a classId from URL, we should at least be on Step 2
            // BUT only if we aren't already on a further step (like 4 from sessionId)
            setStep(prev => (prev === 1 && !isRestoringParam ? 2 : prev));

            // Auto-select location from URL or Class data
            if (!selectedLocation) {
              if (locationIdFromUrl) {
                setSelectedLocation(locationIdFromUrl);
              } else if (found.locationId) {
                setSelectedLocation(found.locationId._id || found.locationId);
              }
            }
          }
        }
        setLoadingClasses(false);
      })
      .catch(() => setLoadingClasses(false));
  }, [classIdFromUrl]);

  // Step 1.1: Fetch specific session if sessionId is in URL
  useEffect(() => {
    if (sessionIdFromUrl && !isRestoringParam) {
      setLoading(true);
      api.get(`/sessions/${sessionIdFromUrl}`)
        .then(res => {
          const session = res.data;
          if (session) {
            setSelectedTrainer(session.trainerId?._id || session.trainerId);
            setSelectedSessions([session]);
            setStep(4);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [sessionIdFromUrl]);

  // Fetch Locations (Filtered by Class if selected)
  useEffect(() => {
    let url = '/locations?activeClasses=true';
    if (selectedClass) {
      url += `&classId=${selectedClass._id}`;
    }
    api.get(url)
      .then(res => {
        const data = res.data || [];
        setLocations(data);

        // If restoring a state, don't reset
        if (isRestoring) return;

        // If current selected location is not in the new filtered list, reset it
        if (selectedLocation && !data.find(l => l._id === selectedLocation)) {
          setSelectedLocation('');
        }
      })
      .catch(() => { });
  }, [selectedClass?._id, isRestoring]);

  // Fetch My Children for Step 4
  useEffect(() => {
    if (step === 4 && getUser()) {
      api.get('/children/mine')
        .then(res => setMyChildren(res.data || []))
        .catch(() => { });
    }
  }, [step]);

  // Step 3: Fetch Trainers for selected class and location
  useEffect(() => {
    if (selectedClass && selectedLocation) {
      const classTrainers = selectedClass.availableTrainers || [];
      // Filter trainers by location
      const filtered = classTrainers.filter(t => {
        const tLocationIds = t.locationIds || [];
        // Check if current selectedLocation is in trainer's locations
        return tLocationIds.some(loc => (loc._id || loc) === selectedLocation);
      });
      setTrainers(filtered);
    }
  }, [selectedClass, selectedLocation]);

  // Step 2.1: Fetch Sessions when trainer is selected
  useEffect(() => {
    if (selectedClass && selectedTrainer && selectedLocation) {
      setLoading(true);
      api.get(`/sessions?classId=${selectedClass._id}&trainerId=${selectedTrainer}&locationId=${selectedLocation}&start=${new Date().toISOString()}`)
        .then(res => {
          setSessions(res.data);

          // Auto-select first date group if available
          const groups = Array.from(new Set(res.data.map(s =>
            new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
          )));
          if (groups.length > 0) setSelectedDateFilter(groups[0]);

          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedClass, selectedTrainer]);

  // Group sessions by date string
  const sessionGroups = useMemo(() => {
    const groups = {};
    sessions.forEach(s => {
      const dateKey = new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(s);
    });
    return groups;
  }, [sessions]);

  const dateKeys = Object.keys(sessionGroups);

  const handleNextStep = () => {
    if (step === 2 && !selectedLocation) {
      setError('Please select a branch location');
      return;
    }
    if (step === 3 && selectedSessions.length === 0) {
      setError('Please select at least one time slot');
      return;
    }

    // Auth validation if they are on Step 4 (Guest form)
    if (step === 4 && showGuestForm) {
      if (!guestDetails.name || !guestDetails.email || !guestDetails.phone) {
        setError('Please fill in all guest details');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(guestDetails.email)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    if (step === 5) {
      // Basic validation
      for (const p of participants) {
        if (!p.name || !p.age) {
          setError('Please fill in all participant details');
          return;
        }
        // New Structured Validation
        const pAge = parseInt(p.age);

        // Age validation
        if (selectedClass.minAge !== undefined && selectedClass.minAge !== null && pAge < selectedClass.minAge) {
          setError(`${p.name} is too young for this class. Minimum age: ${selectedClass.minAge}`);
          return;
        }
        if (selectedClass.maxAge !== undefined && selectedClass.maxAge !== null && pAge > selectedClass.maxAge) {
          setError(`${p.name} is too old for this class. Maximum age: ${selectedClass.maxAge}`);
          return;
        }

        // Gender validation
        if (selectedClass.genderRestriction && selectedClass.genderRestriction !== 'any') {
          if (p.gender.toLowerCase() !== selectedClass.genderRestriction.toLowerCase()) {
            setError(`${p.name}'s gender does not match the class restriction: ${selectedClass.genderRestriction}`);
            return;
          }
        }
      }
      // Capacity validation for ALL selected sessions
      for (const sess of selectedSessions) {
        const remaining = sess.capacity - (sess.bookedParticipants || 0);
        if (participants.length > remaining) {
          const dateStr = new Date(sess.startTime).toLocaleDateString();
          setError(`Only ${remaining} spots left for ${dateStr}. You are trying to book ${participants.length}.`);
          return;
        }
      }
    }

    setError('');

    // Skip Step 4 (Auth) if already logged in
    if (step === 3 && getUser()) {
      setStep(5);
    } else {
      setStep(step + 1);
    }
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    try {
      // Calculate per-session proportion of the total discount
      const totalSessions = selectedSessions.length;
      const perSessionDiscount = totalSessions > 0 ? (discountAmount / totalSessions) : 0;

      if (isCorporateMode) {
        // Consolidated Group Booking for Corporate
        const payload = {
          participants,
          sessionIds: selectedSessions.map(s => s._id),
          classId: selectedClass._id,
          locationId: selectedLocation,
          corporateName: corporateName || getUser()?.companyName || 'Corporate Booking',
          paymentMethod: paymentType || 'center',
          promotionId: selectedPromo?._id,
          discountAmount: discountAmount,
          couponCode,
          couponAmount: couponAmount
        };
        const res = await api.post('/bookings/group', payload);
        sessionStorage.removeItem('booking_pending_state');
        setCreatedBookings(res.data.bookings || [res.data]);
        setStep(8);
      } else {
        // Consolidated Group Bookings for Families
        const payload = {
          participants,
          sessionIds: selectedSessions.map(s => s._id),
          classId: selectedClass._id,
          locationId: selectedLocation,
          paymentMethod: paymentType || 'center',
          guestDetails: !getUser() ? guestDetails : undefined,
          promotionId: selectedPromo?._id,
          discountAmount,
          couponCode,
          couponAmount
        };
        const res = await api.post('/bookings/group', payload);
        sessionStorage.removeItem('booking_pending_state');
        setCreatedBookings(res.data.bookings || [res.data]);
        setStep(8);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { name: '', age: '', gender: 'male', relation: '' }]);
  };

  const removeParticipant = (index) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index, field, value) => {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;

    // Auto-fill logic for "Self"
    if (field === 'relation' && value === 'Self') {
      const user = getUser();
      if (user) {
        newParticipants[index].name = user.name || newParticipants[index].name;
      }
    }

    setParticipants(newParticipants);
  };

  const handleChildSelect = (index, childId) => {
    const newParticipants = [...participants];
    if (childId === 'new') {
      newParticipants[index] = { ...newParticipants[index], name: '', age: '', gender: 'male', childId: undefined };
    } else {
      const child = myChildren.find(c => c._id === childId);
      if (child) {
        newParticipants[index] = {
          ...newParticipants[index],
          name: child.name,
          age: child.age || '',
          gender: child.gender === 'other' ? 'male' : (child.gender || 'male'),
          childId: child._id
        };
      }
    }
    setParticipants(newParticipants);
  };

  const handleQuickAddChild = (child) => {
    // Add child to participants only if they aren't already there
    if (!participants.some(p => p.childId === child._id)) {
      setParticipants([...participants, {
        name: child.name,
        age: child.age,
        gender: child.gender === 'other' ? 'male' : (child.gender || 'male'),
        relation: 'Child',
        childId: child._id
      }]);
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="flex justify-between mb-12 relative px-4">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2 rounded-full"></div>
            <div className="absolute top-1/2 left-0 h-1 bg-brand-blue -z-10 -translate-y-1/2 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 7) * 100}%` }}></div>
            {[1, 2, 3, 4, 5, 6, 7].map(s => (
              <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= s ? 'bg-brand-blue text-white shadow-glow' : 'bg-white text-ink/30 border-2 border-slate-200'}`}>
                {s}
              </div>
            ))}
          </div>

          <div className="soft-card rounded-[48px] p-8 md:p-12">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center animate-pulse">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="animate-rise text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                  <div>
                    <h2 className="font-display text-4xl font-black text-ink tracking-tight">Select a program</h2>
                    <p className="text-ink/60 mt-2">Choose the perfect activity to get started</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
                    <button
                      onClick={() => setIsCorporateMode(false)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isCorporateMode ? 'bg-white text-brand-blue shadow-sm' : 'text-ink/40 hover:text-ink'}`}
                    >
                      Family
                    </button>
                    <button
                      onClick={() => setIsCorporateMode(true)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isCorporateMode ? 'bg-brand-blue text-white shadow-md' : 'text-ink/40 hover:text-ink'}`}
                    >
                      Corporate
                    </button>
                  </div>
                </div>

                {isCorporateMode && (
                  <div className="mb-10 p-6 rounded-[32px] bg-brand-blue/5 border border-brand-blue/20 animate-rise">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-2xl">🏢</div>
                      <div>
                        <h3 className="font-display text-xl text-ink">Corporate Group Booking</h3>
                        <p className="text-xs text-ink/60">Register multiple staff members for team building sessions</p>
                      </div>
                    </div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2 ml-2">Company Name</label>
                    <input
                      type="text"
                      className="w-full bg-white border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink shadow-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                      placeholder="Enter your company name (e.g., TechCorp Solutions)"
                      value={corporateName}
                      onChange={(e) => setCorporateName(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-[400px] rounded-[40px] bg-white border-2 border-slate-50 animate-pulse flex flex-col p-6">
                        <div className="aspect-[4/3] rounded-[32px] bg-slate-100 mb-4" />
                        <div className="h-8 bg-slate-100 rounded-xl mb-2 w-3/4" />
                        <div className="h-4 bg-slate-100 rounded-lg mb-6 w-1/2" />
                        <div className="mt-auto flex justify-between">
                          <div className="h-8 w-24 bg-slate-100 rounded-full" />
                          <div className="h-8 w-20 bg-slate-100 rounded-xl" />
                        </div>
                      </div>
                    ))
                  ) : classes.map(c => (
                    <button
                      key={c._id}
                      onClick={() => { setSelectedClass(c); setStep(2); }}
                      className="group relative p-6 rounded-[40px] border-2 border-slate-100 hover:border-brand-blue transition-all bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-left flex flex-col h-full"
                    >
                      <div className="mb-4 aspect-[4/3] rounded-[32px] bg-slate-100 overflow-hidden relative shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent group-hover:opacity-0 transition-opacity z-10"></div>
                        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-blue shadow-xl border border-white/20">
                          {c.ageGroup}
                        </div>
                        <img
                          src={c.imageUrl ? (getImageUrl(c.imageUrl)) : `https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&q=80&w=800`}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 select-none pointer-events-none"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800";
                          }}
                        />
                      </div>
                      <h3 className="font-display text-2xl text-ink leading-tight mb-2 group-hover:text-brand-blue transition-colors px-2">{c.title}</h3>
                      <p className="text-sm text-ink/50 line-clamp-2 mb-6 leading-relaxed px-2">{c.description}</p>
                      <div className="mt-auto flex items-center justify-between px-2 pb-2">
                        <span className="bg-ocean/5 text-ocean text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-ocean/10">{c.duration}</span>
                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-widest text-ink/30 block mb-0.5">Per Person</span>
                          <span className="text-xl font-black text-ink">{currency} {c.price}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-rise">
                <h2 className="font-display text-3xl font-black text-ink mb-6">Select Location</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {locations.map(loc => (
                    <button
                      key={loc._id}
                      onClick={() => { setSelectedLocation(loc._id); setStep(3); }}
                      className={`p-8 rounded-[40px] border-2 transition-all text-left flex items-center gap-6 ${selectedLocation === loc._id ? 'border-brand-blue bg-brand-blue/5 shadow-xl' : 'border-slate-50 bg-white hover:border-brand-blue/30'}`}
                    >
                      <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-3xl overflow-hidden shrink-0">
                        {loc.imageUrl ? (
                          <img
                            src={getImageUrl(loc.imageUrl)}
                            alt={loc.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          '📍'
                        )}
                      </div>
                      <div>
                        <h3 className="font-display text-xl text-ink">{loc.name}</h3>
                        <p className="text-sm text-ink/40 mt-1">{loc.city || loc.address}</p>
                      </div>
                    </button>
                  ))}
                  {locations.length === 0 && <p className="col-span-full py-12 text-center text-ink/30 italic">No locations available.</p>}
                </div>
                <div className="mt-12 flex items-center justify-between">
                  <button onClick={() => setStep(1)} className="text-sm font-bold text-ink/40 hover:text-ink transition-colors px-6 py-3">Back to classes</button>
                </div>
              </div>
            )}

            {step === 3 && selectedClass && (
              <div className="animate-rise">
                <h2 className="font-display text-3xl font-black text-ink mb-2">Trainer & Time</h2>
                <p className="text-ink/60 mb-8">{selectedClass.title} • {selectedClass.duration} • {currency} {selectedClass.price}</p>

                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-3">Choose Trainer</label>
                    <select
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                      value={selectedTrainer}
                      onChange={(e) => setSelectedTrainer(e.target.value)}
                    >
                      <option value="">Select Trainer</option>
                      {trainers.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                    {selectedLocation && trainers.length === 0 && (
                      <p className="text-[10px] text-coral font-bold mt-2 ml-2 italic">
                        No trainers available for this class at the selected branch.
                      </p>
                    )}
                  </div>

                  {selectedTrainer && (
                    <div
                      onClick={() => { setShowTrainerModal(true); setActiveImage(0); }}
                      className="animate-rise p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 cursor-pointer hover:shadow-md transition-all hover:border-brand-blue/20 group"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                        {trainers.find(t => t._id === selectedTrainer)?.avatarUrl ? (
                          <img
                            src={trainers.find(t => t._id === selectedTrainer).avatarUrl.startsWith('http') ? trainers.find(t => t._id === selectedTrainer).avatarUrl : `${BASE_URL}${trainers.find(t => t._id === selectedTrainer).avatarUrl}`}
                            alt="Trainer"
                            className="h-full w-full object-cover"
                          />
                        ) : '🏆'}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                          <h3 className="font-display text-xl text-ink underline-offset-4 group-hover:underline">{trainers.find(t => t._id === selectedTrainer)?.name}</h3>
                          <span className="text-[10px] text-brand-blue font-black uppercase tracking-widest bg-brand-blue/5 px-2 py-0.5 rounded-md">View Profile</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mb-2">
                          {(trainers.find(t => t._id === selectedTrainer)?.specialties || []).map((spec, i) => (
                            <span key={i} className="text-[9px] font-black uppercase tracking-widest text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-md">{spec}</span>
                          ))}
                        </div>
                        <p className="text-sm text-ink/60 leading-relaxed italic line-clamp-2">
                          "{trainers.find(t => t._id === selectedTrainer)?.bio || 'Dedicated coach committed to child development and fitness excellence.'}"
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedTrainer && (
                    <div className="animate-rise">
                      <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-3">Available Slots</label>
                      {loading ? <div className="animate-pulse h-12 bg-slate-100 rounded-2xl"></div> : (
                        <div>
                          {dateKeys.length > 0 ? (
                            <>
                              {/* Date Navigation Tabs */}
                              <div className="flex gap-2 overflow-x-auto pb-4 mb-4 select-none scrollbar-hide snap-x">
                                {dateKeys.map(dKey => (
                                  <button
                                    key={dKey}
                                    onClick={() => setSelectedDateFilter(dKey)}
                                    className={`snap-start shrink-0 px-6 py-3 rounded-full text-sm font-bold transition-all border-2 ${selectedDateFilter === dKey ? 'bg-brand-blue text-white shadow-md border-brand-blue' : 'bg-white text-ink/60 border-slate-100 hover:border-brand-blue/30 hover:text-ink'}`}
                                  >
                                    {dKey}
                                  </button>
                                ))}
                              </div>

                              {/* Slots for Selected Date */}
                              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {(sessionGroups[selectedDateFilter] || []).map(s => {
                                  const isSelected = selectedSessions.find(sess => sess._id === s._id);
                                  const spotsLeft = s.capacity - (s.bookedParticipants || 0);
                                  return (
                                    <button
                                      key={s._id}
                                      onClick={() => {
                                        if (spotsLeft <= 0 && !isSelected) return; // Prevent selecting full slots
                                        if (isSelected) {
                                          setSelectedSessions(selectedSessions.filter(sess => sess._id !== s._id));
                                        } else {
                                          setSelectedSessions([...selectedSessions, s]);
                                        }
                                      }}
                                      disabled={spotsLeft <= 0 && !isSelected}
                                      className={`p-5 rounded-3xl border-2 transition-all text-left flex flex-col justify-center items-center gap-1 ${isSelected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-glow' : spotsLeft <= 0 ? 'border-slate-100 bg-slate-50/50 opacity-50 cursor-not-allowed text-ink/20' : 'border-slate-100 bg-white hover:border-brand-blue/30 hover:bg-slate-50 text-ink/80'}`}
                                    >
                                      <span className="text-xl font-black font-display">
                                        {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {s.endTime && ` - ${new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                      </span>
                                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-brand-blue/70' : spotsLeft <= 0 ? 'text-coral' : 'text-ink/40'}`}>
                                        {spotsLeft <= 0 ? 'FULL' : `${spotsLeft} spots left`}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-ink/40 italic py-4">No available sessions for this trainer.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-12 flex items-center justify-between">
                  <button onClick={() => setStep(2)} className="text-sm font-bold text-ink/40 hover:text-ink transition-colors px-6 py-3">Back to location</button>
                  <button onClick={handleNextStep} disabled={selectedSessions.length === 0} className="bg-brand-blue text-white px-10 py-3 rounded-full font-black shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">Continue ({selectedSessions.length})</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-rise text-center py-10">
                {getUser() ? (
                  <div className="max-w-md mx-auto text-center animate-rise">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">👤</div>
                    <h2 className="font-display text-3xl font-black text-ink mb-2">Welcome Back!</h2>
                    <p className="text-ink/60 mb-10">Logged in as <b>{getUser().name}</b>. You are now ready to add participants.</p>

                    <div className="flex flex-col gap-4">
                      <button onClick={() => setStep(5)} className="bg-brand-blue text-white w-full px-10 py-4 rounded-full font-black shadow-lg hover:scale-105 active:scale-95 transition-all">Continue to Participants</button>
                      <button onClick={() => setStep(3)} className="text-sm font-bold text-ink/40 hover:text-ink transition-colors px-6 py-3">Back to sessions</button>
                    </div>
                  </div>
                ) : !showGuestForm ? (
                  <>
                    <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center text-4xl mx-auto mb-6">👋</div>
                    <h2 className="font-display text-3xl font-black text-ink mb-2">You are not logged in</h2>
                    <p className="text-ink/60 mb-10 max-w-md mx-auto">Log in to save this booking to your account and easily add your linked children, or continue as a guest.</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)} className="bg-brand-blue text-white w-full sm:w-auto px-10 py-4 rounded-full font-black shadow-lg hover:scale-105 active:scale-95 transition-all">Log In</button>
                      <p className="text-ink/40 font-bold text-xs uppercase mx-4">Or</p>
                      <button onClick={() => setShowGuestForm(true)} className="bg-white border-2 border-slate-200 text-ink/80 w-full sm:w-auto px-10 py-4 rounded-full font-black hover:border-brand-blue hover:text-brand-blue transition-all">Continue as Guest</button>
                    </div>

                    <div className="mt-12">
                      <button onClick={() => setStep(3)} className="text-sm font-bold text-ink/40 hover:text-ink transition-colors">Back to sessions</button>
                    </div>
                  </>
                ) : (
                  <div className="max-w-md mx-auto text-left animate-rise">
                    <h2 className="font-display text-3xl font-black text-ink mb-2 text-center">Guest Details</h2>
                    <p className="text-ink/60 mb-8 text-center text-sm">We need a few details to send your booking confirmation.</p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-2 px-2">Full Name</label>
                        <input
                          type="text"
                          placeholder="Customer / Guardian Name"
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:border-brand-blue focus:ring-0 outline-none transition-all"
                          value={guestDetails.name}
                          onChange={(e) => setGuestDetails({ ...guestDetails, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-2 px-2">Email Address</label>
                        <input
                          type="email"
                          placeholder="Your Email"
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:border-brand-blue focus:ring-0 outline-none transition-all"
                          value={guestDetails.email}
                          onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink/40 uppercase tracking-widest mb-2 px-2">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="Your Phone Number"
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-ink focus:border-brand-blue focus:ring-0 outline-none transition-all"
                          value={guestDetails.phone}
                          onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between">
                      <button onClick={() => setShowGuestForm(false)} className="text-sm font-bold text-ink/40 hover:text-ink transition-colors px-6 py-3 order-2 sm:order-1 text-center">Back</button>
                      <button onClick={handleNextStep} className="bg-brand-blue text-white w-full sm:w-auto px-10 py-4 rounded-full font-black shadow-lg hover:scale-105 active:scale-95 transition-all order-1 sm:order-2">Continue to Participants</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="animate-rise">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-display text-3xl font-black text-ink">Participants</h2>
                  <div className="flex gap-2">

                    <button onClick={addParticipant} className="bg-brand-blue/10 text-brand-blue px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-blue/20 transition-all">+ Add more</button>
                  </div>
                </div>

                <div className="mb-8 p-6 rounded-[32px] bg-brand-blue/5 border border-brand-blue/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Selected Program</p>
                    <p className="font-display text-xl mt-1 text-ink">{selectedClass?.title || 'N/A'} • {selectedClass?.ageGroup || 'N/A'}</p>
                    {selectedClass?.minAge !== undefined && selectedClass?.maxAge !== undefined && (
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50 inline-block px-3 py-1 rounded-full mt-2">
                        Required Age: {selectedClass.minAge} - {selectedClass.maxAge} Years
                      </p>
                    )}
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-bold text-ink/60">
                        {locations.find(l => l._id === selectedLocation)?.name || 'Central'} • {selectedSessions.length} Session(s) Selected
                      </p>
                      {selectedSessions.map((sess, i) => (
                        <p key={i} className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue/70">
                          {new Date(sess.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} @ {new Date(sess.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {trainers.find(t => t._id === selectedTrainer) && ` • Coach ${trainers.find(t => t._id === selectedTrainer).name}`}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="md:text-right">
                    <p className="text-2xl font-black text-ink">{currency} {selectedClass?.price || 0}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mt-1">Per Participant</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {participants.map((p, idx) => (
                    <div key={idx} className="p-6 rounded-[32px] bg-slate-50 relative animate-rise">
                      {participants.length > 1 && (
                        <button onClick={() => removeParticipant(idx)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white text-red-400 hover:text-red-600 shadow-sm flex items-center justify-center transition-all">×</button>
                      )}
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 mb-4 px-2">Participant {idx + 1}</h3>
                      <div className="grid gap-4 md:grid-cols-5">
                        {myChildren.length > 0 && (
                          <div>
                            <select
                              className="w-full bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all appearance-none cursor-pointer"
                              onChange={(e) => handleChildSelect(idx, e.target.value)}
                              value={p.childId || 'new'}
                            >
                              <option value="new">New Participant</option>
                              {myChildren.map(c => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className={myChildren.length > 0 ? '' : 'md:col-span-1'}>
                          <input
                            type="text"
                            placeholder="Name"
                            className="w-full bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                            value={p.name}
                            onChange={(e) => updateParticipant(idx, 'name', e.target.value)}
                            disabled={p.childId}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Age"
                            className={`w-full bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all ${p.age && (
                                (selectedClass.minAge !== undefined && parseInt(p.age) < selectedClass.minAge) ||
                                (selectedClass.maxAge !== undefined && parseInt(p.age) > selectedClass.maxAge)
                              ) ? 'ring-2 ring-red-400 bg-red-50' : ''
                              }`}
                            value={p.age}
                            onChange={(e) => updateParticipant(idx, 'age', e.target.value)}
                            disabled={p.childId}
                          />
                          {p.age && selectedClass.minAge !== undefined && parseInt(p.age) < selectedClass.minAge && (
                            <p className="text-[8px] font-bold text-red-500 mt-1 px-1">Too young</p>
                          )}
                          {p.age && selectedClass.maxAge !== undefined && parseInt(p.age) > selectedClass.maxAge && (
                            <p className="text-[8px] font-bold text-red-500 mt-1 px-1">Too old</p>
                          )}
                        </div>
                        <div>
                          <select
                            className="w-full bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold text-ink focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all appearance-none cursor-pointer"
                            value={p.relation}
                            onChange={(e) => updateParticipant(idx, 'relation', e.target.value)}
                          >
                            <option value="">Relation</option>
                            <option value="Self">Self (Me)</option>
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="flex bg-white rounded-2xl p-1 shadow-sm">
                          {['male', 'female'].map(g => (
                            <button
                              key={g}
                              disabled={p.childId}
                              onClick={() => updateParticipant(idx, 'gender', g)}
                              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${p.gender === g ? 'bg-brand-blue text-white shadow-md' : 'text-ink/30 hover:text-ink/60 disabled:opacity-50'}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex items-center justify-between">
                  <button onClick={() => setStep(getUser() ? 3 : 4)} className="text-sm font-bold text-ink/40 hover:text-ink transition-colors px-6 py-3">Back</button>
                  <button onClick={handleNextStep} className="bg-brand-blue text-white px-10 py-3 rounded-full font-black shadow-lg hover:scale-105 active:scale-95 transition-all">Review & Summary</button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="animate-rise">
                <div className="text-center mb-10">
                  <h2 className="font-display text-4xl font-black text-ink tracking-tight mb-2">Review & Summary</h2>
                  <p className="text-sm font-bold text-ink/40 uppercase tracking-[0.3em]">Final Step before payment</p>
                </div>

                <div className="space-y-8">
                  {/* Program Overview */}
                  <div className="p-8 rounded-[40px] bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 border border-brand-blue/20 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/30 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Selected Program</p>
                        <h3 className="font-display text-3xl text-ink leading-tight">{selectedClass.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <span className="text-xs font-black uppercase tracking-widest text-ink/60 bg-white/80 px-4 py-1.5 rounded-full shadow-sm border border-slate-100">
                            {selectedClass.ageGroup}
                          </span>
                          <span className="text-sm font-black text-ocean flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-ocean animate-pulse"></span>
                            {locations.find(l => l._id === selectedLocation)?.name || 'Central Branch'}
                          </span>
                        </div>
                      </div>
                      <div className="hidden md:flex w-20 h-20 rounded-[2rem] bg-white/80 backdrop-blur-sm border border-brand-blue/10 items-center justify-center text-4xl shadow-xl shrink-0">
                        🏅
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-2">
                    {/* Sessions Column */}
                    <div className="space-y-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 px-4">Schedule Details ({selectedSessions.length})</p>
                      <div className="space-y-4">
                        {selectedSessions.map((sess, i) => (
                          <div key={i} className="flex justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 group hover:border-brand-blue/30 transition-all hover:shadow-md">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-brand-blue/5 flex flex-col items-center justify-center text-brand-blue shrink-0 group-hover:scale-105 transition-transform">
                                <span className="text-[9px] font-black uppercase leading-none mb-0.5">{new Date(sess.startTime).toLocaleDateString('en-US', { month: 'short' })}</span>
                                <span className="text-xl font-black leading-none">{new Date(sess.startTime).getDate()}</span>
                              </div>
                              <div>
                                <p className="font-black text-ink text-base">{new Date(sess.startTime).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                                <p className="text-[11px] text-brand-blue font-black uppercase tracking-widest mt-1 bg-brand-blue/5 px-2 py-0.5 rounded-md inline-block">
                                  {new Date(sess.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-ink/20 mb-1">Coach</p>
                              <p className="text-xs font-black text-brand-blue">{sess.trainerId?.name || trainers.find(t => t._id === selectedTrainer)?.name || 'TBA'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Participants Column */}
                    <div className="space-y-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 px-4">Participant List ({participants.length})</p>
                      <div className="grid gap-4">
                        {participants.map((p, i) => (
                          <div key={i} className="p-5 rounded-[32px] bg-white border border-slate-100 flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg">
                                {p.gender === 'male' ? '👦' : '👧'}
                              </div>
                              <div>
                                <p className="font-black text-ink text-base line-clamp-1">{p.name}</p>
                                <p className="text-[11px] font-bold text-ink/40 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5 whitespace-nowrap">{p.relation || 'Me'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-5">
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-brand-blue">{p.age} Years</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-ink/20 mt-1">{p.gender}</p>
                              </div>
                              <button
                                onClick={() => {
                                  if (participants.length > 1) {
                                    setParticipants(prev => prev.filter((_, idx) => idx !== i));
                                  } else {
                                    toast.error("At least one participant is required");
                                  }
                                }}
                                className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                                title="Remove Participant"
                              >
                                <span className="text-xl font-bold">×</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Promotions Integration */}
                  {applicablePromos.length > 0 && (
                    <div className="animate-rise p-8 rounded-[40px] bg-white border-2 border-slate-100 shadow-sm space-y-8">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎁</span>
                        <h4 className="text-xs font-black uppercase tracking-widest text-brand-blue">Available Promotions</h4>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {applicablePromos.map(promo => (
                          <button
                            key={promo._id}
                            onClick={() => setSelectedPromo(selectedPromo?._id === promo._id ? null : promo)}
                            className={`p-5 rounded-3xl border-2 transition-all flex items-center justify-between group ${selectedPromo?._id === promo._id ? 'border-brand-blue bg-brand-blue/5 shadow-md' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                {promo.promoType === 'flash' ? '⚡' : '🏷️'}
                              </div>
                              <div className="text-left">
                                <p className="font-black text-ink text-sm">{promo.name}</p>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">
                                  {promo.promoType === 'bogo'
                                    ? 'Buy 1 Get 1 Free'
                                    : (() => {
                                      const saved = calculateDiscount(promo, totalPrice);
                                      const isPercent = promo.discountType === 'percentage' || promo.promoType === 'percentage';
                                      return `Save ${currency} ${Math.round(saved)}${isPercent ? ` (${promo.discountValue}% off)` : ''}`;
                                    })()
                                  }
                                </p>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedPromo?._id === promo._id ? 'bg-brand-blue border-brand-blue text-white' : 'border-white bg-white group-hover:border-slate-200'}`}>
                              {selectedPromo?._id === promo._id && <span className="text-xs font-black">✓</span>}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* BOGO Claim Assistant */}
                      {selectedPromo?.promoType === 'bogo' && (
                        <div className="p-6 rounded-[32px] bg-emerald-50 border border-emerald-100 animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl">🎉</div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">BOGO Claim Assistant</p>
                              <h5 className="font-display text-lg text-ink">You have a free session available!</h5>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {/* Quick Add Children Buttons */}
                            {myChildren
                              .filter(child => !participants.some(p => p.childId === child._id))
                              .map(child => (
                                <button
                                  key={child._id}
                                  onClick={() => handleQuickAddChild(child)}
                                  className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all border border-emerald-100 flex items-center gap-2 group"
                                  title={`Add ${child.name}`}
                                >
                                  <span className="text-xs group-hover:scale-125 transition-transform">➕</span> {child.name}
                                </button>
                              ))}

                            {/* Standard Add Button */}
                            <button
                              onClick={() => setStep(5)}
                              className="bg-white/40 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600/60 hover:text-emerald-600 hover:bg-white shadow-sm transition-all border border-emerald-100 flex items-center gap-2"
                            >
                              <span>👥</span> Manage List
                            </button>

                            {(() => {
                              // Find Next Day Slot Shortcut
                              if (selectedSessions.length === 1) {
                                const currentSess = selectedSessions[0];
                                const nextDayStr = new Date(new Date(currentSess.startTime).getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                                const nextDaySlot = sessionGroups[nextDayStr]?.find(s => {
                                  const sTime = new Date(s.startTime);
                                  const cTime = new Date(currentSess.startTime);
                                  return sTime.getHours() === cTime.getHours() && sTime.getMinutes() === cTime.getMinutes();
                                });

                                if (nextDaySlot) {
                                  return (
                                    <button
                                      onClick={() => setSelectedSessions([...selectedSessions, nextDaySlot])}
                                      className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                      <span>⚡</span> Add Tomorrow @ {new Date(nextDaySlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Free)
                                    </button>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                          <p className="mt-4 text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">
                            * BOGO applies to every 2nd unit (Total: {participants.length * selectedSessions.length} units selected)
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing Footer */}
                  <div className="mt-16 pt-12 border-t-2 border-slate-100/50">
                    <div className="grid md:grid-cols-2 gap-12 items-start">
                      {/* Left: Financial Breakdown */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue text-sm">🧾</div>
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-ink/40">Order Summary</h4>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm font-bold text-ink/40">Gross Subtotal</span>
                            <span className="text-sm font-black text-ink">
                              {currency} {
                                (activeTax?.calculationMethod === 'inclusive'
                                  ? (activeTax.type === 'percentage' ? totalPrice / (1 + (activeTax.value / 100)) : Math.max(0, totalPrice - activeTax.value))
                                  : totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              }
                            </span>
                          </div>

                          {discountAmount > 0 && (
                            <div className="flex justify-between items-baseline group">
                              <span className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Promotions & Savings
                              </span>
                              <span className="text-sm font-black text-emerald-600">-{currency} {discountAmount.toLocaleString()}</span>
                            </div>
                          )}

                          {taxAmount > 0 && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-[11px] font-black uppercase tracking-widest text-ink/30 italic">
                                {activeTax?.name || 'VAT'} ({activeTax?.value}% {activeTax?.type === 'percentage' ? '' : currency})
                                {activeTax?.calculationMethod === 'inclusive' && <span className="ml-1">(Included)</span>}
                              </span>
                              <span className="text-sm font-black text-ink/40">
                                {activeTax?.calculationMethod === 'inclusive' ? '' : '+ '}{currency} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-between items-baseline gap-2">
                            <span className="text-lg font-black text-ink">Total Amount</span>
                            <div className="text-right">
                              <p className="text-2xl sm:text-3xl font-black text-brand-blue tracking-tighter break-all">
                                {currency} {Math.max(0, (activeTax?.calculationMethod === 'inclusive' ? totalPrice : (totalPrice + taxAmount)) - discountAmount - couponAmount).toLocaleString()}
                              </p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-ink/20 mt-1">Inclusive of all taxes</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-ink/40 leading-relaxed uppercase tracking-wider text-center md:text-left">
                            {selectedClass?.price || 0} {currency} PER UNIT × {participants.length} PARTICIPANTS × {selectedSessions.length} SESSIONS
                          </p>
                        </div>
                      </div>

                      {/* Right: Voucher & Action */}
                      <div className="space-y-8 w-full overflow-hidden">
                        <div className="bg-white rounded-[32px] p-5 md:p-8 border-2 border-slate-100 shadow-sm relative overflow-hidden group hover:border-brand-blue/30 transition-all">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                              <span className="text-xl">🎟️</span>
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-ink/80">Redeem Voucher</h4>
                                <p className="text-[10px] text-ink/40 font-bold mt-1">Enter your cash coupon / voucher code below</p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-4 sm:px-6 text-sm font-black uppercase tracking-widest text-ink placeholder:text-ink/20 outline-none focus:border-brand-blue focus:shadow-inner transition-all"
                                placeholder="CODE (CPN-XXXX)"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                disabled={couponAmount > 0 || isValidatingCoupon}
                              />
                              {couponAmount > 0 ? (
                                <button
                                  onClick={() => { setCouponAmount(0); setCouponCode(''); }}
                                  className="bg-red-50 text-red-500 px-6 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                >Remove</button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (!getUser()) {
                                      toast.error('Please login to use coupons');
                                      setStep(6);
                                      return;
                                    }
                                    setIsValidatingCoupon(true);
                                    try {
                                      const res = await api.post('/coupons/validate', { code: couponCode });
                                      setCouponAmount(res.data.data.amount);
                                      toast.success('Coupon applied!');
                                    } catch (err) {
                                      toast.error(err.response?.data?.message || 'Invalid coupon');
                                    } finally {
                                      setIsValidatingCoupon(false);
                                    }
                                  }}
                                  disabled={!couponCode || isValidatingCoupon}
                                  className="bg-brand-blue text-white px-8 rounded-2xl text-[10px] font-black uppercase disabled:opacity-50 hover:bg-ocean transition-all shadow-lg active:scale-95"
                                >
                                  {isValidatingCoupon ? '...' : 'Apply'}
                                </button>
                              )}
                            </div>
                            {couponAmount > 0 && (
                              <p className="mt-3 text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                ✓ {currency} {couponAmount} voucher active
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setStep(7)}
                          className="w-full bg-brand-blue text-white px-4 md:px-14 py-5 md:py-6 rounded-[2.5rem] font-black shadow-glow hover:scale-[1.03] active:scale-[0.98] transition-all text-lg md:text-xl hover:shadow-brand-blue/30 group flex flex-col items-center whitespace-normal break-words"
                        >
                          <span>Secure Booking <span className="hidden sm:inline">Now</span> <span className="ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span></span>
                          <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">
                            Total: {currency} {Math.max(0, (totalPrice - discountAmount - couponAmount) + (activeTax?.calculationMethod === 'inclusive' ? 0 : taxAmount)).toLocaleString()}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 text-center">
                    <button onClick={() => setStep(5)} className="text-sm font-bold text-ink/40 hover:text-brand-blue transition-colors flex items-center justify-center gap-2 mx-auto group">
                      <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span> Edit details & participants
                    </button>
                  </div>
                </div>
              </div>
            )}



            {step === 7 && (
              <div className="animate-rise text-center py-10">
                {paymentType === 'online' ? (
                  <PaymentForm
                    totalAmount={Math.max(0, (totalPrice - discountAmount - couponAmount) + (activeTax?.calculationMethod === 'inclusive' ? 0 : taxAmount))}
                    onSubmit={handleCreateBooking}
                    onCancel={() => { setPaymentType(''); setStep(6); }}
                  />
                ) : (
                  <>
                    <h2 className="font-display text-3xl font-black text-ink mb-2">Payment Method</h2>
                    <p className="text-ink/60 mb-10">Choose how you would like to pay for your session.</p>

                    <div className={`grid gap-4 ${(globalSettings.allowCenterPayment ?? true) ? 'sm:grid-cols-2' : 'max-w-xs mx-auto'} text-left`}>
                      <button onClick={() => setPaymentType('online')} className="p-8 rounded-[40px] border-2 border-slate-50 bg-white hover:border-brand-blue hover:shadow-xl transition-all group flex flex-col items-center w-full">
                        <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">💳</div>
                        <h3 className="font-display text-xl group-hover:text-brand-blue">Online Payment</h3>
                        <p className="text-xs text-ink/40 mt-2 font-medium text-center">Add a card • Secure and fast</p>
                      </button>
                      {(globalSettings.allowCenterPayment ?? true) && (
                        <button onClick={handleCreateBooking} className="p-8 rounded-[40px] border-2 border-slate-50 bg-white hover:border-brand-blue hover:shadow-xl transition-all group flex flex-col items-center w-full">
                          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">📍</div>
                          <h3 className="font-display text-xl group-hover:text-brand-blue">Pay at Center</h3>
                          <p className="text-xs text-ink/40 mt-2 font-medium text-center">Cash or Card at the gym</p>
                        </button>
                      )}
                    </div>

                    <div className="mt-12">
                      <button onClick={() => setStep(5)} className="text-sm font-bold text-ink/40 hover:text-ink transition-colors">Back to summary</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 8 && (
              <div className="animate-rise text-center py-12">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 animate-bounce transition-transform">✓</div>
                <h2 className="font-display text-4xl font-black text-ink mb-4">Awesome!</h2>
                <div className="mb-8 space-y-4">
                  {createdBookings.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-md mx-auto border border-slate-100">
                      <p className="text-brand-blue font-black tracking-widest text-sm uppercase">
                        #{createdBookings[0]?.bookingNumber}
                      </p>
                      <button
                        onClick={() => window.open(`/invoice/booking/${createdBookings[0]?._id}`, '_blank')}
                        className="bg-white text-brand-blue px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2 border border-brand-blue/10"
                      >
                        <span>📄</span> Print Invoice
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-ink/60 text-lg mb-10 max-w-md mx-auto">Your booking for {participants.length} participant(s) has been successfully placed. We've sent an email confirmation.</p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => navigate('/dashboard/bookings')} className="bg-brand-blue text-white px-10 py-3 rounded-full font-black shadow-lg hover:translate-y-[-2px] active:translate-y-0 transition-all">Go to My Bookings</button>
                  <button onClick={() => navigate('/')} className="bg-white border-2 border-slate-100 text-ink/60 px-10 py-3 rounded-full font-black hover:bg-slate-50 transition-all">Home</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trainer Detail Modal */}
        {showTrainerModal && selectedTrainer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setShowTrainerModal(false)}
            />
            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-8 overflow-hidden animate-rise">
              <button
                onClick={() => setShowTrainerModal(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 text-ink/40 flex items-center justify-center hover:bg-slate-100 hover:text-ink transition-all z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col md:flex-row gap-8">
                <div className="space-y-6 shrink-0 w-full md:w-auto">
                  {/* Main Image View */}
                  <div className="relative w-full max-w-[320px] aspect-square md:w-64 md:h-64 rounded-[40px] bg-slate-50 overflow-hidden shadow-inner border border-slate-100 mx-auto md:mx-0 group/main">
                    {(() => {
                      const trainer = trainers.find(t => t._id === selectedTrainer);
                      const images = [trainer?.avatarUrl, ...(trainer?.gallery || [])].filter(Boolean);
                      const currentImg = images[activeImage] || images[0];

                      if (!currentImg) return <div className="h-full w-full flex items-center justify-center text-7xl">🏆</div>;

                      return (
                        <img
                          src={getImageUrl(currentImg)}
                          alt="Trainer Active"
                          className="h-full w-full object-cover animate-in fade-in zoom-in-95 duration-500"
                        />
                      );
                    })()}

                    {/* Navigation Arrows (if multiple) */}
                    {(() => {
                      const images = [trainers.find(t => t._id === selectedTrainer)?.avatarUrl, ...(trainers.find(t => t._id === selectedTrainer)?.gallery || [])].filter(Boolean);
                      if (images.length <= 1) return null;
                      return (
                        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover/main:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveImage(prev => (prev === 0 ? images.length - 1 : prev - 1)); }}
                            className="w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-ink hover:bg-white"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveImage(prev => (prev === images.length - 1 ? 0 : prev + 1)); }}
                            className="w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-ink hover:bg-white"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Interactive Thumbnails */}
                  {(() => {
                    const images = [trainers.find(t => t._id === selectedTrainer)?.avatarUrl, ...(trainers.find(t => t._id === selectedTrainer)?.gallery || [])].filter(Boolean);
                    if (images.length <= 1) return null;
                    return (
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActiveImage(idx)}
                            className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shadow-sm hover:scale-105 ${activeImage === idx ? 'border-brand-blue scale-110' : 'border-white hover:border-brand-blue/30'}`}
                          >
                            <img
                              src={getImageUrl(img)}
                              className="w-full h-full object-cover"
                              alt={`Thumbnail ${idx}`}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-blue mb-2">Coach Profile</p>
                  <h2 className="font-display text-4xl text-ink mb-4">{trainers.find(t => t._id === selectedTrainer)?.name}</h2>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {(trainers.find(t => t._id === selectedTrainer)?.specialties || []).map((spec, i) => (
                      <span key={i} className="text-xs font-bold text-brand-blue bg-brand-blue/5 px-3 py-1 rounded-full border border-brand-blue/10">
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/30">Professional Biography</p>
                      <p className="text-ink/70 leading-relaxed text-sm whitespace-pre-line">
                        {trainers.find(t => t._id === selectedTrainer)?.bio || 'Full professional biography pending update.'}
                      </p>
                    </div>

                    {trainers.find(t => t._id === selectedTrainer)?.locationId && (
                      <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ocean/10 flex items-center justify-center text-ocean text-xs">📍</div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-ink/30">Primary Branch</p>
                          <p className="text-sm font-bold text-ink/80">{locations.find(l => l._id === (trainers.find(t => t._id === selectedTrainer)?.locationId?._id || trainers.find(t => t._id === selectedTrainer)?.locationId))?.name || 'Central'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  onClick={() => setShowTrainerModal(false)}
                  className="flex-1 bg-brand-blue text-white py-4 rounded-full font-black shadow-lg hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  Select this Coach
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
