import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { getUser } from '../utils/auth.js';
import { getLocationId } from '../utils/location.js';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { currency } = useSettings();

  // Checkout State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [preferredDays, setPreferredDays] = useState([]);
  const [preferredSlots, setPreferredSlots] = useState([]); // Array of strings
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [detailsPlan, setDetailsPlan] = useState(null);
  const [applicablePromos, setApplicablePromos] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [claimBogo, setClaimBogo] = useState(false);
  const [bogoChildId, setBogoChildId] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [activeTax, setActiveTax] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Payment State
  const [paymentType, setPaymentType] = useState('online'); // 'online' or 'center'
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({});

  // Upgrade & Proration State
  const [upgradeMembership, setUpgradeMembership] = useState(null);
  const [prorationCredit, setProrationCredit] = useState(0);

  const fetchPlans = async () => {
    try {
      const locationId = getLocationId();
      const res = await api.get('/plans', { params: { locationId } });
      setPlans(res.data);
      
      const catRes = await api.get('/categories?status=active&type=membership');
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to fetch plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    
    // Fetch global settings
    api.get('/settings/global').then(res => {
      const settingsMap = {};
      res.data.forEach(s => { settingsMap[s.key] = s.value; });
      setGlobalSettings(settingsMap);
      
      const urlParams = new URLSearchParams(window.location.search);
      const upgradeId = urlParams.get('upgrade');
      
      if (upgradeId) {
        api.get('/memberships/mine').then(mRes => {
          const m = mRes.data.find(x => x._id === upgradeId);
          if (m && settingsMap.enable_proration) {
            setUpgradeMembership(m);
            // Calculate Proration Credit
            let unusedValue = 0;
            const totalPaid = m.bookingId?.totalAmount || m.planId?.price || 0;
            
            if (m.planId?.type === 'credit-based' && m.planId.creditsIncluded) {
              const totalCredits = (m.planId.creditsIncluded || 0) * (m.membershipUnits || 1);
              unusedValue = totalCredits > 0 ? (m.creditsRemaining / totalCredits) * totalPaid : 0;
            } else if (m.classesRemaining > -1 && m.planId?.classesIncluded) {
              const totalSessions = (m.planId.classesIncluded || 0) * (m.membershipUnits || 1);
              unusedValue = totalSessions > 0 ? (m.classesRemaining / totalSessions) * totalPaid : 0;
            } else if (m.classesRemaining === -1 && m.endDate) {
              // Time based
              const start = new Date(m.startDate || m.createdAt).getTime();
              const end = new Date(m.endDate).getTime();
              const now = new Date().getTime();
              if (end > start && now < end) {
                const remainingRatio = (end - now) / (end - start);
                unusedValue = remainingRatio * totalPaid;
              }
            }
            setProrationCredit(Math.max(0, Math.round(unusedValue * 100) / 100));
          }
        }).catch(() => {});
      }
    }).catch(() => {});

    const handleChange = () => fetchPlans();
    window.addEventListener('location-change', handleChange);
    return () => window.removeEventListener('location-change', handleChange);
  }, []);

  const openCheckout = (plan) => {
    if (!getUser()) {
      navigate('/login?redirect=/pricing');
      return;
    }
    setSelectedPlan(plan);
    setShowCheckout(true);
    setMessage('');
    setError('');
    
    // Fetch children for selection
    api.get('/children/mine').then(res => {
      setChildren(res.data || []);
      if (res.data?.length > 0) setSelectedChildId(res.data[0]._id);
    }).catch(() => {});

    // Fetch applicable promotions
    const locationId = getLocationId();
    api.get(`/promotions/active?locationId=${locationId}&itemId=${plan._id}&itemType=plan`)
      .then(res => {
        setApplicablePromos(res.data || []);
      })

    // Fetch tax rule
    const fetchTax = async () => {
      try {
        if (plan.taxId) {
          const res = await api.get(`/taxes/${plan.taxId}`);
          setActiveTax(res.data.data);
        } else {
          const res = await api.get(`/taxes?locationId=${locationId}&status=active`);
          setActiveTax(res.data.data?.[0] || null);
        }
      } catch (err) {
        console.error('Tax fetch error:', err);
        setActiveTax(null);
      }
    };
    fetchTax();
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setSelectedPlan(null);
    setSelectedPromo(null);
    setDiscountAmount(0);
    setCheckoutStep(1);
    setActiveTax(null);
    setCouponInput('');
    setAppliedCoupon(null);
    setPaymentType('online');
    setIsProcessing(false);
    setCardForm({ name: '', number: '', expiry: '', cvc: '' });
  };

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setIsValidatingCoupon(true);
    setError('');
    try {
      const res = await api.post('/coupons/validate', { code: couponInput });
      setAppliedCoupon(res.data.data);
      setMessage(`Coupon applied! Saved ${currency} ${res.data.data.amount}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCardChange = (event) => {
    let { name, value } = event.target;
    if (name === 'number') {
      value = value.replace(/\D/g, '').slice(0, 16);
      value = value.match(/.{1,4}/g)?.join(' ') || value;
    }
    if (name === 'expiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (name === 'cvc') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setCardForm((prev) => ({ ...prev, [name]: value }));
  };

  const calculateDiscount = (promo, basePrice) => {
    if (!promo || !basePrice) return 0;
    
    const calcByType = (type, val) => {
      if (type === 'percentage') return basePrice * (val / 100);
      return Math.min(basePrice, val);
    };

    let disc = 0;
    if (promo.promoType === 'percentage') {
      disc = basePrice * (promo.discountValue / 100);
    } else if (promo.promoType === 'cash' || promo.promoType === 'flash' || promo.promoType === 'lifestyle' || promo.promoType === 'bulk') {
      disc = calcByType(promo.discountType || (promo.promoType === 'percentage' ? 'percentage' : 'flat'), promo.discountValue);
    } else if (promo.promoType === 'tiered') {
      const tier = promo.discountTiers
        ?.filter(t => basePrice >= t.minAmount)
        .sort((a, b) => b.minAmount - a.minAmount)[0];
      if (tier) {
        disc = tier.type === 'percentage' ? (basePrice * (tier.value / 100)) : Math.min(basePrice, tier.value);
      }
    } else if (promo.promoType === 'bogo') {
      disc = 0;
    }
    return Math.round(disc * 100) / 100;
  };

  const totalWeeklySessions = preferredDays.length * (preferredSlots.length || 1);
  const isUnlimited = selectedPlan?.type !== 'dropin' && !selectedPlan?.classesIncluded;
  const baseCapacity = isUnlimited ? Infinity : (selectedPlan?.classesIncluded || 1);
  const effectiveCapacity = baseCapacity * (claimBogo ? 2 : 1);
  const membershipUnits = Math.max(1, Math.ceil(totalWeeklySessions / effectiveCapacity));
  const multipliedPrice = selectedPlan ? (selectedPlan.price * membershipUnits) : 0;

  useEffect(() => {
    if (selectedPromo && multipliedPrice) {
      setDiscountAmount(calculateDiscount(selectedPromo, multipliedPrice));
    } else {
      setDiscountAmount(0);
    }
  }, [selectedPromo, multipliedPrice]);

  const currentCouponAmount = appliedCoupon?.amount || 0;
  const taxableAmount = selectedPlan ? Math.max(0, multipliedPrice - discountAmount - currentCouponAmount - prorationCredit) : 0;
  const currTaxValue = (() => {
    if (!activeTax || !taxableAmount) return 0;
    if (activeTax.type === 'percentage') {
       if (activeTax.calculationMethod === 'inclusive') {
          return taxableAmount - (taxableAmount / (1 + (activeTax.value / 100)));
       } else {
          return taxableAmount * (activeTax.value / 100);
       }
    }
    return activeTax.value || 0;
  })();

  const finalTotalAmount = activeTax?.calculationMethod === 'inclusive' ? taxableAmount : (taxableAmount + currTaxValue);

  const handleCheckout = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!selectedPlan) return;
    
    if (paymentType === 'online') {
       if (!cardForm.name || !cardForm.number || !cardForm.expiry || !cardForm.cvc) {
          setError('Please complete card details.');
          return;
       }
    }

    const last4 = paymentType === 'online' ? cardForm.number.replace(/\s/g, '').slice(-4) : undefined;
    const reference = paymentType === 'online' ? `mock_${Date.now()}` : `center_${Date.now()}`;

    const user = getUser();
    // GENDER VALIDATION
    if (selectedPlan.gender && selectedPlan.gender !== 'mixed') {
       let pGender = '';
       if (selectedChildId === 'self') {
          pGender = user?.gender;
       } else if (selectedChildId) {
          const child = children.find(c => c._id === selectedChildId);
          pGender = child?.gender;
       }

       if (pGender && pGender !== 'other' && pGender !== selectedPlan.gender) {
          setError(`Gender Mismatch: This membership is restricted to ${selectedPlan.gender}s only.`);
          return;
       }
    }

    setIsProcessing(true);
    try {
      const payment = await api.post('/payments', {
        planId: selectedPlan._id,
        amount: Math.round(finalTotalAmount * 100) / 100,
        discountAmount,
        couponAmount: currentCouponAmount,
        couponCode: appliedCoupon?.code,
        taxAmount: Math.round(currTaxValue * 100) / 100,
        promotionId: selectedPromo?._id,
        paymentMethod: paymentType,
        status: paymentType === 'online' ? 'paid' : 'pending',
        reference,
        last4,
        membershipUnits
      });

      await api.post('/memberships', {
        planId: selectedPlan._id,
        paymentId: payment.data._id,
        childId: selectedChildId === 'self' ? null : (selectedChildId || null),
        preferredDays,
        preferredSlots,
        sessionsPerWeek: totalWeeklySessions,
        claimBogo,
        bogoChildId: bogoChildId || (selectedChildId === 'self' ? null : selectedChildId),
        membershipUnits,
        startDate,
        discountAmount,
        couponCode: appliedCoupon?.code,
        couponAmount: currentCouponAmount,
        promotionId: selectedPromo?._id,
        upgradeFromMembershipId: upgradeMembership?._id
      });

      setMessage(paymentType === 'online' ? 'Payment successful! Your schedule has been generated.' : 'Booking confirmed! Please pay at the center to activate.');
      setTimeout(() => {
        closeCheckout();
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Payment failed. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPlans = plans.filter(p => {
    const itemCategoryId = typeof p.categoryId === 'object' ? p.categoryId?._id : p.categoryId;
    return selectedCategory === 'All' || itemCategoryId === selectedCategory;
  });

  const classOptions = filteredPlans.filter(p => p.type === 'pack' || p.type === 'subscription');
  const termPricing = filteredPlans.filter(p => p.type === 'term');
  const dropIns = filteredPlans.filter(p => p.type === 'dropin');

  const minDropIn = dropIns.length > 0
    ? Math.min(...dropIns.map(p => p.price))
    : (filteredPlans.find(p => p.type === 'dropin')?.price || 80);

  return (
    <div>
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-500 p-8 text-white shadow-glow">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Pricing</p>
            <h1 className="mt-3 font-display text-3xl md:text-4xl">Other class options</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Baby classes · Ballet · Combat sports · Fitness. Transparent packages with playful perks.
            </p>
          </div>
          <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Drop-ins</p>
              <p className="mt-2 text-xl font-semibold">From {minDropIn} {currency}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Bundles</p>
              <p className="mt-2 text-xl font-semibold">Save 15%</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Freebies</p>
              <p className="mt-2 text-xl font-semibold">Gym access</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Coaching</p>
              <p className="mt-2 text-xl font-semibold">Progress notes</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-white/10" />
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest px-2">Location:</span>
            <LocationPicker compact />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest px-2">Category:</span>
            <select
              className="bg-slate-100 border-none rounded-full py-2 px-4 text-xs font-bold text-ink/70 focus:ring-2 focus:ring-brand-blue/20 outline-none cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <section className="mt-8">
          <SectionTitle
            kicker="Packages"
            title="Pick the plan that fits your rhythm"
            subtitle="Save more with multi-class bundles and enjoy extra perks."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-3xl bg-white/40" />
              ))
            ) : classOptions.length > 0 ? (
              classOptions.map((item) => (
                <div
                  key={item._id}
                  className={`relative overflow-hidden rounded-3xl border ${item.isFeatured ? 'border-coral/40 bg-white shadow-glow' : 'border-white/60 bg-white/80'} p-6`}
                >
                  {/* Promotion Sash */}
                  {item.activePromotions?.length > 0 && (
                    <div className="absolute top-0 left-0 z-10">
                      <div className="bg-coral text-white text-[8px] font-black uppercase tracking-widest py-1.5 px-8 -rotate-45 -translate-x-[25%] translate-y-[20%] shadow-lg">
                        {item.activePromotions[0].promoType === 'bogo' ? 'BOGO 1+1' : 
                         item.activePromotions[0].promoType === 'flash' ? 'FLASH' : 
                         item.activePromotions[0].promoType === 'percentage' ? `${item.activePromotions[0].discountValue}% OFF` :
                         'OFFER'}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4 mt-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${item.sessionType === 'personal' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {item.sessionType || 'Group'} Session
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {item.validDays === 'both' ? 'All Days' : item.validDays === 'weekday' ? 'Weekdays' : 'Weekends'}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl font-black text-ink leading-tight">{item.name}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">Price</p>
                      <div className="flex flex-col items-end">
                        {item.activePromotions?.length > 0 ? (
                          <>
                            <p className="text-xs font-bold text-slate-300 line-through">
                              {item.price.toLocaleString()} {currency}
                            </p>
                            <p className="text-3xl font-black text-coral">
                              {Math.round(
                                item.activePromotions[0].discountType === 'percentage'
                                  ? item.price * (1 - item.activePromotions[0].discountValue / 100)
                                  : Math.max(0, item.price - item.activePromotions[0].discountValue)
                              ).toLocaleString()}
                              <span className="text-xs ml-1 opacity-40">{currency}</span>
                            </p>
                          </>
                        ) : (
                          <p className="text-3xl font-black text-brand-blue">
                            {item.price.toLocaleString()}
                            <span className="text-xs ml-1 opacity-40">{currency}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-ink/40">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      {item.classesIncluded || (item.type === 'dropin' ? '1' : 'Unlimited')} Classes
                    </span>
                    {(item.durationValue && item.durationUnit) ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {item.durationValue} {item.durationUnit.charAt(0).toUpperCase() + item.durationUnit.slice(1)}
                      </span>
                    ) : item.durationWeeks ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {Math.round(item.durationWeeks * 10) / 10} Weeks
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="flex flex-wrap items-center">
                    {item.bonusQuantity > 0 && (
                      <div className="mt-3 mr-2 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border border-emerald-100/50 shadow-sm">
                        <span>🎁</span>
                        {item.bonusItemType === 'same' 
                          ? `+${item.bonusQuantity} FREE ${item.bonusQuantity === 1 ? 'Class' : 'Classes'}`
                          : `+${item.bonusQuantity} FREE ${item.bonusQuantity === 1 ? 'Class' : 'Classes'} of ${item.bonusItemName}`
                        }
                      </div>
                    )}
                    {item.bonuses && item.bonuses.map((b, idx) => b.quantity > 0 && (
                      <div key={idx} className="mt-3 mr-2 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border border-emerald-100/50 shadow-sm">
                        <span>🎁</span>
                        {b.itemType === 'same'
                          ? `+${b.quantity} FREE ${b.quantity === 1 ? 'Class' : 'Classes'}`
                          : `+${b.quantity} FREE ${b.quantity === 1 ? 'Class' : 'Classes'} of ${b.itemName}`
                        }
                      </div>
                    ))}
                  </div>

                  {item.benefits && item.benefits.length > 0 && (
                    <div className="mt-6 border-t border-slate-50 pt-4 flex flex-wrap gap-x-4 gap-y-2">
                      {item.benefits.map((benefit, bi) => (
                        <div key={bi} className="flex items-center gap-2 text-xs font-bold text-ink/60">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                           {benefit}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setDetailsPlan(item)}
                      className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-ink/70 transition-transform hover:bg-slate-200 active:scale-95"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => openCheckout(item)}
                      className="flex-1 rounded-2xl bg-brand-blue py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/50 md:col-span-2">No class packs available for this location.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="section-soft rounded-[32px] p-8">
            <SectionTitle kicker="Terms" title="Price per term" />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {termPricing.map((term) => (
                <div key={term._id} className="rounded-2xl border bg-white/80 p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-ink/70 font-bold">{term.name}</p>
                    <p className="mt-2 text-2xl font-black text-ocean">{term.price.toLocaleString()} {currency}</p>
                  </div>
                  <button
                    onClick={() => openCheckout(term)}
                    className="mt-5 w-full rounded-xl bg-orange-100 py-3 text-sm font-bold text-orange-600 transition-transform hover:bg-orange-200 active:scale-95"
                  >
                    Buy Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Details Modal */}
      {detailsPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm" onClick={() => setDetailsPlan(null)}>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header with Close Button */}
            <div className="flex items-start justify-between mb-5 shrink-0">
              <div className="pr-4">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue/40">Membership Details</span>
                <h2 className="text-2xl md:text-3xl font-black text-ink mt-1 leading-tight">{detailsPlan.name}</h2>
              </div>
              <button 
                onClick={() => setDetailsPlan(null)}
                className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-slate-50 flex items-center justify-center text-ink/30 hover:bg-slate-100 hover:text-coral transition-all"
                title="Close"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
              {/* Tagline */}
              {detailsPlan.tagline && (
                <p className="text-sm font-bold text-ink/50 italic leading-relaxed">"{detailsPlan.tagline}"</p>
              )}

              {/* Core Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                  <p className="text-[9px] font-black uppercase text-ink/30 mb-1">Entitlement</p>
                  <p className="text-xl font-black text-brand-blue">
                    {detailsPlan.type === 'credit-based' ? `${detailsPlan.creditsIncluded} Credits` : (detailsPlan.classesIncluded || '∞ Unlimited')}
                  </p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                  <p className="text-[9px] font-black uppercase text-ink/30 mb-1">Validity</p>
                  <p className="text-xl font-black text-brand-blue">{detailsPlan.validity || `${detailsPlan.durationWeeks} Weeks`}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {detailsPlan.bonusQuantity > 0 && (
                   <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 animate-in slide-in-from-bottom-2 duration-300">
                      <span className="text-3xl">🎁</span>
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Bonus Reward Included</p>
                         <p className="text-lg font-black text-ink">
                           {detailsPlan.bonusItemType === 'same'
                             ? `${detailsPlan.bonusQuantity} Free ${detailsPlan.bonusQuantity === 1 ? 'Class' : 'Classes'}!`
                             : `${detailsPlan.bonusQuantity} Free ${detailsPlan.bonusQuantity === 1 ? 'Class' : 'Classes'} of ${detailsPlan.bonusItemName}!`
                           }
                         </p>
                         <p className="text-[10px] font-bold text-ink/50 mt-1">
                            You will receive these bonus sessions automatically upon purchasing this plan.
                         </p>
                      </div>
                   </div>
                )}
                {detailsPlan.bonuses && detailsPlan.bonuses.map((b, idx) => b.quantity > 0 && (
                   <div key={`b-${idx}`} className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 animate-in slide-in-from-bottom-2 duration-300">
                      <span className="text-3xl">🎁</span>
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Additional Bonus Reward</p>
                         <p className="text-lg font-black text-ink">
                           {b.itemType === 'same'
                             ? `${b.quantity} Free ${b.quantity === 1 ? 'Class' : 'Classes'}!`
                             : `${b.quantity} Free ${b.quantity === 1 ? 'Class' : 'Classes'} of ${b.itemName}!`
                           }
                         </p>
                         <p className="text-[10px] font-bold text-ink/50 mt-1">
                            You will receive these bonus sessions automatically upon purchasing this plan.
                         </p>
                      </div>
                   </div>
                ))}
              </div>

              {/* Advanced Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/30 border border-indigo-50">
                    <span className="text-lg">🏋️</span>
                    <div>
                       <p className="text-[8px] font-black uppercase text-indigo-400">Session Mode</p>
                       <p className="text-xs font-bold text-ink capitalize">{detailsPlan.sessionType || 'Group'} Session</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/30 border border-emerald-50">
                    <span className="text-lg">🗓️</span>
                    <div>
                       <p className="text-[8px] font-black uppercase text-emerald-500">Access Days</p>
                       <p className="text-xs font-bold text-ink capitalize">{detailsPlan.validDays === 'both' ? 'All Days' : detailsPlan.validDays}</p>
                    </div>
                 </div>
              </div>

              {/* Trainer Info (Added) */}
              {detailsPlan.trainerId && (
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 animate-in slide-in-from-bottom-2 duration-300">
                    {detailsPlan.trainerId.avatarUrl ? (
                       <img src={detailsPlan.trainerId.avatarUrl} alt={detailsPlan.trainerId.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                       <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-xl">👤</div>
                    )}
                    <div>
                       <p className="text-[9px] font-black uppercase tracking-widest text-brand-blue">Dedicated Trainer</p>
                       <p className="text-sm font-black text-ink">{detailsPlan.trainerId.name}</p>
                       <p className="text-[9px] font-bold text-ink/40 uppercase">Assigned for all sessions</p>
                    </div>
                 </div>
              )}

              {/* Limits & Rules */}
              <div className="bg-brand-blue/5 rounded-3xl p-5 space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">Membership Rules</p>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink/60">Daily Booking Limit</span>
                    <span className="text-xs font-black text-ink">{detailsPlan.dailyBookingLimit > 0 ? `${detailsPlan.dailyBookingLimit} Classes` : 'Unlimited'}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink/60">Cancel Window</span>
                    <span className="text-xs font-black text-ink">{detailsPlan.extensionRules?.cancellationWindow || 6} Hours</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink/60">Freeze Option</span>
                    <span className="text-xs font-black text-emerald-600">{detailsPlan.extensionRules?.allowFreezing ? '✓ Supported' : '× Not Supported'}</span>
                 </div>
              </div>

              {/* Benefits Section */}
              {detailsPlan.benefits?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/30 pl-1">Included Benefits</p>
                  <ul className="space-y-2.5">
                    {detailsPlan.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold text-ink/70 bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">✓</div>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>


            
            <div className="mt-4 pt-4 border-t border-slate-50 shrink-0">
               <button
                 onClick={() => { setDetailsPlan(null); openCheckout(detailsPlan); }}
                 className="w-full rounded-2xl bg-brand-blue py-4 md:py-5 text-white font-black shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
               >
                 Book This Plan
               </button>
               <p className="text-[8px] md:text-[9px] font-bold text-ink/20 text-center uppercase tracking-widest mt-3">Safe & Secure Payment via Stripe</p>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brand-blue p-8 text-white shrink-0 relative">
              <button onClick={closeCheckout} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">×</button>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
                {checkoutStep === 1 ? 'Step 1: Scheduling' : 'Step 2: Payment'}
              </p>
              <h3 className="text-2xl font-black">{selectedPlan.name} — {selectedPlan.price} {currency}</h3>
              {checkoutStep === 2 && (
                <button onClick={() => setCheckoutStep(1)} className="mt-4 text-[10px] font-black uppercase tracking-widest border border-white/30 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all">← Back to scheduling</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {error && <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-sm font-bold border border-rose-100">⚠️ {error}</div>}
              {message && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold border border-emerald-100">✅ {message}</div>}

              {checkoutStep === 1 ? (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-ink/30 ml-2 mb-2 block">1. Select Child</label>
                    <select
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold focus:ring-4 focus:ring-brand-blue/5 outline-none"
                    >
                      <option value="">Choose a child...</option>
                      <option value="self">Book for Self (Account Holder)</option>
                      {children.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-ink/30 ml-2 mb-2 block">2. Training Days {selectedPlan?.sessionsPerWeek > 0 ? `(Max ${selectedPlan.sessionsPerWeek} days/week)` : ''}</label>
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-3xl">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const isWeekend = day === 'Sat' || day === 'Sun';
                        const isSelected = preferredDays.includes(day);
                        const isLimitReached = !isSelected && selectedPlan?.sessionsPerWeek > 0 && preferredDays.length >= selectedPlan.sessionsPerWeek;
                        const isDisabled = (selectedPlan.validDays === 'weekday' && isWeekend) || (selectedPlan.validDays === 'weekend' && !isWeekend) || isLimitReached;
                        
                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setPreferredDays(prev => isSelected ? prev.filter(d => d !== day) : [...prev, day])}
                            className={`rounded-xl py-2.5 text-xs font-black transition-all ${isDisabled ? 'opacity-20 cursor-not-allowed' : isSelected ? 'bg-brand-blue text-white shadow-lg' : 'bg-white text-ink/40 shadow-sm'}`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-ink/30 ml-2 mb-2 block">3. Time Slots</label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-3xl">
                      {selectedPlan.timeSlots?.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setPreferredSlots(prev => preferredSlots.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot])}
                          className={`rounded-xl py-2.5 text-[10px] font-black transition-all ${preferredSlots.includes(slot) ? 'bg-brand-blue text-white' : 'bg-white text-ink/40'}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-left">
                     <label className="text-[10px] font-black uppercase text-ink/30 ml-2 mb-2 block">4. Membership Start Date</label>
                     <div className="bg-slate-50 p-4 rounded-3xl">
                        <input 
                           type="date"
                           min={new Date().toISOString().split('T')[0]}
                           value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                           className="w-full bg-white rounded-xl py-3 px-4 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                        />
                        <p className="text-[9px] font-bold text-ink/20 uppercase tracking-widest mt-3 ml-1">
                           Your membership will end on {(() => {
                              const d = new Date(startDate);
                              if (selectedPlan.type === 'subscription' && selectedPlan.billingCycle) {
                                 if (selectedPlan.billingCycle === 'weekly') d.setDate(d.getDate() + 7);
                                 else if (selectedPlan.billingCycle === 'monthly') d.setMonth(d.getMonth() + 1);
                                 else if (selectedPlan.billingCycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
                              } else if (selectedPlan.durationWeeks) {
                                 d.setDate(d.getDate() + (selectedPlan.durationWeeks * 7));
                              }
                              return d.toLocaleDateString();
                           })()}
                        </p>
                     </div>
                  </div>

                  {applicablePromos.length > 0 && (
                    <div className="pt-6 border-t border-slate-100 text-left">
                      <label className="text-[10px] font-black uppercase text-brand-blue mb-4 block">Offers Available</label>
                      <div className="space-y-3">
                        {applicablePromos.map(promo => (
                          <button
                            key={promo._id}
                            type="button"
                            onClick={() => setSelectedPromo(selectedPromo?._id === promo._id ? null : promo)}
                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${selectedPromo?._id === promo._id ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-50 bg-white'}`}
                          >
                            <div className="text-left">
                              <p className="font-bold text-xs">{promo.name}</p>
                              <p className="text-[9px] font-black text-emerald-600 uppercase">
                                {promo.promoType === 'bogo' ? 'Buy 1 Get 1 FREE' : `Save ${currency} ${calculateDiscount(promo, multipliedPrice)}`}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPromo?._id === promo._id ? 'bg-brand-blue border-brand-blue text-white' : 'border-slate-100'}`}>
                              {selectedPromo?._id === promo._id ? '✓' : '+'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Voucher/Coupon Entry */}
                  <div className="pt-6 border-t border-slate-100/50">
                     <label className="text-[10px] font-black uppercase text-ink/30 ml-2 mb-2 block">Gift Voucher / Promo Code</label>
                     <div className="flex gap-2">
                        <input 
                           type="text"
                           placeholder="Enter code..."
                           value={couponInput}
                           onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                           disabled={appliedCoupon || isValidatingCoupon}
                           className="flex-1 rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-blue/5 uppercase"
                        />
                        {appliedCoupon ? (
                           <button 
                              onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                              className="px-6 rounded-2xl bg-rose-50 text-rose-500 font-black text-[10px] uppercase"
                           >
                              Remove
                           </button>
                        ) : (
                           <button 
                              onClick={handleApplyCoupon}
                              disabled={!couponInput || isValidatingCoupon}
                              className="px-6 rounded-2xl bg-ink text-white font-black text-[10px] uppercase shadow-lg disabled:opacity-30"
                           >
                              {isValidatingCoupon ? '...' : 'Apply'}
                           </button>
                        )}
                     </div>
                     {appliedCoupon && (
                        <div className="mt-2 ml-2 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase">
                           <span>🎁</span> Voucher Valid: -{currency} {appliedCoupon.amount} Applied
                        </div>
                     )}
                  </div>

                  {prorationCredit > 0 && (
                    <div className="pt-6 border-t border-slate-100/50">
                      <label className="text-[10px] font-black uppercase text-amber-500 ml-2 mb-2 block flex items-center gap-2">
                        <span>⭐</span> Plan Upgrade Proration Applied
                      </label>
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-amber-600">Credit for unused current plan</p>
                          <p className="text-[9px] font-bold text-amber-600/60 uppercase mt-0.5">Applied automatically to this checkout</p>
                        </div>
                        <p className="text-lg font-black text-amber-600">- {currency} {prorationCredit.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* BOGO Claim Choice */}
                  {selectedPromo?.promoType === 'bogo' && (
                    <div className="mt-4 border-t-2 border-dashed border-slate-100 pt-6 text-left animate-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-black text-ink tracking-tight uppercase">🎁 Claim Free Item?</p>
                          <p className="text-[10px] font-bold text-ink/30 uppercase tracking-widest mt-1">Add one more for the same price</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setClaimBogo(!claimBogo);
                            if (!claimBogo && !bogoChildId) setBogoChildId(selectedChildId);
                          }}
                          className={`w-14 h-8 rounded-full transition-all relative ${claimBogo ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${claimBogo ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {claimBogo && (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                          <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest ml-1 mb-2">Recipient for Free Item:</p>
                          <div className="grid grid-cols-2 gap-3">
                            {children.map(c => (
                              <button
                                key={c._id}
                                type="button"
                                onClick={() => setBogoChildId(c._id)}
                                className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${bogoChildId === c._id ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-50 hover:border-slate-200'}`}
                              >
                                <span className="text-lg">👧</span>
                                <div className="text-left">
                                  <p className="text-xs font-black text-ink leading-none">{c.name}</p>
                                  <p className="text-[8px] font-black text-ink/20 uppercase mt-1">{c.age} yrs</p>
                                </div>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setBogoChildId('')}
                              className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${bogoChildId === '' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-50 hover:border-slate-200'}`}
                            >
                              <span className="text-lg">👤</span>
                              <p className="text-xs font-black text-ink">Individual</p>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!selectedChildId || preferredDays.length === 0) return setError('Please complete selection.');
                      
                      const user = getUser();
                      if (selectedPlan.gender && selectedPlan.gender !== 'mixed') {
                         let pGender = '';
                         if (selectedChildId === 'self') {
                            pGender = user?.gender;
                         } else {
                            const child = children.find(c => c._id === selectedChildId);
                            pGender = child?.gender;
                         }

                         if (pGender && pGender !== 'other' && pGender !== selectedPlan.gender) {
                            return setError(`This membership is exclusively for ${selectedPlan.gender}s.`);
                         }
                      }

                      setError('');
                      setCheckoutStep(2);
                    }}
                    className="w-full rounded-2xl bg-brand-blue py-5 text-white font-black shadow-xl"
                  >
                    Continue to Payment →
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-left-4">
                  {/* Payment Method Selector */}
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-col sm:flex-row gap-4">
                      <button
                         type="button"
                         onClick={() => setPaymentType('online')}
                         className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${paymentType === 'online' ? 'border-brand-blue bg-white shadow-xl' : 'border-transparent opacity-50 hover:bg-white/50'}`}
                      >
                         <span className="text-3xl">💳</span>
                         <div className="text-center">
                            <p className="text-sm font-black text-ink">Pay Online</p>
                            <p className="text-[10px] font-bold text-ink/30 uppercase mt-1">Instant Activation</p>
                         </div>
                      </button>
                      {(globalSettings.allowCenterPayment ?? true) && (
                        <button
                          type="button"
                          onClick={() => setPaymentType('center')}
                          className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${paymentType === 'center' ? 'border-brand-blue bg-white shadow-xl' : 'border-transparent opacity-50 hover:bg-white/50'}`}
                        >
                          <span className="text-3xl">🏢</span>
                          <div className="text-center">
                              <p className="text-sm font-black text-ink">Pay at Center</p>
                              <p className="text-[10px] font-bold text-ink/30 uppercase mt-1">Cash or Card on-site</p>
                          </div>
                        </button>
                      )}
                  </div>

                  <div className="space-y-1">

                    <label className="text-[10px] font-black uppercase text-ink/30 block mb-2">Checkout Summary</label>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-ink/60">Gross Amount</span>
                        <span className="text-ink font-black">
                          {currency} {
                            (activeTax?.calculationMethod === 'inclusive' 
                              ? (activeTax.type === 'percentage' ? multipliedPrice / (1 + (activeTax.value / 100)) : Math.max(0, multipliedPrice - activeTax.value)) 
                              : multipliedPrice).toFixed(2)
                          }
                        </span>
                      </div>

                      {membershipUnits > 1 && (
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
                          <span>Capacity Multiplier (x{membershipUnits} Units)</span>
                          <span>Over {baseCapacity} weekly spots</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-[9px] font-black text-ink/30 uppercase">Subtotal</span>
                        <span className="text-sm font-black text-ink">
                          {(activeTax?.calculationMethod === 'inclusive' 
                              ? (activeTax.type === 'percentage' ? multipliedPrice / (1 + (activeTax.value / 100)) : Math.max(0, multipliedPrice - activeTax.value)) 
                              : multipliedPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                        </span>
                      </div>
                      {prorationCredit > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-[9px] font-black text-amber-500 uppercase">Proration Credit</span>
                          <span className="text-sm font-black text-amber-500">- {prorationCredit.toLocaleString()} {currency}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-[9px] font-black text-emerald-500 uppercase">Promo Discount</span>
                          <span className="text-sm font-black text-emerald-500">- {discountAmount.toLocaleString()} {currency}</span>
                        </div>
                      )}
                      {appliedCoupon && (
                        <div className="flex justify-between items-center text-emerald-600 font-bold mb-2">
                          <span className="text-[10px] uppercase tracking-widest pl-2">Voucher Redeemed</span>
                          <span className="text-sm">-{currency} {appliedCoupon.amount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-3">
                        <span className="text-ink/60">
                           VAT ({activeTax?.value}{activeTax?.type === 'percentage' ? '%' : ` ${currency}`})
                           {activeTax?.calculationMethod === 'inclusive' && <span className="block text-[8px] font-black uppercase text-brand-blue/40 tracking-widest">Included in price</span>}
                        </span>
                        <span className="text-ink">{currency} {currTaxValue.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Final Payable</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-brand-blue leading-none">{currency} {finalTotalAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-4">
                    {paymentType === 'online' ? (
                       <div className="space-y-4 animate-in fade-in duration-300">
                         <div className="space-y-4">
                           <input
                             type="text"
                             name="name"
                             value={cardForm.name}
                             onChange={handleCardChange}
                             className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold"
                             placeholder="Cardholder Name"
                             required
                           />
                           <input
                             type="text"
                             name="number"
                             value={cardForm.number}
                             onChange={handleCardChange}
                             className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold font-mono"
                             placeholder="Card Number"
                             required
                           />
                           <div className="grid grid-cols-2 gap-4">
                             <input
                               type="text"
                               name="expiry"
                               value={cardForm.expiry}
                               onChange={handleCardChange}
                               className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold text-center"
                               placeholder="MM/YY"
                               required
                             />
                             <input
                               type="password"
                               name="cvc"
                               value={cardForm.cvc}
                               onChange={handleCardChange}
                               className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold text-center"
                               placeholder="CVC"
                               required
                             />
                           </div>
                         </div>
                         <button 
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full rounded-2xl bg-brand-blue py-5 text-white font-black shadow-xl mt-4 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                         >
                           {isProcessing ? (
                              <>
                                 <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                 <span>Processing...</span>
                              </>
                           ) : (
                              <>
                                 <span>🔒 Securely Pay {currency} {finalTotalAmount.toFixed(2)}</span>
                              </>
                           )}
                         </button>
                         <p className="text-center text-[10px] font-bold text-ink/20 uppercase tracking-widest pt-2">Protected by 256-bit SSL encryption</p>
                       </div>
                    ) : (
                       <div className="animate-in slide-in-from-top-4 duration-500">
                          <div className="p-8 rounded-[32px] bg-emerald-50/50 border-2 border-dashed border-emerald-200 text-center mb-6">
                             <span className="text-4xl block mb-4">✅</span>
                             <h4 className="text-lg font-black text-emerald-900 mb-2">Ready to Book?</h4>
                             <p className="text-sm text-emerald-700/70 font-bold leading-relaxed">
                                You will pay at the reception when you visit the center. Your sessions will be held for you.
                             </p>
                          </div>
                          <button 
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full rounded-2xl bg-brand-blue py-5 text-white font-black shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? (
                               <>
                                  <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Confirming...</span>
                               </>
                            ) : (
                               <>
                                  <span>Confirm Booking & Pay at Center →</span>
                               </>
                            )}
                          </button>
                       </div>
                    )}
                  </form>
                </div>

              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
