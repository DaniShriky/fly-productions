// Splits off a trailing Hebrew parenthetical, e.g. "MEGA STAR (מגזר דתי)"
// -> { main: "MEGA STAR", suffix: "(מגזר דתי)" }, so it can be rendered
// in Assistant instead of the Latin-only Hubot Sans used for the rest
// of a competition title.
export function splitReligiousSuffix(name: string) {
  const idx = name.indexOf("(");
  if (idx === -1) return { main: name, suffix: null as string | null };
  return { main: name.slice(0, idx).trim(), suffix: name.slice(idx) };
}
