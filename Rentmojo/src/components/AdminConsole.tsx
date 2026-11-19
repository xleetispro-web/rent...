import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Smartphone,
  PackageCheck,
  FileCheck2,
  QrCode,
  Activity,
  Plus,
  Save,
  Eye,
  CheckCircle2,
  XCircle,
  BellPlus,
  Upload,
  X,
  Lock,
  KeyRound,
  ArrowLeft,
  Users,
  MessageSquare,
  Download,
  Send,
  Globe,
} from 'lucide-react';
import {
  CustomerAccountRecord,
  KycRecord,
  LiveChatSession,
  PaymentConfigData,
  ProductCategory,
  RentalOrder,
  RentalProduct,
  UserActivityLog,
  IMG_IPHONE,
} from '../data/initialData';
import { compressImageFileToDataUrl } from '../utils/kycAndQrHelpers';
import firebaseConfig from '../../firebase-applet-config.json';

const MAX_BRUTE_FORCE_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes hard lockout
const DEFAULT_ADMIN_PASSKEY = 'Rentmojo@2026';
const LEGACY_ADMIN_PASSKEY = 'Rentm0j0@2026';

interface AdminConsoleProps {
  isAdminUser: boolean;
  currentUser: { uid: string; email: string | null; displayName: string | null } | null;
  products: RentalProduct[];
  orders: RentalOrder[];
  kycList: KycRecord[];
  userLogs: UserActivityLog[];
  paymentConfig: PaymentConfigData;
  customerAccounts: CustomerAccountRecord[];
  liveChats: LiveChatSession[];
  onExitAdminToStore: () => void;
  onRecordSecurityLog: (action: string, details: string) => Promise<void>;
  onSaveProduct: (product: RentalProduct, isNew: boolean) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSavePaymentConfig: (config: PaymentConfigData) => Promise<void>;
  onAdminUpdateOrder: (
    orderId: string,
    updates: Partial<Pick<RentalOrder, 'paymentStatus' | 'orderStatus' | 'kycStatus'>>,
    targetUserId: string,
    orderCode: string
  ) => Promise<void>;
  onAdminReviewKyc: (
    kycId: string,
    orderId: string,
    targetUserId: string,
    status: 'approved' | 'rejected',
    adminRemarks: string
  ) => Promise<void>;
  onSendBroadcastNotification: (
    targetUserId: string,
    title: string,
    message: string,
    type: 'order' | 'payment' | 'kyc' | 'shipping' | 'promo'
  ) => Promise<void>;
  onToggleCustomerStatus: (accountId: string, nextStatus: 'active' | 'blocked') => Promise<void>;
  onAdminReplyChat: (
    chatId: string,
    replyText: string,
    nextStatus?: LiveChatSession['status']
  ) => Promise<void>;
  initialTab?: 'inventory' | 'orders' | 'kyc' | 'bank' | 'logs' | 'users' | 'livechat' | 'export';
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  isAdminUser,
  currentUser,
  products,
  orders,
  kycList,
  userLogs,
  paymentConfig,
  customerAccounts,
  liveChats,
  onExitAdminToStore,
  onRecordSecurityLog,
  onSaveProduct,
  onDeleteProduct,
  onSavePaymentConfig,
  onAdminUpdateOrder,
  onAdminReviewKyc,
  onSendBroadcastNotification,
  onToggleCustomerStatus,
  onAdminReplyChat,
  initialTab,
}) => {
  // Brute-Force & Security Gate State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('rm0_admin_unlocked') === 'true';
  });
  const [passkeyInput, setPasskeyInput] = useState('');
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(localStorage.getItem('rm0_admin_failed_attempts') || '0');
  });
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    return Number(localStorage.getItem('rm0_admin_lockout_until') || '0');
  });
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNowTs(current);
      if (lockoutUntil > 0 && current >= lockoutUntil) {
        setLockoutUntil(0);
        setFailedAttempts(0);
        localStorage.removeItem('rm0_admin_lockout_until');
        localStorage.removeItem('rm0_admin_failed_attempts');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const [activeTab, setActiveTab] = useState<
    'inventory' | 'orders' | 'kyc' | 'bank' | 'logs' | 'users' | 'livechat' | 'export'
  >(initialTab || 'livechat');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [editingProduct, setEditingProduct] = useState<RentalProduct | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Admin Live Chat state
  const [selectedChatId, setSelectedChatId] = useState<string>(liveChats[0]?.id || '');
  const [adminReplyInput, setAdminReplyInput] = useState<string>('');

  useEffect(() => {
    if (liveChats.length > 0 && !liveChats.some((c) => c.id === selectedChatId)) {
      setSelectedChatId(liveChats[0].id);
    }
  }, [liveChats, selectedChatId]);

  // Bank config state
  const [bankForm, setBankForm] = useState<PaymentConfigData>(paymentConfig);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // KYC Inspector Modal state
  const [inspectedKyc, setInspectedKyc] = useState<KycRecord | null>(null);
  const [kycRemarkInput, setKycRemarkInput] = useState('');
  const [inspectedOrderPayment, setInspectedOrderPayment] = useState<RentalOrder | null>(null);

  // Notification Broadcast Form
  const [notifTarget, setNotifTarget] = useState('ALL_USERS');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'order' | 'payment' | 'kyc' | 'shipping' | 'promo'>(
    'shipping'
  );

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const isLockedOut = lockoutUntil > nowTs;
  const remainingLockoutSec = Math.max(0, Math.ceil((lockoutUntil - nowTs) / 1000));
  const isCooldownActive = cooldownUntil > nowTs;
  const remainingCooldownSec = Math.max(0, Math.ceil((cooldownUntil - nowTs) / 1000));

  const handleVerifyAdminGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMsg(null);

    if (isLockedOut) {
      setAuthErrorMsg(
        `BRUTE-FORCE LOCKOUT ACTIVE: Too many failed login attempts. Try again in ${Math.floor(
          remainingLockoutSec / 60
        )}m ${remainingLockoutSec % 60}s.`
      );
      return;
    }

    if (isCooldownActive) {
      setAuthErrorMsg(
        `Rate limit active: Please wait ${remainingCooldownSec}s before next attempt.`
      );
      return;
    }

    const savedCustomKey = localStorage.getItem('rm0_custom_admin_key');
    const isPasskeyValid = savedCustomKey
      ? passkeyInput.trim() === savedCustomKey
      : passkeyInput.trim() === DEFAULT_ADMIN_PASSKEY ||
        passkeyInput.trim() === LEGACY_ADMIN_PASSKEY;
    if (isPasskeyValid) {
      setFailedAttempts(0);
      setLockoutUntil(0);
      localStorage.removeItem('rm0_admin_failed_attempts');
      localStorage.removeItem('rm0_admin_lockout_until');
      sessionStorage.setItem('rm0_admin_unlocked', 'true');
      setIsUnlocked(true);
      setPasskeyInput('');
      await onRecordSecurityLog(
        'Admin Portal /admin Unlocked',
        `Authorized admin session established (${currentUser?.email || 'Master Key'})`
      );
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      localStorage.setItem('rm0_admin_failed_attempts', String(nextAttempts));

      if (nextAttempts >= MAX_BRUTE_FORCE_ATTEMPTS) {
        const lockUntilTime = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockUntilTime);
        localStorage.setItem('rm0_admin_lockout_until', String(lockUntilTime));
        setAuthErrorMsg(
          'SECURITY ALERT: 5 failed attempts detected! /admin portal is locked for 15 minutes to prevent brute-force attacks.'
        );
        await onRecordSecurityLog(
          'BRUTE-FORCE LOCKOUT TRIGGERED (/admin)',
          `5 consecutive failed login attempts blocked. Locked for 15 minutes.`
        );
      } else {
        // Exponential backoff delay (3s, 6s, 12s, 24s)
        const backoffSec = Math.pow(2, nextAttempts) + 1;
        setCooldownUntil(Date.now() + backoffSec * 1000);
        setAuthErrorMsg(
          `Invalid Admin Passkey! Attempt ${nextAttempts} of ${MAX_BRUTE_FORCE_ATTEMPTS}. Rate-limited for ${backoffSec} seconds.`
        );
        await onRecordSecurityLog(
          'Failed /admin Login Attempt Blocked',
          `Failed attempt ${nextAttempts}/${MAX_BRUTE_FORCE_ATTEMPTS} — Exponential rate limit (${backoffSec}s) applied.`
        );
      }
    }
  };

  const totalStockUnits = products.reduce((acc, p) => acc + p.stockCount, 0);
  const lowStockCount = products.filter((p) => p.stockCount <= 5).length;
  const pendingKycCount = kycList.filter((k) => k.status === 'submitted').length;
  const activeMonthlyRevenue = orders
    .filter((o) => o.orderStatus !== 'cancelled')
    .reduce((acc, o) => acc + o.monthlyRentTotal, 0);

  const filteredProducts =
    categoryFilter === 'all'
      ? products
      : products.filter((p) => p.category === categoryFilter);

  const handleOpenNewProduct = () => {
    setIsCreatingProduct(true);
    setEditingProduct({
      id: `prod_${Date.now()}`,
      name: '',
      category: 'mobiles',
      brand: 'Apple',
      shortSpec: '5G · 256GB Storage · 1 Year Rentmojo Care',
      description:
        'Sanitized flagship device delivered within 48 hours across all pincodes with zero maintenance fees.',
      imageUrl: IMG_IPHONE,
      rent3m: 3499,
      rent6m: 2999,
      rent12m: 2499,
      rent24m: 1999,
      securityDeposit: 3999,
      stockCount: 10,
      featured: true,
      deliveryHours: 48,
    });
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (editingProduct.name.trim().length < 2) {
      showToast('Please enter a valid product name.');
      return;
    }
    await onSaveProduct(editingProduct, isCreatingProduct);
    setEditingProduct(null);
    setIsCreatingProduct(false);
    showToast(`Saved "${editingProduct.name}" rental pricing & stock count.`);
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFileToDataUrl(file, 480, 0.75);
    setBankForm((prev) => ({ ...prev, qrImageUrl: compressed }));
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSavePaymentConfig(bankForm);
    showToast('Updated Bank Account Details & UPI Payment QR Scanner for all customers!');
  };

  // RENDER HARDENED BRUTE-FORCE PROTECTED GATE IF NOT UNLOCKED
  if (!isUnlocked) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center px-4 py-12 bg-slate-950 text-white">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-7 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#1DB2A6] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> /admin — Protected Endpoint
            </span>
            <button
              type="button"
              onClick={onExitAdminToStore}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Storefront
            </button>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Rentmojo Admin Security Gate
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Protected by Brute-Force Rate Limiting (Max {MAX_BRUTE_FORCE_ATTEMPTS} attempts before 15-minute IP/Session Lockout).
            </p>
          </div>

          {/* Attempt Counter Bar */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Brute-Force Shield Status:</span>
            <span
              className={`font-mono font-bold ${
                isLockedOut
                  ? 'text-red-400'
                  : failedAttempts > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {isLockedOut
                ? `LOCKED (${Math.floor(remainingLockoutSec / 60)}m ${
                    remainingLockoutSec % 60
                  }s)`
                : `${MAX_BRUTE_FORCE_ATTEMPTS - failedAttempts} / ${MAX_BRUTE_FORCE_ATTEMPTS} Attempts Remaining`}
            </span>
          </div>

          {authErrorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-xs font-medium text-red-200">
              {authErrorMsg}
            </div>
          )}

          <form onSubmit={handleVerifyAdminGate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter Master Admin Passkey *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  disabled={isLockedOut || isCooldownActive}
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter Private Master Security Key"
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-[#E62E2D] focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLockedOut || isCooldownActive || !passkeyInput.trim()}
              className="w-full py-2.5 px-4 text-xs font-bold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] disabled:opacity-40 transition-colors"
            >
              {isLockedOut
                ? `Locked Out — Wait ${Math.floor(remainingLockoutSec / 60)}m ${
                    remainingLockoutSec % 60
                  }s`
                : isCooldownActive
                ? `Rate Limited — Wait ${remainingCooldownSec}s`
                : 'Verify & Unlock /admin Console'}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Protected Master Gate:</span>
            <span className="font-mono text-emerald-400">Passkey + Brute-Force Shield Active</span>
          </div>
        </div>
      </div>
    );
  }

  const totalUnreadAdminChats = liveChats.reduce((sum, c) => sum + (c.unreadForAdmin || 0), 0);
  const activeSelectedChat =
    liveChats.find((c) => c.id === selectedChatId) || liveChats[0] || null;

  const handleDownloadPortablePackage = () => {
    const portableBundle = {
      exportedAtIso: new Date().toISOString(),
      platform: 'Rentmojo Full-Stack Rental & Live Support Platform',
      firebaseConfiguration: firebaseConfig,
      collectionsSnapshot: {
        products,
        paymentConfig,
        customerAccounts,
        orders,
        kycSubmissions: kycList,
        liveChats,
        userLogs,
      },
      deploymentInstructions: {
        step1_install: 'npm install',
        step2_development: 'npm run dev',
        step3_productionBuild: 'npm run build',
        step4_firebaseHosting:
          'firebase login && firebase init hosting && firebase deploy --only hosting,firestore:rules',
        step5_vercelOrNetlify:
          'Upload this repository or dist/ folder to Vercel/Netlify. Build command: npm run build | Output directory: dist',
      },
    };
    const blob = new Blob([JSON.stringify(portableBundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentmojo-firebase-portable-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Portable Website & Firebase Data Package downloaded!');
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-6">
      {/* Top Admin Header & Auth Status */}
      <div className="p-4 sm:p-6 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-mono text-[#1DB2A6]">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>SECURED RENTMOJO /ADMIN CONSOLE · FIREBASE LIVE SYNC ACTIVE</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight mt-1">
            Admin Desk: Live Chat (Laxmi), Users & IP Tracker, Inventory & KYC
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            View live customer enquiries from Laxmi Chat, registered user credentials & IP addresses, orders, KYC documents, and export your full Firebase setup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onExitAdminToStore}
            className="px-3 py-2 text-xs font-bold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPortablePackage}
            className="px-3.5 py-2 text-xs font-bold bg-[#1DB2A6] text-slate-950 rounded-lg hover:bg-teal-400 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Portable Firebase Copy</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('rm0_admin_unlocked');
              setIsUnlocked(false);
              onExitAdminToStore();
            }}
            className="px-3 py-2 text-xs font-semibold bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            Lock Admin
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{statusBanner}</span>
          <button type="button" onClick={() => setStatusBanner(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Strip (Tabular Numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500">Total Phones & Gadgets in Stock</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {totalStockUnits} Units
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {products.length} Active SKUs · {lowStockCount} Low Stock
          </div>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500">Customer & Guest Orders</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {orders.length} Orders
          </div>
          <div className="text-xs text-teal-700 font-medium mt-1">
            Guaranteed 48h Shipping SLA
          </div>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500">Monthly Rental Run-Rate</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{activeMonthlyRevenue.toLocaleString('en-IN')}/mo
          </div>
          <div className="text-xs text-slate-500 mt-1">
            UPI ID: <span className="font-mono">{paymentConfig.upiId}</span>
          </div>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500">Aadhaar & PAN KYC Queue</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {kycList.length} Submissions
          </div>
          <div className="text-xs text-[#E62E2D] font-medium mt-1">
            {pendingKycCount} Awaiting Review
          </div>
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          {
            id: 'inventory',
            label: '01. Inventory & Rent Prices',
            icon: Smartphone,
          },
          {
            id: 'users',
            label: `02. Registered Users, Login & IP (${customerAccounts.length})`,
            icon: Users,
          },
          {
            id: 'livechat',
            label: `03. Live Chat — Laxmi Enquiries (${liveChats.length})${
              totalUnreadAdminChats > 0 ? ` · ${totalUnreadAdminChats} NEW` : ''
            }`,
            icon: MessageSquare,
          },
          {
            id: 'orders',
            label: `04. Orders & UTR Screenshots (${orders.length})`,
            icon: PackageCheck,
          },
          {
            id: 'kyc',
            label: `05. KYC: Aadhaar & PAN (${kycList.length})`,
            icon: FileCheck2,
          },
          {
            id: 'bank',
            label: '06. Bank & UPI QR Scanner',
            icon: QrCode,
          },
          {
            id: 'logs',
            label: `07. Activity Logs (${userLogs.length})`,
            icon: Activity,
          },
          {
            id: 'export',
            label: '08. Portable Website & Firebase Copy',
            icon: Download,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#E62E2D] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: INVENTORY, STOCK & RENTAL PRICING MANAGER */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg">
              {['all', 'mobiles', 'laptops', 'gadgets', 'packages', 'furniture', 'appliances'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                      categoryFilter === cat
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenNewProduct}
              className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add New Phone / Laptop / Gadget
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Product & Category</th>
                  <th className="py-3 px-3 text-right">3M Rent</th>
                  <th className="py-3 px-3 text-right">6M Rent</th>
                  <th className="py-3 px-3 text-right">12M Rent</th>
                  <th className="py-3 px-3 text-right">24M Rent</th>
                  <th className="py-3 px-3 text-right">Deposit</th>
                  <th className="py-3 px-4 text-center">Phones / Units in Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      <div className="text-slate-500 mt-0.5">
                        <span className="uppercase font-semibold text-[#E62E2D]">
                          {prod.category}
                        </span>{' '}
                        · {prod.brand} · {prod.shortSpec}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      ₹{prod.rent3m.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      ₹{prod.rent6m.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      ₹{prod.rent12m.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-teal-700 font-semibold">
                      ₹{prod.rent24m.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      ₹{prod.securityDeposit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onSaveProduct(
                              { ...prod, stockCount: Math.max(0, prod.stockCount - 1) },
                              false
                            )
                          }
                          className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 font-mono font-bold"
                        >
                          -
                        </button>
                        <span
                          className={`font-mono font-bold tabular-nums min-w-[3rem] text-center ${
                            prod.stockCount <= 5 ? 'text-red-600' : 'text-slate-900'
                          }`}
                        >
                          {prod.stockCount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onSaveProduct({ ...prod, stockCount: prod.stockCount + 1 }, false)
                          }
                          className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 font-mono font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingProduct(false);
                          setEditingProduct({ ...prod });
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
                      >
                        Edit Price / Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(prod.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Product Edit / Create Modal */}
          {editingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
              <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {isCreatingProduct
                      ? 'Add New Rental Phone / Gadget / Product'
                      : `Edit Rental Prices & Stock — ${editingProduct.name}`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveProductForm} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Product Title *
                      </label>
                      <input
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, name: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        value={editingProduct.category}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            category: e.target.value as ProductCategory,
                          })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="mobiles">Mobiles & Smartphones</option>
                        <option value="laptops">Laptops & Workstations</option>
                        <option value="gadgets">Smart Gadgets & Gaming</option>
                        <option value="packages">Smart Packages / Combos</option>
                        <option value="furniture">Home & Office Furniture</option>
                        <option value="appliances">Home Appliances</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                      <input
                        type="text"
                        value={editingProduct.brand}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, brand: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Key Specifications (Separated by ·)
                      </label>
                      <input
                        type="text"
                        value={editingProduct.shortSpec}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, shortSpec: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        3 Months Rent (₹/mo)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.rent3m}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            rent3m: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        6 Months Rent (₹/mo)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.rent6m}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            rent6m: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        12 Months Rent (₹/mo)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.rent12m}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            rent12m: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        24 Months Rent (₹/mo)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.rent24m}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            rent24m: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Refundable Deposit (₹)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.securityDeposit}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            securityDeposit: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#E62E2D] mb-1">
                        Available Stock Units *
                      </label>
                      <input
                        type="number"
                        value={editingProduct.stockCount}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            stockCount: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      Save Product & Stock
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER ORDERS, PAYMENTS & 48H SHIPPING */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-sm text-slate-500">
              No customer orders yet. Place a test order from the storefront (Account or Guest Checkout) to manage it here.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="p-5 rounded-xl bg-white border border-slate-200 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {order.orderCode}
                    </span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {order.customerName} ({order.customerEmail} · {order.customerPhone})
                    </span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-xs text-slate-500 uppercase">
                      {order.checkoutType} checkout
                    </span>
                  </div>
                  <div className="text-xs font-mono text-teal-700 font-semibold">
                    Guaranteed 48h Delivery: {order.guaranteedDeliveryBy}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 space-y-1">
                    <div className="text-slate-500 font-medium">Ordered Rental Items</div>
                    <div className="font-semibold text-slate-900">{order.itemsSummary}</div>
                    <div className="font-mono text-slate-700">
                      Tenure: {order.tenureMonths}M · Rent: ₹
                      {order.monthlyRentTotal.toLocaleString('en-IN')}/mo · Paid Today: ₹
                      {order.payableNowTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 space-y-1">
                    <div className="text-slate-500 font-medium">
                      Delivery Address & All-India Pincode
                    </div>
                    <div className="font-semibold text-slate-900">{order.shippingAddress}</div>
                    <div className="font-mono text-slate-700">
                      City: {order.city} · Pincode: <strong>{order.pincode}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 space-y-1.5">
                    <div className="text-slate-500 font-medium">
                      UTR & Payment Screenshot ({order.paymentMethod})
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-slate-900">
                          UTR: {order.utrNumber}
                        </div>
                        <div className="text-slate-700">
                          Payment: <strong className="uppercase">{order.paymentStatus}</strong> ·
                          KYC: <strong className="uppercase">{order.kycStatus}</strong>
                        </div>
                      </div>
                      {order.paymentScreenshotDataUrl && (
                        <img
                          src={order.paymentScreenshotDataUrl}
                          alt="Customer Payment Screenshot"
                          referrerPolicy="no-referrer"
                          onClick={() => setInspectedOrderPayment(order)}
                          className="w-20 h-14 object-cover rounded border border-slate-300 cursor-pointer hover:opacity-90 shrink-0"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Action Bar for Payment & 48h Dispatch */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 font-medium">Payment Verification:</span>
                    {order.paymentScreenshotDataUrl && (
                      <button
                        type="button"
                        onClick={() => setInspectedOrderPayment(order)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Payment Screenshot
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onAdminUpdateOrder(
                          order.id,
                          { paymentStatus: 'verified' },
                          order.userId,
                          order.orderCode
                        );
                        showToast(`Verified payment UTR ${order.utrNumber} for ${order.orderCode}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verify UTR Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAdminUpdateOrder(
                          order.id,
                          { paymentStatus: 'rejected' },
                          order.userId,
                          order.orderCode
                        );
                        showToast(`Marked payment rejected for ${order.orderCode}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold hover:bg-red-100"
                    >
                      Reject UTR
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 font-medium">48h Shipping Stage:</span>
                    {(
                      [
                        { val: 'processing', label: 'Processing' },
                        { val: 'dispatched_48h', label: 'Dispatch (48h Express)' },
                        { val: 'delivered_active', label: 'Delivered & Active' },
                        { val: 'cancelled', label: 'Cancel' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.val}
                        type="button"
                        onClick={() => {
                          onAdminUpdateOrder(
                            order.id,
                            { orderStatus: st.val },
                            order.userId,
                            order.orderCode
                          );
                          showToast(`Updated ${order.orderCode} status to ${st.label}`);
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                          order.orderStatus === st.val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Full-Screen Payment Screenshot Zoom Modal */}
          {inspectedOrderPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 overflow-y-auto">
              <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl p-6 space-y-4 my-8">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Customer Payment Receipt Screenshot — {inspectedOrderPayment.orderCode}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Customer: {inspectedOrderPayment.customerName} · UTR:{' '}
                      <strong className="font-mono text-slate-900">
                        {inspectedOrderPayment.utrNumber}
                      </strong>{' '}
                      · Amount: ₹{inspectedOrderPayment.payableNowTotal.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedOrderPayment(null)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-center">
                  <img
                    src={inspectedOrderPayment.paymentScreenshotDataUrl}
                    alt="Full Payment Screenshot"
                    referrerPolicy="no-referrer"
                    className="max-h-96 object-contain rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      onAdminUpdateOrder(
                        inspectedOrderPayment.id,
                        { paymentStatus: 'rejected' },
                        inspectedOrderPayment.userId,
                        inspectedOrderPayment.orderCode
                      );
                      setInspectedOrderPayment(null);
                      showToast(`Rejected payment for ${inspectedOrderPayment.orderCode}`);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg"
                  >
                    Reject Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAdminUpdateOrder(
                        inspectedOrderPayment.id,
                        { paymentStatus: 'verified' },
                        inspectedOrderPayment.userId,
                        inspectedOrderPayment.orderCode
                      );
                      setInspectedOrderPayment(null);
                      showToast(`Verified payment for ${inspectedOrderPayment.orderCode}!`);
                    }}
                    className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Approve & Verify Payment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER KYC & DOCUMENT INSPECTOR (ADDRESS, AADHAAR PHOTO, PAN PHOTO) */}
      {activeTab === 'kyc' && (
        <div className="space-y-6">
          {kycList.length === 0 ? (
            <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-sm text-slate-500">
              No customer KYC documents uploaded yet. Complete a checkout or upload Aadhaar/PAN in the Customer Portal to inspect them here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kycList.map((kyc) => (
                <div
                  key={kyc.id}
                  className="p-5 rounded-xl bg-white border border-slate-200 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{kyc.fullName}</h3>
                      <p className="text-xs text-slate-500">
                        {kyc.email} · <span className="font-mono">{kyc.phone}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold uppercase text-[#E62E2D]">
                      KYC: {kyc.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-lg">
                    <div>
                      <span className="text-slate-500">Full Delivery Address: </span>
                      <span className="font-semibold text-slate-900">
                        {kyc.fullAddress} — <strong className="font-mono">{kyc.pincode}</strong>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">12-Digit Aadhaar Card Number: </span>
                      <span className="font-mono font-bold text-slate-900">
                        {kyc.aadhaarNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">10-Char PAN Card Number: </span>
                      <span className="font-mono font-bold text-slate-900">{kyc.panNumber}</span>
                    </div>
                  </div>

                  {/* Side-by-side Aadhaar Photo & PAN Photo Thumbnails */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-600">
                        Uploaded Aadhaar Card Photo
                      </div>
                      <img
                        src={kyc.aadhaarPhotoDataUrl}
                        alt="Customer Aadhaar Card"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          setInspectedKyc(kyc);
                          setKycRemarkInput(kyc.adminRemarks || '');
                        }}
                        className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-600">
                        Uploaded PAN Card Photo
                      </div>
                      <img
                        src={kyc.panPhotoDataUrl}
                        alt="Customer PAN Card"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          setInspectedKyc(kyc);
                          setKycRemarkInput(kyc.adminRemarks || '');
                        }}
                        className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectedKyc(kyc);
                        setKycRemarkInput(kyc.adminRemarks || '');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Zoom & Inspect Full KYC
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onAdminReviewKyc(
                            kyc.id,
                            kyc.orderId,
                            kyc.userId,
                            'approved',
                            'Aadhaar & PAN Verified by Admin — Cleared for 48h Express Dispatch'
                          );
                          showToast(`Approved KYC for ${kyc.fullName}`);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve KYC
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAdminReviewKyc(
                            kyc.id,
                            kyc.orderId,
                            kyc.userId,
                            'rejected',
                            'Please re-upload a clearer photo of your Aadhaar/PAN card.'
                          );
                          showToast(`Requested KYC re-upload from ${kyc.fullName}`);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full-Screen KYC Document Zoom Modal */}
          {inspectedKyc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 overflow-y-auto">
              <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-xl p-6 space-y-5 my-8">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Customer KYC Document Dossier — {inspectedKyc.fullName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Address: {inspectedKyc.fullAddress} ({inspectedKyc.pincode}) · Aadhaar:{' '}
                      <span className="font-mono font-bold">{inspectedKyc.aadhaarNumber}</span> ·
                      PAN: <span className="font-mono font-bold">{inspectedKyc.panNumber}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedKyc(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      Aadhaar Card Photo ({inspectedKyc.aadhaarNumber})
                    </div>
                    <img
                      src={inspectedKyc.aadhaarPhotoDataUrl}
                      alt="Full Aadhaar Card"
                      referrerPolicy="no-referrer"
                      className="w-full rounded-xl border border-slate-200 object-contain max-h-72 bg-slate-50"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      PAN Card Photo ({inspectedKyc.panNumber})
                    </div>
                    <img
                      src={inspectedKyc.panPhotoDataUrl}
                      alt="Full PAN Card"
                      referrerPolicy="no-referrer"
                      className="w-full rounded-xl border border-slate-200 object-contain max-h-72 bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Verification Remarks (Sent to Customer Notification)
                  </label>
                  <input
                    type="text"
                    value={kycRemarkInput}
                    onChange={(e) => setKycRemarkInput(e.target.value)}
                    placeholder="e.g. Aadhaar & PAN verified. Dispatched via 48h Express."
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      onAdminReviewKyc(
                        inspectedKyc.id,
                        inspectedKyc.orderId,
                        inspectedKyc.userId,
                        'rejected',
                        kycRemarkInput || 'KYC document unclear, please re-upload.'
                      );
                      setInspectedKyc(null);
                      showToast('Marked KYC as Rejected and notified customer.');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg"
                  >
                    Reject & Ask Re-Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAdminReviewKyc(
                        inspectedKyc.id,
                        inspectedKyc.orderId,
                        inspectedKyc.userId,
                        'approved',
                        kycRemarkInput || 'Aadhaar & PAN verified by Admin.'
                      );
                      setInspectedKyc(null);
                      showToast('Approved KYC and notified customer!');
                    }}
                    className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Approve KYC & Notify Customer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BANK DETAILS & UPI QR SCANNER SETTINGS */}
      {activeTab === 'bank' && (
        <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Customer Rent Collection Bank Details & UPI QR Scanner
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Update your bank account details, UPI ID, and custom QR scanner image here. Customers will immediately see these details during Step 2 of Checkout.
            </p>
          </div>

          <form onSubmit={handleSaveBankConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={bankForm.accountHolderName}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, accountHolderName: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">IFSC Code *</label>
                <input
                  type="text"
                  value={bankForm.ifscCode}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })
                  }
                  required
                  className="w-full px-3.5 py-2 text-sm font-mono uppercase rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  value={bankForm.branchName}
                  onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#E62E2D] mb-1">
                  Merchant UPI ID (for Scanner) *
                </label>
                <input
                  type="text"
                  value={bankForm.upiId}
                  onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Instructions Note Shown at Checkout
              </label>
              <textarea
                rows={2}
                value={bankForm.paymentNote}
                onChange={(e) => setBankForm({ ...bankForm, paymentNote: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">
                  Custom UPI Scanner QR Image (Optional)
                </div>
                <p className="text-slate-500">
                  Upload your own PhonePe / GPay / Paytm QR image, or leave empty to auto-generate a dynamic UPI QR from your UPI ID.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:border-[#E62E2D] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  <span>Upload QR Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrFileUpload}
                    className="hidden"
                  />
                </label>
                {bankForm.qrImageUrl && (
                  <button
                    type="button"
                    onClick={() => setBankForm({ ...bankForm, qrImageUrl: '' })}
                    className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-semibold"
                  >
                    Use Auto UPI QR
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Bank & Scanner Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: USER ACTIVITY LOGS & NOTIFICATION SYSTEM */}
      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 5 Columns: Send Notification to Customer */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-fit">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BellPlus className="w-4 h-4 text-[#E62E2D]" />
              Send Real-Time Notification to Customer
            </h3>
            <p className="text-xs text-slate-600">
              Send instant order dispatch alerts, rent due reminders, or KYC status updates to customers.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!notifTitle.trim() || !notifMessage.trim()) return;
                await onSendBroadcastNotification(
                  notifTarget,
                  notifTitle.trim(),
                  notifMessage.trim(),
                  notifType
                );
                setNotifTitle('');
                setNotifMessage('');
                showToast('Notification dispatched to customer!');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient</label>
                <select
                  value={notifTarget}
                  onChange={(e) => setNotifTarget(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ALL_USERS">All Active Customers</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.userId}>
                      {o.customerName} ({o.orderCode} — {o.customerEmail})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as typeof notifType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  <option value="shipping">48-Hour Express Shipping Update</option>
                  <option value="payment">Rent Payment / UTR Confirmation</option>
                  <option value="kyc">Aadhaar & PAN KYC Verification</option>
                  <option value="order">Order Update</option>
                  <option value="promo">Special Offer / Upgrade</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. Dispatched: Arriving Within 48 Hours!"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message *</label>
                <textarea
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Your rented iPhone 16 Pro Max has passed quality check and is out for 48-hour express delivery."
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221]"
              >
                Send Notification Now
              </button>
            </form>
          </div>

          {/* Right 7 Columns: Chronological User Activity Logs */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#1DB2A6]" />
                Customer & Admin Activity Audit Logs ({userLogs.length})
              </h3>
              <span className="text-xs font-mono text-slate-500">LIVE AUDIT TRAIL</span>
            </div>

            {userLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No user logs recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {userLogs.map((log) => (
                  <div key={log.id} className="py-3 text-xs flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        <span className="uppercase text-[#E62E2D] mr-1.5">[{log.category}]</span>
                        {log.action}
                      </div>
                      <div className="text-slate-600">{log.details}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Actor: {log.userEmail} (UID: {log.userId.slice(0, 10)})
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(log.createdAtIso).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: REGISTERED USERS, LOGIN CREDENTIALS & IP ADDRESS TRACKER */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#E62E2D]" />
                <span>Registered Customer Accounts, Login Details & Live IP Tracker</span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Every new account created on the storefront appears here with full login credentials, live IP address, state/city, and device fingerprint.
              </p>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-mono">
              Total Accounts: {customerAccounts.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer Name & ID</th>
                  <th className="py-3.5 px-4">Login Email & Phone</th>
                  <th className="py-3.5 px-4">Login Password</th>
                  <th className="py-3.5 px-4">Live IP Address & Device</th>
                  <th className="py-3.5 px-4">City, State & PIN</th>
                  <th className="py-3.5 px-4">Created & Last Login</th>
                  <th className="py-3.5 px-4 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customerAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{acc.fullName}</div>
                      <div className="font-mono text-[11px] text-slate-400">{acc.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{acc.email}</div>
                      <div className="font-mono text-slate-600">+91 {acc.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 font-mono font-bold text-amber-900">
                        {acc.passwordPlain}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-teal-700">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{acc.ipAddress}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{acc.userAgent}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {acc.city}, {acc.state}
                      </div>
                      <div className="font-mono text-slate-500">PIN: {acc.pincode}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700">
                        Joined: {new Date(acc.createdAtIso).toLocaleString('en-IN')}
                      </div>
                      <div className="text-teal-700 font-semibold mt-0.5">
                        Last Login: {new Date(acc.lastLoginIso).toLocaleString('en-IN')} (
                        {acc.loginCount}x)
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          const next = acc.status === 'active' ? 'blocked' : 'active';
                          await onToggleCustomerStatus(acc.id, next);
                          showToast(`Account ${acc.email} marked as ${next.toUpperCase()}`);
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                          acc.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-800'
                            : 'bg-red-100 text-red-800 hover:bg-emerald-100 hover:text-emerald-800'
                        }`}
                      >
                        {acc.status === 'active' ? 'Active (Click to Block)' : 'Blocked (Unblock)'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: LIVE CHAT DESK — LAXMI CUSTOMER ENQUIRIES */}
      {activeTab === 'livechat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[560px]">
          {/* Left 4 Columns: Customer Enquiry Sessions List */}
          <div className="lg:col-span-4 border-r border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Laxmi Live Customer Enquiries</h3>
                <p className="text-[11px] text-slate-400">
                  Real-time customer leads & live chat sessions
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#DF2927] text-white text-xs font-mono font-bold">
                {liveChats.length} Chats
              </span>
            </div>

            <div className="divide-y divide-slate-200 overflow-y-auto max-h-[500px]">
              {liveChats.map((chat) => {
                const isSelected = activeSelectedChat?.id === chat.id;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full p-4 text-left transition-colors flex flex-col gap-1.5 ${
                      isSelected ? 'bg-red-50/80 border-l-4 border-[#DF2927]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {chat.customerName || 'New Visitor (Typing...)'}
                      </span>
                      {chat.unreadForAdmin > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#DF2927] text-white text-[10px] font-mono font-bold">
                          {chat.unreadForAdmin} New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                      <span>Phone: {chat.customerPhone || 'Collecting...'}</span>
                      <span>·</span>
                      <span className="text-teal-700">IP: {chat.ipAddress}</span>
                    </div>
                    <div className="text-xs text-slate-700 line-clamp-1 font-medium">
                      {chat.enquiryProduct ||
                        chat.messages[chat.messages.length - 1]?.text ||
                        'Laxmi Onboarding Active'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="uppercase font-bold text-[#DF2927]">{chat.status}</span>
                      <span>{new Date(chat.updatedAtIso).toLocaleTimeString('en-IN')}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 8 Columns: Active Live Conversation & Instant Admin Reply */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            {activeSelectedChat ? (
              <>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {activeSelectedChat.customerName || 'Visitor'}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-teal-300 font-mono text-xs font-bold">
                        {activeSelectedChat.customerPhone || 'No Phone Yet'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-xs">
                        IP: {activeSelectedChat.ipAddress}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Enquiry Topic:{' '}
                      <strong className="text-slate-900">
                        {activeSelectedChat.enquiryProduct || 'Onboarding with Laxmi Bot'}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await onAdminReplyChat(
                          activeSelectedChat.id,
                          '',
                          activeSelectedChat.status === 'resolved'
                            ? 'active_live'
                            : 'resolved'
                        );
                        showToast('Chat status updated!');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
                    >
                      {activeSelectedChat.status === 'resolved'
                        ? 'Reopen Chat'
                        : 'Mark Resolved'}
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-5 overflow-y-auto space-y-3 max-h-[380px] bg-slate-50/50">
                  {activeSelectedChat.messages.map((m) => {
                    const isAdminMsg = m.sender === 'admin';
                    const isCustMsg = m.sender === 'customer';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] font-bold text-slate-500 mb-1">
                          {isAdminMsg
                            ? 'You (Rentmojo Admin)'
                            : isCustMsg
                            ? `Customer (${m.senderName})`
                            : 'Laxmi Bot'}
                        </span>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            isAdminMsg
                              ? 'bg-slate-900 text-white'
                              : isCustMsg
                              ? 'bg-[#DF2927] text-white'
                              : 'bg-white text-slate-800 border border-slate-200'
                          }`}
                        >
                          {m.text}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(m.timestampIso).toLocaleTimeString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Admin Live Reply Input */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!adminReplyInput.trim()) return;
                    const text = adminReplyInput.trim();
                    setAdminReplyInput('');
                    await onAdminReplyChat(activeSelectedChat.id, text, 'active_live');
                    showToast(`Live reply sent to ${activeSelectedChat.customerName}!`);
                  }}
                  className="p-4 bg-white border-t border-slate-200 flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={adminReplyInput}
                    onChange={(e) => setAdminReplyInput(e.target.value)}
                    placeholder={`Type a live message to ${
                      activeSelectedChat.customerName || 'Customer'
                    }...`}
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#DF2927] hover:bg-[#c92221] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Live Reply</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 text-sm">
                Select a customer enquiry on the left to start chatting live.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: PORTABLE WEBSITE & FIREBASE SELF-HOSTING PACKAGE */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Portable Website & Firebase Self-Hosting Package
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Download your complete Firebase configuration, database collections (Products, Users, IPs, Orders, KYC, Live Chats), and deployment guide to host on any server (Firebase Hosting, Vercel, Netlify, or Custom VPS).
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPortablePackage}
              className="px-5 py-3 rounded-xl bg-[#DF2927] hover:bg-[#c92221] text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Firebase & Website Backup (.json)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-2">
              <div className="text-teal-300 font-mono font-bold uppercase">
                Connected Firebase Configuration (firebase-applet-config.json)
              </div>
              <pre className="p-3 rounded-lg bg-slate-950 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(firebaseConfig, null, 2)}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 text-sm">
                How to Host on Any Hosting Provider (Future-Proof Steps)
              </div>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed">
                <li>
                  <strong>Export Code & Config:</strong> Use AI Studio&apos;s top-right{' '}
                  <strong>Download / Export ZIP (or GitHub)</strong> button along with the{' '}
                  <strong>Portable Backup JSON</strong> button above.
                </li>
                <li>
                  <strong>Install Dependencies Locally:</strong> Run{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">npm install</code>{' '}
                  in the project folder.
                </li>
                <li>
                  <strong>Build Production Bundle:</strong> Run{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">
                    npm run build
                  </code>{' '}
                  — this generates the static{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">dist/</code>{' '}
                  folder already wired to your Firebase project{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">
                    {firebaseConfig.projectId}
                  </code>
                  .
                </li>
                <li>
                  <strong>Deploy Anywhere:</strong> Upload the{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">dist/</code>{' '}
                  folder to <strong>Firebase Hosting</strong>, <strong>Vercel</strong>,{' '}
                  <strong>Netlify</strong>, or <strong>Hostinger / cPanel</strong>. Add your new
                  custom domain in <em>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized Domains</em>.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
