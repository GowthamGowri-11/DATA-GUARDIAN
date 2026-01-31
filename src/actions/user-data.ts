'use server';

import { prisma } from '@/lib/prisma';
import {
    generateSecureToken,
    generateOTP,
    hashOTP,
    calculateExpiry,
    encryptData,
    generateDataHash,
    generateOwnerToken,
} from '@/lib/crypto';
import { userDataSchema, UserDataInput } from '@/lib/validations';

export type CreateSecureLinkResult = {
    success: boolean;
    shareUrl?: string;
    ownerUrl?: string; // URL for kill switch
    otp?: string;
    expiresAt?: Date;
    error?: string;
};

/**
 * Creates a secure link with encrypted user data
 * 
 * Security features:
 * - Data encrypted with AES-256-GCM before storage
 * - No PII stored in readable format
 * - Owner token generated for kill switch access
 * - Audit log entry created (no PII)
 */
export async function createSecureLink(input: UserDataInput): Promise<CreateSecureLinkResult> {
    try {
        // Validate input on server side (Zero Trust)
        const validatedData = userDataSchema.safeParse(input);

        if (!validatedData.success) {
            return {
                success: false,
                error: validatedData.error.issues[0]?.message || 'Invalid input data',
            };
        }

        const { firstName, lastName, email, phone, gender, age, validityMinutes } = validatedData.data;

        // Prepare user data object for encryption
        const userData = {
            firstName,
            lastName,
            email,
            phone,
            gender,
            age,
        };

        // Generate tokens and security artifacts
        const token = generateSecureToken();
        const ownerToken = generateOwnerToken();
        const otp = generateOTP();
        const otpHash = await hashOTP(otp);
        const expiresAt = calculateExpiry(validityMinutes);

        // Encrypt user data (AES-256-GCM)
        const encryptedData = encryptData(userData);
        const dataHash = generateDataHash(userData);

        // Create user data and secure link in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Store encrypted user data
            const userDataRecord = await tx.userData.create({
                data: {
                    encryptedData,
                    dataHash,
                },
            });

            // Create secure link
            const secureLink = await tx.secureLink.create({
                data: {
                    token,
                    ownerToken,
                    otpHash,
                    expiresAt,
                    userId: userDataRecord.id,
                },
            });

            // Create audit log entry (no PII)
            await tx.auditLog.create({
                data: {
                    action: 'CREATED',
                    linkId: secureLink.id,
                },
            });

            return { secureLink, userDataRecord };
        });

        // Generate URLs
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const shareUrl = `${baseUrl}/share/${token}`;
        const ownerUrl = `${baseUrl}/revoke/${ownerToken}`;

        // In production, send OTP via email/SMS here
        // For now, we return it for demonstration
        // SECURITY: In production, remove otp from response
        console.log(`[SECURE] Link created. ID: ${result.secureLink.id}`);

        return {
            success: true,
            shareUrl,
            ownerUrl,
            otp, // In production, send via email/SMS instead
            expiresAt,
        };
    } catch (error) {
        // SECURITY: Never log sensitive data
        console.error('Error creating secure link:', error instanceof Error ? error.message : 'Unknown error');
        return {
            success: false,
            error: 'Failed to create secure link. Please try again.',
        };
    }
}
