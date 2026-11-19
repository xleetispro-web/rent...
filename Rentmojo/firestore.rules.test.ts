/**
 * Phase 0 Security TDD specification verifying all Dirty Dozen attack payloads
 * are rejected by firestore.rules.
 */
export interface DirtyDozenScenario {
  id: number;
  title: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  payloadSummary: Record<string, unknown>;
}

export const DIRTY_DOZEN_SCENARIOS: DirtyDozenScenario[] = [
  {
    id: 1,
    title: 'Shadow Field Injection on Order Create',
    collection: 'orders/ord_101',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { orderCode: 'RM-101', isVerifiedAdmin: true }
  },
  {
    id: 2,
    title: 'Unverified Email Admin Spoof',
    collection: 'settings/payment_config',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { authEmail: 'xleetispro@gmail.com', email_verified: false }
  },
  {
    id: 3,
    title: 'Cross-User Order Spoofing on Create',
    collection: 'orders/ord_102',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { authUid: 'user_A', userId: 'user_B' }
  },
  {
    id: 4,
    title: 'PII Horizontal Privilege Escalation (Get)',
    collection: 'kycSubmissions/kyc_user_A',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { authUid: 'user_B' }
  },
  {
    id: 5,
    title: 'Unfiltered List Query on KYC Submissions',
    collection: 'kycSubmissions',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { authUid: 'user_B', queryFilter: 'NONE' }
  },
  {
    id: 6,
    title: 'Invalid Aadhaar/PAN Regex Payload',
    collection: 'kycSubmissions/kyc_103',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { aadhaarNumber: '12345', panNumber: 'badpan' }
  },
  {
    id: 7,
    title: 'Denial-of-Wallet Oversized ID Poisoning',
    collection: 'orders/' + 'x'.repeat(150),
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { idLength: 150 }
  },
  {
    id: 8,
    title: 'Order Terminal State Bypass',
    collection: 'orders/ord_cancelled',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { existingStatus: 'cancelled', newUtr: '999999999999' }
  },
  {
    id: 9,
    title: 'KYC Self-Approval Privilege Escalation',
    collection: 'kycSubmissions/kyc_104',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { status: 'approved', adminRemarks: 'Self approved' }
  },
  {
    id: 10,
    title: 'Immutable Timestamp Tampering',
    collection: 'orders/ord_105',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { createdAt: '1999-01-01T00:00:00Z' }
  },
  {
    id: 11,
    title: 'Audit Log Mutation Attack',
    collection: 'userLogs/log_101',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { action: 'tampered_action' }
  },
  {
    id: 12,
    title: 'Unauthorized Catalog Price Manipulation',
    collection: 'products/prod_iphone16',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { authUid: 'standard_user', rent12m: 1 }
  }
];
