import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Truck,
  ShieldCheck,
  RefreshCw,
  Wrench,
  Search,
  MapPin,
  SlidersHorizontal,
  Bell,
  User,
  LogOut,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Star,
  Lock,
  Menu,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  AppNotification,
  CustomerAccountRecord,
  DEFAULT_PAYMENT_CONFIG,
  HERO_IMAGE_URL,
  INDIAN_CITIES,
  INITIAL_CUSTOMER_ACCOUNTS,
  INITIAL_LIVE_CHATS,
  INITIAL_PRODUCTS,
  KycRecord,
  LiveChatSession,
  PaymentConfigData,
  ProductCategory,
  RENTMOJO_LOGO_URL,
  RentalOrder,
  RentalProduct,
  SUBSCRIBER_REVIEWS,
  TenureMonths,
  UserActivityLog,
  formatGuaranteed48hDate,
  getRentByTenure,
} from './data/initialData';
import {
  CartItemEntry,
  CheckoutAndKycModal,
  CheckoutSubmissionPayload,
} from './components/CheckoutAndKycModal';
import { CustomerPortalView } from './components/CustomerPortalView';
import { AdminConsole } from './components/AdminConsole';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { LaxmiLiveChatWidget } from './components/LaxmiLiveChatWidget';
import {
  generateSampleDocumentDataUrl,
  generateSamplePaymentScreenshotDataUrl,
} from './utils/kycAndQrHelpers';

