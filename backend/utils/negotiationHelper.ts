/**
 * Format negotiation details into a readable message
 */
export function formatNegotiationMessage(
    baseMessage: string,
    negotiationDetails: any,
    campaignId?: string
): string {
    let message = baseMessage + '\n\n';
    message += '📋 **Negotiation Details:**\n\n';

    if (negotiationDetails.proposedAmount) {
        message += `💰 Proposed Amount: ₹${negotiationDetails.proposedAmount.toLocaleString('en-IN')}\n`;
    }

    if (negotiationDetails.proposedDeadline) {
        const deadline = new Date(negotiationDetails.proposedDeadline);
        message += `📅 Proposed Deadline: ${deadline.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })}\n`;
    }

    if (negotiationDetails.counterRequirements && negotiationDetails.counterRequirements.length > 0) {
        message += `\n📝 Counter Requirements:\n`;
        negotiationDetails.counterRequirements.forEach((req: string, index: number) => {
            message += `${index + 1}. ${req}\n`;
        });
    }

    message += '\nPlease review and let me know if you agree with these terms.';

    return message;
}

