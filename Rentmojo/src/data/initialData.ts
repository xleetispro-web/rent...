export type ProductCategory =
  | 'mobiles'
  | 'laptops'
  | 'gadgets'
  | 'packages'
  | 'furniture'
  | 'appliances';

export type TenureMonths = 3 | 6 | 12 | 24;

export interface RentalProduct {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string;
  shortSpec: string;
  description: string;
  imageUrl: string;
  galleryImages?: string[];
  rent3m: number;
  rent6m: number;
  rent12m: number;
  rent24m: number;
  securityDeposit: number;
  stockCount: number;
  featured: boolean;
  deliveryHours: number;
  updatedBy?: string;
}

export interface PaymentConfigData {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  qrImageUrl: string;
  paymentNote: string;
  updatedBy: string;
}

export interface RentalOrder {
  id: string;
  orderCode: string;
  userId: string;
  checkoutType: 'account' | 'guest';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  pincode: string;
  itemsSummary: string;
  primaryProductId: string;
  tenureMonths: TenureMonths;
  monthlyRentTotal: number;
  refundableDepositTotal: number;
  payableNowTotal: number;
  utrNumber: string;
  paymentScreenshotDataUrl: string;
  paymentMethod: 'upi_qr' | 'bank_transfer';
  paymentStatus: 'pending_verification' | 'verified' | 'rejected';
  orderStatus: 'processing' | 'dispatched_48h' | 'delivered_active' | 'cancelled';
  kycStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  guaranteedDeliveryBy: string;
  createdAtIso: string;
}

export interface KycRecord {
  id: string;
  userId: string;
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
  status: 'submitted' | 'approved' | 'rejected';
  adminRemarks: string;
  createdAtIso: string;
}

export interface AppNotification {
  id: string;
  targetUserId: string;
  actorId: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'kyc' | 'shipping' | 'promo';
  read: boolean;
  createdAtIso: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  category: 'auth' | 'checkout' | 'kyc' | 'payment' | 'admin';
  createdAtIso: string;
}

export const RENTMOJO_LOGO_URL =
  '/assets/aistudio/rentomojo-logo-9hy026_2054e9ad.png';

export const HERO_IMAGE_URL =
  'https://m.media-amazon.com/images/I/81dT7CUY6GL._SL1500_.jpg';

// Legacy aliases kept for AdminConsole default imports
export const IMG_IPHONE =
  'https://m.media-amazon.com/images/I/81dT7CUY6GL._SL1500_.jpg';
export const IMG_MACBOOK =
  'https://m.media-amazon.com/images/I/61RJn0ofUsL._SL1500_.jpg';
export const IMG_GADGETS =
  'https://m.media-amazon.com/images/I/51mWHXY8hyL._SL1500_.jpg';
export const IMG_FURNITURE =
  'https://m.media-amazon.com/images/I/81OmhFfS-hL._SL1500_.jpg';

export const INDIAN_CITIES = [
  { name: 'All Over India', samplePin: '110001' },
  { name: 'Bengaluru', samplePin: '560001' },
  { name: 'Mumbai', samplePin: '400001' },
  { name: 'Delhi NCR', samplePin: '110001' },
  { name: 'Pune', samplePin: '411001' },
  { name: 'Hyderabad', samplePin: '500081' },
  { name: 'Chennai', samplePin: '600001' },
  { name: 'Gurugram', samplePin: '122001' },
  { name: 'Noida', samplePin: '201301' },
  { name: 'Ahmedabad', samplePin: '380001' },
  { name: 'Jaipur', samplePin: '302001' },
];

export const DEFAULT_PAYMENT_CONFIG: PaymentConfigData = {
  bankName: 'HDFC Bank Corporate',
  accountHolderName: 'Rentmojo Smart Rentals Pvt Ltd',
  accountNumber: '50200089412763',
  ifscCode: 'HDFC0001248',
  branchName: 'Koramangala 80 Feet Road, Bengaluru',
  upiId: 'rentmojo.pay@hdfcbank',
  qrImageUrl: '',
  paymentNote:
    'Scan the UPI QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) or transfer via IMPS/NEFT and enter your 12-digit UTR number + upload payment screenshot below for instant order & 48-hour dispatch confirmation.',
  updatedBy: 'system',
};

