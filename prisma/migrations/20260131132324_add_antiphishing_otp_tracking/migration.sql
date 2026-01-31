-- AlterTable
ALTER TABLE "SecureLink" ADD COLUMN     "otpFirstAttemptAt" TIMESTAMP(3),
ADD COLUMN     "otpVerifiedAt" TIMESTAMP(3);
