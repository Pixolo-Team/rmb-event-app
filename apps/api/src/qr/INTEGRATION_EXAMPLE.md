# PF5 Integration Example

This document shows how PF5 (QR signing & verification) flows through the codebase.

## Scenario: Attendee Import → QR Scan → Meeting Recorded

### Step 1: Admin Imports Attendees (F1.1)

Admin uploads a CSV file with attendee data.

```
name,email,phone,business,chapter
Radha Sharma,radha@example.com,+919876543210,TechCorp,RMB Delhi
Harish Patel,harish@example.com,+918765432109,StartupXYZ,RMB Bangalore
```

**Backend flow:**
1. `AdminImportController.importCsv()` receives the file
2. `AdminImportService.importCsv()` parses and validates each row
3. For each valid row, `importRow()` is called:
   ```typescript
   // Create attendee in DB
   const attendee = await this.prisma.attendee.create({
     data: {
       name: "Radha Sharma",
       email: "radha@example.com",
       phone: "+919876543210",
       businessName: "TechCorp",
       chapterId: /* ... */,
       qrToken: "temp", // Temporary placeholder
     },
   });

   // Sign the QR payload with the real attendee ID
   const qrToken = this.qrSigning.sign({
     attendeeId: attendee.id,           // "123e4567-e89b-12d3-a456-426614174000"
     name: "Radha Sharma",
     email: "radha@example.com",
     phone: "+919876543210",
     businessName: "TechCorp",
   });
   // qrToken is now a long JWT string:
   // "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdHRlbmRlZUlkIjoiMTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwibmFtZSI6IlJhZGhhIFNoYXJtYSIsImVtYWlsIjoicmFkaGdAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiszOTE5ODc2NTQzMjEwIiwiYnVzaW5lc3NOYW1lIjoiVGVjaENvcnAifQ.SomeBase64EncodedSignature..."

   // Update attendee with the signed token
   await this.prisma.attendee.update({
     where: { id: attendee.id },
     data: { qrToken },
   });
   ```

4. Return success in the import report

**Database state after import:**
```sql
SELECT id, name, qrToken FROM attendee WHERE name = 'Radha Sharma';
-- id                                      | name          | qrToken
-- 123e4567-e89b-12d3-a456-426614174000 | Radha Sharma  | eyJhbGciOiJSUzI1NiIsIn...
```

### Step 2: Badge Printing (F3.5)

Admin goes to the Badge Printing page and selects attendees to print badges.

**Backend/Frontend flow:**
1. `AdminImportService.getAttendeeForBadgePrinting()` fetches attendee with their `qrToken`
2. Frontend (web) renders QR code using the `qrToken`:
   ```typescript
   // apps/web/app/admin/badges/page.tsx
   const qrDataUrl = await QRCode.toDataURL(attendee.qrToken, { /* options */ });
   // QRCode library encodes the JWT string into a scannable QR code
   ```
3. Admin prints the badge with the QR code

**The QR code contains:**
- The signed JWT token (opaque to the human eye, readable by QR scanner)
- The payload is tamper-proof because it's cryptographically signed

### Step 3: Attendee Scans Another's QR Code (F4.2)

Attendee Radha opens her phone, goes to the Scan screen, and scans Harish's printed badge.

**Frontend flow:**
1. `html5-qrcode` library captures the camera feed
2. When a QR code is detected, it decodes to a string (the JWT token)
3. Frontend calls `POST /api/meetings/scan` with the decoded token

**Backend flow:**
```typescript
// apps/api/src/connections/connections.controller.ts
@Post('scan')
async scan(@Body() dto: ScanConnectionDto, @Request() req: any) {
  return this.connections.scan(req.attendeeId, dto.qrToken);
}

// apps/api/src/connections/connections.service.ts
async scan(attendeeId: string, qrToken: string) {
  // Step 1: Try to verify as a signed JWT (PF5)
  const payload = this.qrSigning.verify(qrToken);
  let targetId: string;

  if (payload) {
    // ✅ Signature is valid — extract attendee ID from payload
    // payload = {
    //   attendeeId: "987e6543-a89b-12d3-a456-426614174999",
    //   name: "Harish Patel",
    //   email: "harish@example.com",
    //   phone: "+918765432109",
    //   businessName: "StartupXYZ"
    // }
    targetId = payload.attendeeId; // "987e6543-a89b-12d3-a456-426614174999"
  } else {
    // ❌ Signature verification failed — fall back to DB lookup (legacy tokens)
    const target = await this.prisma.attendee.findUnique({
      where: { qrToken },
    });
    if (!target) throw new NotFoundException("That QR code isn't recognised");
    targetId = target.id;
  }

  // Step 2: Verify it's not a self-scan
  if (targetId === attendeeId) {
    throw new BadRequestException("That's your own QR code");
  }

  // Step 3: Fetch the target attendee from DB
  const target = await this.prisma.attendee.findUnique({
    where: { id: targetId },
    include: { chapter: true },
  });
  if (!target) throw new NotFoundException("That QR code isn't recognised");

  // Step 4: Record the meeting (canonical pair, deduped)
  const [attendeeAId, attendeeBId] = [attendeeId, target.id].sort();
  const meeting = await this.prisma.meeting.upsert({
    where: { attendeeAId_attendeeBId: { attendeeAId, attendeeBId } },
    create: { attendeeAId, attendeeBId, scannedById: attendeeId },
    update: {},
  });

  // Step 5: Return the scanned attendee's details
  return {
    met: true,
    attendee: {
      id: target.id,
      name: target.name,
      businessName: target.businessName,
      // ... other fields
      metAt: meeting.createdAt,
    },
  };
}
```

