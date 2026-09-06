// Same codebase, two live Vercel projects: the public production domain
// (indexable) and a separate project for the registration link sent
// directly to specific clients (kept out of search). The registration CTA
// itself is now always shown on both — this flag only controls indexing.
// Reused the existing NEXT_PUBLIC_SHOW_REGISTRATION env var name (already
// set per-project in Vercel) rather than renaming it there too.
export const IS_PRIVATE_LINK = process.env.NEXT_PUBLIC_SHOW_REGISTRATION === "true";