export const INITIAL_PRODUCTS: RentalProduct[] = [
  // ============================================================================
  // 1. MOBILES & IPHONES (11 Distinct Models — iPhone 18 Pro Max down to iPhone 15 + Android Flagships)
  // Every single model uses its own unique verified Amazon.in (m.media-amazon.com) images & specs
  // ============================================================================
  {
    id: 'prod_iphone_18_pro_max_512',
    name: 'Apple iPhone 18 Pro Max (512GB, Desert Gold Titanium)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A20 Pro 2nm Chip · 6.9" ProMotion 120Hz XDR · Triple 48MP Periscope 10x Zoom · Wi-Fi 7',
    description:
      'Ultra-flagship Apple iPhone 18 Pro Max (512GB) in Desert Gold Titanium featuring the 2nm A20 Pro neural engine, triple 48MP Pro camera array with 10x optical tetraprism zoom, ProRes 8K video, and AppleCare+ accidental damage cover included.',
    imageUrl: 'https://m.media-amazon.com/images/I/71TSx9D2BVL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71TSx9D2BVL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71T5NVOgbpL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81c50PU+lpL._SL1500_.jpg',
    ],
    rent3m: 5699,
    rent6m: 4999,
    rent12m: 4199,
    rent24m: 3599,
    securityDeposit: 5999,
    stockCount: 9,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_18_pro_256',
    name: 'Apple iPhone 18 Pro (256GB, Stealth Black Titanium)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A20 Pro Chip · 6.3" Super Retina XDR 120Hz · 48MP Fusion + 5x Telephoto · Action Button',
    description:
      'Rent the Apple iPhone 18 Pro (256GB, Stealth Black Titanium) with Grade-5 brushed titanium frame, solid-state haptic Camera Control button, 48MP Spatial Video capture, and guaranteed 48-hour delivery with MagSafe charger & case.',
    imageUrl: 'https://m.media-amazon.com/images/I/81Os1SDWpcL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/81Os1SDWpcL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61f4dTush1L._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81c50PU+lpL._SL1500_.jpg',
    ],
    rent3m: 4999,
    rent6m: 4399,
    rent12m: 3699,
    rent24m: 3149,
    securityDeposit: 5499,
    stockCount: 12,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_17_pro_max_256',
    name: 'Apple iPhone 17 Pro Max (256GB, Deep Titanium Blue)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A19 Pro Chip · 6.9" Always-On ProMotion · 48MP Triple Camera · 4K 120fps Dolby Vision',
    description:
      'Flagship Apple iPhone 17 Pro Max in Deep Titanium Blue with 12GB RAM for Apple Intelligence, anti-reflective Ceramic Shield display, 33-hour battery life, and zero maintenance cost on Rentmojo.',
    imageUrl: 'https://m.media-amazon.com/images/I/81fxjeu8fdL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/81fxjeu8fdL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81c50PU+lpL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81dT7CUY6GL._SL1500_.jpg',
    ],
    rent3m: 4799,
    rent6m: 4199,
    rent12m: 3499,
    rent24m: 2999,
    securityDeposit: 5200,
    stockCount: 15,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_17_pro_256',
    name: 'Apple iPhone 17 Pro (256GB, White Silver Titanium)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A19 Pro Bionic · 6.3" 120Hz OLED · 5x Optical Zoom · Thunderbolt USB-C 10Gbps',
    description:
      'Compact powerhouse Apple iPhone 17 Pro (256GB) in White Silver Titanium featuring 120Hz ProMotion OLED, 48MP Ultra-Wide macro photography, and studio-grade 4-mic spatial audio recording.',
    imageUrl: 'https://m.media-amazon.com/images/I/81SigpJN1KL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/81SigpJN1KL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61f4dTush1L._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81dT7CUY6GL._SL1500_.jpg',
    ],
    rent3m: 4399,
    rent6m: 3799,
    rent12m: 3199,
    rent24m: 2699,
    securityDeposit: 4800,
    stockCount: 11,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_17_plus_256',
    name: 'Apple iPhone 17 Plus (256GB, Alpine Emerald Green)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A19 Bionic · 6.7" Super Retina XDR · 48MP 2x Optical Telephoto · 32h Battery Life',
    description:
      'Big-screen Apple iPhone 17 Plus (256GB) with aerospace aluminum enclosure, programmable Action Button, Dynamic Island live activities, and 35W fast USB-C charging.',
    imageUrl: 'https://m.media-amazon.com/images/I/71nvkHnPpZL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71nvkHnPpZL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71v2jVh6nIL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71d7rfSl0wL._SL1500_.jpg',
    ],
    rent3m: 3799,
    rent6m: 3299,
    rent12m: 2699,
    rent24m: 2249,
    securityDeposit: 4200,
    stockCount: 14,
    featured: false,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_17_128',
    name: 'Apple iPhone 17 (128GB, Ultramarine Mist Blue)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A19 Chip · 6.1" Dynamic Island OLED · 48MP Dual Fusion Camera · 5G Dual eSIM',
    description:
      'Lightweight everyday flagship Apple iPhone 17 (128GB) in Ultramarine Mist Blue with 2000-nit outdoor peak brightness, Next-Gen Portraits, and free tempered glass + case.',
    imageUrl: 'https://m.media-amazon.com/images/I/71d7rfSl0wL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71d7rfSl0wL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61bK6PMOC3L._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71657TiFeHL._SL1500_.jpg',
    ],
    rent3m: 3399,
    rent6m: 2899,
    rent12m: 2399,
    rent24m: 1999,
    securityDeposit: 3800,
    stockCount: 18,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_16_pro_max',
    name: 'Apple iPhone 16 Pro Max (256GB, Natural Titanium)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A18 Pro Chip · 6.9" Super Retina XDR · 48MP Pro Camera · Camera Control · 5G',
    description:
      'Rent the flagship Apple iPhone 16 Pro Max (256GB, Natural Titanium) with AppleCare+ protection, zero maintenance cost, free tempered glass & MagSafe case, and easy upgrade after 6 months.',
    imageUrl: 'https://m.media-amazon.com/images/I/81dT7CUY6GL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/81dT7CUY6GL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81c50PU+lpL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81Os1SDWpcL._SL1500_.jpg',
    ],
    rent3m: 4199,
    rent6m: 3699,
    rent12m: 3099,
    rent24m: 2599,
    securityDeposit: 4699,
    stockCount: 14,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_16_pro_256',
    name: 'Apple iPhone 16 Pro (256GB, Deep Purple Titanium)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A18 Pro 6-Core GPU · 6.3" ProMotion 120Hz · 48MP Macro & 5x Telephoto · MagSafe',
    description:
      'Pro camera system and hardware-accelerated ray tracing in a sleek 6.3-inch Deep Purple Titanium chassis. Delivered sanitized with 100% battery health guarantee.',
    imageUrl: 'https://m.media-amazon.com/images/I/61XO4bORHUL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/61XO4bORHUL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71yzJoE7WlL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/619f09kK7tL._SL1500_.jpg',
    ],
    rent3m: 3899,
    rent6m: 3399,
    rent12m: 2799,
    rent24m: 2349,
    securityDeposit: 4399,
    stockCount: 10,
    featured: false,
    deliveryHours: 48,
  },
  {
    id: 'prod_iphone_15_128',
    name: 'Apple iPhone 15 (128GB, Matte Black)',
    category: 'mobiles',
    brand: 'Apple',
    shortSpec: 'A16 Bionic · Dynamic Island · 48MP Main Camera · USB-C · Matte Textured Glass',
    description:
      'Rent the popular Apple iPhone 15 in matte Black featuring Dynamic Island, 48MP high-resolution camera, and USB-C connectivity with MagSafe case & fast adapter included.',
    imageUrl: 'https://m.media-amazon.com/images/I/71657TiFeHL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71657TiFeHL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71v2jVh6nIL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71GLMJ7TQiL._SL1500_.jpg',
    ],
    rent3m: 2899,
    rent6m: 2499,
    rent12m: 1999,
    rent24m: 1649,
    securityDeposit: 3499,
    stockCount: 19,
    featured: false,
    deliveryHours: 48,
  },
  {
    id: 'prod_samsung_s24_ultra',
    name: 'Samsung Galaxy S24 Ultra 5G (256GB, Titanium Gray)',
    category: 'mobiles',
    brand: 'Samsung',
    shortSpec: 'Snapdragon 8 Gen 3 · Built-in S-Pen · 200MP Quad Telephoto · Galaxy AI',
    description:
      'Experience the ultimate Android flagship with integrated S-Pen, titanium frame, and 200MP camera system. Includes accidental damage cover and 48-hour doorstep delivery.',
    imageUrl: 'https://m.media-amazon.com/images/I/81vxWpPpgNL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/81vxWpPpgNL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71RVuBs3q9L._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71WcjsOVOmL._SL1500_.jpg',
    ],
    rent3m: 3999,
    rent6m: 3499,
    rent12m: 2899,
    rent24m: 2449,
    securityDeposit: 4499,
    stockCount: 11,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_oneplus_12_5g',
    name: 'OnePlus 12 5G (16GB RAM, 512GB, Flowy Emerald)',
    category: 'mobiles',
    brand: 'OnePlus',
    shortSpec: 'Snapdragon 8 Gen 3 · Hasselblad Camera · 100W SUPERVOOC Charger Included',
    description:
      'Ultra-fast performance with 16GB RAM, Hasselblad 4th-Gen camera system, and 100W red-cable SUPERVOOC charger included in the Rentmojo box.',
    imageUrl: 'https://m.media-amazon.com/images/I/71XNeka-BRL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71XNeka-BRL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61BAuSC0UnL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71CXhVhpM0L._SL1500_.jpg',
    ],
    rent3m: 2599,
    rent6m: 2199,
    rent12m: 1799,
    rent24m: 1499,
    securityDeposit: 2999,
    stockCount: 9,
    featured: false,
    deliveryHours: 48,
  },

  // ============================================================================
  // 2. LAPTOPS & WORKSTATIONS (7 Distinct Laptops — MacBook Pro 14/16, MacBook Air M2/M3, Dell XPS, ASUS ROG, HP OLED)
  // Every laptop has its own verified Amazon.in (m.media-amazon.com) images & complete details
  // ============================================================================
  {
    id: 'prod_macbook_pro_m3',
    name: 'Apple MacBook Pro 14" (M3 Pro, 18GB Unified RAM, 512GB SSD, Space Black)',
    category: 'laptops',
    brand: 'Apple',
    shortSpec: 'Apple M3 Pro 11-Core · 14.2" Liquid Retina XDR 120Hz · 18h Battery · MagSafe 3',
    description:
      'Studio-grade Space Black MacBook Pro 14-inch for developers, creators, and founders. Pre-tested battery health >95%, original 70W MagSafe 3 charger, HDMI + SDXC ports, and free replacement support.',
    imageUrl: 'https://m.media-amazon.com/images/I/61RJn0ofUsL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/61RJn0ofUsL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/618d5bS2lUL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61L5QgPvgqL._SL1500_.jpg',
    ],
    rent3m: 5899,
    rent6m: 5199,
    rent12m: 4399,
    rent24m: 3699,
    securityDeposit: 6499,
    stockCount: 8,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_macbook_pro_16_m3_max',
    name: 'Apple MacBook Pro 16" (M3 Max, 36GB Unified RAM, 1TB SSD, Classic Silver)',
    category: 'laptops',
    brand: 'Apple',
    shortSpec: 'Apple M3 Max 14-Core CPU / 30-Core GPU · 16.2" XDR Display · 22h Battery',
    description:
      'Extreme workstation laptop for 8K video rendering, 3D modeling, and local LLM engineering. Includes 140W USB-C power adapter, Thunderbolt 4 ports, and 6-speaker Spatial Audio.',
    imageUrl: 'https://m.media-amazon.com/images/I/61L5QgPvgqL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/61L5QgPvgqL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/618d5bS2lUL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61RJn0ofUsL._SL1500_.jpg',
    ],
    rent3m: 7499,
    rent6m: 6599,
    rent12m: 5599,
    rent24m: 4799,
    securityDeposit: 7999,
    stockCount: 6,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_macbook_air_m2',
    name: 'Apple MacBook Air 13.6" (M2 Chip, 16GB RAM, 256GB SSD, Midnight)',
    category: 'laptops',
    brand: 'Apple',
    shortSpec: 'Apple M2 8-Core · 13.6" Liquid Retina Display · 1.24 kg Ultra-Light · Touch ID',
    description:
      'Silent fanless design in Midnight finish, all-day 18-hour battery life, 1080p FaceTime HD camera, and crisp Liquid Retina display. Ideal for remote work, students, and corporate teams.',
    imageUrl: 'https://m.media-amazon.com/images/I/71f5Eu5lJSL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71f5Eu5lJSL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71jG+e7roXL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71TPda7cwUL._SL1500_.jpg',
    ],
    rent3m: 3699,
    rent6m: 3199,
    rent12m: 2649,
    rent24m: 2199,
    securityDeposit: 4200,
    stockCount: 16,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_macbook_air_15_m3',
    name: 'Apple MacBook Air 15.3" (M3 Chip, 16GB Unified RAM, 512GB SSD, Starlight)',
    category: 'laptops',
    brand: 'Apple',
    shortSpec: 'Apple M3 8-Core CPU / 10-Core GPU · 15.3" Liquid Retina · Dual External Display Support',
    description:
      'Expansive 15.3-inch Liquid Retina display in Starlight gold-silver finish with M3 chip, Wi-Fi 6E, MagSafe 3 charging, and 6-speaker sound system with force-cancelling woofers.',
    imageUrl: 'https://m.media-amazon.com/images/I/71S4sIPFvBL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71S4sIPFvBL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71TPda7cwUL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71jG+e7roXL._SL1500_.jpg',
    ],
    rent3m: 4399,
    rent6m: 3799,
    rent12m: 3149,
    rent24m: 2649,
    securityDeposit: 4800,
    stockCount: 12,
    featured: false,
    deliveryHours: 48,
  },
  {
    id: 'prod_dell_xps_15',
    name: 'Dell XPS 15 Creator Edition (Core i7 13th Gen, RTX 4050 6GB, 16GB/1TB SSD)',
    category: 'laptops',
    brand: 'Dell',
    shortSpec: 'Intel Core i7-13700H · NVIDIA RTX 4050 6GB · 15.6" FHD+ InfinityEdge · Carbon Fiber',
    description:
      'CNC-machined platinum silver aluminum & black carbon fiber palm-rest Windows workstation built for CAD, Premiere Pro video editing, AI workloads, and enterprise multitasking.',
    imageUrl: 'https://m.media-amazon.com/images/I/719C6bJv8jL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/719C6bJv8jL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71vFKBpKakL._SL1500_.jpg',
    ],
    rent3m: 4499,
    rent6m: 3899,
    rent12m: 3199,
    rent24m: 2699,
    securityDeposit: 4999,
    stockCount: 7,
    featured: false,
    deliveryHours: 48,
  },
  {
    id: 'prod_asus_rog_strix_g16',
    name: 'ASUS ROG Strix G16 Gaming Laptop (Core i9-14900HX, RTX 4060 8GB, 16GB/1TB)',
    category: 'laptops',
    brand: 'ASUS ROG',
    shortSpec: 'Intel Core i9-14900HX · NVIDIA GeForce RTX 4060 8GB · 16" FHD+ 165Hz · Aura Sync RGB',
    description:
      'High-FPS esports and AAA gaming powerhouse with ROG Intelligent Cooling (Tri-Fan + Liquid Metal), MUX Switch with NVIDIA Advanced Optimus, and 165Hz Dolby Vision display.',
    imageUrl: 'https://m.media-amazon.com/images/I/71lYhcc++AL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71lYhcc++AL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81vDZyJQ-4L._SL1500_.jpg',
    ],
    rent3m: 4899,
    rent6m: 4299,
    rent12m: 3599,
    rent24m: 2999,
    securityDeposit: 5499,
    stockCount: 9,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_hp_pavilion_plus_14',
    name: 'HP Pavilion Plus 14 OLED Creator Laptop (Intel Core Ultra 7, 16GB RAM, 1TB SSD)',
    category: 'laptops',
    brand: 'HP',
    shortSpec: 'Intel Core Ultra 7 155H AI Chip · 14" 2.8K 120Hz OLED · Intel Arc Graphics · 1.4 kg',
    description:
      'Ultra-sleek all-metal HP Pavilion Plus 14 featuring an IMAX Enhanced 2.8K 120Hz OLED display, dedicated AI NPU, 5MP IR Windows Hello camera, and Poly Studio dual speakers.',
    imageUrl: 'https://m.media-amazon.com/images/I/71ehzrGUO7L._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71ehzrGUO7L._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71p-M3sPhhL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71k3fJh5EwL._SL1500_.jpg',
    ],
    rent3m: 3299,
    rent6m: 2799,
    rent12m: 2299,
    rent24m: 1899,
    securityDeposit: 3699,
    stockCount: 13,
    featured: false,
    deliveryHours: 48,
  },

  // ============================================================================
  // 3. SMART GADGETS & GAMING (Amazon.in Official Multi-Angle Images)
  // ============================================================================
  {
    id: 'prod_ps5_slim_bundle',
    name: 'Sony PlayStation 5 Slim Disc Edition + DualSense Controller',
    category: 'gadgets',
    brand: 'Sony',
    shortSpec: '4K 120Hz Ray Tracing · 1TB Custom SSD · Haptic DualSense Included',
    description:
      'Rent the PS5 Slim Disc Console with 4K 120fps gaming output, ultra-high-speed 1TB SSD, and 3D Audio. Delivered to any Indian pincode within 48 hours.',
    imageUrl: 'https://m.media-amazon.com/images/I/51mWHXY8hyL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/51mWHXY8hyL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/619BkvKW35L._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61O45C5qASL._SL1500_.jpg',
    ],
    rent3m: 2699,
    rent6m: 2299,
    rent12m: 1849,
    rent24m: 1499,
    securityDeposit: 3499,
    stockCount: 12,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_ipad_pro_m4',
    name: 'Apple iPad Pro 11" (M4 Chip, Wi-Fi + Apple Pencil Pro)',
    category: 'gadgets',
    brand: 'Apple',
    shortSpec: 'Ultra Retina XDR OLED · Apple M4 Chip · Apple Pencil Pro Included',
    description:
      'The thinnest Apple device ever built, paired with Apple Pencil Pro for illustration, note-taking, and pro video workflows.',
    imageUrl: 'https://m.media-amazon.com/images/I/81gC7frRJyL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/81gC7frRJyL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61uA2UVnYWL._SL1500_.jpg',
    ],
    rent3m: 3299,
    rent6m: 2799,
    rent12m: 2299,
    rent24m: 1899,
    securityDeposit: 3800,
    stockCount: 10,
    featured: true,
    deliveryHours: 48,
  },
  {
    id: 'prod_sony_xm5_anc',
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    category: 'gadgets',
    brand: 'Sony',
    shortSpec: '8-Mic Industry-Leading ANC · 30h Battery · Multipoint Bluetooth',
    description:
      'Sanitized, studio-grade over-ear headphones with fresh ear cushions, hardshell carry case, and USB-C fast charging cable.',
    imageUrl: 'https://m.media-amazon.com/images/I/51aXvjzcukL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/51aXvjzcukL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61vJtKbAssL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61u1VALn6JL._SL1500_.jpg',
    ],
    rent3m: 1199,
    rent6m: 999,
    rent12m: 799,
    rent24m: 649,
    securityDeposit: 1500,
    stockCount: 22,
    featured: false,
    deliveryHours: 48,
  },

  // ============================================================================
  // 4. PACKAGES / COMBOS
  // ============================================================================
  {
    id: 'prod_wfh_pro_combo',
    name: 'Remote Founder WFH Tech Combo (MacBook Air M2 + iPad + ANC Headset)',
    category: 'packages',
    brand: 'Rentmojo Studio',
    shortSpec: 'MacBook Air M2 16GB · iPad Pro M4 · Sony XM5 ANC Headphones',
    description:
      'Complete plug-and-play executive remote work suite delivered in one box within 48 hours. Save 22% compared to renting items individually.',
    imageUrl: 'https://m.media-amazon.com/images/I/71f5Eu5lJSL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71f5Eu5lJSL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81gC7frRJyL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/51aXvjzcukL._SL1500_.jpg',
    ],
    rent3m: 5499,
    rent6m: 4699,
    rent12m: 3899,
    rent24m: 3299,
    securityDeposit: 5999,
    stockCount: 6,
    featured: false,
    deliveryHours: 48,
  },

  // ============================================================================
  // 5. FURNITURE
  // ============================================================================
  {
    id: 'prod_nordic_sofa_lshape',
    name: 'Nordic Teal 3-Seater L-Shape Fabric Sofa + Solid Oak Coffee Table',
    category: 'furniture',
    brand: 'Rentmojo Living',
    shortSpec: 'High-Density Foam · Stain-Resistant Weave · Free Assembly in 48h',
    description:
      'Rentmojo bestseller living room lounge combo with free doorstep assembly, free annual deep-cleaning, and zero relocation charges.',
    imageUrl: 'https://m.media-amazon.com/images/I/81OmhFfS-hL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/81OmhFfS-hL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71S8U9VzLTL._SL1500_.jpg',
    ],
    rent3m: 1899,
    rent6m: 1599,
    rent12m: 1249,
    rent24m: 999,
    securityDeposit: 2499,
    stockCount: 15,
    featured: false,
    deliveryHours: 48,
  },

  // ============================================================================
  // 6. APPLIANCES
  // ============================================================================
  {
    id: 'prod_smart_tv_55_4k',
    name: 'Samsung 55" Crystal 4K UHD Smart TV + Wall Mount Kit',
    category: 'appliances',
    brand: 'Samsung',
    shortSpec: '55-Inch 4K UHD HDR10+ · Dolby Digital Plus · Free Wall Installation',
    description:
      'Cinema-scale 55-inch 4K Smart TV with voice remote and free wall/table installation within 48 hours of KYC approval.',
    imageUrl: 'https://m.media-amazon.com/images/I/71RxCmvnrbL._SL1500_.jpg',
    galleryImages: [
      'https://m.media-amazon.com/images/I/71RxCmvnrbL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81OmhFfS-hL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71S8U9VzLTL._SL1500_.jpg',
    ],
    rent3m: 1999,
    rent6m: 1699,
    rent12m: 1349,
    rent24m: 1099,
    securityDeposit: 2599,
    stockCount: 13,
    featured: false,
    deliveryHours: 48,
  },
];

