// Single external registration link, shared by the Nav CTA and every
// competition page's hero. This is a stopgap, not the real Supabase-backed
// registration flow (that's Phase 3+, see docs/ARCHITECTURE.md) — it just
// points at an external form/link Dani sends directly to clients.
// TODO: replace with the real link once Dani sends it, then again with the
// real in-site registration flow once Phase 3 lands.
export const REGISTRATION_URL = "https://forms.gle/XyvWwyQ5KM2crzueA";
