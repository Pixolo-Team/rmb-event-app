# QR Signing & Verification (PF5)

## Overview

PF5 implements **cryptographic signing and verification of QR tokens** using RSA-2048 asymmetric encryption. This enables secure, tamper-proof QR codes for attendees while maintaining a shared, injectable utility service across the platform.

## Architecture

### Signing Flow (Import)
1. Admin imports attendees (F1.1) — `AdminImportService` calls `importCsv()`
2. Each attendee gets a **signed JWT token** via `QRSigningService.sign()`
3. Token contains: `attendeeId`, `name`, `email`, `phone`, `businessName` (optional)
4. Stored in DB as `Attendee.qrToken` (opaque, unguessable)
5. Rendered as QR code on badges (F3.5) or displayed on Profile (F4.1)

### Verification Flow (Scanning)
1. **Meeting scan** (F4.2) or **Staff check-in** (F3.4) scans a QR code
2. `QRSigningService.verify()` decrypts and validates the JWT signature
3. If valid: extract attendee ID from payload, proceed with meeting/check-in
4. If invalid: **fallback to DB lookup** (backward compatibility with legacy tokens)
5. Atomically record the meeting or check-in

### Key Management
- **RSA-2048 keypair** generated at first startup
- Private key: `.keys/qr-private.pem` (used for signing)
- Public key: `.keys/qr-public.pem` (used for verifying)
- Both files are **excluded from git** (see `.gitignore`)
- In production, keys should be persisted outside the container (e.g., via secrets manager)

## Usage

### Signing (Import)
```typescript
import { QRSigningService } from "../qr/qr-signing.service";

constructor(private qrSigning: QRSigningService) {}

const qrToken = this.qrSigning.sign({
  attendeeId: attendee.id,
  name: attendee.name,
  email: attendee.email,
  phone: attendee.phone,
  businessName: attendee.businessName,
});

// Store qrToken in DB
await this.prisma.attendee.update({
  where: { id: attendee.id },
  data: { qrToken },
});
```

### Verifying (Scanning)
```typescript
const payload = this.qrSigning.verify(qrToken);

if (payload) {
  // JWT is valid — use attendeeId from payload
  const attendee = await this.prisma.attendee.findUnique({
    where: { id: payload.attendeeId },
  });
} else {
  // JWT verification failed — fall back to DB lookup for legacy tokens
  const attendee = await this.prisma.attendee.findUnique({
    where: { qrToken }, // DB lookup by token string
  });
}
```

## Integration Points

| Feature | Service | Change |
|---------|---------|--------|
| **F1.1** Import | `AdminImportService` | Generates signed JWT during CSV import |
| **F3.4** Staff Check-in | `CheckinService.checkInByStaffQrScan()` | Verifies JWT, falls back to DB lookup |
| **F4.1** Profile QR | `AttendeeService` | Returns signed token to client (already done) |
| **F4.2** Meeting Scan | `ConnectionsService.scan()` | Verifies JWT, falls back to DB lookup |
| **F3.5** Badge Printing | `AdminImportService` | Uses signed token from DB (no API change) |

## Backward Compatibility

**Existing tokens** (already in the database as opaque random strings) are handled gracefully:
1. Verify is attempted (RSA signature check)
2. If it fails, a database lookup by token string is performed
3. This allows old tokens to continue working indefinitely

**Migration path:** When new attendees are imported, they get signed tokens. Legacy attendees' tokens remain unchanged until the next import.

## Security Considerations

### What's Protected
- **Tamper-proof:** QR payload cannot be altered without invalidating the signature
- **Unguessable:** Cryptographically signed, not a simple hash
- **Opaque:** Token format doesn't expose attendee data (payload is base64url-encoded)

### What's Not Protected
- **Confidentiality:** The base64url payload is readable if someone parses the token manually (but QR codes are ephemeral — print/scan/delete)
- **Freshness/Expiry:** No timestamp validation (the PRD asked for no expiry)
- **Revocation:** A scanned token remains valid forever (intentional, per requirements)

### Deployment Notes
- Private key must never be committed to version control
- In containerized/serverless deployments:
  - Generate the keypair **once at startup** in a persistent volume
  - OR provision keys via environment (base64-encoded) and write them in `constructor`
  - Store securely in a secrets manager if available
- Public key can be safely shared (used for verification only)

## Testing

Run the test suite:
```bash
npm test -- apps/api/src/qr/qr-signing.service.spec.ts
```

Tests cover:
- Valid signature generation and verification
- Tampered signature rejection
- Malformed token handling
- Optional fields in payload
- Unicode characters in fields

## Implementation Notes

### Why RSA Asymmetric?
1. **Future flexibility:** If needed, the public key can be distributed to client apps for offline verification (e.g., staff app on a tablet without API access)
2. **Audit trail:** Cryptographically provable that signatures came from the server
3. **Standard:** RSA-2048 is a well-understood, battle-tested algorithm

### Why No Expiry?
Per the PRD (PF5 spec), QR tokens have **no expiration.** Once signed, they're valid for the life of the event and beyond. The server can always revoke or reject a token at the application layer (e.g., checking `attendee.deleted = true` before logging a meeting).

### Why Fall Back to DB Lookup?
The current codebase already stores and uses opaque `qrToken` strings. To avoid breaking existing imported attendees, we verify the JWT first (new tokens), then fall back to the database (legacy tokens). Over time, all attendees will have signed tokens as they're re-imported.

## Future Enhancements

1. **Client-side verification:** Distribute public key to staff app so QR verification works offline
2. **Token expiry:** Add optional TTL for additional security (requires timestamp in payload)
3. **Revocation list:** Maintain a blocklist of scanned/invalid tokens
4. **Audit logging:** Log all QR verification attempts (success/failure) for compliance
