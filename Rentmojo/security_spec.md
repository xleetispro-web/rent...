# Rentm0j0 Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Invariant**: All write operations require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Admin Privilege Invariant**: Admin operations (`products` mutations, `settings` mutations, order/KYC verification overrides) are restricted strictly to verified bootstrapped admin (`xleetispro@gmail.com` with `email_verified == true`) or a UID present in `/admins/{uid}`.
4. **PII & Order Isolation**: `orders`, `kycSubmissions`, `notifications`, and `userLogs` contain sensitive customer data (Aadhaar numbers, PAN numbers, addresses, phone numbers). Read (`get` and `list`) access is strictly restricted to the document owner (`resource.data.userId == request.auth.uid`) or an `isAdmin()`. Blanket `isSignedIn()` reads are forbidden.
5. **Strict Schema & Key Validation**: Every `create` and `update` must pass `isValid[Entity](incoming())`, enforcing `hasAll` and `hasOnly` key allowlists, string length boundaries, numeric bounds, and regex format validation (6-digit pincode, 12-digit Aadhaar, 10-char PAN).
6. **Temporal & Ownership Immutability**: `createdAt == request.time` on create; `createdAt == existing().createdAt` and `updatedAt == request.time` on update; `userId == existing().userId` on update.
7. **Terminal State Locking**: Orders in `'cancelled'` status and KYC submissions in `'approved'` status cannot be modified by standard users (`|| isAdmin()` override allowed for administrative corrections).

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on Order Create**: Includes `isVerifiedAdmin: true` alongside valid order fields -> Rejected by `hasOnly()`.
2. **Unverified Email Admin Spoof**: Token has `email: "xleetispro@gmail.com"` but `email_verified: false` attempting to update `/settings/payment_config` -> Rejected by `isVerifiedUser()`.
3. **Cross-User Order Spoofing on Create**: User `uid_A` creates an order with `userId: "uid_B"` -> Rejected by `data.userId == request.auth.uid`.
4. **PII Horizontal Privilege Escalation (Get)**: User `uid_B` calls `get` on `/kycSubmissions/kyc_uid_A` -> Rejected by `existing().userId == request.auth.uid || isAdmin()`.
5. **Unfiltered List Query on KYC Submissions**: Authenticated non-admin user queries `/kycSubmissions` without `where('userId', '==', uid)` -> Rejected by `resource.data.userId == request.auth.uid || isAdmin()`.
6. **Invalid Aadhaar/PAN Regex Payload**: Submitting `aadhaarNumber: "12345"` or `panNumber: "invalidpan"` -> Rejected by `.matches('^[0-9]{12}$')` and `.matches('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')`.
7. **Denial-of-Wallet Oversized ID Poisoning**: Creating `/orders/{150_char_id}` -> Rejected by `isValidId()`.
8. **Order Terminal State Bypass**: User attempts to update an order whose `existing().orderStatus == 'cancelled'` -> Rejected by terminal state guard.
9. **KYC Self-Approval Privilege Escalation**: User updates their own KYC document with `status: 'approved'` or modifies `adminRemarks` -> Rejected because user update action only allows `status == 'submitted'` and blocks `adminRemarks`.
10. **Immutable Timestamp Tampering**: Client sends backdated `createdAt` on create or modifies `createdAt` on update -> Rejected by `incoming().createdAt == request.time` / `incoming().createdAt == existing().createdAt`.
11. **Audit Log Mutation Attack**: User or attacker tries to `update` a `/userLogs/{logId}` document -> Rejected by `allow update: if false;`.
12. **Unauthorized Catalog Price Manipulation**: Standard user attempts to update `rent12m` in `/products/{productId}` -> Rejected by `isAdmin()`.
