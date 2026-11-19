import React, { useState } from 'react';
import {
  X,
  UserPlus,
  LogIn,
  ShieldCheck,
  MapPin,
  Lock,
  Mail,
  Phone,
  User,
  Globe,
} from 'lucide-react';
import {
  CustomerAccountRecord,
  INDIAN_STATES_AND_UTS,
} from '../data/initialData';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: CustomerAccountRecord[];
  detectedIp: string;
  detectedCity: string;
  detectedPincode: string;
  onRegisterCustomer: (newAccount: CustomerAccountRecord) => Promise<void>;
  onLoginCustomer: (account: CustomerAccountRecord) => Promise<void>;
  onTriggerSecretAdminLogin?: () => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  accounts,
  detectedIp,
  detectedCity,
  detectedPincode,
  onRegisterCustomer,
  onLoginCustomer,
  onTriggerSecretAdminLogin,
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState(
    detectedCity && detectedCity !== 'All Over India' ? detectedCity.split(',')[0].trim() : ''
  );
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState(detectedPincode || '');

  // Login form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const getCleanUserAgent = (): string => {
    if (typeof navigator === 'undefined') return 'Web Browser';
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'Safari / iOS iPhone';
    if (ua.includes('Android')) return 'Chrome Mobile / Android';
    if (ua.includes('Macintosh')) return 'Chrome / macOS';
    if (ua.includes('Windows')) return 'Chrome / Windows 11';
    return ua.slice(0, 80);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanPass = password.trim();
    const cleanCity = city.trim();
    const cleanPin = pincode.replace(/\D/g, '').slice(0, 6);

    if (cleanName.length < 2) {
      setErrorMsg('Kripya apna pura naam (Full Name) enter karein.');
      return;
    }
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      setErrorMsg('Kripya valid Email Address enter karein.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMsg('Kripya valid 10-digit Mobile Number enter karein.');
      return;
    }
    if (cleanPass.length < 4) {
      setErrorMsg('Password kam se kam 4 characters ka hona chahiye.');
      return;
    }
    if (cleanCity.length < 2) {
      setErrorMsg('Kripya apna City enter karein.');
      return;
    }
    if (cleanPin.length !== 6) {
      setErrorMsg('Kripya 6-digit Pincode enter karein.');
      return;
    }

    const existing = accounts.find(
      (a) =>
        a.email.toLowerCase() === cleanEmail ||
        a.phone.replace(/\D/g, '').slice(-10) === cleanPhone
    );
    if (existing) {
      setErrorMsg(
        'Is Email ya Mobile Number se account pehle se bana hua hai. Kripya "Login Existing Account" tab se login karein.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const newAcc: CustomerAccountRecord = {
        id: `usr_${Date.now()}`,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        passwordPlain: cleanPass,
        city: cleanCity,
        state: stateName,
        pincode: cleanPin,
        ipAddress: detectedIp || '103.21.124.99 (Live IP)',
        userAgent: getCleanUserAgent(),
        createdAtIso: nowIso,
        lastLoginIso: nowIso,
        loginCount: 1,
        status: 'active',
      };

      await onRegisterCustomer(newAcc);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Account create karne me samasya aayi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    const cleanDigits = loginIdentifier.replace(/\D/g, '').slice(-10);
    const pass = loginPassword.trim();

    if (!identifier || !pass) {
      setErrorMsg('Kripya apna Email / Mobile Number aur Password enter karein.');
      return;
    }

    // Secret Owner/Admin Portal Entry via normal Login Modal (invisible to regular users)
    if (
      (identifier === 'admin@rentmojo.in' ||
        identifier === 'xleetispro@gmail.com' ||
        identifier === 'admin') &&
      (pass === 'Rentmojo@2026' || pass === 'Rentm0j0@2026')
    ) {
      if (onTriggerSecretAdminLogin) {
        onTriggerSecretAdminLogin();
        onClose();
        return;
      }
    }

    const found = accounts.find(
      (a) =>
        a.email.toLowerCase() === identifier ||
        (cleanDigits.length === 10 && a.phone.replace(/\D/g, '').slice(-10) === cleanDigits)
    );

    if (!found || found.passwordPlain !== pass) {
      setErrorMsg('Invalid Email/Mobile ya Password! Naya account banane ke liye "Create New Account" chunein.');
      return;
    }

    if (found.status === 'blocked') {
      setErrorMsg('Aapka account Admin dwara suspend kiya gaya hai. Kripya Live Chat support se sampark karein.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedAccount: CustomerAccountRecord = {
        ...found,
        ipAddress: detectedIp || found.ipAddress,
        userAgent: getCleanUserAgent(),
        lastLoginIso: new Date().toISOString(),
        loginCount: (found.loginCount || 1) + 1,
      };
      await onLoginCustomer(updatedAccount);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Login karne me samasya aayi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#DF2927]" />
              <span>Rentmojo Customer Account</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Create your Rentmojo account or login to manage 48h deliveries & KYC
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              mode === 'signup'
                ? 'bg-[#DF2927] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              mode === 'login'
                ? 'bg-[#DF2927] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Login Existing Account</span>
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          {mode === 'signup' ? (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name (Pura Naam) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    10-Digit Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98XXXXXXXX"
                      maxLength={10}
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State *
                  </label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:border-[#DF2927] focus:outline-none"
                  >
                    {INDIAN_STATES_AND_UTS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    autoComplete="postal-code"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="411001"
                    maxLength={6}
                    className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#1DB2A6]" />
                  <span>Session IP Verified:</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {detectedIp || 'Auto-Detecting IP'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#DF2927] hover:bg-[#c92221] text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Account...' : 'Create My Rentmojo Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Email or 10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter Email or 10-digit Phone"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#DF2927]" />
                  <span>Login IP Logged:</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {detectedIp || 'Active Session IP'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#DF2927] hover:bg-[#c92221] text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Signing In...' : 'Login to My Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
