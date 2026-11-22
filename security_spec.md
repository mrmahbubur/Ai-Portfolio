# Security Specification & Test-Driven Hardening

## 1. Data Invariants
1. **User Profile Invariant**: Users may only create, read, update, or manage their own document at `/users/{userId}` where `userId == request.auth.uid`. Writing someone else's document or forging UIDs is strictly forbidden.
2. **Subscriber Invariant**:
   - Creating a subscription requires a valid email format, max size limits, and `receivePlatformUpdates` boolean.
   - Reading or modifying subscriber records is restricted to authenticated owners or administrative services to protect PII email addresses.
3. **Inquiry Invariant**:
   - Inquiries at `/inquiries/{inquiryId}` can be created by visitors (rate-guarded by field length and required fields), but cannot be updated or deleted by public visitors once submitted to prevent tampering with historical contact logs.
   - Reading inquiries is restricted to the administrator (`mr216873@gmail.com`).
4. **Denial-of-Wallet & Resource Exhaustion Invariant**: Every text property is capped (`<= 2000` chars for messages, `<= 128` for emails and UIDs). Junk document IDs longer than 128 chars or containing non-alphanumeric characters are rejected (`isValidId`).

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Identity Spoofing - User Profile)**: Unauthenticated visitor attempting to write `/users/user_123` with `{ uid: "user_123", email: "hacker@test.com" }`. (Expected: PERMISSION_DENIED)
2. **Payload 2 (Cross-User Write)**: Authenticated user `user_ABC` attempting to write `/users/user_XYZ`. (Expected: PERMISSION_DENIED)
3. **Payload 3 (Admin Role Privilege Escalation)**: User injecting `isAdmin: true` or `role: "admin"` into `/users/{uid}`. (Expected: PERMISSION_DENIED)
4. **Payload 4 (Ghost Fields / Shadow Update)**: Updating `/users/{uid}` with undeclared shadow keys `{ isVerified: true, maliciousToken: "xyz" }`. (Expected: PERMISSION_DENIED)
5. **Payload 5 (ID Poisoning Attack)**: Submitting document with 2KB junk document ID `/users/$$$$$invalid#id....`. (Expected: PERMISSION_DENIED)
6. **Payload 6 (Oversized Message Denial-of-Wallet)**: Submitting inquiry with 500KB text payload exceeding `maxLength: 2000`. (Expected: PERMISSION_DENIED)
7. **Payload 7 (PII Blanket Read Attack)**: Authenticated regular user trying to run `list` or `get` on `/inquiries/{id}` of other users. (Expected: PERMISSION_DENIED)
8. **Payload 8 (Inquiry Tampering / Overwrite)**: Attempting to edit or update an existing inquiry document after creation. (Expected: PERMISSION_DENIED)
9. **Payload 9 (Subscriber PII Harvesting)**: Unauthenticated or non-owner client running a blanket list query across `/subscribers`. (Expected: PERMISSION_DENIED)
10. **Payload 10 (Invalid Type Injection)**: Passing boolean or object where string is required (e.g., `{ email: 12345 }`). (Expected: PERMISSION_DENIED)
11. **Payload 11 (Timestamp Forgery)**: User submitting future arbitrary date string to bypass audit trail. (Expected: PERMISSION_DENIED)
12. **Payload 12 (Catch-All Wildcard Route Leak)**: Reading or writing an arbitrary unmapped collection `/system_secrets/keys`. (Expected: PERMISSION_DENIED)

## 3. Test Runner Definition
Rules are tested and audited against these 12 invariants to ensure complete coverage.
