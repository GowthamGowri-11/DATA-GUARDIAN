
import { createHash } from 'crypto';
import { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

/**
 * Generates a privacy-safe device hash from request headers
 * Used for session binding without storing raw PII
 */
export function generateDeviceHash(headers: ReadonlyHeaders | Headers): string {
    const userAgent = headers.get('user-agent') || 'unknown-ua';
    const acceptLanguage = headers.get('accept-language') || 'unknown-lang';
    const secChUa = headers.get('sec-ch-ua') || '';
    const secChUaPlatform = headers.get('sec-ch-ua-platform') || '';

    // Combine stable device signals
    // Note: IP is intentionally excluded to allow roaming (e.g., switching from WiFi to 4G)
    const fingerprintString = `${userAgent}|${acceptLanguage}|${secChUa}|${secChUaPlatform}`;

    // Create SHA-256 hash
    return createHash('sha256')
        .update(fingerprintString)
        .digest('hex');
}
