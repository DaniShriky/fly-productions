export const PHONE = "052-471-8088";

const digits = PHONE.replace(/\D/g, "").replace(/^0/, "");
export const PHONE_TEL_URL = `tel:+972${digits}`;
// wa.me needs the number in international format with no leading 0.
export const WHATSAPP_URL = `https://wa.me/972${digits}`;
