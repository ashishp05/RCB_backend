-- Customer login by SMS one-time code, plus optional profile fields.
ALTER TABLE "visitors" ADD COLUMN "email" TEXT,
ADD COLUMN "birthday" DATE;

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_codes_phone_createdAt_idx" ON "otp_codes"("phone", "createdAt");
