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
    encryptBuffer
} from '@/lib/crypto';
import { userDataSchema, fileSchema, ACCEPTED_FILE_TYPES } from '@/lib/validations';
import { z } from 'zod';

export type CreateSecureLinkResult = {
    success: boolean;
    shareUrl?: string;
    ownerUrl?: string;
    otp?: string;
    expiresAt?: Date;
    purpose?: string;  // V2.1: Return purpose for confirmation
    error?: string;
};

export async function createSecureLinkWithFiles(formData: FormData): Promise<CreateSecureLinkResult> {
    try {
        // 1. Extract and Validate Text Data
        const rawData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            gender: formData.get('gender'),
            age: Number(formData.get('age')),
            validityMinutes: Number(formData.get('validityMinutes')),
        };

        // V2.1: Extract purpose and notification fields
        const purpose = formData.get('purpose') as string | null;
        const purposeDetail = formData.get('purposeDetail') as string | null;
        const notificationEmail = formData.get('notificationEmail') as string | null;

        const validatedData = userDataSchema.safeParse(rawData);
        if (!validatedData.success) {
            return {
                success: false,
                error: validatedData.error.issues[0]?.message || 'Invalid input data',
            };
        }

        // 2. Extract and Process Files
        const files: File[] = [];
        const fileEntries = formData.getAll('files');

        for (const entry of fileEntries) {
            if (entry instanceof File && entry.size > 0) {
                files.push(entry);
            }
        }

        // Validate Files
        const encryptedFiles: any[] = [];
        for (const file of files) {
            // Validate Type and Size
            const validation = fileSchema.safeParse({ size: file.size, type: file.type });
            if (!validation.success) {
                return {
                    success: false,
                    error: `File ${file.name}: ${validation.error.issues[0]?.message}`,
                };
            }

            // Encrypt Content
            const buffer = Buffer.from(await file.arrayBuffer());
            const { iv, authTag, encryptedContent } = encryptBuffer(buffer);

            encryptedFiles.push({
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                encryptedContent,
                iv,
                authTag,
            });
        }

        const { firstName, lastName, email, phone, gender, age, validityMinutes } = validatedData.data;

        // 3. Prepare User Data for Encryption
        const userData = {
            firstName,
            lastName,
            email,
            phone,
            gender,
            age,
        };

        // 4. Generate Security Artifacts
        const token = generateSecureToken();
        const ownerToken = generateOwnerToken();
        const otp = generateOTP();
        const otpHash = await hashOTP(otp);
        const expiresAt = calculateExpiry(validityMinutes);

        // Encrypt User Data
        const encryptedUserData = encryptData(userData);
        const dataHash = generateDataHash(userData);

        // 5. Database Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create UserData Record
            const userDataRecord = await tx.userData.create({
                data: {
                    encryptedData: encryptedUserData,
                    dataHash,
                },
            });

            // Create SecureLink with Files (V2.1 Enhanced)
            const secureLink = await tx.secureLink.create({
                data: {
                    token,
                    ownerToken,
                    otpHash,
                    expiresAt,
                    userId: userDataRecord.id,
                    // V2.1 Additions
                    purpose: purpose || undefined,
                    purposeDetail: purposeDetail || undefined,
                    notificationEmail: notificationEmail || undefined,
                    files: {
                        create: encryptedFiles,
                    },
                },
            });

            // Audit Log (V2.1: Include purpose if provided)
            await tx.auditLog.create({
                data: {
                    action: 'CREATED',
                    linkId: secureLink.id,
                    metadata: {
                        fileCount: files.length,
                        purpose: purpose || undefined,
                        hasNotifications: !!notificationEmail
                    },
                },
            });

            return secureLink;
        }, {
            maxWait: 10000,
            timeout: 120000
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const shareUrl = `${baseUrl}/share/${token}`;
        const ownerUrl = `${baseUrl}/revoke/${ownerToken}`;

        console.log(`[SECURE] Link created with ${files.length} files. ID: ${result.id}`);

        return {
            success: true,
            shareUrl,
            ownerUrl,
            otp,
            expiresAt,
            purpose: purpose || undefined,  // V2.1: Return for UI confirmation
        };

    } catch (error) {
        console.error('Error creating secure link:', error instanceof Error ? error.message : 'Unknown error');
        return {
            success: false,
            error: 'Failed to create secure link. Please try again.',
        };
    }
}
