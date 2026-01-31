/**
 * Masks an email address for privacy
 * Example: john.doe@example.com -> j***@example.com
 */
export function maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '***@***';

    if (localPart.length <= 1) {
        return `${localPart}***@${domain}`;
    }

    return `${localPart[0]}***@${domain}`;
}

/**
 * Masks a phone number for privacy
 * Example: +919876543210 -> +91 ****3210
 */
export function maskPhone(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.length < 4) {
        return '****';
    }

    // Get country code (if starts with +)
    if (cleaned.startsWith('+')) {
        const countryCodeMatch = cleaned.match(/^\+(\d{1,3})/);
        if (countryCodeMatch) {
            const countryCode = countryCodeMatch[0];
            const rest = cleaned.slice(countryCode.length);
            const lastFour = rest.slice(-4);
            return `${countryCode} ****${lastFour}`;
        }
    }

    // Default masking: show last 4 digits
    const lastFour = cleaned.slice(-4);
    return `****${lastFour}`;
}
