'use server';

import { prisma } from '@/lib/prisma';

export type CleanupResult = {
    success: boolean;
    deletedLinks: number;
    deletedUsers: number;
    error?: string;
};

/**
 * Cleanup expired and revoked secure links and their associated encrypted data
 * 
 * Security features:
 * - Removes all expired encrypted data
 * - Removes revoked data
 * - Creates audit log entries
 * - Should be called via cron job (Vercel Cron, etc.)
 */
export async function cleanupExpiredData(): Promise<CleanupResult> {
    try {
        const now = new Date();

        // Find all expired or revoked secure links
        const linksToClean = await prisma.secureLink.findMany({
            where: {
                OR: [
                    { expiresAt: { lt: now } },
                    { isRevoked: true },
                ],
            },
            select: {
                id: true,
                userId: true,
                isRevoked: true,
            },
        });

        if (linksToClean.length === 0) {
            return {
                success: true,
                deletedLinks: 0,
                deletedUsers: 0,
            };
        }

        const userIds = linksToClean.map(link => link.userId);
        const linkIds = linksToClean.map(link => link.id);

        // Delete in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create audit log entries for cleanup
            await tx.auditLog.createMany({
                data: linkIds.map(linkId => ({
                    action: 'CLEANUP',
                    linkId,
                })),
            });

            // Delete secure links first (due to foreign key)
            const deletedLinks = await tx.secureLink.deleteMany({
                where: {
                    id: { in: linkIds },
                },
            });

            // Delete associated encrypted user data
            const deletedUsers = await tx.userData.deleteMany({
                where: {
                    id: { in: userIds },
                },
            });

            return {
                deletedLinks: deletedLinks.count,
                deletedUsers: deletedUsers.count,
            };
        });

        // SECURITY: Log only counts, never data content
        console.log(`[CLEANUP] Deleted ${result.deletedLinks} links and ${result.deletedUsers} encrypted records`);

        return {
            success: true,
            ...result,
        };
    } catch (error) {
        console.error('Cleanup error:', error instanceof Error ? error.message : 'Unknown');
        return {
            success: false,
            deletedLinks: 0,
            deletedUsers: 0,
            error: 'Cleanup failed',
        };
    }
}

/**
 * Get cleanup statistics (for monitoring)
 */
export async function getCleanupStats(): Promise<{
    pendingCleanup: number;
    totalLinks: number;
    expiredLinks: number;
    revokedLinks: number;
    activeLinks: number;
}> {
    const now = new Date();

    const [total, expired, revoked] = await Promise.all([
        prisma.secureLink.count(),
        prisma.secureLink.count({ where: { expiresAt: { lt: now } } }),
        prisma.secureLink.count({ where: { isRevoked: true } }),
    ]);

    return {
        pendingCleanup: expired + revoked,
        totalLinks: total,
        expiredLinks: expired,
        revokedLinks: revoked,
        activeLinks: total - expired,
    };
}
