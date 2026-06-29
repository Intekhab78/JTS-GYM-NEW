import { getImageUrl  } from '../api/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyChild = {
  firstName: '',
  lastName: '',
  gender: 'male',
  birthDate: '',
  school: '',
  medicalCondition: '',
  photoUrl: ''
};

export default function Register() {
  const { currency } = useSettings();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirmation: '',
    phone: '+971',
    firstName: '',
    lastName: '',
    instagram: '',
    gender: 'male',
    relationship: '',
    birthDate: '',
    address: '',
    city: '',
    country: 'United Arab Emirates',
    locationId: '',
    avatarUrl: '',
    children: [{ ...emptyChild }]
  });

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get('/locations').then(res => setLocations(res.data || [])).catch(() => { });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChildChange = (index, e) => {
    const { name, value } = e.target;
    const newChildren = [...form.children];
    newChildren[index][name] = value;
    setForm(prev => ({ ...prev, children: newChildren }));
  };

  const addChild = () => {
    setForm(prev => ({ ...prev, children: [...prev.children, { ...emptyChild }] }));
  };

  const removeChild = (index) => {
    if (form.children.length > 1) {
      setForm(prev => ({ ...prev, children: prev.children.filter((_, i) => i !== index) }));
    }
  };

  const handleFileUpload = async (e, type, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const { data } = await api.post('/upload', formData, config);

      if (type === 'parent') {
        setForm(prev => ({ ...prev, avatarUrl: data.image }));
      } else {
        const newChildren = [...form.children];
        newChildren[index].photoUrl = data.image;
        setForm(prev => ({ ...prev, children: newChildren }));
      }
    } catch (err) {
      alert('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.email || !form.password || !form.locationId) {
        setError('Please fill in all required customer fields.');
        return;
      }
      if (form.password !== form.passwordConfirmation) {
        setError('Passwords do not match.');
        return;
      }
    }
    setError('');
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    const payload = {
      ...form,
      locationIds: form.locationId ? [form.locationId] : [],
      name: `${form.firstName} ${form.lastName}`.trim()
    };

    try {
      const res = await api.post('/auth/register', payload);
      login(res.data);
      if (redirect) {
        navigate(redirect);
      } else {
        navigate(res.data.role === 'admin' || res.data.role === 'superadmin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> Preferred Branch
          </label>
          <select
            name="locationId"
            value={form.locationId}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            required
          >
            <option value="">Select Branch</option>
            {locations.map(loc => (
              <option key={loc._id} value={loc._id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70">Customer Photo</label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'parent')}
              className="block w-full text-xs text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-xs file:font-semibold
                file:bg-ocean/10 file:text-ocean
                hover:file:bg-ocean/20 transition-all
                cursor-pointer"
            />
            {form.avatarUrl && (
              <img src={getImageUrl(form.avatarUrl)} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt="Preview" />
            )}
            {uploading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-ocean border-t-transparent" />}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> First Name
          </label>
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="e.g. John"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> Last Name
          </label>
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="e.g. Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70">Instagram Handle</label>
          <input
            name="instagram"
            value={form.instagram}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="@username"
          />
          <p className="text-[10px] text-ink/40 mt-1 italic">Earn loyalty points with your Instagram posts!</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> Email Address
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="john@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> Password
          </label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="Minimum 6 characters"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> Confirm Password
          </label>
          <input
            name="passwordConfirmation"
            type="password"
            value={form.passwordConfirmation}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="Confirm your password"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> Gender
          </label>
          <div className="flex gap-4 p-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="gender" value="male" checked={form.gender === 'male'} onChange={handleChange} className="text-ocean focus:ring-ocean" />
              <span className="text-sm font-semibold group-hover:text-ocean transition-colors">Male</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="gender" value="female" checked={form.gender === 'female'} onChange={handleChange} className="text-ocean focus:ring-ocean" />
              <span className="text-sm font-semibold group-hover:text-ocean transition-colors">Female</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70">Relationship</label>
          <select
            name="relationship"
            value={form.relationship}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
          >
            <option value="">Select Relationship</option>
            <option value="father">Father</option>
            <option value="mother">Mother</option>
            <option value="guardian">Guardian</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> Mobile Number
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="+971 50 XXXXXXX"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70">Customer Birth Date</label>
          <input
            name="birthDate"
            type="date"
            value={form.birthDate}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-2">
          <label className="text-sm font-bold text-ink/70">Country</label>
          <input
            name="country"
            value={form.country}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-100 p-3.5 text-sm cursor-not-allowed"
            readOnly
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
            <span className="text-coral">*</span> City
          </label>
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0"
            placeholder="e.g. Dubai"
            required
          />
        </div>
        <div className="md:col-span-3 space-y-2">
          <label className="text-sm font-bold text-ink/70">Address</label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full rounded-2xl border-slate-200 bg-slate-50 p-3.5 text-sm focus:border-ocean focus:ring-0 min-h-[100px]"
            placeholder="Your full address"
          />
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <button
          type="button"
          onClick={nextStep}
          className="rounded-full bg-ocean px-10 py-3.5 text-sm font-black text-white shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          Next: Customer Info
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      {form.children.map((child, index) => (
        <div key={index} className="relative p-6 rounded-[32px] border-2 border-slate-100 bg-slate-50/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-ocean/10 text-ocean flex items-center justify-center text-xs">
                {index + 1}
              </span>
              Customer Information
            </h3>
            {form.children.length > 1 && (
              <button
                type="button"
                onClick={() => removeChild(index)}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
                <span className="text-coral">*</span> First Name
              </label>
              <input
                name="firstName"
                value={child.firstName}
                onChange={(e) => handleChildChange(index, e)}
                className="w-full rounded-2xl border-slate-200 bg-white p-3.5 text-sm focus:border-ocean focus:ring-0"
                placeholder="Customer's first name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink/70">Last Name</label>
              <input
                name="lastName"
                value={child.lastName}
                onChange={(e) => handleChildChange(index, e)}
                className="w-full rounded-2xl border-slate-200 bg-white p-3.5 text-sm focus:border-ocean focus:ring-0"
                placeholder="Customer's last name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
                <span className="text-coral">*</span> Gender
              </label>
              <div className="flex gap-4 p-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name={`gender-${index}`} value="male" checked={child.gender === 'male'} onChange={(e) => handleChildChange(index, { target: { name: 'gender', value: 'male' } })} className="text-ocean focus:ring-ocean" />
                  <span className="text-sm font-semibold group-hover:text-ocean transition-colors">Boy</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name={`gender-${index}`} value="female" checked={child.gender === 'female'} onChange={(e) => handleChildChange(index, { target: { name: 'gender', value: 'female' } })} className="text-ocean focus:ring-ocean" />
                  <span className="text-sm font-semibold group-hover:text-ocean transition-colors">Girl</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink/70 flex items-center gap-1">
                <span className="text-coral">*</span> Date of Birth
              </label>
              <input
                name="birthDate"
                type="date"
                value={child.birthDate}
                onChange={(e) => handleChildChange(index, e)}
                className="w-full rounded-2xl border-slate-200 bg-white p-3.5 text-sm focus:border-ocean focus:ring-0"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink/70">School</label>
              <input
                name="school"
                value={child.school}
                onChange={(e) => handleChildChange(index, e)}
                className="w-full rounded-2xl border-slate-200 bg-white p-3.5 text-sm focus:border-ocean focus:ring-0"
                placeholder="e.g. Dubai British School"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink/70">Medical Conditions</label>
              <input
                name="medicalCondition"
                value={child.medicalCondition}
                onChange={(e) => handleChildChange(index, e)}
                className="w-full rounded-2xl border-slate-200 bg-white p-3.5 text-sm focus:border-ocean focus:ring-0"
                placeholder="e.g. Asthma, Allergies, None"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-ink/70">Customer Photo</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'child', index)}
                  className="block w-full text-xs text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-xs file:font-semibold
                    file:bg-ocean/10 file:text-ocean
                    hover:file:bg-ocean/20 transition-all
                    cursor-pointer"
                />
                {child.photoUrl && (
                  <img src={getImageUrl(child.photoUrl)} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt="Preview" />
                )}
                {uploading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-ocean border-t-transparent" />}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={addChild}
          className="flex items-center gap-2 rounded-full border-2 border-dashed border-slate-200 px-6 py-3 text-sm font-bold text-ink/60 hover:border-ocean hover:text-ocean transition-all"
        >
          <span className="text-xl">+</span> Add Another Customer
        </button>
      </div>

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={prevStep}
          className="rounded-full bg-slate-100 px-10 py-3.5 text-sm font-bold text-ink hover:bg-slate-200 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="rounded-full bg-ocean px-10 py-3.5 text-sm font-black text-white shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          Next: Final T&C
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="rounded-[32px] border-2 border-slate-100 p-8 bg-slate-50/30">
        <h3 className="text-lg font-bold text-ink mb-4">Terms & Conditions</h3>
        <div className="max-h-96 overflow-y-auto pr-4 text-[10px] leading-relaxed text-ink/60 space-y-4 whitespace-pre-wrap font-sans">
          <p className="font-bold text-xs text-ink mb-4 uppercase tracking-widest border-b pb-2">Terms & Conditions</p>
          <p> These Terms & Conditions are administered on behalf of My First Gym / trading as MY FIRST GYM. References to ‘we’, ‘us’ and ‘our’ are references to the My First Gym / trading as MY FIRST GYM, registered in the UAE, and whose registered office is at, Abu Dhabi and Dubai, UAE. My First Gym maintains the website (www.myfirstgym.com). </p>
          <p> References to ‘you’, ‘your’ and ‘yours’, and after acceptance, the member, are references to the individual completing the membership application form. </p>
          <p> You must be aged 18 or over to be a customer, guardian, or responsible of a dependent member of the facility and to register his or her membership via our website. </p>
          <p> If you are under the age of 18 you are not eligible to be a member or to register via our website. You should seek the support of your customer or guardian to become a member. </p>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">PRINCIPLE TERMS</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>This agreement commences once you have indicated your acceptance of our Terms and Conditions in the declaration section of the web sign up process and clicked the JOIN NOW button.</li>
            <li>All new memberships are subject to the approval of the management. The management reserves the right to reject an application for membership to the facility for any reason whatsoever, in their absolute discretion.</li>
            <li>Your membership starts immediately (or when the facility opens in the case of a pre-sale membership).</li>
            <li>This agreement will become binding on you and us and you will be entitled to all the rights and privileges exercisable for the type of services or membership chosen.</li>
            <li>You cannot transfer this agreement to anyone else.</li>
            <li>The Laws of the United Arab Emirates shall govern the Terms & Conditions, without regards to conflict of laws principals. All disputes arising in connection therewith shall be heard only by a court of competent jurisdiction in U.A.E.</li>
            <li>We will not trade with or provide any services to OFAC and sanctioned countries.</li>
            <li>United Arab Emirates is our Country of Domicile. MY FIRST GYM controls this site from the U.A.E. MY FIRST GYM makes no representation that this site is appropriate for use in other locations. If you use this site from other locations you are responsible for ensuring compliance with local laws. You may not use, export or re-export any materials from this site in violation of any applicable laws or regulations, including, but not limited to any U.A.E export laws and regulations.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">PHYSICAL HEALTH OF MEMBER</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>In accepting these Terms & Conditions the member warrants and also represents that he/she is in good health and is not knowingly incapable of engaging in either active or passive exercise. The member further warrants that such exercise would not be detrimental to their health, safety, comfort, well-being or physical condition.</li>
            <li>The member shall not use any MY FIRST GYM facilities whilst suffering from any infections or contagious illness, disease or other ailment such as open cuts, abrasions, open sores or minor infection, where there is a risk that such use may be detrimental to the health, safety, comfort or physical condition of other members.</li>
            <li>Before using a MY FIRST GYM facility, the member must read and confirm agreement of our Member Health Declaration Form by clicking the “Join Now” button.</li>
            <li>If a member is taking medication and is aware of a condition that may affect them taking part in exercise a doctor’s letter would be needed.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">FEES AND CHARGES</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>All published membership or other fees and other charges are exclusive of any taxes (e.g. VAT). Should any taxes be imposed in connection with the provision of our services, you undertake to be liable for the payment thereof in additional to the headline Membership Fees.</li>
            <li>The “Monthly Recurring Payment” or “Recurring Payment” means the MY FIRST GYM monthly membership fee corresponding to the purchased membership option, and determined by the membership type and membership term at the point of joining.</li>
            <li>The monthly membership fee or Monthly Recurring Payment is due each month in full, upfront, in advance and with the exception of cancellations under the terms detailed below, no partial refund of the monthly membership fee will be made unless you are cancelling under cooling-off regulations detailed below.</li>
            <li>A “Joining Fee” will be charged upon becoming a member. The Joining Fee is a one-off payment at the point of becoming a member and is applied to cover the initial administration costs associated with setting up a new membership and recurring payment agreement and entitles you to a free trial class.</li>
            <li>During certain special offer periods (e.g. pre-opening) the MY FIRST GYM management may in its sole discretion choose to remove or reduce the Joining Fee.</li>
            <li>The Joining Fee (if one is payable/applicable at the time of you joining) and first Monthly Recurring Payment are collected from you by us either by Debit or Credit card at time of purchase at the same time as you become a member.</li>
            <li>Your second Monthly Recurring Payment will be collected one month after you joined, unless you joined prior to your facility opening in which case it will be collected one month after the facility has opened. Subsequent Monthly Recurring Payments for monthly membership fees will be collected monthly thereafter.</li>
            <li>If any Monthly Recurring Payment is returned unpaid or any cheque is returned unpaid or if any other form of payment is not honoured for whatever reason, you shall pay us on demand an administration fee of {currency} 200. If, despite us having notified you of a missed payment, further payments are missed, we reserve the right to, at our sole election, either suspend or terminate your membership. If you are ever over 30 days in arrears on a missed monthly payment then we reserve the right to bill you immediately after the 30 day grace period for the remaining contract value without any prior notification.</li>
            <li>You are obligated to make the minimum number of Monthly Recurring Payments stated in your choice of membership. You are obligated to make every Recurring Payment regardless of non-attendance, except where the cancellation terms below are met.</li>
            <li>The date of your Monthly recurring Payment is likely to be the same date on each month as the first Monthly Recurring Payment. You are unable to amend the date of your Recurring Payment but we reserve the right to amend the date of your Monthly Recurring Payment at our sole discretion.</li>
            <li>Once you have completed the minimum number of Monthly Recurring Payments as stated in your membership choice we will automatically continue collecting Monthly Recurring Payments every month. Your membership will be extended by one month for each payment (“Renewal Period”).</li>
            <li>If you have fulfilled your commitment to the membership you have joined, you may prevent the Automatic Renewal Period at any time by visiting the MY FIRST GYM website and submitting an online cancellation form (you should give us not less than 30 days’ notice).</li>
            <li>You agree to advise us immediately of any change to the Members Details provided.</li>
            <li>You agree to retain a copy of all transaction records and you are responsible for maintaining the confidentiality of your account.</li>
            <li>All credit/debit cards’ details and personally identifiable information will NOT be sold, shared, rented or leased to any third parties.</li>
            <li>MY FIRST GYM will not pass any debit/credit card details to third parties’.</li>
            <li>MY FIRST GYM takes appropriate steps to ensure data privacy and security including through various hardware and software methodologies. However, MY FIRST GYM cannot guarantee the security of any information that is disclosed online</li>
            <li>MY FIRST GYM is not responsible for the privacy policies of websites to which it links. If you provide any information to such third parties different rules regarding the collection and use of your personal information may apply. You should contact these entities directly if you have any questions about their use of the information that they collect.</li>
            <li>The Website Policies and Terms & Conditions may be changed or updated occasionally to meet the requirements and standards. Therefore, the Customers’ are encouraged to frequently visit these sections to be updated about the changes on the website. Modifications will be effective on the day they are posted.</li>
            <li>From time to time we may need to increase the price of your membership. We will give you at least 1 full months’ notice of any incoming price increase and will make it very clear when the price increase will take effect and how much your membership will cost after the increase. During this period you will have your usual right to terminate your membership in accordance with the membership terms and conditions and rules. If you do not terminate the membership by the date given to you in the notice then the price of your membership will be increased in accordance with our notice.</li>
            <li>If you fail to pay any amount due under this agreement for a period of more than thirty days, then we may pass the debt to a third-party company for collection or take legal/police action against you. The reasonable and direct costs incurred in employing the third party company will be borne by you including costs in tracing you if you have changed your address or contact without telling us.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">PAYMENT METHOD</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>We accept payment by Visa or Mastercard debit and credit cards in {currency} for our memberships and other products and services. All online purchases are also governed by the terms and conditions of respective merchant service providers. Please review respective merchant service provider’s user agreement and privacy policy before entering any transaction.</li>
            <li>Payment confirmation via email to the email address you provide at the point of registration will be issued within 24 hours of successful processing of your payment.</li>
            <li>You, as the cardholder must retain a copy of transaction records and Merchant policies and rules.</li>
            <li>You are responsible for maintaining the confidentiality of your membership account and payment details.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">CANCELLATION AND REFUNDS</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>If you joined online from the website or from the mobile application, you have either 14 full days after joining if you do not attend or 24 hours post your first visit to cancel this agreement for any reason.</li>
            <li>If you exercise this right to cancel we will reimburse you all membership fee payments received from you. If you have used the facility before requesting to cancel then we will reduce your membership fee refund by a pro rata amount equal to the number of days from joining to the date cancellation was requested.</li>
            <li>If you joined as a member inside our premises or at an event outside our facility, you have no legal entitlement to a cooling-off period.</li>
            <li>The Joining Fee is not refundable under any circumstances.</li>
            <li>Following the above mentioned 14 day period, the initial membership payment and each subsequent Monthly Recurring Payment made is not refundable under any circumstances but you may cancel your membership subject to the following cancellation polices.</li>
            <li>We will manage and process the cancellation of your membership upon receipt of a properly submitted cancellation request. Should your Recurring Payment be cancelled without submission of a cancellation request form at any time you may incur fees as a result of any missed payments. If you wish to have confirmation of any amendments to your account at any stage please contact a member of the MY FIRST GYM team.</li>
            <li>Refunds will be made onto the original mode of payment and will be processed within 10 to 20 days depends on the issuing bank of the credit card.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">CANCELATION WITHIN CONTRACT</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Relocation: This agreement can be cancelled in the event that your new permanent address is outside Dubai upon MY FIRST GYM satisfactory receipt of proof of your relocation and new address.</li>
            <li>Long term (over 3 month) illness or injury: This agreement may be cancelled in the event of an illness, injury or medical condition which in the written opinion of a doctor or other suitably qualified medical practitioner prohibits exercise for 3 months or longer upon appropriate proof being provided. The writing opinion must be dated within 30 days of the request to cancel.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">FREEZING</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Temporary Illness or Injury: This agreement may be frozen for a minimum of 1 month and/or maximum of 3 months in the event of a temporary illness, injury or medical condition which in the written opinion of a doctor or other suitably qualified medical practitioner prohibits exercise for a period of time.</li>
            <li>A freeze period does not affect the Minimum number of Monthly Recurring Payments you are due to make and any payments remaining at the time of the freeze will remain due and recommence on a monthly basis once the freeze period has completed.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">HEALTH AND SAFETY</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>All members are required to accept our “Member Health Declaration Form” at the point of registration and before commencing any exercise within the facility.</li>
            <li>While every precaution is taken to maintain safety standards, all equipment and facilities are used entirely at the members or guests own risk. Any malfunction of equipment noted should be reported to a member of staff as soon as it is noticed.</li>
            <li>Members or guests may not use the facilities whilst under the influence of alcohol, narcotics or other mood altering substances.</li>
            <li>MY FIRST GYM operates a strict no smoking policy.</li>
          </ul>

          <p className="font-bold text-ink pt-2 uppercase tracking-tighter">BEHAVIOUR</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Members and guests must treat MY FIRST GYM facilities and one another with respect; failure to comply shall constitute a serious breach of the terms of membership, and could result in the loss of membership.</li>
            <li>Any anti-social or offensive behavior will result in the member or guest being immediately evicted from the gym and your membership cancelled.</li>
          </ul>
        </div>
        <div className="mt-8">
          <label className="flex items-start gap-4 cursor-pointer group">
            <input type="checkbox" required className="mt-1 text-ocean focus:ring-ocean rounded" />
            <span className="text-sm font-bold text-ink">
              I agree to My First Gym's Terms and Conditions and <Link to="/health-declaration" className="text-blue-600 hover:underline">Member Health Declaration</Link>.
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={prevStep}
          className="rounded-full bg-slate-100 px-10 py-3.5 text-sm font-bold text-ink hover:bg-slate-200 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full bg-coral px-12 py-4 text-base font-black text-white shadow-xl hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-3"
        >
          {uploading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {uploading ? 'Processing...' : 'Complete Registration'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 md:py-20">
        <div className="mb-12 text-center">
          <h1 className="font-display text-4xl md:text-5xl text-brand-blue">Join the Family</h1>
          <p className="mt-3 text-lg text-ink/60">Your journey to joy and fitness begins here.</p>
        </div>

        {/* Stepper */}
        <div className="relative mb-16 px-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2" />
          <div className="relative flex justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 relative z-10 ${step >= s ? 'bg-ocean text-white shadow-lg' : 'bg-white text-slate-300 border-2 border-slate-200'
                    }`}
                >
                  {s}
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${step >= s ? 'text-ocean' : 'text-slate-300'}`}>
                  {s === 1 ? 'Customer Info' : s === 2 ? 'Dependent Info' : 'Terms'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[40px] bg-white p-8 md:p-12 shadow-2xl shadow-slate-200/50">
          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-500 text-sm font-bold flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </form>

          <p className="mt-10 text-center text-sm text-ink/70">
            Already a member? <Link className="font-bold text-coral hover:underline" to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}>Login to your account</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
