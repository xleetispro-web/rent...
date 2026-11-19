import React, { useState } from 'react';
import {
  X,
  Truck,
  QrCode,
  Building2,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  UserCheck,
  Mail,
  Sparkles,
} from 'lucide-react';
import {
  CustomerAccountRecord,
  INDIAN_STATES_AND_UTS,
  PaymentConfigData,
  RentalProduct,
  TenureMonths,
  getRentByTenure,
  formatGuaranteed48hDate,
} from '../data/initialData';
import {
  compressImageFileToDataUrl,
  generateDeterministicQrMatrix,
  generateSampleDocumentDataUrl,
  generateSamplePaymentScreenshotDataUrl,
} from '../utils/kycAndQrHelpers';

export interface CartItemEntry {
  product: RentalProduct;
  tenure: TenureMonths;
  quantity: number;
}

export interface CheckoutSubmissionPayload {
  checkoutType: 'account' | 'guest';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  pincode: string;
  paymentMethod: 'upi_qr' | 'bank_transfer';
  utrNumber: string;
  paymentScreenshotDataUrl: string;
  aadhaarNumber: string;
  panNumber: string;
  aadhaarPhotoDataUrl: string;
  panPhotoDataUrl: string;
}

interface CheckoutAndKycModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItemEntry[];
  selectedCity: string;
  defaultPincode: string;
  paymentConfig: PaymentConfigData;
  currentUser: { uid: string; email: string | null; displayName: string | null } | null;
  activeCustomer?: CustomerAccountRecord | null;
  onOpenCustomerAuth: () => void;
  onSubmitOrderAndKyc: (payload: CheckoutSubmissionPayload) => Promise<string>;
}

