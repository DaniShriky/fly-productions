// Same codebase, two live deployments: the production domain (public,
// indexable, no registration CTA) and a separate branch/deployment for the
// registration link sent directly to specific clients (CTA on, noindex on).
// Toggle this in the Vercel project's environment variables per deployment —
// not in code, and not per-environment .env files that would get committed.
export const SHOW_REGISTRATION = process.env.NEXT_PUBLIC_SHOW_REGISTRATION === "true";
