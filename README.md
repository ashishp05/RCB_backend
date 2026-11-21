# Box Cricket Backend: The Riverside Cricket Box

The booking API for a box cricket venue, built with **Node.js (>=24)**, **Express 5**,
**TypeScript**, **Prisma 7** and **PostgreSQL**. It implements the Flutter app's backend contract:

- visitor identity by mobile number
- the live slot grid
- slot holds that prevent double booking
- self-bookings paid through Razorpay (UPI QR or card)
- counter bookings by staff (cash or online)
- confirmation SMS through MSG91 or Twilio
- a PIN-protected admin API

## How it works

### Booking flows

**Self-book (website):**
`POST /visitors` → `GET /venues/:id` + `/slots` → `POST /holds` → `POST /bookings` (pending) →
`POST /payments/razorpay/order` → Razorpay Checkout or QR → `POST /payments/razorpay/verify`
(or the webhook) → booking becomes `upcoming` → SMS to the customer and the admin.

**Counter cash:** staff `POST /admin/bookings` with `paymentKind: cash` → confirmed immediately,
and the SMS is sent.

**Counter UPI or card:** `POST /admin/bookings` → `pending` plus a Razorpay order → verify or
webhook, or staff calls `POST /admin/bookings/:id/mark-paid` ("Cash received?" / simulate).

### No double booking

`booking_slots` has one row per occupied `(pitch, date, hour)` with a **UNIQUE** constraint. A row
belongs to either a hold or an active booking. Holds, self-bookings, counter bookings and
reschedules all insert rows inside a transaction, so of two concurrent requests for the same hour,
only one can succeed. The other gets `409 That slot is not available.`

### Lifecycles

| What | Rule (see `BOOKING_RULES` in `src/constants/config.constants.ts`) |
| :--- | :--- |
| Hold | Expires after **8 min**. A visitor holds one selection at a time: a new hold replaces the old one. |
| Pending booking | The visitor has **15 min** to pay, and the timer restarts when a payment order is created. Unpaid bookings are released (`cancelled`, "Payment not completed in time"). |
| Late payment | If a payment is captured after the booking was released, the slot is taken back when it is still free. Otherwise the payment is refunded and the API returns 409. |
| Cancellation | Full refund when cancelled **≥ 24 h** before start, otherwise none. Online payments are refunded through Razorpay, and cash refunds are recorded. Staff can override the amount. |
| Reschedule | Same duration, and the price is unchanged. Customers can reschedule up to **2 h** before start. |
| Completed | A background sweeper (every 60 s) marks `upcoming` bookings `completed` after their last hour (IST). |

All times follow the venue's time zone (**Asia/Kolkata**). Money is stored as **integer paise**,
and the API speaks **rupees** (`hourlyRate: 900`). GST is stored in basis points and exposed as a
percent (`gstRate: 18`).

### Pricing

```
subtotal = hourlyRate × hours
discount = offer (flat ₹ or % with optional cap), never more than subtotal
taxes    = (subtotal − discount + platformFee) × gstRate
total    = subtotal − discount + platformFee + taxes
```

## API reference (`/api/v1`)

Responses are the JSON payloads from the contract (no envelope). Errors look like
`{ "success": false, "message": "...", "errors"?: [...] }`. Paged admin lists return an array and
the full count in the `X-Total-Count` header (`?limit=&skip=`).

### Public

| Method | Route | Notes |
| :--- | :--- | :--- |
| `POST` | `/visitors` | `{ name, phone }`, upsert by phone |
| `GET` | `/visitors/me?phone=` | 404 when unknown |
| `GET` | `/venues` · `/venues/:id` | Venue with `settings` and `pitches` |
| `GET` | `/venues/:id/slots?date=&pitchId=` | `available` · `booked` · `held` · `past` |
| `GET` | `/venues/:id/offers` | Active offer codes ("Offers for you") |
| `POST` | `/holds` | `{ venueId?, pitchId?, date, hours[], phone? }` → `{ holdId, expiresAt }` |
| `DELETE` | `/holds/:id` | Release a hold when the user goes back |
| `POST` | `/bookings/price` | `{ hours, offerCode? }`, price preview |
| `POST` | `/bookings` | `{ holdId, customerName, customerPhone, players?, notes?, offerCode? }` → pending booking |
| `GET` | `/bookings?phone=` · `/bookings/:id` | |
| `POST` | `/bookings/:id/cancel` | `{ phone, reason? }` |
| `POST` | `/bookings/:id/reschedule` | `{ phone, date, startHour }` |
| `POST` | `/payments/razorpay/order` | `{ bookingId, method: upi_qr \| credit_card \| debit_card }` |
| `POST` | `/payments/razorpay/verify` | `{ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` |
| `POST` | `/payments/razorpay/webhook` | Handles `payment.captured` / `order.paid` idempotently, signed with `x-razorpay-signature` |

