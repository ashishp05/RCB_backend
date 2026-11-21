-- Staff sign in with email + password instead of a shared PIN.
-- Existing rows (e.g. the seeded staff-demo) get a placeholder email and an unusable password
-- hash: they cannot log in until `npm run db:seed` or an admin password reset sets real values.
ALTER TABLE "staff_users"
ADD COLUMN     "email" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT '!',
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "resetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetTokenHash" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "staff_users" SET "email" = "id" || '@staff.local' WHERE "email" IS NULL;

ALTER TABLE "staff_users"
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "passwordHash" DROP DEFAULT,
ALTER COLUMN "name" DROP DEFAULT,
ALTER COLUMN "role" SET DEFAULT 'staff',
DROP COLUMN "pinHash";

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- Offer rules used by the app: title, minimum hours, weekdays-only and card accent.
ALTER TABLE "offers" ADD COLUMN     "accent" TEXT NOT NULL DEFAULT 'lime',
ADD COLUMN     "minHours" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "weekdaysOnly" BOOLEAN NOT NULL DEFAULT false;