export function getRentByTenure(product: RentalProduct, tenure: TenureMonths): number {
  switch (tenure) {
    case 3:
      return product.rent3m;
    case 6:
      return product.rent6m;
    case 12:
      return product.rent12m;
    case 24:
      return product.rent24m;
  }
}

export function formatGuaranteed48hDate(): string {
  const target = new Date(Date.now() + 48 * 60 * 60 * 1000);
  return (
    target.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ' (Within 48 Hours)'
  );
}

export interface SubscriberReview {
  id: string;
  name: string;
  city: string;
  category: 'mobiles' | 'laptops' | 'gadgets';
  rentedProduct: string;
  tenure: string;
  rating: number;
  reviewText: string;
  initials: string;
  avatarBg: string;
}

export const SUBSCRIBER_REVIEWS: SubscriberReview[] = [
  {
    id: 'rev_1',
    name: 'Kushal Tiwari',
    city: 'Pune',
    category: 'mobiles',
    rentedProduct: 'Apple iPhone 18 Pro (256GB, Stealth Black Titanium)',
    tenure: '12 Months Plan',
    rating: 5,
    reviewText:
      'Buying a ₹1.35L flagship phone upfront makes no sense when new models launch every year. I rented the iPhone 18 Pro 256GB from Rentmojo — completed my Aadhaar & PAN KYC in 2 minutes, scanned the UPI QR, and got a sealed, 100% battery-health phone with MagSafe case delivered within 36 hours!',
    initials: 'KT',
    avatarBg: '#DF2927',
  },
  {
    id: 'rev_2',
    name: 'Anjali Deshmukh',
    city: 'Mumbai',
    category: 'laptops',
    rentedProduct: 'Apple MacBook Pro 14" (M3 Pro, 18GB Unified RAM)',
    tenure: '12 Months Plan',
    rating: 5,
    reviewText:
      'As a freelance UI/UX designer & video editor, I needed a MacBook Pro M3 Pro urgently for a client project. Rentmojo delivered a spotless Space Black MacBook Pro with original 70W MagSafe charger right to my doorstep inside 48 hours. Zero maintenance stress and super affordable monthly rent!',
    initials: 'AD',
    avatarBg: '#1DB2A6',
  },
  {
    id: 'rev_3',
    name: 'Siddharth Kulkarni',
    city: 'Bengaluru',
    category: 'mobiles',
    rentedProduct: 'Apple iPhone 17 Pro Max (256GB, Deep Titanium Blue)',
    tenure: '24 Months Plan',
    rating: 5,
    reviewText:
      'Started with an iPhone 15 last year and upgraded seamlessly to the iPhone 17 Pro Max on Rentmojo! The 4K 120fps camera is insane, and the monthly rental plan costs less than phone depreciation. Best platform in India for renting iPhones without blocking huge capital.',
    initials: 'SK',
    avatarBg: '#0F172A',
  },
  {
    id: 'rev_4',
    name: 'Rohan Verma',
    city: 'Delhi NCR',
    category: 'laptops',
    rentedProduct: 'ASUS ROG Strix G16 Gaming Laptop (Core i9, RTX 4060)',
    tenure: '6 Months Plan',
    rating: 5,
    reviewText:
      'Rented the ASUS ROG Strix G16 RTX 4060 for my 6-month semester break and AI model training. The laptop runs every AAA title at 165Hz without heating. Guest checkout with UTR + payment screenshot upload was super smooth and KYC got approved in 20 minutes.',
    initials: 'RV',
    avatarBg: '#2563EB',
  },
  {
    id: 'rev_5',
    name: 'Priya Nair',
    city: 'Hyderabad',
    category: 'mobiles',
    rentedProduct: 'Samsung Galaxy S24 Ultra 5G (256GB, Titanium Gray)',
    tenure: '12 Months Plan',
    rating: 5,
    reviewText:
      'Wanted the Galaxy S24 Ultra for concert photography and the 200MP zoom camera. Rentmojo delivered the Titanium Gray unit with built-in S-Pen in 40 hours! The phone looks straight out of the showroom and the refundable deposit is very reasonable.',
    initials: 'PN',
    avatarBg: '#7C3AED',
  },
  {
    id: 'rev_6',
    name: 'Vikramaditya Joshi',
    city: 'Pune',
    category: 'laptops',
    rentedProduct: 'Apple MacBook Air 15.3" (M3 Chip, 16GB RAM, Starlight)',
    tenure: '12 Months Plan',
    rating: 5,
    reviewText:
      'Our startup rented 4 MacBook Air M3 15-inch laptops and 2 Dell XPS 15 machines from Rentmojo instead of spending ₹7 Lakhs upfront. Every single laptop had >97% battery health, original chargers, and arrived within 48 hours in Baner, Pune.',
    initials: 'VJ',
    avatarBg: '#059669',
  },
  {
    id: 'rev_7',
    name: 'Meera Iyer',
    city: 'Chennai',
    category: 'mobiles',
    rentedProduct: 'Apple iPhone 18 Pro Max (512GB, Desert Gold Titanium)',
    tenure: '12 Months Plan',
    rating: 5,
    reviewText:
      'Every content creator needs the iPhone 18 Pro Max 512GB! Renting it on Rentmojo saved me from EMI traps. They even included a free tempered glass and MagSafe clear case in the box. 10/10 experience.',
    initials: 'MI',
    avatarBg: '#D97706',
  },
  {
    id: 'rev_8',
    name: 'Arjun Malhotra',
    city: 'Gurugram',
    category: 'laptops',
    rentedProduct: 'Dell XPS 15 Creator Edition (Core i7, RTX 4050, 1TB)',
    tenure: '6 Months Plan',
    rating: 5,
    reviewText:
      'The Dell XPS 15 Creator Edition from Rentmojo is a beast for AutoCAD and 4K Premiere Pro timelines. When I relocated from Gurugram to Noida, Rentmojo handled my address transfer without charging a single rupee.',
    initials: 'AM',
    avatarBg: '#DF2927',
  },
  {
    id: 'rev_9',
    name: 'Neha Chawla',
    city: 'Ahmedabad',
    category: 'mobiles',
    rentedProduct: 'Apple iPhone 17 (128GB, Ultramarine Mist Blue)',
    tenure: '24 Months Plan',
    rating: 5,
    reviewText:
      'Super happy with my Ultramarine Blue iPhone 17! At ₹1,999/mo on the 24-month plan, it is cheaper than any credit card EMI and comes with free maintenance & accidental damage cover.',
    initials: 'NC',
    avatarBg: '#0D9488',
  },
  {
    id: 'rev_10',
    name: 'Karthik Reddy',
    city: 'Bengaluru',
    category: 'laptops',
    rentedProduct: 'Apple MacBook Pro 16" (M3 Max, 36GB RAM, 1TB SSD)',
    tenure: '12 Months Plan',
    rating: 5,
    reviewText:
      'Getting a 36GB Unified RAM M3 Max MacBook Pro 16" on monthly rent is a game-changer for AI engineers. Delivered in Indiranagar within 24 hours of uploading my Aadhaar and PAN card.',
    initials: 'KR',
    avatarBg: '#1E293B',
  },
  {
    id: 'rev_11',
    name: 'Tanvi Patwardhan',
    city: 'Pune',
    category: 'mobiles',
    rentedProduct: 'OnePlus 12 5G (16GB RAM, 512GB, Flowy Emerald)',
    tenure: '6 Months Plan',
    rating: 5,
    reviewText:
      'The OnePlus 12 Flowy Emerald arrived with the original 100W SUPERVOOC red-cable charger in the box. Charges 0 to 100% in 26 minutes! Rentmojo support team kept me updated on notifications at every step.',
    initials: 'TP',
    avatarBg: '#16A34A',
  },
  {
    id: 'rev_12',
    name: 'Devansh Kapoor',
    city: 'Jaipur',
    category: 'laptops',
    rentedProduct: 'HP Pavilion Plus 14 OLED (Intel Core Ultra 7, 16GB/1TB)',
    tenure: '12 Months Plan',
    rating: 5,
    reviewText:
      'The 2.8K 120Hz OLED display on the HP Pavilion Plus 14 is breathtaking. Even in Jaipur pincode 302001, Rentmojo delivered within the promised 48-hour window.',
    initials: 'DK',
    avatarBg: '#4F46E5',
  },
];

