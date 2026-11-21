-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('upcoming', 'pending', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingChannel" AS ENUM ('self', 'counter');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('upi_qr', 'credit_card', 'debit_card', 'cash');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('created', 'captured', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "SmsRecipient" AS ENUM ('customer', 'admin');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('sent', 'failed', 'simulated');

-- CreateEnum
CREATE TYPE "OfferKind" AS ENUM ('flat', 'percent');

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "openHour" INTEGER NOT NULL DEFAULT 0,
    "closeHour" INTEGER NOT NULL DEFAULT 24,
    "minHours" INTEGER NOT NULL DEFAULT 1,
    "maxHours" INTEGER NOT NULL DEFAULT 24,
    "advanceDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitches" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_settings" (
    "venueId" TEXT NOT NULL,
    "hourlyRatePaise" INTEGER NOT NULL,
    "additionalChargePaise" INTEGER NOT NULL DEFAULT 0,
    "gstRateBps" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_settings_pkey" PRIMARY KEY ("venueId")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Staff',
    "pinHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" "OfferKind" NOT NULL DEFAULT 'flat',
    "value" INTEGER NOT NULL,
    "maxDiscountPaise" INTEGER,
    "minSubtotalPaise" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holds" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" INTEGER[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "visitorPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startHour" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "channel" "BookingChannel" NOT NULL,
    "paymentKind" "PaymentKind",
    "paymentMethodLabel" TEXT,
    "priceJson" JSONB NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "couponCode" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "staffId" TEXT,
    "players" INTEGER,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundAmountPaise" INTEGER,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_slots" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "holdId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'created',
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "refundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_messages" (
    "id" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "recipient" "SmsRecipient" NOT NULL,
    "body" TEXT NOT NULL,
    "bookingId" TEXT,
    "provider" TEXT NOT NULL,
    "providerId" TEXT,
    "status" "SmsStatus" NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pitches_venueId_idx" ON "pitches"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "visitors_phone_key" ON "visitors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "offers_venueId_code_key" ON "offers"("venueId", "code");

-- CreateIndex
CREATE INDEX "holds_expiresAt_idx" ON "holds"("expiresAt");

-- CreateIndex
CREATE INDEX "bookings_customerPhone_idx" ON "bookings"("customerPhone");

-- CreateIndex
CREATE INDEX "bookings_venueId_date_idx" ON "bookings"("venueId", "date");

-- CreateIndex
CREATE INDEX "bookings_status_expiresAt_idx" ON "bookings"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "booking_slots_holdId_idx" ON "booking_slots"("holdId");

-- CreateIndex
CREATE INDEX "booking_slots_bookingId_idx" ON "booking_slots"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_slots_pitchId_date_hour_key" ON "booking_slots"("pitchId", "date", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "sms_messages_bookingId_idx" ON "sms_messages"("bookingId");

-- CreateIndex
CREATE INDEX "sms_messages_sentAt_idx" ON "sms_messages"("sentAt");

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_settings" ADD CONSTRAINT "venue_settings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

