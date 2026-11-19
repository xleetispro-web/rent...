import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  Upload,
  FileText,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  Package,
  MapPin,
} from 'lucide-react';
import {
  AppNotification,
  KycRecord,
  PaymentConfigData,
  RentalOrder,
} from '../data/initialData';
import {
  compressImageFileToDataUrl,
  generateSampleDocumentDataUrl,
} from '../utils/kycAndQrHelpers';

interface CustomerPortalViewProps {
  orders: RentalOrder[];
  kycList: KycRecord[];
  notifications: AppNotification[];
  paymentConfig: PaymentConfigData;
  currentUser: { uid: string; email: string | null; displayName: string | null } | null;
  onUpdateKycDocs: (
    kycId: string,
    orderId: string,
    payload: {
      fullAddress: string;
      pincode: string;
      aadhaarNumber: string;
      panNumber: string;
      aadhaarPhotoDataUrl: string;
      panPhotoDataUrl: string;
    }
  ) => Promise<void>;
  onCreateStandaloneKyc: (payload: {
    orderId: string;
    fullName: string;
    email: string;
    phone: string;
    fullAddress: string;
    pincode: string;
    aadhaarNumber: string;
    panNumber: string;
    aadhaarPhotoDataUrl: string;
    panPhotoDataUrl: string;
  }) => Promise<void>;
  onMarkNotificationRead: (notifId: string) => Promise<void>;
  onUpdateOrderPaymentScreenshot: (orderId: string, screenshotDataUrl: string) => Promise<void>;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  orders,
  kycList,
  notifications,
  paymentConfig,
  currentUser,
  onUpdateKycDocs,
  onCreateStandaloneKyc,
  onMarkNotificationRead,
  onUpdateOrderPaymentScreenshot,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || 'standalone');
  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarPhotoDataUrl, setAadhaarPhotoDataUrl] = useState('');
  const [panPhotoDataUrl, setPanPhotoDataUrl] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const existingKycForSelected = kycList.find((k) => k.orderId === selectedOrderId) || kycList[0];

  const handleUploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: 'aadhaar' | 'pan'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFileToDataUrl(file);
    if (docType === 'aadhaar') setAadhaarPhotoDataUrl(compressed);
    else setPanPhotoDataUrl(compressed);
  };

  const handleSaveKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    const cleanAadhaar = (aadhaarNumber || existingKycForSelected?.aadhaarNumber || '').replace(
      /\D/g,
      ''
    );
    const cleanPan = (panNumber || existingKycForSelected?.panNumber || '')
      .trim()
      .toUpperCase();
    const cleanPin = (pincode || existingKycForSelected?.pincode || '560001')
      .replace(/\D/g, '')
      .slice(0, 6);
    const finalAddress = (fullAddress || existingKycForSelected?.fullAddress || '').trim();
    const finalAadhaarImg = aadhaarPhotoDataUrl || existingKycForSelected?.aadhaarPhotoDataUrl || '';
    const finalPanImg = panPhotoDataUrl || existingKycForSelected?.panPhotoDataUrl || '';

    if (!/^[0-9]{12}$/.test(cleanAadhaar)) {
      setFeedbackMsg('Error: Please enter a valid 12-digit Aadhaar Card number.');
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setFeedbackMsg('Error: Please enter a valid 10-character PAN number (e.g. ABCDE1234F).');
      return;
    }
    if (finalAddress.length < 5) {
      setFeedbackMsg('Error: Please enter your complete delivery address.');
      return;
    }
    if (!finalAadhaarImg || !finalPanImg) {
      setFeedbackMsg('Error: Please upload both Aadhaar Card and PAN Card photos.');
      return;
    }

    setIsSaving(true);
    try {
      if (existingKycForSelected) {
        await onUpdateKycDocs(existingKycForSelected.id, existingKycForSelected.orderId, {
          fullAddress: finalAddress,
          pincode: cleanPin,
          aadhaarNumber: cleanAadhaar,
          panNumber: cleanPan,
          aadhaarPhotoDataUrl: finalAadhaarImg,
          panPhotoDataUrl: finalPanImg,
        });
      } else {
        const targetOrder = orders[0];
        await onCreateStandaloneKyc({
          orderId: targetOrder?.id || 'ord_demo',
          fullName: (fullName || currentUser?.displayName || 'Customer').trim(),
          email: (email || currentUser?.email || 'customer@example.com').trim(),
          phone: phone.trim(),
          fullAddress: finalAddress,
          pincode: cleanPin,
          aadhaarNumber: cleanAadhaar,
          panNumber: cleanPan,
          aadhaarPhotoDataUrl: finalAadhaarImg,
          panPhotoDataUrl: finalPanImg,
        });
      }
      setFeedbackMsg('Success: Your Aadhaar & PAN KYC documents have been uploaded and synced with Admin!');
    } catch (err) {
      setFeedbackMsg(
        'Error: ' + (err instanceof Error ? err.message : 'Failed to upload KYC documents.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Rentmojo Rentals, 48h Tracking & Digital KYC Vault
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your 48-hour guaranteed shipment, view bank/UPI payment verification, and upload or update your Aadhaar & PAN documents.
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-white px-4 py-2.5 rounded-lg border border-slate-200">
          Official Support UPI:{' '}
          <span className="font-mono font-semibold text-slate-900">{paymentConfig.upiId}</span> ·{' '}
          <span>{paymentConfig.bankName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Columns: Active Orders + Direct KYC Document Upload Form */}
        <div className="lg:col-span-7 space-y-8">
          {/* Active Rental Orders List */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#E62E2D]" />
              My Rental Orders & 48-Hour Shipping Status ({orders.length})
            </h2>

            {orders.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  No rental orders placed yet.
                </p>
                <p className="text-xs text-slate-500">
                  Add any smartphone, laptop, gadget, or furniture item from the catalog to get guaranteed 48-hour delivery.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-xl bg-white border border-slate-200 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {order.orderCode}
                        </span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          {order.checkoutType === 'guest' ? 'Guest Checkout' : 'Account Order'}
                        </span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span className="text-xs font-mono text-slate-500">
                          Tenure: {order.tenureMonths} Months
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">
                        Order Status:{' '}
                        <span className="text-[#E62E2D] uppercase">{order.orderStatus}</span>
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-slate-900">
                      {order.itemsSummary}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg">
                      <div>
                        <span className="text-slate-600 font-bold block">Monthly Rent</span>
                        <span className="text-sm font-black tabular-nums text-[#111827]">
                          ₹{order.monthlyRentTotal.toLocaleString('en-IN')}/mo
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Payment / UTR & Screenshot</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-semibold text-slate-900">
                            {order.utrNumber} ({order.paymentStatus})
                          </span>
                          <label className="cursor-pointer px-2 py-0.5 rounded bg-white border border-slate-300 hover:border-[#E62E2D] text-[11px] font-semibold text-[#E62E2D] flex items-center gap-1 whitespace-nowrap">
                            <Upload className="w-3 h-3" />
                            <span>{order.paymentScreenshotDataUrl ? 'Update' : 'Upload'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const dataUrl = await compressImageFileToDataUrl(file);
                                await onUpdateOrderPaymentScreenshot(order.id, dataUrl);
                                setFeedbackMsg(
                                  `Payment screenshot uploaded for ${order.orderCode}!`
                                );
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {order.paymentScreenshotDataUrl && (
                          <img
                            src={order.paymentScreenshotDataUrl}
                            alt="Payment Receipt Screenshot"
                            referrerPolicy="no-referrer"
                            className="mt-1.5 w-24 h-14 object-cover rounded border border-slate-200"
                          />
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block">KYC Verification</span>
                        <span className="font-semibold text-slate-900 uppercase">
                          {order.kycStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {order.shippingAddress}, {order.city} —{' '}
                        <strong className="font-mono">{order.pincode}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-teal-700 font-semibold">
                        <Truck className="w-3.5 h-3.5" />
                        Guaranteed By: {order.guaranteedDeliveryBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Direct User Interface KYC Document Upload Section */}
          <section className="p-6 rounded-xl bg-white border border-slate-200 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#1DB2A6]" />
                  Upload / Update KYC Documents (Aadhaar Card & PAN Card)
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Submit or update your Aadhaar Card photo, PAN Card photo, and delivery address directly for Admin verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sampleA = '482910384756';
                  const sampleP = 'ABCDE1234F';
                  setAadhaarNumber(sampleA);
                  setPanNumber(sampleP);
                  if (!fullAddress) {
                    setFullAddress('Flat 301, Indiranagar 100ft Road, Bengaluru');
                  }
                  setAadhaarPhotoDataUrl(
                    generateSampleDocumentDataUrl(
                      'aadhaar',
                      fullName || currentUser?.displayName || 'Customer',
                      sampleA
                    )
                  );
                  setPanPhotoDataUrl(
                    generateSampleDocumentDataUrl(
                      'pan',
                      fullName || currentUser?.displayName || 'Customer',
                      sampleP
                    )
                  );
                }}
                className="px-3 py-1.5 text-xs font-semibold text-[#E62E2D] bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                Load Sample KYC Photos
              </button>
            </div>

            {feedbackMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border ${
                  feedbackMsg.startsWith('Error')
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleSaveKyc} className="space-y-4">
              {orders.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Linked Order
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderCode} — {o.itemsSummary}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    12-Digit Aadhaar Card Number *
                  </label>
                  <input
                    type="text"
                    value={aadhaarNumber || existingKycForSelected?.aadhaarNumber || ''}
                    onChange={(e) =>
                      setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))
                    }
                    placeholder="482910384756"
                    maxLength={12}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-Character PAN Card Number *
                  </label>
                  <input
                    type="text"
                    value={panNumber || existingKycForSelected?.panNumber || ''}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="w-full px-3.5 py-2 text-sm font-mono uppercase rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    value={fullAddress || existingKycForSelected?.fullAddress || ''}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="House/Flat No, Street, Area"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Pincode *
                  </label>
                  <input
                    type="text"
                    value={pincode || existingKycForSelected?.pincode || ''}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="560001"
                    maxLength={6}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Aadhaar Photo Upload */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Aadhaar Card Photo Upload *
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white hover:border-[#E62E2D] text-xs font-medium text-slate-700">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Upload Aadhaar Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, 'aadhaar')}
                      className="hidden"
                    />
                  </label>
                  {(aadhaarPhotoDataUrl || existingKycForSelected?.aadhaarPhotoDataUrl) && (
                    <img
                      src={aadhaarPhotoDataUrl || existingKycForSelected?.aadhaarPhotoDataUrl}
                      alt="Uploaded Aadhaar Card"
                      referrerPolicy="no-referrer"
                      className="w-full h-32 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                </div>

                {/* PAN Photo Upload */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    PAN Card Photo Upload *
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white hover:border-[#E62E2D] text-xs font-medium text-slate-700">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Upload PAN Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, 'pan')}
                      className="hidden"
                    />
                  </label>
                  {(panPhotoDataUrl || existingKycForSelected?.panPhotoDataUrl) && (
                    <img
                      src={panPhotoDataUrl || existingKycForSelected?.panPhotoDataUrl}
                      alt="Uploaded PAN Card"
                      referrerPolicy="no-referrer"
                      className="w-full h-32 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Uploading KYC Documents...' : 'Save & Upload KYC Documents'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right 5 Columns: Submitted KYC Records & Live Notification Center */}
        <div className="lg:col-span-5 space-y-8">
          {/* Submitted KYC Status Card */}
          <section className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#E62E2D]" />
              Submitted KYC Records ({kycList.length})
            </h2>
            {kycList.length === 0 ? (
              <p className="text-xs text-slate-500">
                No KYC records submitted yet. Complete checkout or use the form on the left to upload your Aadhaar & PAN cards.
              </p>
            ) : (
              <div className="space-y-3">
                {kycList.map((k) => (
                  <div
                    key={k.id}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{k.fullName}</span>
                      <span className="font-semibold uppercase text-teal-700">{k.status}</span>
                    </div>
                    <div className="font-mono text-slate-600">
                      Aadhaar: {k.aadhaarNumber} · PAN: {k.panNumber}
                    </div>
                    <div className="text-slate-600">
                      Address: {k.fullAddress} ({k.pincode})
                    </div>
                    {k.adminRemarks && (
                      <div className="text-slate-800 font-medium bg-white p-2 rounded border border-slate-200">
                        Admin Note: {k.adminRemarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Live Notification Feed */}
          <section className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#E62E2D]" />
                Real-Time Notifications ({notifications.length})
              </h2>
              <span className="text-xs text-slate-500">
                {notifications.filter((n) => !n.read).length} Unread
              </span>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500">
                You have no notifications yet. Order, payment, 48h shipping, and KYC updates appear here automatically.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition-colors ${
                      notif.read
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-red-50/40 border-red-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{notif.title}</span>
                      {!notif.read ? (
                        <button
                          type="button"
                          onClick={() => onMarkNotificationRead(notif.id)}
                          className="text-[11px] font-semibold text-[#E62E2D] hover:underline whitespace-nowrap shrink-0"
                        >
                          Mark Read
                        </button>
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.createdAtIso).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
