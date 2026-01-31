import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptData } from '@/lib/crypto';

interface DecryptedUserData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: string;
    age: number;
}

// Helper to check Redis if configured
async function tryIsTokenRevoked(token: string): Promise<boolean | null> {
    try {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN ||
            process.env.UPSTASH_REDIS_REST_URL.includes('your-redis')) {
            return null;
        }
        const { isTokenRevoked } = await import('@/lib/redis');
        return await isTokenRevoked(token);
    } catch {
        return null;
    }
}

async function tryValidateSession(token: string, sessionId: string): Promise<boolean | null> {
    try {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN ||
            process.env.UPSTASH_REDIS_REST_URL.includes('your-redis')) {
            return null;
        }
        const { validateSession } = await import('@/lib/redis');
        return await validateSession(token, sessionId);
    } catch {
        return null;
    }
}

async function tryGetSessionTTL(token: string, sessionId: string, fallback: number): Promise<number> {
    try {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN ||
            process.env.UPSTASH_REDIS_REST_URL.includes('your-redis')) {
            return fallback;
        }
        const { getSessionTTL } = await import('@/lib/redis');
        const ttl = await getSessionTTL(token, sessionId);
        return ttl > 0 ? ttl : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Server-Sent Events (SSE) endpoint for streaming decrypted data
 * 
 * Security features:
 * - Validates session on connection and with heartbeats
 * - Terminates stream immediately if session expires or is revoked
 * - Sends countdown updates from server (not frontend)
 * - Backend-enforced access control
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    // Get session ID from cookie
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
        return new Response('Unauthorized: No session', { status: 401 });
    }

    // Check revocation in Redis (if available)
    const revokedInRedis = await tryIsTokenRevoked(token);
    if (revokedInRedis === true) {
        return new Response('Access revoked', { status: 403 });
    }

    // Validate session in Redis (if available)
    const sessionValid = await tryValidateSession(token, sessionId);
    if (sessionValid === false) {
        return new Response('Session invalid or expired', { status: 401 });
    }

    // Get secure link and encrypted data
    const secureLink = await prisma.secureLink.findUnique({
        where: { token },
        include: { userData: true },
    });

    if (!secureLink || !secureLink.userData || !secureLink.isUsed || secureLink.isRevoked) {
        return new Response('Not accessible', { status: 404 });
    }

    const now = new Date();
    if (secureLink.expiresAt < now) {
        return new Response('Expired', { status: 410 });
    }

    // Decrypt data
    let userData: DecryptedUserData;
    try {
        userData = decryptData<DecryptedUserData>(secureLink.userData.encryptedData);
    } catch {
        return new Response('Decryption failed', { status: 500 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // Send initial data
            const initialSeconds = Math.max(0, Math.floor((secureLink.expiresAt.getTime() - Date.now()) / 1000));
            const initialData = {
                type: 'data',
                userData,
                expiresAt: secureLink.expiresAt.toISOString(),
                remainingSeconds: initialSeconds,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

            const startTime = Date.now();
            const logSessionEnd = async (reason: string) => {
                try {
                    const duration = Math.floor((Date.now() - startTime) / 1000);
                    // Fire and forget audit log
                    await prisma.auditLog.create({
                        data: {
                            action: 'SESSION_ENDED',
                            linkId: secureLink.id,
                            reason: `Session ended: ${reason}`,
                            metadata: { durationSeconds: duration, endReason: reason },
                        },
                    });
                } catch (e) {
                    console.error('Failed to log session end:', e);
                }
            };

            // Heartbeat interval (every 5 seconds)
            const heartbeatInterval = setInterval(async () => {
                try {
                    // Check DB for revocation (more reliable than Redis when Redis not configured)
                    const link = await prisma.secureLink.findUnique({
                        where: { token },
                        select: { isRevoked: true, expiresAt: true },
                    });

                    if (!link || link.isRevoked) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'revoked' })}\n\n`));
                        clearInterval(heartbeatInterval);
                        controller.close();
                        logSessionEnd('revoked');
                        return;
                    }

                    // Calculate remaining time
                    const dbRemainingSeconds = Math.floor((link.expiresAt.getTime() - Date.now()) / 1000);
                    const ttl = await tryGetSessionTTL(token, sessionId, dbRemainingSeconds);

                    if (ttl <= 0 || dbRemainingSeconds <= 0) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'expired' })}\n\n`));
                        clearInterval(heartbeatInterval);
                        controller.close();
                        logSessionEnd('expired');
                        return;
                    }

                    // Send heartbeat with countdown
                    const heartbeat = {
                        type: 'heartbeat',
                        remainingSeconds: Math.min(ttl, dbRemainingSeconds),
                        timestamp: Date.now(),
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
                } catch (error) {
                    console.error('Heartbeat error:', error instanceof Error ? error.message : 'Unknown');
                    clearInterval(heartbeatInterval);
                    controller.close();
                    logSessionEnd('error');
                }
            }, 5000);

            // Cleanup on abort
            request.signal.addEventListener('abort', () => {
                clearInterval(heartbeatInterval);
                controller.close();
                logSessionEnd('client_disconnect');
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}