**Frontend receives:**
```json
{
  "met": true,
  "attendee": {
    "id": "987e6543-a89b-12d3-a456-426614174999",
    "name": "Harish Patel",
    "businessName": "StartupXYZ",
    "metAt": "2026-01-15T10:30:45Z"
  }
}
```

**Database state after scan:**
```sql
INSERT INTO meeting (attendeeAId, attendeeBId, scannedById, createdAt)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- Radha (scanner)
  '987e6543-a89b-12d3-a456-426614174999',  -- Harish (scanned)
  '123e4567-e89b-12d3-a456-426614174000',  -- scannedById = scanner
  NOW()
);
```

### Step 4: Staff Check-in at the Desk (F3.4)

Event staff have a tablet at the check-in desk. When an attendee arrives, staff scans their badge.

**Backend flow:**
```typescript
// apps/api/src/checkin/checkin.controller.ts
@Post('qr-scan')
async checkInByQrScan(@Body() dto: QrScanCheckinDto) {
  return this.checkinService.checkInByStaffQrScan(dto.qrToken);
}

// apps/api/src/checkin/checkin.service.ts
async checkInByStaffQrScan(qrToken: string) {
  // Step 1: Try to verify as a signed JWT (PF5)
  const payload = this.qrSigning.verify(qrToken);
  let attendee;

  if (payload) {
    // ✅ Signature valid — fetch by attendeeId from payload
    attendee = await this.prisma.attendee.findUnique({
      where: { id: payload.attendeeId },
    });
  } else {
    // ❌ Signature invalid — fall back to legacy DB lookup
    attendee = await this.prisma.attendee.findUnique({
      where: { qrToken },
    });
  }

  if (!attendee) {
    return { status: "not_found" };
  }

  // Step 2: Record the check-in
  const outcome = await this.recordCheckIn(attendee.id, "STAFF_QR");
  return { ...outcome, attendeeName: attendee.name };
}
```

**Response:**
```json
{
  "status": "checked_in",
  "method": "STAFF_QR",
  "checkedInAt": "2026-01-15T09:15:30Z",
  "attendeeName": "Radha Sharma"
}
```

**Tablet/staff UI shows:**
- ✅ "Radha Sharma checked in successfully"
- Method: QR Scan
- Time: 09:15 AM

---

## Security Properties Verified

### 1. **Tamper Detection**
If someone tries to modify the QR payload (e.g., change `attendeeId`), the signature will be invalid:

```typescript
// Attacker modifies the token
token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdHRlbmRlZUlkIjoiNDMyZTc2NTQtYWI5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIn0.BadSignature"

payload = qrSigning.verify(token);
// => null (signature doesn't match the modified payload)

// Falls back to DB lookup, which fails because the token isn't in the database
// => "That QR code isn't recognised"
```

### 2. **Unguessable Tokens**
The JWT contains no sequential or predictable information. An attacker cannot forge a valid QR code without the private key.

### 3. **Backward Compatibility**
Existing attendees with legacy opaque tokens (imported before PF5) continue to work:

```typescript
// Legacy token (old random string)
qrToken = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

payload = qrSigning.verify(qrToken);
// => null (not a JWT format)

// Falls back to DB lookup
target = await prisma.attendee.findUnique({ where: { qrToken } });
// => Found! Continue normally
```

---

## Troubleshooting

### "That QR code isn't recognised"
1. **JWT verification failed:** The signature is invalid. Either:
   - The keys were regenerated (old JWTs become invalid)
   - The token was corrupted during scanning
   - The QR code reader returned garbled data

2. **DB lookup failed:** The token doesn't exist in the database. Either:
   - Attendee was deleted
   - Token was never imported
   - Attendee database was reset

### Staff app can't verify offline
If the staff tablet loses connectivity, it can still scan but can't verify signatures (requires private key for now). In Phase 2, we can distribute the public key to the staff app for offline verification.

### "That's your own QR code"
Attendee tried to scan their own badge. This is prevented at the application level — good UX to prevent accidental confusion.