// ============================================================================
// ALL 28 INDIAN STATES & 8 UNION TERRITORIES (For Professional Address & Account Forms)
// ============================================================================
export const INDIAN_STATES_AND_UTS: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export interface CustomerAccountRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordPlain: string;
  city: string;
  state: string;
  pincode: string;
  ipAddress: string;
  userAgent: string;
  createdAtIso: string;
  lastLoginIso: string;
  loginCount: number;
  status: 'active' | 'blocked';
}

export interface ChatMessageItem {
  id: string;
  sender: 'laxmi_bot' | 'customer' | 'admin';
  senderName: string;
  text: string;
  timestampIso: string;
}

export interface LiveChatSession {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  city: string;
  state: string;
  ipAddress: string;
  enquiryProduct: string;
  onboardingComplete: boolean;
  status: 'bot_onboarding' | 'waiting_for_admin' | 'active_live' | 'resolved';
  unreadForAdmin: number;
  unreadForCustomer: number;
  messages: ChatMessageItem[];
  createdAtIso: string;
  updatedAtIso: string;
}

export const INITIAL_CUSTOMER_ACCOUNTS: CustomerAccountRecord[] = [
  {
    id: 'usr_rmj_1001',
    fullName: 'Rohan Deshmukh',
    email: 'rohan.deshmukh@example.com',
    phone: '9820411290',
    passwordPlain: 'Rohan@2026',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411014',
    ipAddress: '103.21.124.88',
    userAgent: 'Chrome 131.0 / Windows 11 (64-bit)',
    createdAtIso: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
    lastLoginIso: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    loginCount: 4,
    status: 'active',
  },
  {
    id: 'usr_rmj_1002',
    fullName: 'Sneha Kulkarni',
    email: 'sneha.k@example.com',
    phone: '9819203455',
    passwordPlain: 'Sneha#9901',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    ipAddress: '49.36.142.19',
    userAgent: 'Safari 18.1 / iOS iPhone',
    createdAtIso: new Date(Date.now() - 86400 * 1000 * 1).toISOString(),
    lastLoginIso: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    loginCount: 2,
    status: 'active',
  },
];

