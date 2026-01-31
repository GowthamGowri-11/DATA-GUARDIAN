-- CreateTable
CREATE TABLE "UserData" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecureLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SecureLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecureLink_token_key" ON "SecureLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SecureLink_userId_key" ON "SecureLink"("userId");

-- CreateIndex
CREATE INDEX "SecureLink_token_idx" ON "SecureLink"("token");

-- CreateIndex
CREATE INDEX "SecureLink_expiresAt_idx" ON "SecureLink"("expiresAt");

-- AddForeignKey
ALTER TABLE "SecureLink" ADD CONSTRAINT "SecureLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