export const CheckoutAndKycModal: React.FC<CheckoutAndKycModalProps> = ({
  isOpen,
  onClose,
  cart,
  selectedCity,
  defaultPincode,
  paymentConfig,
  currentUser,
  activeCustomer,
  onOpenCustomerAuth,
  onSubmitOrderAndKyc,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [checkoutType, setCheckoutType] = useState<'account' | 'guest'>(
    activeCustomer || currentUser ? 'account' : 'guest'
  );
  const [customerName, setCustomerName] = useState(
    activeCustomer?.fullName || currentUser?.displayName || ''
  );
  const [customerEmail, setCustomerEmail] = useState(
    activeCustomer?.email || currentUser?.email || ''
  );
  const [customerPhone, setCustomerPhone] = useState(activeCustomer?.phone || '');
  const [addressType, setAddressType] = useState<'Home' | 'Office' | 'PG / Hostel'>('Home');
  const [flatBuilding, setFlatBuilding] = useState('');
  const [areaStreet, setAreaStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState(
    activeCustomer?.city ||
      (selectedCity && selectedCity !== 'All Over India'
        ? selectedCity.split(',')[0].trim()
        : '')
  );
  const [stateName, setStateName] = useState(activeCustomer?.state || 'Maharashtra');
  const [pincode, setPincode] = useState(
    activeCustomer?.pincode || (defaultPincode && defaultPincode !== '110001' ? defaultPincode : '')
  );
  const [shippingAddress, setShippingAddress] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'bank_transfer'>('upi_qr');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentScreenshotDataUrl, setPaymentScreenshotDataUrl] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarPhotoDataUrl, setAadhaarPhotoDataUrl] = useState('');
  const [panPhotoDataUrl, setPanPhotoDataUrl] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const monthlyRentTotal = cart.reduce(
    (sum, item) => sum + getRentByTenure(item.product, item.tenure) * item.quantity,
    0
  );
  const refundableDepositTotal = cart.reduce(
    (sum, item) => sum + item.product.securityDeposit * item.quantity,
    0
  );
  const payableNowTotal = monthlyRentTotal + refundableDepositTotal;
  const guaranteedDateText = formatGuaranteed48hDate();

  const upiUri = `upi://pay?pa=${encodeURIComponent(
    paymentConfig.upiId
  )}&pn=${encodeURIComponent(paymentConfig.accountHolderName)}&am=${payableNowTotal}&cu=INR`;
  const qrMatrix = generateDeterministicQrMatrix(upiUri);

  const copyText = (label: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleStep1Next = () => {
    setErrorMsg(null);
    const cleanName = (
      customerName ||
      activeCustomer?.fullName ||
      currentUser?.displayName ||
      ''
    ).trim();
    const cleanEmail = (
      customerEmail ||
      activeCustomer?.email ||
      currentUser?.email ||
      ''
    ).trim();
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
    const cleanPin = pincode.replace(/\D/g, '').slice(0, 6);
    const cleanCity = city.trim();
    const cleanFlat = flatBuilding.trim();
    const cleanArea = areaStreet.trim();
    const cleanLandmark = landmark.trim();

    if (cleanName.length < 2) {
      setErrorMsg('Please enter your Full Name (minimum 2 characters).');
      return;
    }
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      setErrorMsg('Please enter a valid Email Address for order & invoice updates.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Mobile Number for 48-hour delivery coordination.');
      return;
    }
    if (cleanFlat.length < 2) {
      setErrorMsg('Please enter your Flat / House No. / Building Name.');
      return;
    }
    if (cleanArea.length < 3) {
      setErrorMsg('Please enter your Street / Area / Sector / Locality.');
      return;
    }
    if (cleanCity.length < 2) {
      setErrorMsg('Please enter your City / District.');
      return;
    }
    if (!stateName) {
      setErrorMsg('Please select your State / Union Territory.');
      return;
    }
    if (cleanPin.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Indian Pincode.');
      return;
    }

    const formattedFullAddress = `[${addressType}] ${cleanFlat}, ${cleanArea}${
      cleanLandmark ? `, Landmark: ${cleanLandmark}` : ''
    }, ${cleanCity}, ${stateName} - ${cleanPin}`;

    setCustomerName(cleanName);
    setCustomerEmail(cleanEmail);
    setCustomerPhone(cleanPhone);
    setCity(`${cleanCity}, ${stateName}`);
    setPincode(cleanPin);
    setShippingAddress(formattedFullAddress);
    setStep(2);
  };

  const handleStep2Next = () => {
    setErrorMsg(null);
    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length < 6) {
      setErrorMsg(
        'Please enter your UPI / Bank UTR Transaction Reference Number (min 6 characters) after scanning or transferring.'
      );
      return;
    }
    if (!paymentScreenshotDataUrl) {
      setErrorMsg(
        'Please upload your Payment Screenshot right next to the UTR box (or click "Demo Screenshot" to test).'
      );
      return;
    }
    setStep(3);
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'aadhaar' | 'pan' | 'payment'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setErrorMsg(null);
      const dataUrl = await compressImageFileToDataUrl(file);
      if (target === 'aadhaar') {
        setAadhaarPhotoDataUrl(dataUrl);
      } else if (target === 'pan') {
        setPanPhotoDataUrl(dataUrl);
      } else {
        setPaymentScreenshotDataUrl(dataUrl);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process image file.');
    }
  };

  const handleFinalSubmit = async () => {
    setErrorMsg(null);
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    const cleanPan = panNumber.trim().toUpperCase();

    if (!/^[0-9]{12}$/.test(cleanAadhaar)) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar Card number (numbers only).');
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setErrorMsg('Please enter a valid 10-character PAN number (e.g., ABCDE1234F).');
      return;
    }
    if (!aadhaarPhotoDataUrl) {
      setErrorMsg(
        'Please upload your Aadhaar Card photo (or click "Generate Sample Aadhaar Preview" to test).'
      );
      return;
    }
    if (!panPhotoDataUrl) {
      setErrorMsg(
        'Please upload your PAN Card photo (or click "Generate Sample PAN Preview" to test).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const code = await onSubmitOrderAndKyc({
        checkoutType,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        city: city.trim(),
        pincode: pincode.replace(/\D/g, ''),
        paymentMethod,
        utrNumber: utrNumber.trim(),
        paymentScreenshotDataUrl,
        aadhaarNumber: cleanAadhaar,
        panNumber: cleanPan,
        aadhaarPhotoDataUrl,
        panPhotoDataUrl,
      });
      setConfirmedOrderCode(code);
      setStep(4);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not complete order submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden my-8">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Rentmojo Express Checkout & Digital KYC
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Guaranteed 48-Hour Doorstep Delivery across all Indian Pincodes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close checkout modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        {step < 4 && (
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <div
              className={`px-4 py-3 flex items-center gap-2 border-b-2 ${
                step === 1
                  ? 'border-[#E62E2D] text-[#E62E2D] bg-white'
                  : 'border-transparent text-slate-600'
              }`}
            >
              <span className="font-mono">01.</span> Address & 48h Shipping
            </div>
            <div
              className={`px-4 py-3 flex items-center gap-2 border-b-2 ${
                step === 2
                  ? 'border-[#E62E2D] text-[#E62E2D] bg-white'
                  : 'border-transparent text-slate-600'
              }`}
            >
              <span className="font-mono">02.</span> Rent QR & Bank Payment
            </div>
            <div
              className={`px-4 py-3 flex items-center gap-2 border-b-2 ${
                step === 3
                  ? 'border-[#E62E2D] text-[#E62E2D] bg-white'
                  : 'border-transparent text-slate-600'
              }`}
            >
              <span className="font-mono">03.</span> Aadhaar & PAN KYC Upload
            </div>
          </div>
        )}

        <div className="p-6 max-h-[78vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: ACCOUNT OR GUEST + 48H SHIPPING */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Checkout Mode Selector: User Account vs Guest Checkout */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Choose Checkout Mode (User Account or Instant Guest Checkout)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Login or create a new Rentmojo User Account, or proceed directly as a Guest.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCheckoutType('guest')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        checkoutType === 'guest'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                      Guest Checkout
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutType('account')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        checkoutType === 'account'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 inline mr-1.5" />
                      User Account
                    </button>
                  </div>
                </div>

                {checkoutType === 'account' && !activeCustomer && !currentUser && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-600">
                      Create a new Rentmojo Account or Login to link this order to your profile.
                    </span>
                    <button
                      type="button"
                      onClick={onOpenCustomerAuth}
                      className="px-4 py-2 text-xs font-bold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] transition-colors whitespace-nowrap shrink-0"
                    >
                      Create Account / Login
                    </button>
                  </div>
                )}
              </div>

              {/* Guaranteed 48-Hour All-Pincode Banner */}
              <div className="p-4 rounded-lg bg-teal-50/70 border border-teal-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-[#1DB2A6] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Guaranteed 48-Hour Express Delivery — All Indian States & Pincodes Covered
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {pincode.length === 6 ? (
                        <>
                          Pincode{' '}
                          <span className="font-mono font-semibold text-slate-900">{pincode}</span>{' '}
                          ({stateName}) is eligible for doorstep delivery & setup by{' '}
                          <span className="font-semibold text-teal-800">{guaranteedDateText}</span>.
                        </>
                      ) : (
                        <>
                          Enter your 6-digit pincode below for guaranteed doorstep delivery by{' '}
                          <span className="font-semibold text-teal-800">{guaranteedDateText}</span>.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-teal-800">
                  SLA: MAX 48 HOURS
                </span>
              </div>

              {/* Professional Customer Contact & Structured Shipping Address Form */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    1. Contact & Receiver Information
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    All fields marked * are mandatory for 48h dispatch
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name (as per Aadhaar / PAN) *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address (Agreement & Invoice) *
                    </label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      10-Digit Mobile Number (WhatsApp/Call) *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(e) =>
                        setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 pt-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    2. Complete Doorstep Delivery Address
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">
                      Address Type:
                    </span>
                    {(['Home', 'Office', 'PG / Hostel'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddressType(t)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                          addressType === t
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Flat / House No. / Floor / Building Name *
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      autoComplete="address-line1"
                      value={flatBuilding}
                      onChange={(e) => setFlatBuilding(e.target.value)}
                      placeholder="e.g. Flat 402, Tower B, Prestige Residency"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Street / Road / Area / Sector / Locality *
                    </label>
                    <input
                      type="text"
                      name="addressLine2"
                      autoComplete="address-line2"
                      value={areaStreet}
                      onChange={(e) => setAreaStreet(e.target.value)}
                      placeholder="e.g. 80 Feet Road, Koramangala 4th Block"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nearby Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Near Metro / Mall"
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      City / District *
                    </label>
                    <input
                      type="text"
                      name="city"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter City"
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      State / Union Territory (All India) *
                    </label>
                    <select
                      name="state"
                      autoComplete="address-level1"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white focus:border-[#E62E2D] focus:outline-none"
                    >
                      {INDIAN_STATES_AND_UTS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      6-Digit Pincode *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      autoComplete="postal-code"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-700">
                  Payable Today (1st Month Rent + Refundable Deposit):{' '}
                  <span className="font-black tabular-nums text-[#111827] text-base tracking-tight">
                    ₹{payableNowTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="px-6 py-2.5 text-sm font-semibold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] transition-colors whitespace-nowrap shrink-0"
                >
                  Continue to Rent Payment & Scanner
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ADMIN BANK DETAILS & UPI SCANNER */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: UPI QR Code Scanner */}
                <div className="lg:col-span-5 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-3">
                    <QrCode className="w-4 h-4 text-[#E62E2D]" />
                    Scan & Pay via Any UPI App
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                    {paymentConfig.qrImageUrl ? (
                      <img
                        src={paymentConfig.qrImageUrl}
                        alt="Admin UPI Payment Scanner"
                        referrerPolicy="no-referrer"
                        className="w-48 h-48 object-contain"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 21 21"
                        className="w-48 h-48"
                        shapeRendering="crispEdges"
                        aria-label="Generated UPI QR Code"
                      >
                        {qrMatrix.map((row, rIdx) =>
                          row.map((cell, cIdx) =>
                            cell ? (
                              <rect
                                key={`${rIdx}-${cIdx}`}
                                x={cIdx}
                                y={rIdx}
                                width={1}
                                height={1}
                                fill="#0F172A"
                              />
                            ) : null
                          )
                        )}
                      </svg>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-slate-600">
                    UPI ID:{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {paymentConfig.upiId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText('upi', paymentConfig.upiId)}
                      className="ml-2 text-[#E62E2D] hover:underline font-semibold"
                    >
                      {copiedField === 'upi' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="mt-2.5 text-lg font-black tabular-nums text-[#111827] tracking-tight">
                    Amount: ₹{payableNowTotal.toLocaleString('en-IN')}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    (Includes{' '}
                    <strong className="font-extrabold tabular-nums text-[#111827]">
                      ₹{monthlyRentTotal.toLocaleString('en-IN')}/mo
                    </strong>{' '}
                    1st month rent +{' '}
                    <strong className="font-extrabold tabular-nums text-[#111827]">
                      ₹{refundableDepositTotal.toLocaleString('en-IN')}
                    </strong>{' '}
                    100% refundable security deposit)
                  </p>
                </div>

                {/* Right Column: Official Bank Transfer Details + UTR Input */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Building2 className="w-4 h-4 text-[#1DB2A6]" />
                        Official Bank Account Details (IMPS / NEFT / RTGS)
                      </div>
                      <span className="text-xs text-slate-500">Live Admin Verified</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {[
                        { label: 'Bank Name', val: paymentConfig.bankName, key: 'bank' },
                        {
                          label: 'Account Holder',
                          val: paymentConfig.accountHolderName,
                          key: 'holder',
                        },
                        {
                          label: 'Account Number',
                          val: paymentConfig.accountNumber,
                          key: 'acc',
                          mono: true,
                        },
                        {
                          label: 'IFSC Code',
                          val: paymentConfig.ifscCode,
                          key: 'ifsc',
                          mono: true,
                        },
                        { label: 'Branch', val: paymentConfig.branchName, key: 'branch' },
                      ].map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                        >
                          <span className="text-slate-500">{row.label}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold text-slate-900 ${
                                row.mono ? 'font-mono' : ''
                              }`}
                            >
                              {row.val}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyText(row.key, row.val)}
                              className="p-1 text-slate-400 hover:text-slate-800"
                              title="Copy"
                            >
                              {copiedField === row.key ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                      {paymentConfig.paymentNote}
                    </p>
                  </div>

                  {/* Payment Mode & UTR Entry */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi_qr')}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          paymentMethod === 'upi_qr'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Paid via UPI Scanner
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          paymentMethod === 'bank_transfer'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Paid via Bank Transfer (IMPS/NEFT)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Left: 12-Digit UTR Input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          12-Digit UTR / Ref Number *
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            placeholder="e.g. 431982746109"
                            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white focus:border-[#E62E2D] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const generatedUtr = String(
                                Math.floor(100000000000 + Math.random() * 899999999999)
                              );
                              setUtrNumber(generatedUtr);
                              if (!paymentScreenshotDataUrl) {
                                setPaymentScreenshotDataUrl(
                                  generateSamplePaymentScreenshotDataUrl(
                                    customerName || 'Customer',
                                    payableNowTotal,
                                    generatedUtr,
                                    paymentConfig.upiId
                                  )
                                );
                              }
                            }}
                            className="px-2.5 py-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 whitespace-nowrap shrink-0"
                          >
                            Demo UTR
                          </button>
                        </div>
                      </div>

                      {/* Right (UTR ke baju me): Upload Payment Screenshot */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Upload Payment Screenshot *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white hover:border-[#E62E2D] text-xs font-semibold text-slate-700 whitespace-nowrap">
                            <Upload className="w-3.5 h-3.5 text-[#E62E2D] shrink-0" />
                            <span>Upload Screenshot</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'payment')}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const activeUtr =
                                utrNumber ||
                                String(Math.floor(100000000000 + Math.random() * 899999999999));
                              if (!utrNumber) setUtrNumber(activeUtr);
                              setPaymentScreenshotDataUrl(
                                generateSamplePaymentScreenshotDataUrl(
                                  customerName || 'Customer',
                                  payableNowTotal,
                                  activeUtr,
                                  paymentConfig.upiId
                                )
                              );
                            }}
                            className="px-2.5 py-2 text-[11px] font-semibold text-[#E62E2D] bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap shrink-0"
                          >
                            Sample
                          </button>
                        </div>
                      </div>
                    </div>

                    {paymentScreenshotDataUrl && (
                      <div className="pt-2 flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={paymentScreenshotDataUrl}
                            alt="Uploaded Payment Screenshot"
                            referrerPolicy="no-referrer"
                            className="w-16 h-12 object-cover rounded border border-slate-200"
                          />
                          <div className="text-xs">
                            <div className="font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Payment Screenshot Attached
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              UTR: {utrNumber || 'Pending'} · Ready for Admin Verification
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentScreenshotDataUrl('')}
                          className="text-xs font-semibold text-red-600 hover:underline px-2"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Back to Shipping
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="px-6 py-2.5 text-sm font-semibold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] transition-colors whitespace-nowrap shrink-0"
                >
                  Proceed to Mandatory Aadhaar & PAN KYC
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: AADHAAR & PAN KYC + PHOTO UPLOAD */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#1DB2A6] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Mandatory Rentmojo KYC Verification (Aadhaar Card & PAN Card)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Enter your 12-digit Aadhaar number and 10-character PAN number and upload clear photos for 48-hour dispatch clearance.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sampleAadhaar = aadhaarNumber || '482910384756';
                    const samplePan = panNumber || 'ABCDE1234F';
                    setAadhaarNumber(sampleAadhaar);
                    setPanNumber(samplePan);
                    setAadhaarPhotoDataUrl(
                      generateSampleDocumentDataUrl('aadhaar', customerName, sampleAadhaar)
                    );
                    setPanPhotoDataUrl(
                      generateSampleDocumentDataUrl('pan', customerName, samplePan)
                    );
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-[#E62E2D] bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  Auto-Fill Sample KYC Docs
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aadhaar Card Module */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      12-Digit Aadhaar Card Number *
                    </label>
                    <input
                      type="text"
                      value={aadhaarNumber}
                      onChange={(e) =>
                        setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))
                      }
                      placeholder="482910384756"
                      maxLength={12}
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Upload Aadhaar Card Photo (JPG / PNG) *
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-[#E62E2D] text-xs font-medium text-slate-700 bg-slate-50">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Choose Aadhaar Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'aadhaar')}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const num = aadhaarNumber || '482910384756';
                          if (!aadhaarNumber) setAadhaarNumber(num);
                          setAadhaarPhotoDataUrl(
                            generateSampleDocumentDataUrl('aadhaar', customerName, num)
                          );
                        }}
                        className="px-3 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0"
                      >
                        Sample Aadhaar
                      </button>
                    </div>
                  </div>

                  {aadhaarPhotoDataUrl && (
                    <div className="mt-2">
                      <div className="text-[11px] font-medium text-emerald-700 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Aadhaar Document Ready for Admin Review
                      </div>
                      <img
                        src={aadhaarPhotoDataUrl}
                        alt="Aadhaar KYC Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* PAN Card Module */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      10-Character PAN Card Number *
                    </label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="w-full px-3.5 py-2 text-sm font-mono uppercase rounded-lg border border-slate-300 focus:border-[#E62E2D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Upload PAN Card Photo (JPG / PNG) *
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-[#E62E2D] text-xs font-medium text-slate-700 bg-slate-50">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Choose PAN Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'pan')}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pan = panNumber || 'ABCDE1234F';
                          if (!panNumber) setPanNumber(pan);
                          setPanPhotoDataUrl(
                            generateSampleDocumentDataUrl('pan', customerName, pan)
                          );
                        }}
                        className="px-3 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0"
                      >
                        Sample PAN
                      </button>
                    </div>
                  </div>

                  {panPhotoDataUrl && (
                    <div className="mt-2">
                      <div className="text-[11px] font-medium text-emerald-700 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> PAN Document Ready for Admin Review
                      </div>
                      <img
                        src={panPhotoDataUrl}
                        alt="PAN KYC Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Back to Payment
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 text-sm font-semibold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {isSubmitting
                    ? 'Submitting Order & KYC...'
                    : 'Submit KYC & Confirm 48h Rental Order'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ORDER & KYC CONFIRMATION */}
          {step === 4 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Order {confirmedOrderCode} Confirmed & KYC Submitted!
              </h3>
              <p className="text-sm text-slate-600 max-w-xl mx-auto">
                Thank you, <span className="font-semibold text-slate-900">{customerName}</span>.
                Your payment reference (<span className="font-mono">{utrNumber}</span>) and
                Aadhaar/PAN KYC documents have been sent to the Rentmojo Admin Console.
              </p>
              <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Guaranteed Delivery Window:</span>
                  <span className="font-semibold text-teal-700">{guaranteedDateText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shipping Pincode:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {city} — {pincode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">KYC Status:</span>
                  <span className="font-semibold text-amber-700">
                    Submitted (Awaiting Admin Verification)
                  </span>
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  View Order in My Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
