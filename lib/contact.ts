export const PHONE = "052-471-8088";

const digits = PHONE.replace(/\D/g, "").replace(/^0/, "");
export const PHONE_TEL_URL = `tel:+972${digits}`;
// wa.me needs the number in international format with no leading 0.
export const WHATSAPP_URL = `https://wa.me/972${digits}`;

// Same international-format conversion as above, for an arbitrary stored
// phone number (e.g. a studio manager's own number) rather than FLY's fixed
// one. Handles numbers already saved with a "+972" prefix too (seen in the
// wild in studio_managers.phone), not just a local "05..." number.
export function phoneToWhatsAppUrl(phone: string): string {
  const allDigits = phone.replace(/\D/g, "");
  const national = allDigits.startsWith("972") ? allDigits.slice(3) : allDigits.replace(/^0/, "");
  return `https://wa.me/972${national}`;
}