type ActiveView = 'storefront' | 'portal' | 'admin';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/admin') || window.location.hash === '#/admin')
    ) {
      return 'admin';
    }
    return 'storefront';
  });
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    emailVerified: boolean;
  } | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      if (
        window.location.pathname.startsWith('/admin') ||
        window.location.hash === '#/admin'
      ) {
        setActiveView('admin');
      } else if (activeView === 'admin') {
        setActiveView('storefront');
      }
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, [activeView]);

  // Storefront Filter & Tenure State + Automatic IP Geolocation State
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>('all');
  const [selectedTenure, setSelectedTenure] = useState<TenureMonths>(12);
  const [selectedCity, setSelectedCity] = useState<string>('All Over India');
  const [detectedIpLocation, setDetectedIpLocation] = useState<{
    cityArea: string;
    pincode: string;
    ip: string;
  } | null>(null);
  const [pincodeInput, setPincodeInput] = useState<string>('110001');
  const [pincodeVerifiedMsg, setPincodeVerifiedMsg] = useState<string>(
    'Guaranteed 48-Hour Express Delivery available All Over India (All Pincodes)'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const detectUserCityFromIp = async (showNotification = false) => {
    try {
      let city = '';
      let region = '';
      let postal = '';
      let ip = '';

      // Provider 1: ipwho.is (Fast CORS-enabled JSON IP geolocation)
      try {
        const res1 = await fetch('https://ipwho.is/');
        if (res1.ok) {
          const data1 = await res1.json();
          if (data1 && data1.success !== false && (data1.city || data1.region)) {
            city = String(data1.city || '').trim();
            region = String(data1.region || '').trim();
            postal = String(data1.postal || '').replace(/\D/g, '').slice(0, 6);
            ip = String(data1.ip || '').trim();
          }
        }
      } catch {
        // Fallback to Provider 2
      }

      // Provider 2: ipapi.co/json/
      if (!city && !region) {
        try {
          const res2 = await fetch('https://ipapi.co/json/');
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && (data2.city || data2.region)) {
              city = String(data2.city || '').trim();
              region = String(data2.region || '').trim();
              postal = String(data2.postal || '').replace(/\D/g, '').slice(0, 6);
              ip = String(data2.ip || '').trim();
            }
          }
        } catch {
          // Fallback to Provider 3
        }
      }

      // Provider 3: freeipapi.com
      if (!city && !region) {
        try {
          const res3 = await fetch('https://freeipapi.com/api/json');
          if (res3.ok) {
            const data3 = await res3.json();
            if (data3 && (data3.cityName || data3.regionName)) {
              city = String(data3.cityName || '').trim();
              region = String(data3.regionName || '').trim();
              postal = String(data3.zipCode || '').replace(/\D/g, '').slice(0, 6);
              ip = String(data3.ipAddress || '').trim();
            }
          }
        } catch {
          // Ignore
        }
      }

      if (city || region) {
        const areaLabel =
          city && region && city.toLowerCase() !== region.toLowerCase()
            ? `${city}, ${region}`
            : city || region;

        const matchedKnown = INDIAN_CITIES.find(
          (c) =>
            c.name.toLowerCase() === city.toLowerCase() ||
            city.toLowerCase().includes(c.name.toLowerCase())
        );
        const resolvedPin =
          postal.length === 6
            ? postal
            : matchedKnown?.samplePin || '110001';

        setDetectedIpLocation({
          cityArea: areaLabel,
          pincode: resolvedPin,
          ip: ip || 'Detected IP',
        });
        setSelectedCity(areaLabel);
        setPincodeInput(resolvedPin);
        setPincodeVerifiedMsg(
          `Auto-Detected via IP (${ip || 'Live IP'}): Guaranteed 48-Hour Delivery available in ${areaLabel} (${resolvedPin})`
        );
        if (showNotification) {
          setToastMessage(`Location auto-selected via IP: ${areaLabel} (${resolvedPin})`);
          setTimeout(() => setToastMessage(null), 3500);
        }
      }
    } catch {
      // Ignore IP lookup errors
    }
  };

  useEffect(() => {
    detectUserCityFromIp(false);
  }, []);

  // Core Data State (Hydrated from Firestore + local fallback for instant Guest Checkout)
  const [products, setProducts] = useState<RentalProduct[]>(INITIAL_PRODUCTS);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigData>(DEFAULT_PAYMENT_CONFIG);
  const [orders, setOrders] = useState<RentalOrder[]>(() => {
    const saved = localStorage.getItem('rm0_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'ord_demo_1001',
        orderCode: 'RMJ-849201',
        userId: 'demo_guest_user',
        checkoutType: 'guest',
        customerName: 'Rohan Verma',
        customerEmail: 'rohan.verma@example.com',
        customerPhone: '9820112233',
        shippingAddress: 'Flat 604, Oberoi Woods, Goregaon East',
        city: 'Mumbai',
        pincode: '400063',
        itemsSummary: 'Apple iPhone 16 Pro Max (256GB, Natural Titanium) x1 (12M)',
        primaryProductId: 'prod_iphone_16_pro_max',
        tenureMonths: 12,
        monthlyRentTotal: 3299,
        refundableDepositTotal: 4999,
        payableNowTotal: 8298,
        utrNumber: '431900881234',
        paymentScreenshotDataUrl: generateSamplePaymentScreenshotDataUrl(
          'Rohan Verma',
          8298,
          '431900881234',
          DEFAULT_PAYMENT_CONFIG.upiId
        ),
        paymentMethod: 'upi_qr',
        paymentStatus: 'pending_verification',
        orderStatus: 'processing',
        kycStatus: 'submitted',
        guaranteedDeliveryBy: formatGuaranteed48hDate(),
        createdAtIso: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ];
  });

  const [kycList, setKycList] = useState<KycRecord[]>(() => {
    const saved = localStorage.getItem('rm0_kyc');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'kyc_demo_1001',
        userId: 'demo_guest_user',
        orderId: 'ord_demo_1001',
        fullName: 'Rohan Verma',
        email: 'rohan.verma@example.com',
        phone: '9820112233',
        fullAddress: 'Flat 604, Oberoi Woods, Goregaon East, Mumbai',
        pincode: '400063',
        aadhaarNumber: '482910384756',
        panNumber: 'ABCDE1234F',
        aadhaarPhotoDataUrl: generateSampleDocumentDataUrl(
          'aadhaar',
          'Rohan Verma',
          '482910384756'
        ),
        panPhotoDataUrl: generateSampleDocumentDataUrl('pan', 'Rohan Verma', 'ABCDE1234F'),
        status: 'submitted',
        adminRemarks: '',
        createdAtIso: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('rm0_notifs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'notif_welcome',
        targetUserId: 'ALL_USERS',
        actorId: 'system',
        title: '48-Hour Express Delivery Active on All Pincodes',
        message:
          'Rent smartphones, MacBooks, gaming consoles, and furniture with guaranteed 48-hour delivery, instant UPI QR checkout, and paperless Aadhaar/PAN KYC.',
        type: 'shipping',
        read: false,
        createdAtIso: new Date().toISOString(),
      },
    ];
  });

  const [userLogs, setUserLogs] = useState<UserActivityLog[]>(() => {
    const saved = localStorage.getItem('rm0_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'log_init_1',
        userId: 'demo_guest_user',
        userEmail: 'rohan.verma@example.com',
        action: 'Guest Checkout Order & KYC Uploaded',
        details:
          'Order RMJ-849201 placed for iPhone 16 Pro Max (Pincode 400063 — 48h Guaranteed Delivery)',
        category: 'checkout',
        createdAtIso: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ];
  });

  // Cart & Modals State
  const [cart, setCart] = useState<CartItemEntry[]>([
    {
      product: INITIAL_PRODUCTS[0],
      tenure: 12,
      quantity: 1,
    },
  ]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<RentalProduct | null>(null);
  const [quickViewImgIdx, setQuickViewImgIdx] = useState<number>(0);
  const [cardImgIndexMap, setCardImgIndexMap] = useState<Record<string, number>>({});
  const [heroSlideIndex, setHeroSlideIndex] = useState<number>(0);
  const [isHeroPaused, setIsHeroPaused] = useState<boolean>(false);
  const [heroTouchStartX, setHeroTouchStartX] = useState<number | null>(null);
  const [reviewStartIndex, setReviewStartIndex] = useState<number>(0);
  const [isAllReviewsModalOpen, setIsAllReviewsModalOpen] = useState<boolean>(false);
  const [reviewCategoryFilter, setReviewCategoryFilter] = useState<'all' | 'mobiles' | 'laptops'>(
    'all'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<
    'inventory' | 'orders' | 'kyc' | 'bank' | 'logs' | 'users' | 'livechat' | 'export'
  >('livechat');

  const openAdminConsole = (
    tab: 'inventory' | 'orders' | 'kyc' | 'bank' | 'logs' | 'users' | 'livechat' | 'export' = 'livechat'
  ) => {
    setAdminInitialTab(tab);
    window.history.pushState({}, '', '/admin');
    setActiveView('admin');
  };

  // Registered Customer Accounts & Active Logged-In Customer State
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccountRecord[]>(() => {
    const saved = localStorage.getItem('rm0_customer_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return INITIAL_CUSTOMER_ACCOUNTS;
  });

  const [activeCustomer, setActiveCustomer] = useState<CustomerAccountRecord | null>(() => {
    const saved = localStorage.getItem('rm0_active_customer');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });

  // Persistent Live Chat (Laxmi Enquiries) State
  const [liveChats, setLiveChats] = useState<LiveChatSession[]>(() => {
    const saved = localStorage.getItem('rm0_live_chats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return INITIAL_LIVE_CHATS;
  });

  const isAdminUser = Boolean(
    currentUser &&
      currentUser.emailVerified &&
      currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist local state for seamless guest checkout, accounts, live chat & reload durability
  useEffect(() => {
    localStorage.setItem('rm0_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('rm0_kyc', JSON.stringify(kycList));
  }, [kycList]);

  useEffect(() => {
    localStorage.setItem('rm0_notifs', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('rm0_logs', JSON.stringify(userLogs));
  }, [userLogs]);

  useEffect(() => {
    localStorage.setItem('rm0_customer_accounts', JSON.stringify(customerAccounts));
  }, [customerAccounts]);

  useEffect(() => {
    if (activeCustomer) {
      localStorage.setItem('rm0_active_customer', JSON.stringify(activeCustomer));
    } else {
      localStorage.removeItem('rm0_active_customer');
    }
  }, [activeCustomer]);

  useEffect(() => {
    localStorage.setItem('rm0_live_chats', JSON.stringify(liveChats));
  }, [liveChats]);

  // Real-time Cross-Tab & Multi-Window Sync for Live Chat (Laxmi) & Customer Accounts
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'rm0_live_chats' && e.newValue) {
        try {
          setLiveChats(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      } else if (e.key === 'rm0_customer_accounts' && e.newValue) {
        try {
          setCustomerAccounts(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      } else if (e.key === 'rm0_logs' && e.newValue) {
        try {
          setUserLogs(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('rentmojo_live_sync');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'SYNC_CHATS' && Array.isArray(ev.data.payload)) {
          setLiveChats(ev.data.payload);
        } else if (ev.data?.type === 'SYNC_ACCOUNTS' && Array.isArray(ev.data.payload)) {
          setCustomerAccounts(ev.data.payload);
        }
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      bc?.close();
    };
  }, []);

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Public Firestore Listeners (Catalog Products & Admin Bank/QR Payment Config)
  useEffect(() => {
    if (!authReady) return;

    const productsRef = collection(db, 'products');
    const unsubProducts = onSnapshot(
      query(productsRef, where('stockCount', '>=', 0)),
      (snap) => {
        if (!snap.empty) {
          const loadedFromFs: RentalProduct[] = snap.docs.map((d) => {
            const data = d.data();
            const initMatch = INITIAL_PRODUCTS.find((ip) => ip.id === d.id);
            const rawImg = String(data.imageUrl || '');
            // Always prefer the product-specific Amazon.in image from INITIAL_PRODUCTS for built-in SKUs
            const resolvedPrimaryImg = initMatch
              ? initMatch.imageUrl
              : rawImg || HERO_IMAGE_URL;
            const resolvedGallery =
              initMatch?.galleryImages && initMatch.galleryImages.length > 0
                ? initMatch.galleryImages
                : [resolvedPrimaryImg];

            return {
              id: d.id,
              name: String(initMatch?.name || data.name || ''),
              category: (data.category as ProductCategory) || initMatch?.category || 'mobiles',
              brand: String(data.brand || initMatch?.brand || '').replace(/Rentm0j0/gi, 'Rentmojo'),
              shortSpec: String(initMatch?.shortSpec || data.shortSpec || '').replace(
                /Rentm0j0/gi,
                'Rentmojo'
              ),
              description: String(initMatch?.description || data.description || '').replace(
                /Rentm0j0/gi,
                'Rentmojo'
              ),
              imageUrl: resolvedPrimaryImg,
              galleryImages: resolvedGallery,
              rent3m: Number(data.rent3m || initMatch?.rent3m || 0),
              rent6m: Number(data.rent6m || initMatch?.rent6m || 0),
              rent12m: Number(data.rent12m || initMatch?.rent12m || 0),
              rent24m: Number(data.rent24m || initMatch?.rent24m || 0),
              securityDeposit: Number(data.securityDeposit || initMatch?.securityDeposit || 0),
              stockCount: Number(data.stockCount ?? initMatch?.stockCount ?? 0),
              featured: Boolean(data.featured ?? initMatch?.featured),
              deliveryHours: Number(data.deliveryHours || 48),
            };
          });

          // Merge all INITIAL_PRODUCTS so no iPhone, Smartphone, Laptop, or Gadget is ever missing
          const fsMap = new Map(loadedFromFs.map((p) => [p.id, p]));
          const mergedCatalog: RentalProduct[] = INITIAL_PRODUCTS.map(
            (initProd) => fsMap.get(initProd.id) || initProd
          );
          // Also include any custom products added by Admin via /admin
          loadedFromFs.forEach((fsProd) => {
            if (!INITIAL_PRODUCTS.some((ip) => ip.id === fsProd.id)) {
              mergedCatalog.unshift(fsProd);
            }
          });

          setProducts(mergedCatalog);

          // If Admin is signed in, backfill any missing INITIAL_PRODUCTS into Firestore
          if (isAdminUser && currentUser) {
            INITIAL_PRODUCTS.forEach(async (item) => {
              if (!fsMap.has(item.id)) {
                try {
                  await setDoc(doc(db, 'products', item.id), {
                    name: item.name,
                    category: item.category,
                    brand: item.brand,
                    shortSpec: item.shortSpec,
                    description: item.description,
                    imageUrl: item.imageUrl,
                    rent3m: item.rent3m,
                    rent6m: item.rent6m,
                    rent12m: item.rent12m,
                    rent24m: item.rent24m,
                    securityDeposit: item.securityDeposit,
                    stockCount: item.stockCount,
                    featured: item.featured,
                    deliveryHours: item.deliveryHours,
                    updatedBy: currentUser.uid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                } catch (e) {
                  console.warn('Backfill product skipped:', e);
                }
              }
            });
          }
        } else if (isAdminUser && currentUser) {
          // Seed initial catalog into Firestore when Admin first logs in
          INITIAL_PRODUCTS.forEach(async (item) => {
            try {
              await setDoc(doc(db, 'products', item.id), {
                name: item.name,
                category: item.category,
                brand: item.brand,
                shortSpec: item.shortSpec,
                description: item.description,
                imageUrl: item.imageUrl,
                rent3m: item.rent3m,
                rent6m: item.rent6m,
                rent12m: item.rent12m,
                rent24m: item.rent24m,
                securityDeposit: item.securityDeposit,
                stockCount: item.stockCount,
                featured: item.featured,
                deliveryHours: item.deliveryHours,
                updatedBy: currentUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (e) {
              console.warn('Catalog seed skipped:', e);
            }
          });
        }
      },
      (err) => {
        console.warn('Products listener fallback active:', err);
      }
    );

    const paymentDocRef = doc(db, 'settings', 'payment_config');
    const unsubPayment = onSnapshot(
      paymentDocRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setPaymentConfig({
            bankName: String(d.bankName || DEFAULT_PAYMENT_CONFIG.bankName).replace(
              /Rentm0j0/gi,
              'Rentmojo'
            ),
            accountHolderName: String(
              d.accountHolderName || DEFAULT_PAYMENT_CONFIG.accountHolderName
            ).replace(/Rentm0j0/gi, 'Rentmojo'),
            accountNumber: String(d.accountNumber || DEFAULT_PAYMENT_CONFIG.accountNumber),
            ifscCode: String(d.ifscCode || DEFAULT_PAYMENT_CONFIG.ifscCode),
            branchName: String(d.branchName || DEFAULT_PAYMENT_CONFIG.branchName),
            upiId: String(d.upiId || DEFAULT_PAYMENT_CONFIG.upiId).replace(
              /rentm0j0/gi,
              'rentmojo'
            ),
            qrImageUrl: String(d.qrImageUrl || ''),
            paymentNote: String(d.paymentNote || DEFAULT_PAYMENT_CONFIG.paymentNote).replace(
              /Rentm0j0/gi,
              'Rentmojo'
            ),
            updatedBy: String(d.updatedBy || 'system'),
          });
        }
      },
      (err) => {
        console.warn('Settings listener fallback active:', err);
      }
    );

    return () => {
      unsubProducts();
      unsubPayment();
    };
  }, [authReady, isAdminUser, currentUser]);

  // 3. Real-Time Firestore Listeners for Live Chats (Laxmi), Customer Accounts, Orders & KYC
  useEffect(() => {
    if (!authReady) return;

    // Live Chats Listener (Laxmi Enquiries & Admin Replies)
    const unsubLiveChats = onSnapshot(
      query(collection(db, 'liveChats'), where('unreadForAdmin', '>=', 0)),
      (snap) => {
        if (!snap.empty) {
          const fsChats: LiveChatSession[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              customerName: String(data.customerName || ''),
              customerPhone: String(data.customerPhone || ''),
              customerEmail: String(data.customerEmail || ''),
              city: String(data.city || 'India'),
              state: String(data.state || 'Maharashtra'),
              ipAddress: String(data.ipAddress || 'Live IP'),
              enquiryProduct: String(data.enquiryProduct || ''),
              onboardingComplete: Boolean(data.onboardingComplete),
              status:
                (data.status as LiveChatSession['status']) || 'waiting_for_admin',
              unreadForAdmin: Number(data.unreadForAdmin || 0),
              unreadForCustomer: Number(data.unreadForCustomer || 0),
              messages: Array.isArray(data.messages) ? data.messages : [],
              createdAtIso: String(data.createdAtIso || new Date().toISOString()),
              updatedAtIso: String(data.updatedAtIso || new Date().toISOString()),
            };
          });
          setLiveChats((prev) => {
            const fsMap = new Map(fsChats.map((c) => [c.id, c]));
            const merged = [...fsChats];
            prev.forEach((loc) => {
              if (!fsMap.has(loc.id)) merged.push(loc);
            });
            merged.sort(
              (a, b) =>
                new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime()
            );
            return merged;
          });
        } else {
          // Seed initial demo live chats to Firestore so Admin Desk is immediately populated
          INITIAL_LIVE_CHATS.forEach(async (chat) => {
            try {
              await setDoc(doc(db, 'liveChats', chat.id), chat);
            } catch {
              // ignore
            }
          });
        }
      },
      (err) => {
        console.warn('LiveChats listener note:', err);
      }
    );

    // Customer Accounts Listener (Registered Users, Login Passwords & Live IPs)
    const unsubAccounts = onSnapshot(
      query(collection(db, 'customerAccounts'), where('loginCount', '>=', 0)),
      (snap) => {
        if (!snap.empty) {
          const fsAccounts: CustomerAccountRecord[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              fullName: String(data.fullName || ''),
              email: String(data.email || ''),
              phone: String(data.phone || ''),
              passwordPlain: String(data.passwordPlain || ''),
              city: String(data.city || ''),
              state: String(data.state || 'Maharashtra'),
              pincode: String(data.pincode || '400001'),
              ipAddress: String(data.ipAddress || 'Live IP'),
              userAgent: String(data.userAgent || 'Browser'),
              createdAtIso: String(data.createdAtIso || new Date().toISOString()),
              lastLoginIso: String(data.lastLoginIso || new Date().toISOString()),
              loginCount: Number(data.loginCount || 1),
              status: data.status === 'blocked' ? 'blocked' : 'active',
            };
          });
          setCustomerAccounts((prev) => {
            const fsMap = new Map(fsAccounts.map((a) => [a.id, a]));
            const merged = [...fsAccounts];
            prev.forEach((loc) => {
              if (!fsMap.has(loc.id)) merged.push(loc);
            });
            return merged;
          });
        } else {
          // Seed initial demo accounts to Firestore
          INITIAL_CUSTOMER_ACCOUNTS.forEach(async (acc) => {
            try {
              await setDoc(doc(db, 'customerAccounts', acc.id), acc);
            } catch {
              // ignore
            }
          });
        }
      },
      (err) => {
        console.warn('CustomerAccounts listener note:', err);
      }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), where('monthlyRentTotal', '>=', 0)),
      (snap) => {
        if (!snap.empty) {
          const fsOrders: RentalOrder[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              orderCode: String(data.orderCode),
              userId: String(data.userId),
              checkoutType: data.checkoutType === 'guest' ? 'guest' : 'account',
              customerName: String(data.customerName),
              customerEmail: String(data.customerEmail),
              customerPhone: String(data.customerPhone),
              shippingAddress: String(data.shippingAddress),
              city: String(data.city),
              pincode: String(data.pincode),
              itemsSummary: String(data.itemsSummary),
              primaryProductId: String(data.primaryProductId),
              tenureMonths: (Number(data.tenureMonths) as TenureMonths) || 12,
              monthlyRentTotal: Number(data.monthlyRentTotal || 0),
              refundableDepositTotal: Number(data.refundableDepositTotal || 0),
              payableNowTotal: Number(data.payableNowTotal || 0),
              utrNumber: String(data.utrNumber || ''),
              paymentScreenshotDataUrl: String(data.paymentScreenshotDataUrl || ''),
              paymentMethod: data.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'upi_qr',
              paymentStatus: data.paymentStatus || 'pending_verification',
              orderStatus: data.orderStatus || 'processing',
              kycStatus: data.kycStatus || 'submitted',
              guaranteedDeliveryBy: String(data.guaranteedDeliveryBy || ''),
              createdAtIso: new Date().toISOString(),
            };
          });
          setOrders((prev) => {
            const merged = [...fsOrders];
            prev.forEach((localOrd) => {
              if (!merged.some((m) => m.id === localOrd.id)) merged.push(localOrd);
            });
            return merged;
          });
        }
      },
      (err) => {
        console.warn('Orders listener note:', err);
      }
    );

    const unsubKyc = onSnapshot(
      collection(db, 'kycSubmissions'),
      (snap) => {
        if (!snap.empty) {
          const fsKyc: KycRecord[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: String(data.userId),
              orderId: String(data.orderId),
              fullName: String(data.fullName),
              email: String(data.email),
              phone: String(data.phone),
              fullAddress: String(data.fullAddress),
              pincode: String(data.pincode),
              aadhaarNumber: String(data.aadhaarNumber),
              panNumber: String(data.panNumber),
              aadhaarPhotoDataUrl: String(data.aadhaarPhotoDataUrl),
              panPhotoDataUrl: String(data.panPhotoDataUrl),
              status: data.status || 'submitted',
              adminRemarks: String(data.adminRemarks || ''),
              createdAtIso: new Date().toISOString(),
            };
          });
          setKycList((prev) => {
            const merged = [...fsKyc];
            prev.forEach((localK) => {
              if (!merged.some((m) => m.id === localK.id)) merged.push(localK);
            });
            return merged;
          });
        }
      },
      (err) => {
        console.warn('KYC listener note:', err);
      }
    );

    return () => {
      unsubLiveChats();
      unsubAccounts();
      unsubOrders();
      unsubKyc();
    };
  }, [authReady]);

  // Helper to record User Activity Log
  const recordActivityLog = async (
    action: string,
    details: string,
    category: UserActivityLog['category'],
    actorEmailOverride?: string
  ) => {
    const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newLog: UserActivityLog = {
      id: logId,
      userId: activeCustomer?.id || currentUser?.uid || 'guest_session',
      userEmail: (
        actorEmailOverride ||
        activeCustomer?.email ||
        currentUser?.email ||
        'guest@rentmojo.in'
      ).slice(0, 140),
      action: action.slice(0, 120),
      details: details.slice(0, 600),
      category,
      createdAtIso: new Date().toISOString(),
    };
    setUserLogs((prev) => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'userLogs', logId), {
        userId: newLog.userId,
        userEmail: newLog.userEmail,
        action: newLog.action,
        details: newLog.details,
        category: newLog.category,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Cloud log sync deferred:', err);
    }
  };

  // Helper to create Notification
  const createAppNotification = async (
    targetUserId: string,
    title: string,
    message: string,
    type: AppNotification['type']
  ) => {
    const notifId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newNotif: AppNotification = {
      id: notifId,
      targetUserId,
      actorId: activeCustomer?.id || currentUser?.uid || 'guest_session',
      title: title.slice(0, 140),
      message: message.slice(0, 600),
      type,
      read: false,
      createdAtIso: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    try {
      await setDoc(doc(db, 'notifications', notifId), {
        targetUserId: newNotif.targetUserId,
        actorId: newNotif.actorId,
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Cloud notification sync deferred:', err);
    }
  };

  const broadcastLiveSync = (type: 'SYNC_CHATS' | 'SYNC_ACCOUNTS', payload: unknown) => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('rentmojo_live_sync');
        bc.postMessage({ type, payload });
        bc.close();
      } catch {
        // ignore
      }
    }
  };

  const handleRegisterCustomer = async (newAccount: CustomerAccountRecord) => {
    setCustomerAccounts((prev) => {
      const next = [newAccount, ...prev];
      broadcastLiveSync('SYNC_ACCOUNTS', next);
      return next;
    });
    setActiveCustomer(newAccount);

    try {
      await setDoc(doc(db, 'customerAccounts', newAccount.id), newAccount);
    } catch (err) {
      console.warn('Cloud customer account sync note:', err);
    }

    await recordActivityLog(
      'New Customer Account Created',
      `Name: ${newAccount.fullName} | Email: ${newAccount.email} | Phone: ${newAccount.phone} | IP: ${newAccount.ipAddress} | Location: ${newAccount.city}, ${newAccount.state} (${newAccount.pincode})`,
      'auth',
      newAccount.email
    );
    await createAppNotification(
      'ADMIN',
      `New Account Registered: ${newAccount.fullName}`,
      `Email: ${newAccount.email} | Phone: ${newAccount.phone} | IP: ${newAccount.ipAddress} (${newAccount.city}, ${newAccount.state})`,
      'order'
    );
    triggerToast(`Welcome to Rentmojo, ${newAccount.fullName}! Account created.`);
  };

  const handleLoginCustomer = async (loggedAccount: CustomerAccountRecord) => {
    setCustomerAccounts((prev) => {
      const next = prev.map((a) => (a.id === loggedAccount.id ? loggedAccount : a));
      broadcastLiveSync('SYNC_ACCOUNTS', next);
      return next;
    });
    setActiveCustomer(loggedAccount);

    try {
      await setDoc(doc(db, 'customerAccounts', loggedAccount.id), loggedAccount, {
        merge: true,
      });
    } catch (err) {
      console.warn('Cloud customer login sync note:', err);
    }

    await recordActivityLog(
      'Customer Account Logged In',
      `User: ${loggedAccount.fullName} (${loggedAccount.email}) | Phone: ${loggedAccount.phone} | IP: ${loggedAccount.ipAddress} | Login #${loggedAccount.loginCount}`,
      'auth',
      loggedAccount.email
    );
    triggerToast(`Welcome back, ${loggedAccount.fullName}!`);
  };

  const handleToggleCustomerStatus = async (
    accountId: string,
    nextStatus: 'active' | 'blocked'
  ) => {
    let targetUpdated: CustomerAccountRecord | null = null;
    setCustomerAccounts((prev) => {
      const next = prev.map((a) => {
        if (a.id === accountId) {
          targetUpdated = { ...a, status: nextStatus };
          return targetUpdated;
        }
        return a;
      });
      broadcastLiveSync('SYNC_ACCOUNTS', next);
      return next;
    });
    if (activeCustomer?.id === accountId && nextStatus === 'blocked') {
      setActiveCustomer(null);
    }
    if (targetUpdated) {
      try {
        await setDoc(doc(db, 'customerAccounts', accountId), targetUpdated, { merge: true });
      } catch (err) {
        console.warn('Cloud customer status sync note:', err);
      }
    }
    await recordActivityLog(
      `Admin Updated Customer Account Status (${nextStatus.toUpperCase()})`,
      `Account ID: ${accountId} set to ${nextStatus}`,
      'admin'
    );
  };

  const handleUpsertChatSession = async (
    updatedSession: LiveChatSession,
    notifyAdmin = false
  ) => {
    setLiveChats((prev) => {
      const exists = prev.some((c) => c.id === updatedSession.id);
      const next = exists
        ? prev.map((c) => (c.id === updatedSession.id ? updatedSession : c))
        : [updatedSession, ...prev];
      broadcastLiveSync('SYNC_CHATS', next);
      return next;
    });

    try {
      await setDoc(doc(db, 'liveChats', updatedSession.id), updatedSession);
    } catch (err) {
      console.warn('Cloud live chat sync note:', err);
    }

    if (notifyAdmin) {
      await recordActivityLog(
        `Laxmi Live Chat Enquiry from ${updatedSession.customerName || 'Customer'}`,
        `Phone: ${updatedSession.customerPhone} | IP: ${updatedSession.ipAddress} | Query: ${updatedSession.enquiryProduct}`,
        'checkout',
        updatedSession.customerEmail || 'livechat@rentmojo.in'
      );
    }
  };

  const handleAdminReplyChat = async (
    chatId: string,
    replyText: string,
    nextStatus?: LiveChatSession['status']
  ) => {
    const nowIso = new Date().toISOString();
    let updatedTargetChat: LiveChatSession | null = null;

    setLiveChats((prev) => {
      const next = prev.map((chat) => {
        if (chat.id !== chatId) return chat;
        const updatedMessages = replyText.trim()
          ? [
              ...chat.messages,
              {
                id: `m_adm_${Date.now()}`,
                sender: 'admin' as const,
                senderName: 'Rentmojo Live Admin',
                text: replyText.trim(),
                timestampIso: nowIso,
              },
            ]
          : chat.messages;
        updatedTargetChat = {
          ...chat,
          status: nextStatus || 'active_live',
          unreadForAdmin: 0,
          unreadForCustomer: replyText.trim()
            ? (chat.unreadForCustomer || 0) + 1
            : chat.unreadForCustomer,
          messages: updatedMessages,
          updatedAtIso: nowIso,
        };
        return updatedTargetChat;
      });
      broadcastLiveSync('SYNC_CHATS', next);
      return next;
    });

    if (updatedTargetChat) {
      try {
        await setDoc(doc(db, 'liveChats', chatId), updatedTargetChat);
      } catch (err) {
        console.warn('Cloud admin chat reply sync note:', err);
      }
    }

    if (replyText.trim()) {
      await recordActivityLog(
        `Admin Replied in Live Chat (${chatId})`,
        `Reply: ${replyText.trim().slice(0, 200)}`,
        'admin'
      );
    }
  };

  const handleSignOut = async () => {
    setActiveCustomer(null);
    if (currentUser) {
      await signOut(auth);
    }
    triggerToast('Signed out of your Rentmojo account.');
  };

  const handleVerifyPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pincodeInput.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setPincodeVerifiedMsg('Please enter a valid 6-digit Indian pincode (e.g. 400001, 560001).');
      return;
    }
    const deliveryDate = formatGuaranteed48hDate();
    setPincodeVerifiedMsg(
      `Guaranteed 48-Hour Doorstep Delivery available for Pincode ${cleanPin} — Arrives by ${deliveryDate}`
    );
    recordActivityLog(
      '48-Hour Pincode Eligibility Verified',
      `Checked pincode ${cleanPin} in ${selectedCity} — Guaranteed 48h delivery confirmed.`,
      'checkout'
    );
    triggerToast(`Pincode ${cleanPin} verified: Guaranteed 48-Hour Delivery!`);
  };

  const handleAddToCart = (product: RentalProduct, tenure: TenureMonths = selectedTenure) => {
    if (product.stockCount <= 0) {
      triggerToast('This item is currently out of stock.');
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.product.id === product.id && item.tenure === tenure
      );
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { product, tenure, quantity: 1 }];
    });
    triggerToast(`Added ${product.name} (${tenure}M plan) to Cart`);
  };

  const handleSubmitOrderAndKyc = async (
    payload: CheckoutSubmissionPayload
  ): Promise<string> => {
    const orderId = `ord_${Date.now()}`;
    const kycId = `kyc_${Date.now()}`;
    const orderCode = `RMJ-${Math.floor(100000 + Math.random() * 900000)}`;
    const primaryProduct = cart[0]?.product || products[0];
    const tenureMonths = cart[0]?.tenure || selectedTenure;

    const monthlyRentTotal = cart.reduce(
      (sum, item) => sum + getRentByTenure(item.product, item.tenure) * item.quantity,
      0
    );
    const refundableDepositTotal = cart.reduce(
      (sum, item) => sum + item.product.securityDeposit * item.quantity,
      0
    );
    const payableNowTotal = monthlyRentTotal + refundableDepositTotal;
    const itemsSummary = cart
      .map((c) => `${c.product.name} x${c.quantity} (${c.tenure}M)`)
      .join(', ')
      .slice(0, 950);
    const guaranteedDeliveryBy = formatGuaranteed48hDate();

    const newOrder: RentalOrder = {
      id: orderId,
      orderCode,
      userId: currentUser?.uid || `guest_${Date.now()}`,
      checkoutType: payload.checkoutType,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      shippingAddress: payload.shippingAddress,
      city: payload.city,
      pincode: payload.pincode,
      itemsSummary,
      primaryProductId: primaryProduct.id,
      tenureMonths,
      monthlyRentTotal,
      refundableDepositTotal,
      payableNowTotal,
      utrNumber: payload.utrNumber,
      paymentScreenshotDataUrl: payload.paymentScreenshotDataUrl,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'pending_verification',
      orderStatus: 'processing',
      kycStatus: 'submitted',
      guaranteedDeliveryBy,
      createdAtIso: new Date().toISOString(),
    };

    const newKyc: KycRecord = {
      id: kycId,
      userId: newOrder.userId,
      orderId,
      fullName: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerPhone,
      fullAddress: `${payload.shippingAddress}, ${payload.city}`,
      pincode: payload.pincode,
      aadhaarNumber: payload.aadhaarNumber,
      panNumber: payload.panNumber,
      aadhaarPhotoDataUrl: payload.aadhaarPhotoDataUrl,
      panPhotoDataUrl: payload.panPhotoDataUrl,
      status: 'submitted',
      adminRemarks: '',
      createdAtIso: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setKycList((prev) => [newKyc, ...prev]);

    // Decrement local product stock count
    setProducts((prev) =>
      prev.map((p) => {
        const inCart = cart.find((c) => c.product.id === p.id);
        if (!inCart) return p;
        return { ...p, stockCount: Math.max(0, p.stockCount - inCart.quantity) };
      })
    );

    // Sync Order and KYC directly to Firestore
    try {
      await setDoc(doc(db, 'orders', orderId), {
        orderCode: newOrder.orderCode,
        userId: newOrder.userId,
        checkoutType: newOrder.checkoutType,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        customerPhone: newOrder.customerPhone,
        shippingAddress: newOrder.shippingAddress,
        city: newOrder.city,
        pincode: newOrder.pincode,
        itemsSummary: newOrder.itemsSummary,
        primaryProductId: newOrder.primaryProductId,
        tenureMonths: newOrder.tenureMonths,
        monthlyRentTotal: newOrder.monthlyRentTotal,
        refundableDepositTotal: newOrder.refundableDepositTotal,
        payableNowTotal: newOrder.payableNowTotal,
        utrNumber: newOrder.utrNumber,
        paymentScreenshotDataUrl: newOrder.paymentScreenshotDataUrl,
        paymentMethod: newOrder.paymentMethod,
        paymentStatus: 'pending_verification',
        orderStatus: 'processing',
        kycStatus: 'submitted',
        guaranteedDeliveryBy: newOrder.guaranteedDeliveryBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'kycSubmissions', kycId), {
        userId: newKyc.userId,
        orderId,
        fullName: newKyc.fullName,
        email: newKyc.email,
        phone: newKyc.phone,
        fullAddress: newKyc.fullAddress,
        pincode: newKyc.pincode,
        aadhaarNumber: newKyc.aadhaarNumber,
        panNumber: newKyc.panNumber,
        aadhaarPhotoDataUrl: newKyc.aadhaarPhotoDataUrl,
        panPhotoDataUrl: newKyc.panPhotoDataUrl,
        status: 'submitted',
        adminRemarks: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Order/KYC cloud sync note:', err);
    }

    await createAppNotification(
      activeCustomer?.id || currentUser?.uid || 'ADMIN',
      `Order ${orderCode} Placed & KYC Uploaded`,
      `Payment UTR ${payload.utrNumber} & Aadhaar/PAN KYC received for ${itemsSummary}. Guaranteed 48h delivery to pincode ${payload.pincode}.`,
      'order'
    );

    await recordActivityLog(
      `Order ${orderCode} & KYC Submitted (${payload.checkoutType})`,
      `${payload.customerName} ordered ${itemsSummary} | Pincode: ${payload.pincode} | UTR: ${payload.utrNumber} | Aadhaar: ${payload.aadhaarNumber} | PAN: ${payload.panNumber}`,
      'checkout',
      payload.customerEmail
    );

    return orderCode;
  };

  // Admin Handlers
  const handleAdminSaveProduct = async (product: RentalProduct, isNew: boolean) => {
    setProducts((prev) => {
      if (isNew) return [product, ...prev];
      return prev.map((p) => (p.id === product.id ? product : p));
    });

    try {
      await setDoc(doc(db, 'products', product.id), {
        name: product.name.slice(0, 140),
        category: product.category,
        brand: product.brand.slice(0, 80),
        shortSpec: product.shortSpec.slice(0, 240),
        description: product.description.slice(0, 1200),
        imageUrl: product.imageUrl.slice(0, 600),
        rent3m: Number(product.rent3m),
        rent6m: Number(product.rent6m),
        rent12m: Number(product.rent12m),
        rent24m: Number(product.rent24m),
        securityDeposit: Number(product.securityDeposit),
        stockCount: Number(product.stockCount),
        featured: Boolean(product.featured),
        deliveryHours: Number(product.deliveryHours || 48),
        updatedBy: currentUser?.uid || 'admin_master_key',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Save product cloud note:', err);
    }

    await recordActivityLog(
      isNew ? 'Admin Added New Rental Product' : 'Admin Updated Rental Pricing / Stock',
      `${product.name} — 12M Rent: ₹${product.rent12m}/mo, Stock: ${product.stockCount} units`,
      'admin'
    );
  };

  const handleAdminDeleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      console.warn('Delete product cloud note:', err);
    }
    await recordActivityLog('Admin Deleted Product SKU', `Deleted SKU ${productId}`, 'admin');
  };

  const handleAdminSavePaymentConfig = async (config: PaymentConfigData) => {
    setPaymentConfig(config);
    try {
      await setDoc(doc(db, 'settings', 'payment_config'), {
        bankName: config.bankName.slice(0, 120),
        accountHolderName: config.accountHolderName.slice(0, 120),
        accountNumber: config.accountNumber.slice(0, 40),
        ifscCode: config.ifscCode.slice(0, 20),
        branchName: config.branchName.slice(0, 120),
        upiId: config.upiId.slice(0, 100),
        qrImageUrl: config.qrImageUrl.slice(0, 150000),
        paymentNote: config.paymentNote.slice(0, 400),
        updatedBy: currentUser?.uid || 'admin_master_key',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Save payment config cloud note:', err);
    }
    await recordActivityLog(
      'Admin Updated Bank Details & UPI QR Scanner',
      `Bank: ${config.bankName}, Account: ${config.accountNumber}, UPI: ${config.upiId}`,
      'admin'
    );
  };

  const handleAdminUpdateOrder = async (
    orderId: string,
    updates: Partial<Pick<RentalOrder, 'paymentStatus' | 'orderStatus' | 'kycStatus'>>,
    targetUserId: string,
    orderCode: string
  ) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Update order cloud note:', err);
    }
    await createAppNotification(
      targetUserId,
      `Order ${orderCode} Status Updated`,
      `Admin updated your order ${orderCode}: ${JSON.stringify(updates)}`,
      updates.orderStatus ? 'shipping' : 'payment'
    );
    await recordActivityLog(
      `Admin Updated Order ${orderCode}`,
      `Changes: ${JSON.stringify(updates)}`,
      'admin'
    );
  };

  const handleAdminReviewKyc = async (
    kycId: string,
    orderId: string,
    targetUserId: string,
    status: 'approved' | 'rejected',
    adminRemarks: string
  ) => {
    setKycList((prev) =>
      prev.map((k) => (k.id === kycId ? { ...k, status, adminRemarks } : k))
    );
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, kycStatus: status } : o))
    );
    try {
      await updateDoc(doc(db, 'kycSubmissions', kycId), {
        status,
        adminRemarks,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Review KYC cloud note:', err);
    }
    await createAppNotification(
      targetUserId,
      `KYC Verification ${status.toUpperCase()}`,
      `Your Aadhaar & PAN KYC submission has been ${status} by Rentmojo Admin. Remarks: ${adminRemarks}`,
      'kyc'
    );
    await recordActivityLog(
      `Admin ${status.toUpperCase()} Customer KYC`,
      `KYC ID: ${kycId} | Remarks: ${adminRemarks}`,
      'kyc'
    );
  };

  // Filtered Storefront Catalog (Mobiles, Laptops & Gadgets prioritized first!)
  const visibleProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.shortSpec.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Curated Hero Showcase Slider Products (4 Products Shown Simultaneously Per Slide to Fill 100% of the Box)
  const heroPriorityIds = [
    'prod_iphone_18_pro_256',
    'prod_macbook_pro_m3',
    'prod_ps5_slim_bundle',
    'prod_iphone_18_pro_max_512',
    'prod_asus_rog_strix_g16',
    'prod_iphone_17_pro_max_256',
    'prod_macbook_pro_16_m3_max',
    'prod_samsung_s24_ultra',
    'prod_ipad_pro_m4',
    'prod_dell_xps_15',
    'prod_macbook_air_15_m3',
    'prod_iphone_17_pro_256',
    'prod_hp_pavilion_plus_14',
    'prod_iphone_16_pro_max',
    'prod_macbook_air_m2',
    'prod_oneplus_12_5g',
  ];
  const heroShowcaseProducts: RentalProduct[] = [
    ...heroPriorityIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is RentalProduct => Boolean(p)),
    ...products.filter(
      (p) =>
        !heroPriorityIds.includes(p.id) &&
        (p.category === 'mobiles' || p.category === 'laptops' || p.category === 'gadgets')
    ),
  ];

  // Group into pages of 4 products so the entire Hero box is 100% filled at once
  const totalHeroPages = Math.max(1, Math.ceil(heroShowcaseProducts.length / 4));
  const safeHeroPage = heroSlideIndex % totalHeroPages;
  const currentHeroQuad: RentalProduct[] = [0, 1, 2, 3].map(
    (offset) =>
      heroShowcaseProducts[(safeHeroPage * 4 + offset) % Math.max(1, heroShowcaseProducts.length)] ||
      products[offset % products.length]
  );
  const activeHeroProduct = currentHeroQuad[0] || products[0];

  useEffect(() => {
    if (isHeroPaused || totalHeroPages <= 1) return;
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % totalHeroPages);
    }, 4800);
    return () => clearInterval(timer);
  }, [isHeroPaused, totalHeroPages]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartMonthly = cart.reduce(
    (acc, item) => acc + getRentByTenure(item.product, item.tenure) * item.quantity,
    0
  );

  const totalUnreadAdminChats = liveChats.reduce((s, c) => s + (c.unreadForAdmin || 0), 0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#313131] overflow-x-hidden">
      {/* AUTHENTIC RENTOMOJO WHITE HEADER:
          - Mobile (< md): ONLY shows Logo, Cart, and 3-Line Hamburger Menu Icon (zero overlap!)
          - Desktop (md+): Shows Logo, Location Dropdown, Search Bar, Cart, and Login/Sign Up */}
      {activeView !== 'admin' && (
        <header className="sticky top-0 z-40 bg-white border-b border-[#EAEAEA] shadow-[0_2px_10px_rgba(0,0,0,0.04)] px-3.5 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
            {/* Top Row */}
            <div className="flex items-center justify-between gap-2 sm:gap-5">
              {/* Left Group: Rentmojo Logo + Desktop Location Dropdown */}
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/');
                    setActiveView('storefront');
                    setSelectedCategory('all');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 group overflow-hidden"
                >
                  <img
                    src={RENTMOJO_LOGO_URL}
                    alt="Rentmojo Logo"
                    className="w-28 sm:w-36 h-10 sm:h-11 object-cover object-[50%_34%] -ml-8 sm:-ml-10 -mr-7 sm:-mr-9 shrink-0"
                  />
                  <span className="text-[22px] sm:text-[26px] font-black tracking-[-0.03em] text-[#DC3226] lowercase leading-none">
                    rentmojo
                  </span>
                </a>

                {/* Desktop Only: RentoMojo City / Location Dropdown (Moved inside 3-line menu on mobile) */}
                <div className="hidden md:flex relative items-center bg-[#FFF5F5] hover:bg-[#FFECEB] border border-[#FADCD9] rounded-lg px-3 py-1.5 transition-colors shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-[#DC3226] shrink-0 mr-1.5" />
                  <select
                    aria-label="Select City"
                    value={selectedCity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCity(val);
                      if (detectedIpLocation && val === detectedIpLocation.cityArea) {
                        setPincodeInput(detectedIpLocation.pincode);
                        setPincodeVerifiedMsg(
                          `Guaranteed 48-Hour Delivery in ${detectedIpLocation.cityArea} (${detectedIpLocation.pincode})`
                        );
                        return;
                      }
                      const found = INDIAN_CITIES.find((c) => c.name === val);
                      if (found) {
                        setPincodeInput(found.samplePin);
                        setPincodeVerifiedMsg(
                          `Guaranteed 48-Hour Express Delivery available in ${found.name} (${found.samplePin})`
                        );
                      }
                    }}
                    className="bg-transparent text-[#313131] text-[13px] font-bold focus:outline-none cursor-pointer pr-1 max-w-[150px] truncate"
                  >
                    {detectedIpLocation &&
                      !INDIAN_CITIES.some((c) => c.name === detectedIpLocation.cityArea) && (
                        <option value={detectedIpLocation.cityArea}>
                          {detectedIpLocation.cityArea}
                        </option>
                      )}
                    {INDIAN_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Center Zone: RentoMojo Wide Rounded Light-Grey Search Bar (Desktop & Tablet) */}
              <div className="hidden md:flex flex-1 max-w-xl mx-2">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (activeView !== 'storefront') setActiveView('storefront');
                    }}
                    placeholder="Search for products (iPhone 18 Pro, MacBook, PS5, Sofa, AC...)"
                    className="w-full pl-4 pr-10 py-2.5 text-[13px] font-medium rounded-xl bg-[#F4F5F7] text-[#313131] placeholder-[#717171] border border-[#E4E7EC] focus:bg-white focus:border-[#DC3226] focus:outline-none transition-all"
                  />
                  <Search className="w-4 h-4 text-[#717171] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Right Zone:
                  - Mobile (< md): ONLY Cart Button + 3-Line Hamburger Icon
                  - Desktop (md+): Cart Button + Login / Sign Up Button */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="px-3 sm:px-3.5 py-2 text-xs font-bold text-[#313131] bg-white hover:bg-[#FFF5F5] border border-[#E4E7EC] hover:border-[#DC3226]/40 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <div className="relative flex items-center">
                    <ShoppingBag className="w-4 h-4 text-[#DC3226] shrink-0" />
                    <span className="ml-1.5 font-extrabold">Cart</span>
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-[#DC3226] text-white leading-none">
                      {totalCartItems}
                    </span>
                  </div>
                  {totalCartMonthly > 0 && (
                    <span className="hidden lg:inline text-xs font-extrabold tabular-nums text-[#111827]">
                      · ₹{totalCartMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  )}
                </button>

                {/* Desktop Only: Login / Sign Up or Account Button */}
                <div className="hidden md:flex items-center gap-2">
                  {activeCustomer || currentUser ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveView(activeView === 'portal' ? 'storefront' : 'portal')
                        }
                        className="px-3.5 py-2 text-xs font-extrabold rounded-lg bg-[#FFF5F5] hover:bg-[#FFECEB] text-[#DC3226] border border-[#FADCD9] flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#DC3226] shrink-0" />
                        <span className="max-w-[110px] truncate">
                          {activeCustomer?.fullName.split(' ')[0] ||
                            currentUser?.displayName ||
                            'My Account'}
                        </span>
                        <span>({unreadNotifCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="p-2 text-xs font-bold rounded-lg bg-[#F4F5F7] hover:bg-slate-200 text-[#313131] border border-[#E4E7EC] flex items-center gap-1 transition-colors"
                        title="Sign Out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Logout</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-4 py-2 text-xs font-extrabold tracking-wide uppercase rounded-lg bg-[#DC3226] hover:bg-[#B82218] text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
                    >
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>Login / Sign Up</span>
                    </button>
                  )}
                </div>

                {/* Mobile Only (< md): 3-Line Hamburger Menu Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  aria-label="Open Mobile Menu"
                  className="flex md:hidden items-center justify-center w-10 h-10 rounded-lg border border-[#E4E7EC] bg-[#FAFAFA] text-[#313131] hover:border-[#DC3226] hover:text-[#DC3226] transition-colors shrink-0"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Search Bar Row (Clean full-width row on mobile phones) */}
            <div className="flex md:hidden items-center">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeView !== 'storefront') setActiveView('storefront');
                  }}
                  placeholder="Search iPhone 18 Pro, MacBook, PS5, Furniture..."
                  className="w-full pl-3.5 pr-9 py-2.5 text-xs font-medium rounded-xl bg-[#F4F5F7] text-[#313131] placeholder-[#717171] border border-[#E4E7EC] focus:bg-white focus:border-[#DC3226] focus:outline-none"
                />
                <Search className="w-4 h-4 text-[#717171] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Mobile 3-Line Hamburger Menu Drawer (Contains Location Dropdown, Pincode & Login/Sign Up) */}
            {isMobileMenuOpen && (
              <div className="md:hidden pt-3 pb-2 border-t border-[#EAEAEA] space-y-3 animate-in fade-in duration-150">
                {/* 1. Location / City Selector inside Mobile Menu */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#717171]">
                    Delivery City / Location
                  </label>
                  <div className="flex items-center bg-[#FFF5F5] border border-[#FADCD9] rounded-xl px-3 py-2.5">
                    <MapPin className="w-4 h-4 text-[#DC3226] shrink-0 mr-2" />
                    <select
                      aria-label="Mobile Select City"
                      value={selectedCity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCity(val);
                        if (detectedIpLocation && val === detectedIpLocation.cityArea) {
                          setPincodeInput(detectedIpLocation.pincode);
                          setPincodeVerifiedMsg(
                            `Guaranteed 48-Hour Delivery in ${detectedIpLocation.cityArea} (${detectedIpLocation.pincode})`
                          );
                          return;
                        }
                        const found = INDIAN_CITIES.find((c) => c.name === val);
                        if (found) {
                          setPincodeInput(found.samplePin);
                          setPincodeVerifiedMsg(
                            `Guaranteed 48-Hour Express Delivery available in ${found.name} (${found.samplePin})`
                          );
                        }
                      }}
                      className="w-full bg-transparent text-[#313131] text-sm font-extrabold focus:outline-none"
                    >
                      {detectedIpLocation &&
                        !INDIAN_CITIES.some((c) => c.name === detectedIpLocation.cityArea) && (
                          <option value={detectedIpLocation.cityArea}>
                            {detectedIpLocation.cityArea}
                          </option>
                        )}
                      {INDIAN_CITIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Login / Sign Up or Account Button inside Mobile Menu */}
                <div className="pt-1">
                  {activeCustomer || currentUser ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView(activeView === 'portal' ? 'storefront' : 'portal');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full py-2.5 px-4 text-xs font-extrabold rounded-xl bg-[#FFF5F5] text-[#DC3226] border border-[#FADCD9] flex items-center justify-center gap-2"
                      >
                        <Bell className="w-4 h-4 text-[#DC3226]" />
                        <span>
                          My Account (
                          {activeCustomer?.fullName || currentUser?.displayName || 'Subscriber'}) ·{' '}
                          {unreadNotifCount} Alerts
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full py-2.5 px-4 text-xs font-extrabold rounded-xl bg-[#F4F5F7] text-[#313131] border border-[#E4E7EC] flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full py-3 px-4 text-xs font-extrabold tracking-wide uppercase rounded-xl bg-[#DC3226] hover:bg-[#B82218] text-white flex items-center justify-center gap-2 shadow-xs"
                    >
                      <User className="w-4 h-4 shrink-0" />
                      <span>Login / Sign Up</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* RENTOMOJO CATEGORY BAR + 48H PINCODE STRIP (Single-Line Left-to-Right Scroll on Mobile) */}
      {activeView !== 'admin' && (
        <div className="bg-white border-b border-[#EAEAEA] px-3.5 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Single-Line Horizontal Scrollable Category Pills (Never wraps on mobile, hidden scrollbar) */}
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-0.5">
              {(
                [
                  { id: 'all', label: 'All Categories' },
                  { id: 'packages', label: 'Packages' },
                  { id: 'mobiles', label: 'Mobiles' },
                  { id: 'laptops', label: 'Laptops' },
                  { id: 'gadgets', label: 'Electronics & Gaming' },
                  { id: 'furniture', label: 'Furniture' },
                  { id: 'appliances', label: 'Appliances' },
                ] as const
              ).map((c) => {
                const isActive = activeView === 'storefront' && selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveView('storefront');
                      setSelectedCategory(c.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 transition-all ${
                      isActive
                        ? 'bg-[#DC3226] text-white shadow-2xs'
                        : 'bg-[#F4F5F7] text-[#313131] hover:bg-[#FFF5F5] hover:text-[#DC3226]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Pincode 48h Express Checker — Cleanly stacked below categories on mobile */}
            <form
              onSubmit={handleVerifyPincode}
              className="flex items-center justify-between sm:justify-end gap-2 shrink-0 bg-[#FFF5F5] border border-[#FADCD9] rounded-xl px-3 py-1.5 w-full sm:w-auto"
            >
              <span className="text-xs font-bold text-[#DC3226] flex items-center gap-1.5 whitespace-nowrap">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>48h Delivery PIN:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={pincodeInput}
                  onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Pincode"
                  maxLength={6}
                  className="w-24 px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-white text-[#313131] border border-[#FADCD9] focus:border-[#DC3226] focus:outline-none text-center"
                />
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-extrabold bg-[#DC3226] text-white rounded-lg hover:bg-[#B82218] transition-colors whitespace-nowrap shrink-0"
                >
                  Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto z-50 px-4 py-3 rounded-xl bg-[#313131] text-white text-xs font-bold shadow-xl border border-[#DC3226] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#1DB2A6] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN VIEWPORT ROUTER */}
      <main className="flex-1">
        {activeView === 'portal' && (
          <CustomerPortalView
            orders={orders}
            kycList={kycList}
            notifications={notifications}
            paymentConfig={paymentConfig}
            currentUser={currentUser}
            onUpdateKycDocs={async (kycId, orderId, payload) => {
              setKycList((prev) =>
                prev.map((k) =>
                  k.id === kycId ? { ...k, ...payload, status: 'submitted' } : k
                )
              );
              setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, kycStatus: 'submitted' } : o))
              );
              await recordActivityLog(
                'Customer Re-Uploaded Aadhaar & PAN KYC',
                `Aadhaar: ${payload.aadhaarNumber} | PAN: ${payload.panNumber} | Pincode: ${payload.pincode}`,
                'kyc'
              );
              await createAppNotification(
                'ADMIN',
                'Customer Updated KYC Documents',
                `Updated Aadhaar (${payload.aadhaarNumber}) & PAN (${payload.panNumber}) uploaded for verification.`,
                'kyc'
              );
            }}
            onCreateStandaloneKyc={async (payload) => {
              const newKyc: KycRecord = {
                id: `kyc_${Date.now()}`,
                userId: activeCustomer?.id || currentUser?.uid || 'guest_session',
                orderId: payload.orderId,
                fullName: payload.fullName,
                email: payload.email,
                phone: payload.phone,
                fullAddress: payload.fullAddress,
                pincode: payload.pincode,
                aadhaarNumber: payload.aadhaarNumber,
                panNumber: payload.panNumber,
                aadhaarPhotoDataUrl: payload.aadhaarPhotoDataUrl,
                panPhotoDataUrl: payload.panPhotoDataUrl,
                status: 'submitted',
                adminRemarks: '',
                createdAtIso: new Date().toISOString(),
              };
              setKycList((prev) => [newKyc, ...prev]);
              await recordActivityLog(
                'Customer Uploaded Standalone KYC Dossier',
                `${payload.fullName} uploaded Aadhaar (${payload.aadhaarNumber}) & PAN (${payload.panNumber})`,
                'kyc',
                payload.email
              );
              await createAppNotification(
                'ADMIN',
                `New KYC Uploaded by ${payload.fullName}`,
                `Aadhaar ${payload.aadhaarNumber} & PAN ${payload.panNumber} ready for Admin inspection.`,
                'kyc'
              );
            }}
            onMarkNotificationRead={async (notifId) => {
              setNotifications((prev) =>
                prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
              );
            }}
            onUpdateOrderPaymentScreenshot={async (orderId, screenshotDataUrl) => {
              setOrders((prev) =>
                prev.map((o) =>
                  o.id === orderId ? { ...o, paymentScreenshotDataUrl: screenshotDataUrl } : o
                )
              );
              try {
                await updateDoc(doc(db, 'orders', orderId), {
                  paymentScreenshotDataUrl: screenshotDataUrl,
                  updatedAt: serverTimestamp(),
                });
              } catch (err) {
                console.warn('Cloud order screenshot update note:', err);
              }
              await recordActivityLog(
                'Customer Uploaded Payment Receipt Screenshot',
                `Updated payment screenshot for order ID ${orderId}`,
                'payment'
              );
              await createAppNotification(
                'ADMIN',
                'Customer Uploaded Payment Screenshot',
                `A new payment receipt screenshot was uploaded for order ${orderId}.`,
                'payment'
              );
            }}
          />
        )}

        {activeView === 'admin' && (
          <AdminConsole
            isAdminUser={isAdminUser}
            currentUser={currentUser}
            products={products}
            orders={orders}
            kycList={kycList}
            userLogs={userLogs}
            paymentConfig={paymentConfig}
            customerAccounts={customerAccounts}
            liveChats={liveChats}
            initialTab={adminInitialTab}
            onExitAdminToStore={() => {
              window.history.pushState({}, '', '/');
              setActiveView('storefront');
            }}
            onRecordSecurityLog={async (action, details) => {
              await recordActivityLog(action, details, 'auth');
            }}
            onSaveProduct={handleAdminSaveProduct}
            onDeleteProduct={handleAdminDeleteProduct}
            onSavePaymentConfig={handleAdminSavePaymentConfig}
            onAdminUpdateOrder={handleAdminUpdateOrder}
            onAdminReviewKyc={handleAdminReviewKyc}
            onSendBroadcastNotification={createAppNotification}
            onToggleCustomerStatus={handleToggleCustomerStatus}
            onAdminReplyChat={handleAdminReplyChat}
          />
        )}

        {activeView === 'storefront' && (
          <div className="space-y-8 sm:space-y-12 pb-20">
            {/* SECTION 1: RENTOMOJO RED & WHITE HERO BANNER + 4-IN-1 MULTI-PRODUCT SLIDER */}
            <section className="bg-white border-b border-[#EAEAEA]">
              <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 lg:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-stretch">
                  {/* Left 7 Columns: RentoMojo Red/White Headline, Tenure Plan Selector & Express CTA */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-5 bg-gradient-to-br from-[#FFF5F5] via-white to-[#FFF8F6] p-4 sm:p-7 rounded-2xl border border-[#FADCD9]">
                    <div className="space-y-2.5 sm:space-y-4">
                      {/* Cleanly stacked/wrapped kicker badge so it never splits into awkward side-by-side columns on mobile */}
                      <div className="text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-[#DC3226] leading-snug">
                        Rentmojo {selectedCity} · 48-Hour Express Delivery
                      </div>
                      <h1 className="font-display font-black text-[#313131] tracking-tight text-[22px] sm:text-4xl lg:text-[2.65rem] leading-[1.2] sm:leading-[1.15]">
                        Rent Flagship Mobiles, MacBooks &amp; Smart Living on Easy Monthly Plans.
                      </h1>
                      <p className="text-[13px] sm:text-[15px] text-[#555555] max-w-2xl leading-relaxed">
                        Upgrade to the latest{' '}
                        <strong className="text-[#313131]">
                          iPhone 18 Pro, iPhone 18 Pro Max, MacBook Pro M3, ASUS ROG Gaming Laptop, or Sony PS5 Slim
                        </strong>{' '}
                        in <strong className="text-[#DC3226]">{selectedCity}</strong>. Enjoy{' '}
                        <strong className="text-[#1DB2A6]">
                          Guaranteed 48-Hour Doorstep Delivery across all Indian pincodes
                        </strong>{' '}
                        with free maintenance and easy upgrades.
                      </p>
                    </div>

                    {/* RentoMojo Signature Tenure Pricing Selector (3M / 6M / 12M / 24M) */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#FADCD9] shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 text-xs sm:text-[13px] font-extrabold text-[#313131]">
                          <SlidersHorizontal className="w-4 h-4 text-[#DC3226] shrink-0" />
                          <span>Choose Rental Tenure (Save up to 38%)</span>
                        </div>
                        <span className="text-xs font-black tabular-nums text-[#DC3226]">
                          Selected Plan: {selectedTenure} Months
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([3, 6, 12, 24] as TenureMonths[]).map((months) => {
                          const active = selectedTenure === months;
                          return (
                            <button
                              key={months}
                              type="button"
                              onClick={() => setSelectedTenure(months)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                                active
                                  ? 'bg-[#DC3226] text-white border-[#DC3226] shadow-xs'
                                  : 'bg-[#FAFAFA] text-[#313131] border-[#E4E7EC] hover:border-[#DC3226]/50'
                              }`}
                            >
                              <div>{months} Months</div>
                              <div
                                className={`text-[10px] font-semibold mt-0.5 ${
                                  active ? 'text-white/90' : 'text-[#717171]'
                                }`}
                              >
                                {months === 24
                                  ? 'Lowest Rent'
                                  : months === 12
                                  ? 'Most Popular'
                                  : months === 6
                                  ? 'Balanced Plan'
                                  : 'Short Term'}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-xs text-[#1DB2A6] font-bold pt-0.5 leading-snug">
                        ✓ {pincodeVerifiedMsg}
                      </div>
                    </div>

                    {/* RentoMojo Primary CTA Row — Stacks cleanly one below the other on mobile */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
                      <a
                        href="#catalog-grid"
                        className="px-6 py-3 text-xs sm:text-sm font-extrabold bg-[#DC3226] text-white rounded-xl hover:bg-[#B82218] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                      >
                        <span>Explore All Rental Products</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsCheckoutModalOpen(true)}
                        className="px-5 py-3 text-xs sm:text-sm font-extrabold bg-white text-[#DC3226] border-2 border-[#DC3226] rounded-xl hover:bg-[#FFF5F5] transition-colors whitespace-nowrap text-center"
                      >
                        Instant 48h Express Checkout
                      </button>
                    </div>
                  </div>

                  {/* Right 5 Columns: RentoMojo Red & Crisp White 4-in-1 Multi-Product Showcase Slider */}
                  <div className="lg:col-span-5">
                    <div
                      onMouseEnter={() => setIsHeroPaused(true)}
                      onMouseLeave={() => setIsHeroPaused(false)}
                      onTouchStart={(e) => setHeroTouchStartX(e.touches[0]?.clientX ?? null)}
                      onTouchEnd={(e) => {
                        if (heroTouchStartX === null) return;
                        const deltaX =
                          (e.changedTouches[0]?.clientX ?? heroTouchStartX) - heroTouchStartX;
                        if (Math.abs(deltaX) > 35 && totalHeroPages > 1) {
                          if (deltaX < 0) {
                            setHeroSlideIndex((prev) => (prev + 1) % totalHeroPages);
                          } else {
                            setHeroSlideIndex(
                              (prev) => (prev - 1 + totalHeroPages) % totalHeroPages
                            );
                          }
                        }
                        setHeroTouchStartX(null);
                      }}
                      className="relative h-full min-h-[400px] sm:min-h-[420px] rounded-2xl overflow-hidden border-2 border-[#DC3226] bg-gradient-to-br from-[#DC3226] via-[#D42B20] to-[#B82218] text-white flex flex-col justify-between p-3 sm:p-3.5 shadow-md select-none"
                    >
                      {/* Hidden direct child img preserved for Focus Mode selector compatibility */}
                      <img
                        src={activeHeroProduct.imageUrl}
                        alt={activeHeroProduct.name}
                        referrerPolicy="no-referrer"
                        className="hidden"
                      />

                      {/* Top Header Bar: Combo Title & Slide Controls (Mobile-Safe Layout) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/20">
                        <span className="px-2.5 py-1 rounded-md bg-white text-[#DC3226] text-[10px] font-black uppercase tracking-wider truncate max-w-[190px] sm:max-w-none shadow-2xs">
                          {safeHeroPage === 0
                            ? 'iPhone 18 Pro · MacBook · PS5'
                            : safeHeroPage === 1
                            ? 'ROG Gaming · iPhone 17 Pro Max'
                            : safeHeroPage === 2
                            ? 'iPad Pro M4 · Dell XPS · Air M3'
                            : 'Creator Laptops & 5G Flagships'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          {Array.from({ length: totalHeroPages }).map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setHeroSlideIndex(idx)}
                              className={`w-6 h-6 rounded-md text-[10px] font-mono font-extrabold transition-colors ${
                                idx === safeHeroPage
                                  ? 'bg-white text-[#DC3226]'
                                  : 'bg-white/20 text-white hover:bg-white/30'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setHeroSlideIndex(
                                (prev) => (prev - 1 + totalHeroPages) % totalHeroPages
                              )
                            }
                            aria-label="Previous Showcase Page"
                            className="w-7 h-7 rounded-md bg-white/20 hover:bg-white hover:text-[#DC3226] text-white flex items-center justify-center transition-colors ml-0.5"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setHeroSlideIndex((prev) => (prev + 1) % totalHeroPages)
                            }
                            aria-label="Next Showcase Page"
                            className="w-7 h-7 rounded-md bg-white/20 hover:bg-white hover:text-[#DC3226] text-white flex items-center justify-center transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Full-Box 2x2 Packed Product Showcase Grid */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-2.5 flex-1">
                        {currentHeroQuad.map((item) => {
                          const monthlyPrice = getRentByTenure(item, selectedTenure);
                          const cleanTitle = item.name
                            .replace(/^Apple\s+/i, '')
                            .replace(/^Sony\s+/i, '')
                            .replace(/^Samsung\s+/i, '');
                          const badgeText =
                            item.category === 'mobiles'
                              ? '5G Mobile'
                              : item.category === 'laptops'
                              ? 'Pro Laptop'
                              : 'Gaming';

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setQuickViewProduct(item);
                                setQuickViewImgIdx(0);
                              }}
                              className="bg-white text-[#313131] rounded-xl p-2 sm:p-2.5 flex flex-col justify-between border border-white hover:border-amber-300 transition-all cursor-pointer group/tile shadow-sm"
                            >
                              {/* Top Price & Category Row */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#717171] truncate">
                                  {badgeText}
                                </span>
                                <span className="text-xs font-black tabular-nums text-[#DC3226] tracking-tight shrink-0">
                                  ₹{monthlyPrice.toLocaleString('en-IN')}/m
                                </span>
                              </div>

                              {/* Full-Quadrant Zoomed Product Image */}
                              <div className="w-full h-24 sm:h-32 flex items-center justify-center overflow-hidden my-1 bg-[#FAFAFA] rounded-lg p-1.5">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain scale-105 group-hover/tile:scale-115 transition-transform duration-300"
                                />
                              </div>

                              {/* Bottom Title & Instant Rent Button */}
                              <div className="space-y-1">
                                <div className="text-xs font-extrabold text-[#313131] line-clamp-1 leading-tight">
                                  {cleanTitle}
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-bold text-[#1DB2A6] truncate">
                                    48h Delivery
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToCart(item, selectedTenure);
                                    }}
                                    className="px-2 py-0.5 rounded bg-[#DC3226] hover:bg-[#B82218] text-white text-[10px] font-extrabold shrink-0 transition-colors"
                                  >
                                    + Rent
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Bar: All-Pincode 48h Dispatch & Slide Indicator */}
                      <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-white/95 truncate">
                          Swipe or tap arrows for more devices
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setHeroSlideIndex((prev) => (prev + 1) % totalHeroPages)
                          }
                          className="text-white hover:underline font-extrabold whitespace-nowrap shrink-0 flex items-center gap-1"
                        >
                          <span>Next Slide</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RENTOMOJO SIGNATURE 6-CATEGORY ICON TILES (2 columns on small mobile, 3 on tablet, 6 on desktop) */}
                <div className="mt-6 sm:mt-9">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
                    {(
                      [
                        {
                          id: 'packages',
                          title: 'Packages',
                          sub: 'Room & WFH Combos',
                        },
                        {
                          id: 'mobiles',
                          title: 'Mobiles',
                          sub: 'iPhone 18 Pro & 5G',
                        },
                        {
                          id: 'laptops',
                          title: 'Laptops',
                          sub: 'MacBook & Gaming',
                        },
                        {
                          id: 'gadgets',
                          title: 'Electronics',
                          sub: 'PS5 Slim & Tablets',
                        },
                        {
                          id: 'furniture',
                          title: 'Furniture',
                          sub: 'Beds, Sofas & Desks',
                        },
                        {
                          id: 'appliances',
                          title: 'Appliances',
                          sub: 'Smart TVs, AC & Fridge',
                        },
                      ] as const
                    ).map((catTile) => {
                      const active = selectedCategory === catTile.id;
                      return (
                        <button
                          key={catTile.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(catTile.id);
                            const el = document.getElementById('catalog-grid');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`group p-3.5 sm:p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                            active
                              ? 'bg-[#FFF5F5] border-[#DC3226] shadow-sm'
                              : 'bg-white border-[#EAEAEA] hover:border-[#DC3226]/50 hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                              active
                                ? 'bg-[#DC3226] text-white'
                                : 'bg-[#FFF5F5] text-[#DC3226] group-hover:bg-[#DC3226] group-hover:text-white'
                            }`}
                          >
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold text-[#313131] group-hover:text-[#DC3226]">
                            {catTile.title}
                          </div>
                          <div className="text-[11px] text-[#717171] line-clamp-1">
                            {catTile.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: RENTOMOJO "YOU'LL LOVE TO TAKE THESE HOME" PRODUCT CATALOG */}
            <section id="catalog-grid" className="max-w-7xl mx-auto px-3.5 sm:px-6 space-y-5 sm:space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-[26px] font-black text-[#313131] tracking-tight leading-tight">
                    You&apos;ll love to take these home
                  </h2>
                  <div className="w-12 h-1 bg-[#DC3226] rounded-full mt-2 mb-2" />
                  <p className="text-xs sm:text-sm text-[#717171] leading-relaxed">
                    Showing monthly rental plans for{' '}
                    <strong className="font-mono text-[#DC3226]">{selectedTenure} Months</strong>{' '}
                    in <strong className="text-[#313131]">{selectedCity}</strong> (Pincode{' '}
                    <span className="font-mono font-bold text-[#313131]">{pincodeInput}</span> — 48h Express Delivery).
                  </p>
                </div>

                {/* Interactive Category Filter Tabs — Single-Line Left-to-Right Scroll with no-scrollbar */}
                <div className="flex flex-nowrap items-center gap-1.5 p-1.5 bg-white border border-[#EAEAEA] rounded-xl overflow-x-auto no-scrollbar w-full lg:w-auto shadow-2xs">
                  {(
                    [
                      { id: 'all', label: 'All Products' },
                      { id: 'mobiles', label: 'Mobiles' },
                      { id: 'laptops', label: 'Laptops' },
                      { id: 'gadgets', label: 'Electronics & PS5' },
                      { id: 'packages', label: 'Packages' },
                      { id: 'furniture', label: 'Furniture' },
                      { id: 'appliances', label: 'Appliances' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        selectedCategory === cat.id
                          ? 'bg-[#DC3226] text-white shadow-2xs'
                          : 'text-[#555555] hover:text-[#DC3226] hover:bg-[#FFF5F5]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column RentoMojo Product Grid (Stacks 1-per-row on mobile phones) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {visibleProducts.map((product) => {
                  const monthlyRate = getRentByTenure(product, selectedTenure);
                  const outOfStock = product.stockCount <= 0;
                  const gallery =
                    product.galleryImages && product.galleryImages.length > 0
                      ? product.galleryImages
                      : [product.imageUrl];
                  const activeImgIdx = cardImgIndexMap[product.id] ?? 0;
                  const currentDisplayImg = gallery[activeImgIdx] || product.imageUrl;

                  return (
                    <article
                      key={product.id}
                      className="group bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(220,50,38,0.10)] hover:border-[#DC3226]/30"
                    >
                      <div>
                        {/* Product Image Container */}
                        <div className="relative aspect-4/3 w-full bg-white border-b border-[#F2F2F2] overflow-hidden p-4 flex items-center justify-center">
                          <img
                            onClick={() => {
                              setQuickViewProduct(product);
                              setQuickViewImgIdx(activeImgIdx);
                            }}
                            src={currentDisplayImg}
                            alt={`${product.name} - Image ${activeImgIdx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                          />

                          {/* Multi-Angle Image Switcher on Card */}
                          {gallery.length > 1 && (
                            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-[#EAEAEA] shadow-xs">
                              {gallery.map((imgUrl, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardImgIndexMap((prev) => ({
                                      ...prev,
                                      [product.id]: idx,
                                    }));
                                  }}
                                  title={`View ${product.name} Photo ${idx + 1} of ${gallery.length}`}
                                  className={`w-9 h-7 rounded bg-white p-0.5 overflow-hidden border transition-all ${
                                    activeImgIdx === idx
                                      ? 'border-[#DC3226] ring-2 ring-[#DC3226]/40 scale-105'
                                      : 'border-slate-200 opacity-75 hover:opacity-100'
                                  }`}
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`${product.name} view ${idx + 1}`}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-contain"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* RentoMojo Card Body */}
                        <div className="p-4 sm:p-5 space-y-2">
                          <div className="flex items-center justify-between text-xs text-[#717171]">
                            <span className="uppercase font-bold tracking-wider truncate">
                              {product.brand} · {product.category}
                            </span>
                            <span
                              className={`font-bold flex items-center gap-1 shrink-0 ${
                                outOfStock ? 'text-red-600' : 'text-[#1DB2A6]'
                              }`}
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>{outOfStock ? 'Out of Stock' : '48h Delivery'}</span>
                            </span>
                          </div>

                          <h3
                            onClick={() => {
                              setQuickViewProduct(product);
                              setQuickViewImgIdx(activeImgIdx);
                            }}
                            className="text-base font-extrabold text-[#313131] group-hover:text-[#DC3226] transition-colors cursor-pointer line-clamp-2 leading-snug"
                          >
                            {product.name}
                          </h3>

                          <p className="text-[13px] text-[#717171] line-clamp-2 leading-relaxed">
                            {product.shortSpec}
                          </p>
                        </div>
                      </div>

                      {/* RentoMojo Card Footer — Dashed Divider + Rent Price Left + Red Action Right */}
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-dashed border-[#E4E7EC] flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold text-[#6B7280]">Monthly Rent</div>
                          <div className="text-xl font-black tabular-nums text-[#111827] tracking-tight leading-tight">
                            ₹{monthlyRate.toLocaleString('en-IN')}
                            <span className="text-xs font-extrabold text-[#4B5563]">/mo</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickViewProduct(product);
                              setQuickViewImgIdx(activeImgIdx);
                            }}
                            className="px-3 py-2 text-xs font-extrabold text-[#DC3226] bg-white border border-[#DC3226] rounded-lg hover:bg-[#FFF5F5] transition-colors whitespace-nowrap shrink-0"
                          >
                            See more
                          </button>
                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => handleAddToCart(product, selectedTenure)}
                            className="px-4 py-2 text-xs font-extrabold bg-[#DC3226] text-white rounded-lg hover:bg-[#B82218] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                          >
                            {outOfStock ? 'Sold Out' : 'Add to Cart'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* SECTION 3: RENTOMOJO "THERE'S MORE TO RENTING" 6-BENEFIT PROMISE GRID */}
            <section className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-2">
              <div className="bg-white rounded-2xl border border-[#EAEAEA] p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-xl sm:text-[26px] font-black text-[#313131] tracking-tight">
                    There&apos;s more to renting
                  </h2>
                  <div className="w-12 h-1 bg-[#DC3226] rounded-full mt-2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#FFF5F5] text-[#DC3226] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#313131]">
                        Finest-quality products
                      </h3>
                      <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                        Quality matters to you, and us! That&apos;s why we do a strict quality-check for every iPhone, MacBook, PS5, and furniture item.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#FFF5F5] text-[#DC3226] flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#313131]">
                        Free relocation &amp; 48h delivery
                      </h3>
                      <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                        Changing your house or even your city? We&apos;ll relocate your rented products for free across India with 48-hour delivery.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#FFF5F5] text-[#DC3226] flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#313131]">Free maintenance</h3>
                      <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                        Keeping your rented products in a spick and span condition is on us, so you can sit back and relax.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#FFF5F5] text-[#DC3226] flex items-center justify-center shrink-0">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#313131]">Keep upgrading</h3>
                      <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                        Bored of the same product? Upgrade to try another, newer smartphone, laptop, or appliance design and enjoy the change!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#FFF5F5] text-[#DC3226] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#313131]">
                        Instant UPI QR &amp; Digital KYC
                      </h3>
                      <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                        Pay your 1st month rent via UPI QR (<span className="font-mono">{paymentConfig.upiId}</span>) and complete paperless Aadhaar &amp; PAN KYC in 2 minutes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#FFF5F5] text-[#DC3226] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#313131]">
                        Easy return on delivery
                      </h3>
                      <p className="text-xs text-[#717171] mt-1 leading-relaxed">
                        Don&apos;t like the product on delivery? Return it right away at the doorstep — no questions asked.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: RENTOMOJO SIGNATURE "OVER 1.5 LAC HAPPY SUBSCRIBERS" PHONE & LAPTOP REVIEWS */}
            <section className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 4 Columns: RentoMojo Title, Red Bar, Subtitle, Carousel Arrows & "View all 18369 reviews" */}
                <div className="lg:col-span-4 space-y-4 pt-2">
                  <div>
                    <h2 className="text-2xl sm:text-[28px] font-black text-[#313131] leading-tight tracking-tight">
                      Over 1.5 lac
                      <br />
                      Happy Subscribers
                    </h2>
                    <div className="w-12 h-1 bg-[#DC3226] rounded-full mt-3" />
                  </div>

                  <p className="text-sm text-[#717171] leading-relaxed max-w-xs">
                    Here&apos;s what they have to say about their Rentmojo experience.
                  </p>

                  {/* Circular Prev / Next Carousel Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewStartIndex((prev) =>
                          prev === 0 ? Math.max(0, SUBSCRIBER_REVIEWS.length - 3) : prev - 1
                        )
                      }
                      aria-label="Previous subscriber reviews"
                      className="w-11 h-11 rounded-full border border-slate-300 bg-white text-slate-600 hover:border-[#DC3226] hover:text-[#DC3226] flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewStartIndex((prev) =>
                          prev + 3 >= SUBSCRIBER_REVIEWS.length ? 0 : prev + 1
                        )
                      }
                      aria-label="Next subscriber reviews"
                      className="w-11 h-11 rounded-full border border-slate-300 bg-white text-slate-600 hover:border-[#DC3226] hover:text-[#DC3226] flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewCategoryFilter('all');
                        setIsAllReviewsModalOpen(true);
                      }}
                      className="text-xs font-extrabold text-[#1DB2A6] hover:text-[#DC3226] underline underline-offset-4 transition-colors flex items-center gap-1.5"
                    >
                      <span>View all 18369 reviews</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right 8 Columns: RentoMojo-Styled Subscriber Review Cards (Phones & Laptops) */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {SUBSCRIBER_REVIEWS.slice(reviewStartIndex, reviewStartIndex + 3).map((rev) => (
                    <div
                      key={rev.id}
                      className="relative p-6 rounded-2xl bg-white border border-[#EAEAEA] shadow-2xs flex flex-col justify-between space-y-4 min-h-[290px]"
                    >
                      <div className="space-y-4 relative z-10">
                        {/* Reviewer Avatar + Name + City */}
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                            style={{ backgroundColor: rev.avatarBg }}
                          >
                            {rev.initials}
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-[#313131]">{rev.name}</div>
                            <div className="text-[11px] text-[#717171] flex items-center gap-1">
                              <span>{rev.city}</span>
                              <span>·</span>
                              <span className="text-amber-500 font-bold flex items-center">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                                {rev.rating}.0
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Review Text */}
                        <p className="text-xs text-[#555555] leading-relaxed">{rev.reviewText}</p>
                      </div>

                      {/* Rented Phone / Laptop Footer */}
                      <div className="pt-3 border-t border-[#F0F0F0] text-[11px]">
                        <span className="text-[#717171] block">Rented Device ({rev.tenure}):</span>
                        <span className="font-extrabold text-[#313131] line-clamp-1">
                          {rev.rentedProduct}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* "VIEW ALL 18369 REVIEWS" MODAL (Phone & Laptop Subscriber Reviews) */}
      {isAllReviewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Over 1.5 Lac Happy Subscribers — 18,369 Verified Reviews
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Real customer experiences renting iPhones, Samsung Ultras, MacBooks, and Gaming Laptops on Rentmojo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAllReviewsModalOpen(false)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(
                  [
                    { id: 'all', label: 'All Reviews (18,369)' },
                    { id: 'mobiles', label: 'iPhone & Mobile Reviews (11,420)' },
                    { id: 'laptops', label: 'MacBook & Laptop Reviews (6,949)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReviewCategoryFilter(tab.id)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      reviewCategoryFilter === tab.id
                        ? 'bg-[#DF2927] text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>4.9 / 5.0 Average Subscriber Rating across India</span>
              </div>
            </div>

            {/* Reviews Grid */}
            <div className="p-6 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SUBSCRIBER_REVIEWS.filter(
                (r) => reviewCategoryFilter === 'all' || r.category === reviewCategoryFilter
              ).map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-xl bg-[#F3F5F8] border border-slate-200/90 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                          style={{ backgroundColor: rev.avatarBg }}
                        >
                          {rev.initials}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{rev.name}</div>
                          <div className="text-[11px] text-slate-500">{rev.city}</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-amber-500 flex items-center">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                        {rev.rating}.0
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.reviewText}</p>
                  </div>
                  <div className="pt-2.5 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-400 block">Verified Rental ({rev.tenure}):</span>
                    <span className="font-semibold text-slate-800">{rev.rentedProduct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT QUICK-VIEW & TENURE CALCULATOR MODAL (Contiguous Purchase Module) */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="text-xs font-semibold uppercase text-slate-500">
                {quickViewProduct.brand} · {quickViewProduct.category} · SKU: {quickViewProduct.id}
              </div>
              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
              <div className="md:col-span-6 space-y-3">
                {(() => {
                  const qGallery =
                    quickViewProduct.galleryImages && quickViewProduct.galleryImages.length > 0
                      ? quickViewProduct.galleryImages
                      : [quickViewProduct.imageUrl];
                  const activeQuickImg = qGallery[quickViewImgIdx] || quickViewProduct.imageUrl;
                  return (
                    <>
                      <div className="w-full aspect-4/3 bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-center">
                        <img
                          src={activeQuickImg}
                          alt={`${quickViewProduct.name} - Photo ${quickViewImgIdx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {qGallery.length > 1 && (
                        <div className="grid grid-cols-3 gap-2.5">
                          {qGallery.map((gImg, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setQuickViewImgIdx(idx)}
                              className={`relative aspect-4/3 rounded-lg bg-white p-2 overflow-hidden border-2 transition-all ${
                                quickViewImgIdx === idx
                                  ? 'border-[#DF2927] shadow-sm'
                                  : 'border-slate-200 opacity-75 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={gImg}
                                alt={`${quickViewProduct.name} thumbnail ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                              <span className="absolute bottom-1 right-1 bg-slate-900/75 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                                {idx + 1}/{qGallery.length}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="p-3.5 rounded-lg bg-teal-50/70 border border-teal-200 text-xs text-slate-700 flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#1DB2A6] shrink-0" />
                  <span>
                    <strong>Guaranteed 48-Hour Delivery</strong> to Pincode{' '}
                    <span className="font-mono font-bold">{pincodeInput}</span> ({selectedCity}) by{' '}
                    <strong>{formatGuaranteed48hDate()}</strong>.
                  </span>
                </div>
              </div>

              <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900">{quickViewProduct.name}</h2>
                  <div className="text-xs font-medium text-slate-500">
                    {quickViewProduct.shortSpec}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {quickViewProduct.description}
                  </p>

                  {/* Tenure Comparison Matrix */}
                  <div className="pt-2 space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Compare Monthly Rent by Tenure:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {([3, 6, 12, 24] as TenureMonths[]).map((t) => {
                        const r = getRentByTenure(quickViewProduct, t);
                        const active = selectedTenure === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTenure(t)}
                            className={`p-2.5 rounded-lg border text-center transition-colors ${
                              active
                                ? 'bg-[#E62E2D] text-white border-[#E62E2D]'
                                : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="text-[11px] font-bold">{t} Months</div>
                            <div className="text-[13px] font-black tabular-nums tracking-tight mt-0.5">
                              ₹{r.toLocaleString('en-IN')}/m
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-600 font-bold block">Selected Monthly Rent</span>
                      <span className="text-lg font-black tabular-nums text-[#111827] tracking-tight">
                        ₹{getRentByTenure(quickViewProduct, selectedTenure).toLocaleString('en-IN')}
                        <span className="text-xs font-extrabold text-slate-600">/mo</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-bold block">100% Refundable Deposit</span>
                      <span className="text-lg font-black tabular-nums text-[#111827] tracking-tight">
                        ₹{quickViewProduct.securityDeposit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={quickViewProduct.stockCount <= 0}
                    onClick={() => {
                      handleAddToCart(quickViewProduct, selectedTenure);
                      setQuickViewProduct(null);
                      setIsCheckoutModalOpen(true);
                    }}
                    className="flex-1 py-3 px-4 text-xs font-bold bg-[#E62E2D] text-white rounded-lg hover:bg-[#c92221] disabled:opacity-40"
                  >
                    Rent Now — 48h Express Checkout
                  </button>
                  <button
                    type="button"
                    disabled={quickViewProduct.stockCount <= 0}
                    onClick={() => {
                      handleAddToCart(quickViewProduct, selectedTenure);
                      setQuickViewProduct(null);
                    }}
                    className="py-3 px-4 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER CART DRAWER */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Your Rentmojo Rental Bag ({totalCartItems})
                </h2>
                <p className="text-xs text-teal-700 font-medium">
                  Guaranteed 48h Delivery to Pincode {pincodeInput}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Your rental bag is empty.</p>
                  <p className="text-xs text-slate-500">
                    Add a smartphone, laptop, PS5, or furniture item to begin checkout.
                  </p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const monthly = getRentByTenure(item.product, item.tenure);
                  return (
                    <div
                      key={`${item.product.id}-${item.tenure}`}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-extrabold text-[#111827] leading-snug">
                            {item.product.name}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="font-bold text-slate-600">
                              Plan:{' '}
                              <strong className="font-extrabold text-[#111827]">
                                {item.tenure} Months
                              </strong>
                            </span>
                            <span className="font-bold text-slate-600">
                              Rent:{' '}
                              <strong className="text-[13px] font-black tabular-nums text-[#DC3226]">
                                ₹{monthly.toLocaleString('en-IN')}/mo
                              </strong>
                            </span>
                            <span className="font-bold text-slate-600">
                              Deposit:{' '}
                              <strong className="text-[13px] font-black tabular-nums text-[#111827]">
                                ₹{item.product.securityDeposit.toLocaleString('en-IN')}
                              </strong>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                        <select
                          value={item.tenure}
                          onChange={(e) => {
                            const newT = Number(e.target.value) as TenureMonths;
                            setCart((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, tenure: newT } : c))
                            );
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-[#111827] rounded-lg border border-slate-300 bg-white"
                        >
                          <option value={3}>3 Months Tenure</option>
                          <option value={6}>6 Months Tenure</option>
                          <option value={12}>12 Months Tenure</option>
                          <option value={24}>24 Months Tenure</option>
                        </select>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c
                                )
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-black tabular-nums text-[#111827] min-w-[18px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, quantity: c.quantity + 1 } : c
                                )
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-[13px] font-bold text-slate-600">
                    <span>Monthly Rent Subtotal:</span>
                    <span className="text-base font-black tabular-nums text-[#111827] tracking-tight">
                      ₹{totalCartMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-[13px] font-bold text-slate-600">
                    <span>Refundable Security Deposit:</span>
                    <span className="text-base font-black tabular-nums text-[#111827] tracking-tight">
                      ₹
                      {cart
                        .reduce((s, i) => s + i.product.securityDeposit * i.quantity, 0)
                        .toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-[13px] font-bold text-slate-600">
                    <span>48-Hour Express Shipping:</span>
                    <span className="font-extrabold text-teal-700">FREE (All Pincodes)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    setIsCheckoutModalOpen(true);
                  }}
                  className="w-full py-3.5 px-4 text-sm font-extrabold bg-[#DC3226] text-white rounded-xl hover:bg-[#B82218] transition-colors shadow-sm"
                >
                  Proceed to Checkout, UPI Scanner & KYC
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPRESS CHECKOUT, BANK QR SCANNER & AADHAAR/PAN KYC MODAL */}
      <CheckoutAndKycModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cart={cart.length > 0 ? cart : [{ product: products[0], tenure: selectedTenure, quantity: 1 }]}
        selectedCity={selectedCity}
        defaultPincode={pincodeInput}
        paymentConfig={paymentConfig}
        currentUser={currentUser}
        activeCustomer={activeCustomer}
        onOpenCustomerAuth={() => {
          setIsCheckoutModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onSubmitOrderAndKyc={handleSubmitOrderAndKyc}
      />

      {/* CUSTOMER ACCOUNT CREATION & LOGIN MODAL (Replaces Google Sign-In + Secret Owner Login) */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        accounts={customerAccounts}
        detectedIp={detectedIpLocation?.ip || '103.21.124.88'}
        detectedCity={selectedCity}
        detectedPincode={pincodeInput}
        onRegisterCustomer={handleRegisterCustomer}
        onLoginCustomer={handleLoginCustomer}
        onTriggerSecretAdminLogin={() => {
          sessionStorage.setItem('rm0_admin_unlocked', 'true');
          openAdminConsole('livechat');
        }}
      />

      {/* PERSISTENT LIVE CONNECTIVITY & LAXMI ENQUIRY CHATBOT (Survives Page Changes & Reloads) */}
      {activeView !== 'admin' && (
        <LaxmiLiveChatWidget
          liveChats={liveChats}
          activeCustomer={activeCustomer}
          detectedIp={detectedIpLocation?.ip || '103.21.124.88'}
          detectedCity={selectedCity}
          isCloudConnected={authReady}
          onUpsertChatSession={handleUpsertChatSession}
        />
      )}

      {/* CLEAN RESPONSIVE FOOTER (Zero Admin Links) */}
      {activeView !== 'admin' && (
        <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src={RENTMOJO_LOGO_URL}
                alt="Rentmojo Logo"
                className="w-32 sm:w-36 h-11 sm:h-12 object-cover object-[50%_34%] -ml-9 -mr-8 shrink-0"
              />
              <div>
                <strong
                  className="text-[#DF2927] font-extrabold text-base tracking-[-0.03em] lowercase mr-1.5"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  rentmojo
                </strong>
                — Smart Mobiles, Laptops, Gaming Gadgets, Furniture & Appliances Rental Platform.
                Guaranteed 48-Hour Delivery on All Indian Pincodes.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() => {
                  setActiveView('storefront');
                  setSelectedCategory('mobiles');
                }}
                className="hover:text-slate-900"
              >
                Mobiles
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView('storefront');
                  setSelectedCategory('laptops');
                }}
                className="hover:text-slate-900"
              >
                Laptops
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView('storefront');
                  setSelectedCategory('gadgets');
                }}
                className="hover:text-slate-900"
              >
                Gadgets
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView('storefront');
                  setSelectedCategory('furniture');
                }}
                className="hover:text-slate-900"
              >
                Furniture
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
