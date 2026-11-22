# Box Cricket API Reference

API for **The Riverside Cricket Box**: the customer booking site and the admin (counter desk)
panel. Every example below is a real request and response captured from the running server.
IDs and timestamps will differ in your environment.

- **Base URL:** `http://localhost:4000/api/v1` (production: `https://<your-domain>/api/v1`)
- **Content type:** `application/json` for every request with a body
- **Auth:** two kinds of Bearer token.
  - **Customer token** from [`POST /visitors/otp/verify`](#post-visitorsotpverify) (SMS one-time
    code). Needed for holds, bookings, payments and the visitor profile.
  - **Staff token** from [`POST /admin/auth/login`](#post-adminauthlogin). Needed for `/admin/*`.
  - Venue info, slots, offers and the price preview need no auth.

## About this document

This is the **API integration guide** for this backend. It is written for two readers:

- **Frontend developers** wiring the Flutter customer app and the admin panel to the real
  server.
- **AI coding agents** generating or updating that integration code (API clients, models,
  repositories, error handling).

It describes the HTTP contract only. You don't need to read the backend source to integrate.
If the code and this document ever disagree, treat it as a bug and report it.

### Integration rules

1. **Read the [Conventions](#conventions) first.** Most integration bugs come from a few rules:
   - Responses have **no `{ data }` wrapper**.
   - Money is **rupees**, except the Razorpay order `amount`, which is **paise**.
   - Dates are `YYYY-MM-DD` and hours are `0`–`23`, both in **IST**.
   - Admin list totals are in the **`X-Total-Count`** header.
2. **Model the [shared objects](#shared-objects) once** (Booking, Price, Payment order, Staff) and
   reuse them. Every booking endpoint returns the same Booking object.
3. **Handle errors by HTTP status, and show `message` to the user.** All errors are
   `{ "success": false, "message": "...", "errors"?: [...] }`. The messages are written to be
   shown in the app as they are.
4. **Store the token** (customer or staff) and send `Authorization: Bearer <token>`. On **401**,
   clear it and show the login screen. Staff change-password returns a **new** token, so replace
   the stored one. Customers never send their phone number in request bodies; the server takes it
   from the token.
5. **Don't calculate prices on the client.** Show the `price` object returned by
   `POST /bookings/price` and the booking endpoints.
6. **Follow the flows in [Workflows](#workflows)**, especially OTP login → hold → booking →
   payment for customers, and walk-in → mark-paid / payment-failed at the counter.

### Notes for AI agents

- Use the [Endpoint index](#endpoint-index) to find a route, then read its section for the rules
  and error cases.
- Copy field names exactly as shown in the JSON examples (camelCase). Enum values are listed in
  [Conventions](#conventions).
- Fields shown as `"...": "see Booking"` are abbreviations in this document only; the real
  response contains the full object.
- Fields marked optional can be left out of the request entirely. Nullable response fields really
  are `null`, never missing.
- Don't invent endpoints or fields that aren't documented here. If something the UI needs is
  missing, flag it instead of guessing.

### Endpoint index

Paths are relative to `/api/v1`, except the health checks. **Auth:** `-` public · `customer`
customer token (OTP login) · `staff` any signed-in staff · `admin` admin role only.

| Method | Path | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| GET | `/` · `/heartbeat` (server root) | - | Health checks |
| POST | `/visitors/otp/send` | - | Send a 6-digit login code by SMS |
| POST | `/visitors/otp/verify` | - | Check the code → customer token |
| GET, PATCH | `/visitors/me` | customer | Signed-in customer's profile |
| GET | `/venues` · `/venues/:id` | - | Venue, prices, pitches, rules |
| GET | `/venues/:id/slots?date=&pitchId=` | - | Hourly slot grid |
| GET | `/venues/:id/offers` | - | Active offer codes |
| POST | `/holds` | customer | Hold slots for 8 minutes |
| DELETE | `/holds/:id` | customer | Release your hold |
| POST | `/bookings/price` | - | Price preview / check an offer |
| POST | `/bookings` | customer | Create a pending booking from a hold |
| GET | `/bookings` · `/bookings/:id` | customer | My bookings / one of my bookings |
| POST | `/bookings/:id/cancel` | customer | Cancel (with refund policy) |
| POST | `/bookings/:id/reschedule` | customer | Move to a new date or time |
| POST | `/payments/razorpay/order` | customer | Create a Razorpay order |
| POST | `/payments/razorpay/verify` | customer | Confirm a payment from Checkout |
| POST | `/payments/razorpay/webhook` | Razorpay | Razorpay server callback (not for the app) |
| POST | `/admin/auth/login` | - | Email + password login |
| POST | `/admin/auth/forgot-password` · `/reset-password` | - | Password reset by email |
| GET | `/admin/auth/me` | staff | Current staff member |
| POST | `/admin/auth/change-password` | staff | Change password (returns a new token) |
| POST | `/admin/auth/logout` · `/logout-all` | staff | Log out / revoke all sessions |
| GET, POST | `/admin/staff` | admin | List / create staff accounts |
| GET, PATCH | `/admin/staff/:id` | admin | View / update a staff account |
| POST | `/admin/staff/:id/password` | admin | Set someone's password |
| GET | `/admin/dashboard?date=` | staff | Desk home stats + today's bookings |
| POST | `/admin/bookings` | staff | Book walk-in |
| GET | `/admin/bookings?time=&date=&channel=&paymentKind=…` | staff | All bookings (filtered) |
| GET | `/admin/bookings/:id` | staff | Booking detail with payments + SMS |
| POST | `/admin/bookings/:id/mark-paid` | staff | Confirm cash / card / simulate success |
| POST | `/admin/bookings/:id/payment-failed` | staff | Simulate failure, freeing the slot |
| POST | `/admin/bookings/:id/payment-order` | staff | New Razorpay order for a pending booking |
| POST | `/admin/bookings/:id/cancel` · `/reschedule` | staff | Cancel / reschedule |
| GET | `/admin/customers` · `/admin/customers/:phone` | staff | Customers / one customer with bookings |
| GET | `/admin/venues/:id/settings` | staff | Rates & charges (with 1-hour preview) |
| PATCH | `/admin/venues/:id/settings` | admin | Change rates & rules |
| GET | `/admin/venues/:id/offers` | staff | All offers |
| POST, PATCH | `/admin/venues/:id/offers[/:offerId]` | admin | Create / update an offer |
| GET | `/admin/sms` | staff | SMS log |
| GET | `/admin/qr-link` | staff | Counter QR URL |

## Contents

- [About this document](#about-this-document)
- [Conventions](#conventions)
- [Shared objects](#shared-objects): Booking, Price, Payment order, Staff
- **Public (customer site)**
  - [Health](#health)
  - [Visitors & customer login](#visitors--customer-login)
  - [Venue, slots & offers](#venue-slots--offers)
  - [Holds](#holds)
  - [Bookings](#bookings)
  - [Payments (Razorpay)](#payments-razorpay)
- **Admin panel**
  - [Auth](#admin-auth)
  - [Staff accounts](#admin-staff-accounts)
  - [Desk home](#admin-desk-home)
  - [Bookings & walk-ins](#admin-bookings--walk-ins)
  - [Customers](#admin-customers)
  - [Rates & charges](#admin-rates--charges)
  - [Offers](#admin-offers)
  - [SMS log & counter QR](#admin-sms-log--counter-qr)
- [Workflows](#workflows)
- [Error reference](#error-reference)

---

## Conventions

**Response body.** A successful response is the payload itself, with no `{ data: ... }` wrapper.

**Errors.** Every error has the same shape:

```json
{ "success": false, "message": "That slot is not available." }
```

Validation errors (400) also list each failing field:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [{ "path": "hours", "message": "Selected hours must be consecutive" }]
}
```

**Money.** All amounts in requests and responses are **rupees** (`900` = ₹900). The only
exception is the Razorpay order `amount`, which is in **paise** (`177000` = ₹1,770), because that
is what Razorpay Checkout expects.

**Dates and times.**
- Dates are `YYYY-MM-DD`.
- Hours are integers `0`–`23`: a slot `hour: 19` is 7 PM – 8 PM.
- All times are **India time (IST)**. Timestamps such as `createdAt` are ISO-8601 in UTC.

**Phone numbers.** 10-digit Indian mobile numbers. `+91 99999 99999`, `919999999999` and
`09999999999` are all accepted and stored as `9999999999`.

**Paging.** Admin lists accept `limit` (1–100, default 50) and `skip` (default 0). They return a
JSON array, with the total number of matches in the **`X-Total-Count`** response header.

**Enums.**

| Field | Values |
| :--- | :--- |
| Booking `status` | `pending` (awaiting payment) · `upcoming` (confirmed) · `completed` · `cancelled` |
| Booking `channel` | `self` (customer website) · `counter` (staff) |
| `createdBy` | `guest` · `staff` |
| `paymentKind` | `upi_qr` · `credit_card` · `debit_card` · `cash`. Requests also accept the Flutter names `upiQr`, `creditCard`, `debitCard` |
| Slot `status` | `available` · `booked` · `held` (being booked) · `past` |
| Staff `role` | `admin` (everything) · `staff` (counter desk only) |

---

## Shared objects

### Booking

Returned by every booking endpoint.

```json
{
  "id": "BXKAVZEX",
  "venueId": "arena",
  "venueName": "The Riverside Cricket Box",
  "venueArea": "Ashmavati Riverfront",
  "pitchId": "main",
  "pitchName": "Main Box",
  "date": "2026-11-22",
  "startHour": 19,
  "endHour": 21,
  "hours": 2,
  "slotLabel": "7 PM - 9 PM",
  "status": "pending",
  "channel": "self",
  "paymentKind": null,
  "paymentMethod": null,
  "paymentMethodLabel": null,
  "createdBy": "guest",
  "price": { "...": "see Price below" },
  "customerName": "Uday Kotecha",
  "customerPhone": "9999999999",
  "staffId": null,
  "players": 10,
  "notes": null,
  "refundAmount": null,
  "cancelReason": null,
  "expiresAt": "2026-11-21T10:11:05.530Z",
  "confirmedAt": null,
  "cancelledAt": null,
  "createdAt": "2026-11-21T09:56:05.532Z"
}
```

| Field | Notes |
| :--- | :--- |
| `id` | `BX` + 6 characters, with no 0/O/1/I so it reads clearly over the phone |
| `paymentMethod` / `paymentMethodLabel` | The same human label (`"Cash"`, `"UPI QR"`, `"Card - HDFC"`). `paymentMethod` is the Flutter field name |
| `expiresAt` | Only set while `pending`. An unpaid booking is released after this time |
| `refundAmount` | Set when a confirmed booking is cancelled (rupees). `null` if nothing was paid |
| `staffId` | The staff member who created a counter booking |

### Price

```json
{
  "lines": [
    { "hour": 19, "amount": 900, "isPeak": false },
    { "hour": 20, "amount": 900, "isPeak": false }
  ],
  "subtotal": 1800,
  "discount": 50,
  "platformFee": 20,
  "taxes": 0,
  "total": 1770,
  "hourlyRate": 900,
  "hours": 2,
  "gstRate": 0,
  "couponCode": "RIVER50"
}
```

`total = subtotal − discount + platformFee + taxes`. GST (`gstRate`, a percent) applies to
`subtotal − discount + platformFee`. `platformFee` is the venue's "additional charge". `isPeak` is
always `false` for now.

### Payment order

Returned when a Razorpay order is created.

```json
{
  "bookingId": "BXKAVZEX",
  "orderId": "order_mock_a6689c7a0b25",
  "amount": 177000,
  "currency": "INR",
  "keyId": "rzp_test_mock",
  "qrString": null,
  "method": "upi_qr",
  "mock": true
}
```

| Field | Notes |
| :--- | :--- |
| `amount` | **Paise.** Pass it straight to Razorpay Checkout |
| `keyId` | Your Razorpay key id, for Checkout |
| `qrString` | A `upi://pay?...` link to render as a QR. Only for `upi_qr`, and only when `UPI_VPA` is configured on the server |
| `mock` | `true` when the server has no Razorpay keys (development only). Any signature then verifies, so the flow can be tested without real payments |

### Staff

```json
{
  "id": "5b7a762e-d19e-46e1-a8cb-5c01974c0a8e",
  "name": "Venue Admin",
  "email": "admin.rcb@yopmail.com",
  "role": "admin",
  "active": true,
  "lastLoginAt": "2026-11-21T09:56:05.681Z",
  "createdAt": "2026-11-21T09:55:22.768Z",
  "updatedAt": "2026-11-21T09:56:05.676Z"
}
```

Password hashes are never returned.

---

# Public API (customer site)

## Health

### `GET /` and `GET /heartbeat`

These two are served from the server root, not under `/api/v1`.

```json
// GET /                 200
{ "success": true, "message": "ok" }

// GET /heartbeat        200
"ok"
```

## Visitors & customer login

Customers log in with their mobile number and a 6-digit code sent by SMS. There is no password.
The first verified login creates the visitor.

### `POST /visitors/otp/send`

```json
// Request
{ "phone": "9999999999" }

// 200
{
  "message": "We sent a 6-digit code to your mobile number.",
  "phone": "9999999999",
  "expiresIn": 300,
  "resendAfter": 30,
  "devCode": "482913"
}
```

| Field | Notes |
| :--- | :--- |
| `expiresIn` | Seconds the code works (5 minutes) |
| `resendAfter` | Seconds before another code can be requested |
| `devCode` | **Development only**: returned when the server is not in production and `SMS_PROVIDER=console`, so the flow can be tested without SMS. Never present in production |

A new code replaces any unused earlier one. Login codes are not written to the admin SMS log.

| Status | Message |
| :--- | :--- |
| 429 | `Please wait N seconds before requesting a new code.` |
| 429 | `Too many codes requested for this number. Try again in an hour.` (5 per hour) |
| 429 | `Too many requests, please try again later` (per-IP limit, 30 per 15 minutes) |
| 502 | `Could not send the OTP. Please try again.` (SMS provider failed) |

### `POST /visitors/otp/verify`

```json
// Request (name is optional; use it on first sign-up)
{ "phone": "9999999999", "code": "482913", "name": "Uday Kotecha" }

// 200
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 2592000,
  "visitor": {
    "id": "v-9999999999",
    "name": "Uday Kotecha",
    "phone": "9999999999",
    "email": null,
    "birthday": null,
    "createdAt": "2026-11-21T09:56:05.368Z",
    "lastSeenAt": "2026-11-21T09:56:05.368Z"
  },
  "needsName": false
}
```

- Store `token` and send it as `Authorization: Bearer <token>` on customer routes. It lasts
  30 days by default (`VISITOR_JWT_EXPIRES_IN`).
- `needsName: true` means the visitor has no name yet: ask for one and save it with
  `PATCH /visitors/me`.
- A code works once. 5 wrong guesses burn it.

| Status | Message |
| :--- | :--- |
| 400 | `That code is not correct. Please check and try again.` |
| 400 | `This code has expired. Please request a new one.` (also after it was used) |
| 400 | `Too many wrong codes. Please request a new one.` |

### `GET /visitors/me`

**Customer token.** Returns the visitor object above.

### `PATCH /visitors/me`

**Customer token.** Send any of these fields. `null` clears email or birthday. The phone cannot be
changed (it is the login).

```json
// Request
{ "name": "Uday K", "email": "uday@example.com", "birthday": "1995-04-10" }

// 200: the updated visitor
```

| Field | Rules |
| :--- | :--- |
| `name` | 2–80 characters |
| `email` | Valid email or `null` |
| `birthday` | `YYYY-MM-DD` in the past, or `null` |

### Customer route errors

Every customer route answers **401** without a valid customer token:

| Status | Message |
| :--- | :--- |
| 401 | `Please log in with your mobile number to continue.` (no token) |
| 401 | `Session expired. Please log in again.` (bad, expired or staff token) |

## Venue, slots & offers

### `GET /venues`

Returns an array of venue objects (the same shape as below).

### `GET /venues/:id`

The venue with its current prices and pitches. Rate changes in the admin panel show up here
immediately.

```json
// GET /venues/arena     200
{
  "id": "arena",
  "name": "The Riverside Cricket Box",
  "area": "Ashmavati Riverfront",
  "city": "Porbandar",
  "address": "At Ashmavati Riverfront, Opp. Jalaram Colony, M. G. Road, Porbandar",
  "description": "A riverside box cricket arena on the Ashmavati Riverfront in Porbandar. ...",
  "phone": "+91 75071 97507",
  "settings": {
    "hourlyRate": 900,
    "additionalCharge": 20,
    "gstRate": 0,
    "updatedAt": "2026-11-21T09:55:22.682Z"
  },
  "pitches": [{ "id": "main", "name": "Main Box", "size": "90 x 45 ft", "format": "6-a-side" }],
  "openHour": 0,
  "closeHour": 24,
  "minHours": 1,
  "maxHours": 24,
  "advanceDays": 14
}
```

`openHour`/`closeHour`: bookable hours are `openHour` ≤ hour < `closeHour`. `advanceDays`: how
many days ahead customers can book (today + 14).

### `GET /venues/:id/slots?date=YYYY-MM-DD&pitchId=main`

The hourly slot grid for one day. `pitchId` is optional and defaults to the first pitch.

```json
// GET /venues/arena/slots?date=2026-11-22&pitchId=main     200
{
  "date": "2026-11-22",
  "pitchId": "main",
  "slots": [
    { "hour": 18, "label": "6 PM - 7 PM", "status": "available", "price": 900, "isPeak": false },
    { "hour": 19, "label": "7 PM - 8 PM", "status": "available", "price": 900, "isPeak": false },
    { "hour": 20, "label": "8 PM - 9 PM", "status": "available", "price": 900, "isPeak": false }
  ]
}
```

(Trimmed: the real response has one entry per open hour, 24 for this venue.)

| `status` | Meaning (app label) |
| :--- | :--- |
| `available` | Free ("Available") |
| `booked` | Confirmed booking ("Booked") |
| `held` | Someone is checking out, or a booking is awaiting payment ("Being booked") |
| `past` | Start time has passed (IST) ("Passed") |

### `GET /venues/:id/offers`

Offers that are active right now ("Offers for you").

```json
// 200
[
  {
    "id": "b57d9c31-3958-4c75-a4bd-642dd457ce79",
    "code": "WELCOME20",
    "title": "First game on us",
    "description": "20% off your first booking, up to ₹300.",
    "label": "20% OFF",
    "kind": "percent",
    "value": 20,
    "maxDiscount": 300,
    "minSubtotal": 0,
    "minHours": 1,
    "weekdaysOnly": false,
    "accent": "lime",
    "active": true,
    "validFrom": null,
    "validTo": null
  },
  {
    "id": "e67e1c37-92c6-46d4-8a9a-583d514ee6cf",
    "code": "WEEKDAY100",
    "title": "Weekday warm-up",
    "description": "Flat ₹100 off on 2+ hours, Monday to Friday.",
    "label": "₹100 OFF",
    "kind": "flat",
    "value": 100,
    "maxDiscount": null,
    "minSubtotal": 0,
    "minHours": 2,
    "weekdaysOnly": true,
    "accent": "sky",
    "active": true,
    "validFrom": null,
    "validTo": null
  }
]
```

- `kind: flat`: `value` is rupees off.
- `kind: percent`: `value` is percent off, capped at `maxDiscount` rupees.
- `weekdaysOnly`: the **booked date** must be Monday–Friday.
- `accent`: card colour in the app (`lime` · `ball` · `sky` · `amber`).

Seeded offers: `WELCOME20`, `WEEKDAY100`, `TEAM15`, `RIVER50`.

## Holds

A hold reserves slots for **8 minutes** while the customer reviews and checks out.
**Customer token required**: the customer logs in (OTP) before slots are held.

### `POST /holds`

```json
// Request
{ "venueId": "arena", "pitchId": "main", "date": "2026-11-22", "hours": [19, 20] }

// 201
{
  "holdId": "h_156ba150ae34",
  "expiresAt": "2026-11-21T10:04:05.451Z",
  "venueId": "arena",
  "pitchId": "main",
  "date": "2026-11-22",
  "hours": [19, 20]
}
```

| Field | Rules |
| :--- | :--- |
| `venueId` | Optional, defaults to `arena` |
| `pitchId` | Optional, defaults to the first pitch |
| `date` | Required. From today to today + `advanceDays` |
| `hours` | Required, **consecutive** hours; any order is accepted. Count between `minHours` and `maxHours`. Must not have started yet |

A customer holds one selection at a time: a new hold replaces their previous one.

```json
// 409: any of the hours is already held or booked
{ "success": false, "message": "That slot is not available." }

// 400: e.g. hours [19, 21]
{
  "success": false,
  "message": "Validation error",
  "errors": [{ "path": "hours", "message": "Selected hours must be consecutive" }]
}
```

Other 400 messages: `That slot has already passed`, `Bookings are open from today up to the
advance booking window`, `You can book between 1 and 24 hours at a time.`, `Selected hours are
outside opening hours`.

### `DELETE /holds/:holdId`

Releases your own hold, for example when the customer goes back to change slots. Returns **204**
with no body (also when the hold was already gone or belongs to someone else).

## Bookings

### `POST /bookings/price`

Price preview for the review screen. It also validates an offer code.

```json
// Request
{ "hours": 2, "date": "2026-11-22", "startHour": 19, "offerCode": "RIVER50" }

// 200: a Price object
{
  "lines": [
    { "hour": 19, "amount": 900, "isPeak": false },
    { "hour": 20, "amount": 900, "isPeak": false }
  ],
  "subtotal": 1800,
  "discount": 50,
  "platformFee": 20,
  "taxes": 0,
  "total": 1770,
  "hourlyRate": 900,
  "hours": 2,
  "gstRate": 0,
  "couponCode": "RIVER50"
}
```

| Field | Rules |
| :--- | :--- |
| `hours` | Required, 1–24 |
| `date` | Optional. Needed to check weekday-only offers |
| `startHour` | Optional. When given, `lines` lists each hour; otherwise `lines` is `[]` |
| `offerCode` | Optional, case-insensitive |
| `venueId` | Optional, defaults to `arena` |

Offer errors (400):

```json
{ "success": false, "message": "TEAM15 needs at least 3 hrs of booking." }
{ "success": false, "message": "WEEKDAY100 is valid on weekdays only (Mon-Fri)." }
{ "success": false, "message": "This offer code is not valid" }
```

### `POST /bookings`

**Customer token.** Turns the customer's hold into a booking with status **`pending`** (awaiting
payment). The mobile number comes from the token. The customer then has
**15 minutes** to pay, and the timer restarts when a payment order is created.

```json
// Request
{
  "holdId": "h_156ba150ae34",
  "customerName": "Uday Kotecha",
  "players": 10,
  "notes": "",
  "channel": "self",
  "offerCode": "RIVER50"
}

// 201: a Booking object
{
  "id": "BXKAVZEX",
  "status": "pending",
  "channel": "self",
  "createdBy": "guest",
  "date": "2026-11-22",
  "startHour": 19,
  "hours": 2,
  "slotLabel": "7 PM - 9 PM",
  "price": { "subtotal": 1800, "discount": 50, "platformFee": 20, "taxes": 0, "total": 1770, "...": "..." },
  "expiresAt": "2026-11-21T10:11:05.530Z",
  "...": "see Booking"
}
```

| Field | Rules |
| :--- | :--- |
| `holdId` | Required |
| `customerName` | Optional, 2–80 characters. Defaults to the visitor's saved name |
| `players` | Optional, 1–30 |
| `notes` | Optional, up to 500 characters |
| `channel` | Optional, only `"self"` (counter bookings use the admin API) |
| `offerCode` | Optional |

| Status | Message |
| :--- | :--- |
| 404 | `Hold not found` (also when the hold was already used) |
| 410 | `Your hold has expired` (ask the customer to pick slots again) |
| 403 | `This hold belongs to a different mobile number` |
| 400 | `Please provide a valid name` (no name given and none saved) |

### `GET /bookings`

**Customer token.** The signed-in customer's bookings ("My bookings"), newest first. Returns an
array of Booking objects.

### `GET /bookings/:id`

**Customer token.** A single Booking object. 404 `Booking not found` if it doesn't exist, 403
`Mobile number does not match this booking` if it belongs to someone else.

### `POST /bookings/:id/cancel`

**Customer token.** Only the customer who made the booking can cancel it.

```json
// Request: reason optional
{ "reason": "Team members not available" }

// 200: Booking object (relevant fields)
{
  "status": "cancelled",
  "refundAmount": 1770,
  "cancelReason": "Team members not available",
  "cancelledAt": "2026-11-21T09:56:05.621Z"
}
```

**Refund policy** (for confirmed bookings):

| Cancelled | Refund |
| :--- | :--- |
| 24 hours or more before start | 100% |
| 6 to 24 hours before start | 50% |
| Less than 6 hours before start | 0 |

Online payments are refunded automatically through Razorpay. Cancelling a `pending` (unpaid)
booking refunds nothing and gives `refundAmount: null`. Reason suggestions from the app:
`Team members not available`, `Weather`, `Booked by mistake`, `Found another time`, `Other`.

| Status | Message |
| :--- | :--- |
| 403 | `Mobile number does not match this booking` |
| 409 | `Only upcoming or pending bookings can be changed` |

### `POST /bookings/:id/reschedule`

**Customer token.** Moves the booking to a new date and start hour. The duration and price stay the same. Customers
can reschedule until **2 hours** before the original start.

```json
// Request
{ "date": "2026-11-22", "startHour": 20 }

// 200: Booking object with the new time
{ "startHour": 20, "slotLabel": "8 PM - 10 PM", "...": "see Booking" }
```

The new slots may overlap the booking's own current slots. The errors are the same as for holds
(409 `That slot is not available.` and so on), plus 400 `This booking can no longer be
rescheduled` and 400 `Pick a different date or time`.

## Payments (Razorpay)

### `POST /payments/razorpay/order`

**Customer token.** Creates a Razorpay order for the customer's `pending` booking.

```json
// Request
{ "bookingId": "BXKAVZEX", "method": "upi_qr" }

// 200: Payment order
{
  "bookingId": "BXKAVZEX",
  "orderId": "order_mock_a6689c7a0b25",
  "amount": 177000,
  "currency": "INR",
  "keyId": "rzp_test_mock",
  "qrString": null,
  "method": "upi_qr",
  "mock": true
}
```

`method` is `upi_qr`, `credit_card` or `debit_card`. Calling this again creates a new order (for
example, when the customer switches method). 409 `Booking is not awaiting payment` if the booking
is not `pending`.

### `POST /payments/razorpay/verify`

**Customer token.** Call this from the Razorpay Checkout success handler. On success the booking becomes `upcoming`,
and the confirmation SMS goes to the customer and the admin. Calling it twice is safe.

```json
// Request
{
  "bookingId": "BXKAVZEX",
  "razorpayOrderId": "order_mock_a6689c7a0b25",
  "razorpayPaymentId": "pay_mock_1",
  "razorpaySignature": "<razorpay_signature from Checkout>"
}

// 200: Booking object (relevant fields)
{ "status": "upcoming", "paymentKind": "upi_qr", "confirmedAt": "2026-11-21T09:56:05.564Z" }
```

| Status | Message |
| :--- | :--- |
| 400 | `Payment verification failed` (bad signature) |
| 404 | `Payment order not found` (order id doesn't belong to this booking) |
| 403 | `Mobile number does not match this booking` |
| 409 | `That slot is not available.` (paid after the 15-minute window and someone else took the slot; the payment is refunded automatically) |

### `POST /payments/razorpay/webhook`

**For Razorpay only, not the app.** Configure it in the Razorpay dashboard with the events
`payment.captured`, `order.paid` and `payment.failed`. The request is signed with the
`X-Razorpay-Signature` header. Processing is idempotent and has the same effect as verify.

```json
// Razorpay sends
{
  "event": "payment.captured",
  "payload": {
    "payment": { "entity": { "id": "pay_xxx", "order_id": "order_xxx", "amount": 177000, "method": "upi" } }
  }
}

// 200
{ "received": true }
```

400 `Invalid webhook signature` if the signature doesn't match.

---

# Admin panel API

All routes below need `Authorization: Bearer <token>`, except login, forgot-password and
reset-password.

**Roles:**
- `admin` can use every endpoint.
- `staff` gets the counter desk: dashboard, bookings, walk-ins, customers, SMS log and QR. Staff
  can **view** rates and offers but not change them.

Endpoints marked **admin only** return 403 for staff.

| Status | Message | When |
| :--- | :--- | :--- |
| 401 | `No token provided` / `Invalid or expired token` | Missing or bad token |
| 401 | `Session expired. Please log in again.` | Password changed, logout-all, account deactivated or role changed |
| 403 | `You are not allowed to perform this action` | Staff calling an admin-only route |

## Admin auth

### `POST /admin/auth/login`

```json
// Request
{ "email": "admin.rcb@yopmail.com", "password": "Admin@123" }

// 200
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "staffId": "5b7a762e-d19e-46e1-a8cb-5c01974c0a8e",
  "staff": {
    "id": "5b7a762e-d19e-46e1-a8cb-5c01974c0a8e",
    "name": "Venue Admin",
    "email": "admin.rcb@yopmail.com",
    "role": "admin",
    "active": true,
    "lastLoginAt": "2026-11-21T09:56:05.681Z",
    "createdAt": "2026-11-21T09:55:22.768Z",
    "updatedAt": "2026-11-21T09:56:05.676Z"
  }
}
```

- The email is case-insensitive.
- On every start the server creates the admin from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
  (default `admin.rcb@yopmail.com` / `Admin@123`) if that account does not exist yet. An existing
  account is never changed, so a password changed later stays changed.
- `expiresIn` is in seconds (24 h by default, set by `JWT_EXPIRES_IN`).
- Rate limited to 10 requests per 15 minutes per IP. This limit is shared with forgot-password
  and reset-password.

| Status | Message |
| :--- | :--- |
| 401 | `Invalid email or password` (same message for an unknown email or a wrong password) |
| 403 | `Account is inactive or suspended` |
| 429 | `Too many failed attempts. Try again in a few minutes.` (5 wrong passwords lock the account for 15 minutes) |
| 429 | `Too many requests, please try again later` (IP rate limit) |

### `GET /admin/auth/me`

Returns the signed-in Staff object.

### `POST /admin/auth/change-password`

Signs out every other device and returns a **new session**. Replace the stored token with the
new one.

```json
// Request
{ "currentPassword": "Admin@123", "newPassword": "Admin@67890" }

// 200: same shape as login
{ "token": "eyJhbGciOiJIUzI1NiIs...", "tokenType": "Bearer", "expiresIn": 86400, "staffId": "...", "staff": { "...": "..." } }
```

Password rules: at least 8 characters, with at least one letter and one digit.

| Status | Message |
| :--- | :--- |
| 400 | `Current password is incorrect` |
| 400 | `New password must be different from the current password` |
| 400 | `Password must be at least 8 characters and include a letter and a number` |

### `POST /admin/auth/forgot-password`

Emails a reset link that is valid for 30 minutes. The response is the same whether or not the
account exists.

```json
// Request
{ "email": "admin.rcb@yopmail.com" }

// 200
{ "message": "If an account exists for this email, a reset link has been sent." }
```

The link is `{ADMIN_PANEL_URL}/reset-password?token=<64-hex-token>`. The admin panel should read
`token` from the URL and call reset-password. In development with `DISABLE_EMAIL=true`, the link
is printed to the server console.

### `POST /admin/auth/reset-password`

```json
// Request
{ "token": "<token from the email link>", "newPassword": "NewPass123" }

// 200
{ "message": "Password has been reset. You can log in now." }

// 400: wrong, used or expired token
{ "success": false, "message": "This reset link is invalid or has expired" }
```

The token works once. Resetting also clears a login lockout and signs out every device.

### `POST /admin/auth/logout`

```json
// 200
{ "message": "Logged out successfully" }
```

Tokens are stateless, so the client simply deletes its token.

### `POST /admin/auth/logout-all`

Same response. This one revokes **every** token for the account, on all devices.

## Admin: staff accounts

**All admin only.**

### `GET /admin/staff`

Returns an array of Staff objects, active accounts first.

### `POST /admin/staff`

```json
// Request
{
  "name": "Ravi Desk",
  "email": "ravi@riverside.example",
  "role": "staff",
  "password": "Counter123",
  "sendInvite": false
}

// 201: Staff object
{
  "id": "9eaa73e8-d028-438a-99ab-9d1f0cb739bd",
  "name": "Ravi Desk",
  "email": "ravi@riverside.example",
  "role": "staff",
  "active": true,
  "lastLoginAt": null,
  "createdAt": "2026-11-21T09:56:05.823Z",
  "updatedAt": "2026-11-21T09:56:05.823Z"
}
```

| Field | Rules |
| :--- | :--- |
| `role` | `admin` or `staff` (default `staff`) |
| `password` | Same rules as above |
| `sendInvite` | `true` emails a welcome message with the admin panel login link. The password is **not** emailed |

409 `A staff account with this email already exists`.

### `GET /admin/staff/:id`

A single Staff object. 404 `Staff account not found`.

### `PATCH /admin/staff/:id`

```json
// Request: any of these fields
{ "name": "Ravi Patel", "role": "admin", "active": false }

// 200: updated Staff object
```

- Changing `role` or setting `active: false` signs that person out immediately.
- 400 `You cannot deactivate or demote your own account`.
- 400 `At least one active admin account is required`.

### `POST /admin/staff/:id/password`

Sets a new password for someone else (for example, they forgot it). This also clears a lockout
and signs them out.

```json
// Request
{ "newPassword": "Counter456" }

// 200
{ "message": "Password changed successfully" }
```

## Admin: desk home

### `GET /admin/dashboard?date=YYYY-MM-DD`

`date` defaults to today (IST). `venueId` is optional.

```json
// 200
{
  "venueId": "arena",
  "date": "2026-11-23",
  "bookings": 1,
  "bookedHours": 1,
  "openHours": 24,
  "occupancy": 4,
  "revenue": 920,
  "pendingToday": 0,
  "cancelledToday": 1,
  "byChannel": [{ "channel": "counter", "bookings": 1, "revenue": 920 }],
  "pendingTotal": 0,
  "upcomingTotal": 1,
  "today": [{ "id": "BXT93LM5", "...": "Booking objects" }]
}
```

| Field | Meaning |
| :--- | :--- |
| `bookings`, `bookedHours`, `revenue` | Confirmed (`upcoming` + `completed`) on that date |
| `occupancy` | Booked hours ÷ open hours × 100, rounded |
| `pendingToday`, `cancelledToday` | Counts on that date |
| `pendingTotal`, `upcomingTotal` | Counts across all dates |
| `today` | Every non-cancelled booking on the date, by start time (the "Today" list) |

## Admin: bookings & walk-ins

### `POST /admin/bookings`

Book walk-in. The response is a Booking object plus a `payment` field.

**Cash** is confirmed immediately and the SMS is sent:

```json
// Request
{
  "pitchId": "main",
  "date": "2026-11-23",
  "hours": [19, 20],
  "customerName": "Walk-in Guest",
  "customerPhone": "9876543210",
  "paymentKind": "cash",
  "paymentMethodLabel": "Cash"
}

// 201: Booking object + payment (relevant fields)
{
  "status": "upcoming",
  "channel": "counter",
  "createdBy": "staff",
  "paymentKind": "cash",
  "paymentMethod": "Cash",
  "staffId": "5b7a762e-d19e-46e1-a8cb-5c01974c0a8e",
  "payment": null,
  "...": "see Booking"
}
```

**UPI QR or card** create a `pending` booking plus a Razorpay order:

```json
// Request
{ "date": "2026-11-23", "hours": [22], "customerName": "UPI Guest", "customerPhone": "9876543211", "paymentKind": "upi_qr" }

// 201
{
  "status": "pending",
  "expiresAt": "2026-11-21T10:11:05.961Z",
  "payment": {
    "bookingId": "BXT93LM5",
    "orderId": "order_mock_6ae60bc01e16",
    "amount": 92000,
    "currency": "INR",
    "keyId": "rzp_test_mock",
    "qrString": null,
    "method": "upi_qr",
    "mock": true
  },
  "...": "see Booking"
}
```

| Field | Rules |
| :--- | :--- |
| `date`, `hours` | Same rules as holds |
| `customerName`, `customerPhone` | Required |
| `paymentKind` | Required: `cash`, `upi_qr`, `credit_card` or `debit_card` |
| `paymentMethodLabel` | Optional, e.g. `"Card - HDFC"`. Defaults to `Cash` / `UPI QR` / `Credit card` / `Debit card` |
| `pitchId`, `venueId`, `players`, `notes`, `offerCode` | Optional |

409 `That slot is not available.` if the slot was taken.

Then finish the payment with one of the endpoints below.

### `POST /admin/bookings/:id/mark-paid`

Covers "Collect cash & confirm", "Confirm credit/debit card payment" and the UPI demo's "Simulate
success". It confirms a `pending` booking and sends the SMS.

```json
// Request: both fields optional (override how it was paid)
{ "paymentKind": "upi_qr", "paymentMethodLabel": "UPI QR" }

// 200: Booking object (relevant fields)
{ "status": "upcoming", "paymentKind": "upi_qr", "paymentMethod": "UPI QR" }
```

409 `Booking is not awaiting payment`.

### `POST /admin/bookings/:id/payment-failed`

Covers "Simulate failure" and a declined card. It cancels the `pending` booking and frees the slot.

```json
// Request: reason optional
{ "reason": "Card declined" }

// 200: Booking object (relevant fields)
{ "status": "cancelled", "cancelReason": "Card declined", "refundAmount": null }
```

### `POST /admin/bookings/:id/payment-order`

Creates a new Razorpay order for a pending booking, for example to switch from card to UPI.

```json
// Request
{ "method": "upi_qr" }

// 200: Payment order
{ "bookingId": "BX3JY9TH", "orderId": "order_mock_12fa68cc148f", "amount": 92000, "currency": "INR", "keyId": "rzp_test_mock", "qrString": null, "method": "upi_qr", "mock": true }
```

### `GET /admin/bookings`

The "All bookings" screen. Returns an array of Booking objects, with the total in `X-Total-Count`.

```
GET /admin/bookings?time=upcoming&channel=counter&limit=20
→ 200, X-Total-Count: 2
[ { "id": "BXBCJYEA", "status": "upcoming", ... }, { "id": "BXT93LM5", "status": "upcoming", ... } ]
```

| Query | Values |
| :--- | :--- |
| `time` | `all` (default) · `upcoming` (= `upcoming` + `pending`, **soonest first**) · `past` (= `completed` + `cancelled`, newest first) |
| `date` | A single day ("Filter by date") |
| `from`, `to` | Date range, used when `date` is not set |
| `channel` | `self` · `counter` ("All channels") |
| `paymentKind` | `cash` · `upi_qr` · `credit_card` · `debit_card` ("All pay") |
| `status` | `pending` · `upcoming` · `completed` · `cancelled` |
| `search` | Matches booking id, customer name or phone |
| `phone`, `pitchId`, `venueId` | Exact filters |
| `limit`, `skip` | Paging |

### `GET /admin/bookings/:id`

The booking detail screen: a Booking object plus `staff`, `payments` and `sms`.

```json
// 200 (extra fields)
{
  "...": "see Booking",
  "staff": { "id": "5b7a762e-d19e-46e1-a8cb-5c01974c0a8e", "name": "Venue Admin" },
  "payments": [
    {
      "id": "…",
      "provider": "razorpay",
      "orderId": "order_xxx",
      "paymentId": "pay_xxx",
      "status": "captured",
      "amount": 1770,
      "method": "upi_qr",
      "refundId": null,
      "createdAt": "…"
    }
  ],
  "sms": [
    {
      "id": "c5ceadea-f85d-468e-b4f7-ce0adae206ec",
      "toPhone": "9000000001",
      "recipient": "admin",
      "body": "New booking BXBCJYEA: Walk-in Guest (9876543210), Mon, 23 Nov, 2026, 7 PM - 9 PM, Main Box. Rs 1,820 via Cash (counter).",
      "bookingId": "BXBCJYEA",
      "provider": "console",
      "providerId": null,
      "status": "simulated",
      "error": null,
      "sentAt": "2026-11-21T09:56:05.955Z"
    }
  ]
}
```

Payment `status`: `created` · `captured` · `failed` · `refunded`. Payment `amount` is in rupees.

### `POST /admin/bookings/:id/cancel`

```json
// Request: both optional
{ "reason": "Weather", "refundAmount": 500 }

// 200: Booking object (relevant fields)
{ "status": "cancelled", "refundAmount": 500 }
```

Without `refundAmount`, the [refund policy](#post-bookingsidcancel) applies. With it, staff choose
the amount, capped at what was paid. Online payments are refunded through Razorpay; cash refunds
are just recorded.

### `POST /admin/bookings/:id/reschedule`

```json
// Request
{ "date": "2026-11-23", "startHour": 17, "pitchId": "main" }

// 200: updated Booking object
```

`pitchId` is optional. Unlike customers, staff have no 2-hour cutoff, but the new time must still
be in the future.

## Admin: customers

### `GET /admin/customers?search=&limit=&skip=`

Visitors who entered a name and mobile, plus everyone with a booking. Most recently seen first.

```json
// 200, X-Total-Count: 4
[
  {
    "id": "v-9876543211",
    "name": "UPI Guest",
    "phone": "9876543211",
    "email": null,
    "count": 1,
    "totalSpent": 920,
    "firstSeen": "2026-11-21T09:56:05.966Z",
    "lastSeen": "2026-11-21T09:56:05.966Z",
    "lastBookingAt": "2026-11-21T09:56:05.963Z"
  }
]
```

`count` and `totalSpent` only include confirmed bookings (`upcoming` + `completed`). `search`
matches name or phone. `email` is what the customer saved in their profile (or `null`).

### `GET /admin/customers/:phone`

The same customer object plus `bookings` (an array of Booking objects, newest first). 404
`Visitor not found`.

## Admin: rates & charges

### `GET /admin/venues/:id/settings`

```json
// GET /admin/venues/arena/settings     200
{
  "hourlyRate": 900,
  "additionalCharge": 20,
  "gstRate": 0,
  "updatedAt": "2026-11-21T09:55:22.682Z",
  "preview": {
    "hours": 1,
    "hourlyBookingCharge": 900,
    "additionalCharge": 20,
    "taxes": 0,
    "totalPayable": 920
  },
  "openHour": 0,
  "closeHour": 24,
  "minHours": 1,
  "maxHours": 24,
  "advanceDays": 14
}
```

`preview` is the "Customer preview: 1 hour booking example" card.

### `PATCH /admin/venues/:id/settings`

**Admin only.** Send any subset of fields. The response has the same shape as GET. The customer
site picks up changes immediately.

```json
// Request
{ "hourlyRate": 900, "additionalCharge": 20, "gstRate": 0 }
```

| Field | Rules |
| :--- | :--- |
| `hourlyRate`, `additionalCharge` | Rupees, ≥ 0 |
| `gstRate` | Percent, 0–28 (0 = off) |
| `openHour` / `closeHour` | 0–23 / 1–24. `openHour` must be less than `closeHour` |
| `minHours` / `maxHours` | 1–24. `minHours` ≤ `maxHours` |
| `advanceDays` | 0–365 |

## Admin: offers

### `GET /admin/venues/:id/offers`

All offers, including inactive and expired ones. Same shape as the public offers list.

### `POST /admin/venues/:id/offers`

**Admin only.**

```json
// Request
{
  "code": "NIGHT10",
  "title": "Night owl",
  "description": "10% off late games, up to ₹150.",
  "kind": "percent",
  "value": 10,
  "maxDiscount": 150,
  "minHours": 1,
  "weekdaysOnly": false,
  "accent": "sky"
}

// 201
{
  "id": "3c484c46-9d6a-480c-a4ff-418d748056a5",
  "code": "NIGHT10",
  "title": "Night owl",
  "description": "10% off late games, up to ₹150.",
  "label": "10% OFF",
  "kind": "percent",
  "value": 10,
  "maxDiscount": 150,
  "minSubtotal": 0,
  "minHours": 1,
  "weekdaysOnly": false,
  "accent": "sky",
  "active": true,
  "validFrom": null,
  "validTo": null
}
```

| Field | Rules |
| :--- | :--- |
| `code` | Required. 3–32 characters (letters, digits, `-`, `_`), stored uppercase, unique per venue |
| `kind` | Required, `flat` or `percent` |
| `value` | Required. Rupees (`flat`) or percent (`percent`) |
| `maxDiscount`, `minSubtotal` | Optional, rupees |
| `minHours` | Optional, default 1 |
| `weekdaysOnly` | Optional, default `false` |
| `accent` | Optional: `lime` · `ball` · `sky` · `amber` |
| `validFrom`, `validTo` | Optional ISO dates |
| `active` | Optional, default `true` |

409 `Offer code already exists`.

### `PATCH /admin/venues/:id/offers/:offerId`

**Admin only.** Any field except `code`. For example, `{ "active": false }` turns an offer off.
Returns the updated offer.

## Admin: SMS log & counter QR

### `GET /admin/sms?bookingId=&recipient=&status=&limit=&skip=`

Every SMS attempt, newest first.

```json
// 200, X-Total-Count: 6
[
  {
    "id": "690c3a03-b299-47de-b422-e9d4dc8eebeb",
    "toPhone": "9000000001",
    "recipient": "admin",
    "body": "New booking BXT93LM5: UPI Guest (9876543211), Mon, 23 Nov, 2026, 10 PM - 11 PM, Main Box. Rs 920 via UPI QR (counter).",
    "bookingId": "BXT93LM5",
    "provider": "console",
    "providerId": null,
    "status": "simulated",
    "error": null,
    "sentAt": "2026-11-21T09:56:05.977Z"
  }
]
```

- `recipient`: `customer` · `admin`.
- `status`: `sent` · `failed` · `simulated` (`simulated` means the console provider in development).
- Two messages are sent per confirmed booking: one to the customer and one to `ADMIN_NOTIFY_PHONE`.

### `GET /admin/qr-link`

The URL for the "Counter QR" that customers scan to book and pay online themselves.

```json
// 200
{ "url": "http://localhost:5173/book?src=qr" }
```

---

## Workflows

**1. Customer self-booking (website)**

```
GET  /venues/arena                     prices, pitches, rules
GET  /venues/arena/slots?date=...      slot grid
POST /visitors/otp/send                SMS code             (when they continue)
POST /visitors/otp/verify              → customer token
POST /holds                            8-minute hold        → holdId
POST /bookings/price                   review screen (optional offer code)
POST /bookings                         pending booking      → id
POST /payments/razorpay/order          → orderId, amount (paise), keyId
     … Razorpay Checkout / scan QR …
POST /payments/razorpay/verify         booking → upcoming, SMS sent
```

If the customer goes back: `DELETE /holds/:id`. If the hold expires (410): send them back to
slot selection.

**2. Counter: cash**

```
POST /admin/auth/login
POST /admin/bookings  { paymentKind: "cash" }   → upcoming, SMS sent
```

**3. Counter: UPI QR or card**

```
POST /admin/bookings  { paymentKind: "upi_qr" }  → pending + payment
POST /admin/bookings/:id/mark-paid               success → upcoming, SMS sent
POST /admin/bookings/:id/payment-failed          failure → cancelled, slot freed
```

(With real Razorpay keys, the webhook confirms UPI payments automatically.)

**4. Automatic rules**
- Holds expire after 8 minutes, and unpaid bookings after 15 minutes.
- Finished games become `completed`.
- A background job runs every minute to apply these.

---

## Error reference

| Status | Meaning |
| :--- | :--- |
| 400 | Validation error or a business rule (bad date, offer not valid, wrong current password, …) |
| 401 | Not signed in, bad/expired token, session revoked, or wrong email/password |
| 403 | Signed in but not allowed (staff on an admin-only route, customer doesn't own the booking, inactive account) |
| 404 | Not found (`Booking not found`, `Hold not found`, `Route not found or wrong API method`, …) |
| 409 | Conflict: slot taken, booking not in the right state, duplicate email/offer code |
| 410 | `Your hold has expired` |
| 429 | Rate limited, account locked after failed logins, or OTP requested too often |
| 500 | Unexpected server error (`Internal server error`) |
| 502 / 503 | Payment provider error / online payments not configured (production without Razorpay keys) |
