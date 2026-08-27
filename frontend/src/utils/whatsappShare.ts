const APP_STORE_LINK = 'https://apps.apple.com/in/app/influence-me-in/id6755072451';

/**
 * Build WhatsApp share message for a service (same format as backend recommendation).
 * Used on vendor service cards so anyone can "Recommend to someone else".
 */
export function buildServiceWhatsAppMessage(service: {
  serviceName: string;
  description?: string;
  location?: string;
  images?: string[];
}): string {
  let text = `Check out this service - it's amazing! 👇\n\n`;
  text += `*${service.serviceName}*\n\n`;
  text += `${service.description || ''}\n\n`;
  if (service.location) {
    text += `📍 Location: ${service.location}\n\n`;
  }
  if (service.images && service.images.length > 0) {
    text += `Images: ${service.images.slice(0, 3).join(' ')}\n`;
  }
  text += `\n_Shared via Influence-Me.in_\n`;
  text += `Influence-Me.in app: ${APP_STORE_LINK}`;
  return text;
}

/**
 * Open WhatsApp share with the given message (new chat / choose contact).
 */
export function openWhatsAppShare(message: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
