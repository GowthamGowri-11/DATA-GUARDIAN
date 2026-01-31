-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "SecureLink" ADD COLUMN     "deviceHash" TEXT,
ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "notificationEmail" TEXT,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "purposeDetail" TEXT;

-- CreateTable
CREATE TABLE "UserFile" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "encryptedContent" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "secureLinkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFile_secureLinkId_idx" ON "UserFile"("secureLinkId");

-- AddForeignKey
ALTER TABLE "UserFile" ADD CONSTRAINT "UserFile_secureLinkId_fkey" FOREIGN KEY ("secureLinkId") REFERENCES "SecureLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
