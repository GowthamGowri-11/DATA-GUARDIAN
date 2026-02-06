
import { createHash } from 'crypto';
import { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

/**
 * Generates a privacy-safe device hash from request headers
 * Used for session binding without storing raw PII
 * 
 * 5 Signals: User-Agent, Language, Accept-Encoding, sec-ch-ua, sec-ch-ua-platform
 */
export function generateDeviceHash(headers: ReadonlyHeaders | Headers): string {
    const userAgent = headers.get('user-agent') || 'unknown-ua';
    const acceptLanguage = headers.get('accept-language') || 'unknown-lang';
    const acceptEncoding = headers.get('accept-encoding') || 'unknown-enc';
    const secChUa = headers.get('sec-ch-ua') || '';
    const secChUaPlatform = headers.get('sec-ch-ua-platform') || '';

    // Combine stable device signals (5 signals for robust fingerprinting)
    // Note: IP is intentionally excluded to allow roaming (e.g., switching from WiFi to 4G)
    const fingerprintString = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${secChUa}|${secChUaPlatform}`;

    // Create SHA-256 hash
    return createHash('sha256')
        .update(fingerprintString)
        .digest('hex');
}
