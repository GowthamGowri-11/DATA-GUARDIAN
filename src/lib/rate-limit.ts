/**
 * Rate Limiting Module - Anti-Phishing Defense
 * 
 * Purpose: Prevent brute-force attacks and automated phishing attempts
 * by limiting OTP verification and link access attempts.
 * 
 * Security Features:
 * - IP-based rate limiting for OTP verification
 * - Per-token rate limiting for link access
 * - Redis-backed with automatic TTL cleanup
 * - Graceful fallback if Redis unavailable
 */

// ============================================
// RATE LIMIT CONFIGURATION
// ============================================

const RATE_LIMITS = {
    OTP_VERIFY: {
        MAX_ATTEMPTS: 10,       // Max OTP attempts per IP
        WINDOW_SECONDS: 15 * 60 // 15 minute window
    },
    LINK_ACCESS: {
        MAX_ATTEMPTS: 30,       // Max link loads per token
        WINDOW_SECONDS: 60      // 1 minute window
    },
    GLOBAL_IP: {
        MAX_ATTEMPTS: 100,      // Max requests per IP (all endpoints)
        WINDOW_SECONDS: 60      // 1 minute window
    }
};

// ============================================
// TYPES
// ============================================

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;       // Unix timestamp when limit resets
    retryAfter?: number;   // Seconds until retry allowed
}

// ============================================
// REDIS CONNECTION (Lazy initialization)
// ============================================

let redisClient: any = null;

async function getRedis() {
    if (redisClient) return redisClient;

    // Check if Redis is configured
    if (!process.env.UPSTASH_REDIS_REST_URL ||
        !process.env.UPSTASH_REDIS_REST_TOKEN ||
        process.env.UPSTASH_REDIS_REST_URL.includes('your-redis')) {
        return null;
    }

    try {
        const { Redis } = await import('@upstash/redis');
        redisClient = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        return redisClient;
    } catch (error) {
        console.error('[RateLimit] Redis connection failed:', error);
        return null;
    }
}

// ============================================
// RATE LIMIT FUNCTIONS
// ============================================

/**
 * Check rate limit using sliding window counter
 * 
 * @param key - Unique identifier (e.g., IP address, token)
 * @param limit - Maximum allowed attempts
 * @param windowSeconds - Time window in seconds
 */
async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const redis = await getRedis();

    // Fallback: If Redis unavailable, allow (fail open for availability)
    // In production, consider fail-closed with in-memory fallback
    if (!redis) {
        console.log('[RateLimit] Redis unavailable, allowing request');
        return {
            allowed: true,
            remaining: limit,
            resetAt: Date.now() + (windowSeconds * 1000)
        };
    }

    try {
        const current = await redis.incr(key);

        // Set TTL on first request
        if (current === 1) {
            await redis.expire(key, windowSeconds);
        }

        const ttl = await redis.ttl(key);
        const resetAt = Date.now() + (ttl * 1000);
        const remaining = Math.max(0, limit - current);
        const allowed = current <= limit;

        return {
            allowed,
            remaining,
            resetAt,
            retryAfter: allowed ? undefined : ttl
        };
    } catch (error) {
        console.error('[RateLimit] Redis error:', error);
        // Fail open on error
        return {
            allowed: true,
            remaining: limit,
            resetAt: Date.now() + (windowSeconds * 1000)
        };
    }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Rate limit OTP verification attempts by IP
 * 
 * Limit: 10 attempts per 15 minutes per IP
 * 
 * Why: Prevents automated OTP brute-forcing and
 * limits damage from distributed phishing proxies
 */
export async function checkOTPRateLimit(ip: string): Promise<RateLimitResult> {
    const sanitizedIP = sanitizeIP(ip);
    const key = `ratelimit:otp:${sanitizedIP}`;

    return checkRateLimit(
        key,
        RATE_LIMITS.OTP_VERIFY.MAX_ATTEMPTS,
        RATE_LIMITS.OTP_VERIFY.WINDOW_SECONDS
    );
}

/**
 * Rate limit link access attempts by token
 * 
 * Limit: 30 requests per minute per link
 * 
 * Why: Prevents automated scraping and
 * excessive access attempts on single link
 */
export async function checkLinkRateLimit(token: string): Promise<RateLimitResult> {
    const key = `ratelimit:link:${token.substring(0, 16)}`;

    return checkRateLimit(
        key,
        RATE_LIMITS.LINK_ACCESS.MAX_ATTEMPTS,
        RATE_LIMITS.LINK_ACCESS.WINDOW_SECONDS
    );
}

/**
 * Global IP rate limiting for all endpoints
 * 
 * Limit: 100 requests per minute per IP
 * 
 * Why: Catch-all for DoS and aggressive scanning
 */
export async function checkGlobalRateLimit(ip: string): Promise<RateLimitResult> {
    const sanitizedIP = sanitizeIP(ip);
    const key = `ratelimit:global:${sanitizedIP}`;

    return checkRateLimit(
        key,
        RATE_LIMITS.GLOBAL_IP.MAX_ATTEMPTS,
        RATE_LIMITS.GLOBAL_IP.WINDOW_SECONDS
    );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize IP address for use as Redis key
 * Handles IPv6, forwarded headers, etc.
 */
function sanitizeIP(ip: string): string {
    if (!ip || ip === 'unknown') return 'unknown';

    // Handle x-forwarded-for (take first IP)
    const firstIP = ip.split(',')[0].trim();

    // Replace colons in IPv6 for key safety
    return firstIP.replace(/:/g, '-').substring(0, 45);
}

/**
 * Extract client IP from request headers
 * Handles common proxy configurations
 */
export function extractClientIP(headers: Headers): string {
    // Try various headers in order of preference
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = headers.get('x-real-ip');
    if (realIP) return realIP;

    const cfConnectingIP = headers.get('cf-connecting-ip');
    if (cfConnectingIP) return cfConnectingIP;

    return 'unknown';
}

/**
 * Format rate limit error message for users
 */
export function formatRateLimitError(result: RateLimitResult): string {
    if (result.allowed) return '';

    const minutes = Math.ceil((result.retryAfter || 60) / 60);
    return `Too many attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
}
