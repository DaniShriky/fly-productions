// Used to turn a hex accent color into plain R/G/B numbers so CSS can build
// translucent variants of it (rgba(var(--x-r), var(--x-g), var(--x-b), 0.2))
// at whatever alpha each rule needs, without depending on the CSS
// color-mix() function — not supported in older browsers/webviews, which
// silently drops the whole declaration (seen in practice: a glow that used
// color-mix() rendered as nothing).
export function hexToRgbParts(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return null;

  const [, r, g, b] = match;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}