`cancel` and `reschedule` require the booking's mobile number: with the soft visitor identity, the
phone is the proof of ownership.

### Admin (`Authorization: Bearer <jwt>`)

| Method | Route | Notes |
| :--- | :--- | :--- |
| `POST` | `/admin/auth/login` | `{ pin }` → `{ token, staffId, name, role }` (rate limited) |
| `GET` | `/admin/me` · `/admin/dashboard?date=` · `/admin/qr-link` | |
| `GET`/`PATCH` | `/admin/venues/:id/settings` | `{ hourlyRate, additionalCharge, gstRate, openHour, closeHour, minHours, maxHours, advanceDays }` |
| `GET`/`POST` | `/admin/venues/:id/offers` | `{ code, kind: flat \| percent, value, maxDiscount?, minSubtotal?, validFrom?, validTo? }` |
| `PATCH` | `/admin/venues/:id/offers/:offerId` | |
| `POST` | `/admin/bookings` | Counter booking. Cash confirms immediately; other kinds return `payment` (Razorpay order) |
| `GET` | `/admin/bookings?from=&to=&status=&channel=&paymentKind=&pitchId=&phone=&search=` | |
| `GET` | `/admin/bookings/:id` | Includes payments and SMS history |
| `POST` | `/admin/bookings/:id/mark-paid` | `{ paymentKind?, paymentMethodLabel? }` |
| `POST` | `/admin/bookings/:id/payment-order` | `{ method }`, new order for a pending booking |
| `POST` | `/admin/bookings/:id/cancel` | `{ reason?, refundAmount? }` |
| `POST` | `/admin/bookings/:id/reschedule` | `{ date, startHour, pitchId? }` |
| `GET` | `/admin/customers?search=` | Visitors with `bookingsCount`, `totalSpent`, `lastBookingAt` |
| `GET` | `/admin/sms?bookingId=&recipient=&status=` | Every SMS attempt |

## Integrations

- **Razorpay:** set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`.
  Point the dashboard webhook at `/api/v1/payments/razorpay/webhook` (events: `payment.captured`,
  `order.paid`, `payment.failed`). Without keys, and **outside production only**, payments run in
  **mock mode**: orders get `order_mock_*` ids and any signature verifies, so the whole flow works
  locally. Set `UPI_VPA` to include a `upi://pay` string (`qrString`) for the on-screen QR.
- **SMS:** `SMS_PROVIDER=console` (default) logs each message and stores it as `simulated`.
  - `msg91` uses the Flow API with DLT templates `MSG91_TEMPLATE_CUSTOMER` and
    `MSG91_TEMPLATE_ADMIN`. Template variables: `booking_id`, `date`, `slot`, `amount`, `name`,
    `phone`, `venue`.
  - `twilio` sends the plain text body.
  - Admin messages go to `ADMIN_NOTIFY_PHONE`.
- **Counter QR:** `/admin/qr-link` returns `PUBLIC_SITE_URL/book?src=qr`.

## Project layout

```bash
prisma/schema.prisma          # venues, pitches, venue_settings, visitors, staff_users, offers,
                              # holds, bookings, booking_slots, payments, sms_messages
src/
├── container.ts              # Wires repositories → services → controllers once
├── features/
│   ├── venue/                # Venue payload, slot grid, booking-window rules, settings, offers
│   ├── visitor/              # Soft visitor identity + admin customer list
│   ├── booking/              # Holds, bookings, pricing, cancel/reschedule, counter bookings
│   ├── payment/              # Razorpay orders, verify, webhook, refunds
│   ├── notification/         # Confirmation SMS + sms_messages log
│   └── admin/                # PIN auth, dashboard, admin routes
├── jobs/booking-sweeper.job.ts
├── seeds/seed.ts             # Riverside venue, pitch "main", ₹900/h + ₹20, RIVER50, staff PIN
├── utils/                    # time (IST), money, razorpay, sms providers, validators, ...
└── tests/                    # Pricing, IST time, Razorpay signature unit tests
```

Each feature follows **route → controller → service → repository**. See [.agents/](.agents/AGENTS.md)
for the coding standards.

## Quick start

```bash
npm install
cp .env.example .env            # set DATABASE_URL and JWT_SECRET (32+ chars)
npx prisma migrate deploy       # create tables
npm run db:seed                 # venue, pricing, RIVER50, staff PIN (STAFF_DEMO_PIN, default 1234)
npm run dev                     # http://localhost:4000/api/v1
```

| Command | Description |
| :--- | :--- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build / run |
| `npm test` | Unit tests |
| `npm run typecheck` · `lint` · `format:check` | Static checks |
| `npm run db:migrate` · `db:deploy` · `db:seed` · `db:studio` | Prisma workflows |
