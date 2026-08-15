// Turns a public Instagram Reel/post URL (e.g.
// "https://www.instagram.com/reel/DTLCgMmCI4P/?utm_source=...") into
// Meta's public embed iframe URL. Works for public posts without any API
// key. Returns null if the URL doesn't look like an Instagram post/reel.
export function getInstagramEmbedUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/(reel|p)\/([^/?]+)/);
  if (!match) return null;
  const [, type, shortcode] = match;
  return `https://www.instagram.com/${type}/${shortcode}/embed`;
}