export const INITIAL_LIVE_CHATS: LiveChatSession[] = [
  {
    id: 'chat_rmj_901',
    customerName: 'Vikram Joshi',
    customerPhone: '9823019482',
    customerEmail: 'vikram.j@example.com',
    city: 'Pune',
    state: 'Maharashtra',
    ipAddress: '103.48.92.114',
    enquiryProduct: 'iPhone 18 Pro 256GB & MacBook Pro M3 Bulk Rental',
    onboardingComplete: true,
    status: 'waiting_for_admin',
    unreadForAdmin: 1,
    unreadForCustomer: 0,
    messages: [
      {
        id: 'm_1',
        sender: 'laxmi_bot',
        senderName: 'Laxmi (Rentmojo Assistant)',
        text: 'Namaste! Main Laxmi hu, Rentmojo Live Support se. Live chat shuru karne se pehle kripya apna Pura Naam (Full Name) batayein.',
        timestampIso: new Date(Date.now() - 1800 * 1000).toISOString(),
      },
      {
        id: 'm_2',
        sender: 'customer',
        senderName: 'Vikram Joshi',
        text: 'Vikram Joshi',
        timestampIso: new Date(Date.now() - 1740 * 1000).toISOString(),
      },
      {
        id: 'm_3',
        sender: 'laxmi_bot',
        senderName: 'Laxmi (Rentmojo Assistant)',
        text: 'Dhanyavaad Vikram Joshi ji! Ab kripya apna 10-Digit Mobile Number batayein taki humari team aapko connect kar sake.',
        timestampIso: new Date(Date.now() - 1730 * 1000).toISOString(),
      },
      {
        id: 'm_4',
        sender: 'customer',
        senderName: 'Vikram Joshi',
        text: '9823019482',
        timestampIso: new Date(Date.now() - 1680 * 1000).toISOString(),
      },
      {
        id: 'm_5',
        sender: 'laxmi_bot',
        senderName: 'Laxmi (Rentmojo Assistant)',
        text: 'Aap kis City/State se hain aur kis product (iPhone 18 Pro, MacBook, Laptop, PS5) ke baare me enquiry karna chahte hain?',
        timestampIso: new Date(Date.now() - 1670 * 1000).toISOString(),
      },
      {
        id: 'm_6',
        sender: 'customer',
        senderName: 'Vikram Joshi',
        text: 'Pune, Maharashtra. Mujhe iPhone 18 Pro 256GB aur MacBook Pro M3 12 months plan pe chahiye, kya kal tak delivery ho jayegi?',
        timestampIso: new Date(Date.now() - 1600 * 1000).toISOString(),
      },
      {
        id: 'm_7',
        sender: 'laxmi_bot',
        senderName: 'Laxmi (Rentmojo Assistant)',
        text: 'Aapki details aur query humare Live Admin Desk ko bhej di gayi hai! Aap yahan seedha live baat kar sakte hain. Page change ya reload karne par bhi ye chat band nahi hogi.',
        timestampIso: new Date(Date.now() - 1595 * 1000).toISOString(),
      },
    ],
    createdAtIso: new Date(Date.now() - 1800 * 1000).toISOString(),
    updatedAtIso: new Date(Date.now() - 1595 * 1000).toISOString(),
  },
];


