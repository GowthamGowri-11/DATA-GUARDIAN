/*
  Migration: add_encryption_and_security
  
  This migration:
  1. Deletes all existing data (old plaintext data should not be kept)
  2. Removes plaintext PII columns from UserData
  3. Adds encrypted data storage
  4. Adds owner token and revocation support to SecureLink
  5. Creates AuditLog table for minimal audit trail
*/

-- Step 1: Delete all existing data (old insecure plaintext data)
-- This is intentional - we don't want to keep unencrypted PII
DELETE FROM "SecureLink";
DELETE FROM "UserData";

-- Step 2: Add new columns to SecureLink
ALTER TABLE "SecureLink" ADD COLUMN "isRevoked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SecureLink" ADD COLUMN "ownerToken" TEXT;

-- Step 3: Transform UserData table
-- Drop old plaintext columns
ALTER TABLE "UserData" DROP COLUMN IF EXISTS "age";
ALTER TABLE "UserData" DROP COLUMN IF EXISTS "email";
ALTER TABLE "UserData" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "UserData" DROP COLUMN IF EXISTS "gender";
ALTER TABLE "UserData" DROP COLUMN IF EXISTS "lastName";
ALTER TABLE "UserData" DROP COLUMN IF EXISTS "phone";

-- Add encrypted data columns
ALTER TABLE "UserData" ADD COLUMN "dataHash" TEXT;
ALTER TABLE "UserData" ADD COLUMN "encryptedData" TEXT;

-- Step 4: Make new columns required (now that table is empty)
ALTER TABLE "SecureLink" ALTER COLUMN "ownerToken" SET NOT NULL;
ALTER TABLE "UserData" ALTER COLUMN "dataHash" SET NOT NULL;
ALTER TABLE "UserData" ALTER COLUMN "encryptedData" SET NOT NULL;

-- Step 5: Create AuditLog table
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create indexes
CREATE INDEX "AuditLog_linkId_idx" ON "AuditLog"("linkId");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE UNIQUE INDEX "SecureLink_ownerToken_key" ON "SecureLink"("ownerToken");
CREATE INDEX "SecureLink_ownerToken_idx" ON "SecureLink"("ownerToken");

-- Step 7: Add foreign key for AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "SecureLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
