/**
 * Content Filter Utility
 * Filters phone numbers, emails, and other sensitive information from messages
 */

// Phone number patterns (international formats)
const PHONE_PATTERNS = [
    /\b\d{10}\b/g, // 10 digits (US/India)
    /\b\d{11,15}\b/g, // 11-15 digits (international)
    /\+\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,9}\b/g, // +XX-XXX-XXX-XXXX
    /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, // XXX-XXX-XXXX
    /\b\d{4}[\s.-]?\d{3}[\s.-]?\d{3}\b/g, // XXXX-XXX-XXX
    /\+?91[\s-]?\d{10}\b/g, // Indian format +91-XXXXXXXXXX
];

// Email patterns
const EMAIL_PATTERNS = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

/**
 * Filter sensitive content from message text
 * @param content - The message content to filter
 * @returns Object with filtered content and whether content was modified
 */
export const filterContent = (content: string): { content: string; wasFiltered: boolean } => {
    let filteredContent = content;
    let wasFiltered = false;

    // Filter phone numbers
    for (const pattern of PHONE_PATTERNS) {
        const matches = filteredContent.match(pattern);
        if (matches && matches.length > 0) {
            wasFiltered = true;
            // Replace with masked version
            filteredContent = filteredContent.replace(pattern, (match) => {
                // Keep only last 2 digits visible
                if (match.length >= 3) {
                    return match.slice(0, -2) + 'XX';
                }
                return 'XXXX';
            });
        }
    }

    // Filter email addresses
    for (const pattern of EMAIL_PATTERNS) {
        const matches = filteredContent.match(pattern);
        if (matches && matches.length > 0) {
            wasFiltered = true;
            // Replace with masked version
            filteredContent = filteredContent.replace(pattern, (match) => {
                const [localPart, domain] = match.split('@');
                if (localPart && domain) {
                    // Mask local part, keep domain partially visible
                    const maskedLocal = localPart.slice(0, 1) + '***';
                    const domainParts = domain.split('.');
                    if (domainParts.length >= 2) {
                        const maskedDomain = domainParts[0].slice(0, 1) + '***.' + domainParts.slice(1).join('.');
                        return `${maskedLocal}@${maskedDomain}`;
                    }
                    return `${maskedLocal}@***`;
                }
                return '***@***';
            });
        }
    }

    return {
        content: filteredContent,
        wasFiltered,
    };
};

/**
 * Check if content contains sensitive information
 * @param content - The message content to check
 * @returns true if content contains phone numbers or emails
 */
export const containsSensitiveInfo = (content: string): boolean => {
    const { wasFiltered } = filterContent(content);
    return wasFiltered;
};

/**
 * Validate message content before sending
 * @param content - The message content to validate
 * @returns Object with isValid flag and error message if invalid
 */
export const validateContent = (content: string): { isValid: boolean; message?: string } => {
    if (!content || content.trim().length === 0) {
        return {
            isValid: false,
            message: 'Message content cannot be empty.',
        };
    }

    if (content.length > 5000) {
        return {
            isValid: false,
            message: 'Message content is too long. Maximum 5000 characters allowed.',
        };
    }

    // Check for sensitive information
    const { wasFiltered } = filterContent(content);
    if (wasFiltered) {
        return {
            isValid: false,
            message: 'Messages cannot contain phone numbers or email addresses. Please remove them before sending.',
        };
    }

    return {
        isValid: true,
    };
};



