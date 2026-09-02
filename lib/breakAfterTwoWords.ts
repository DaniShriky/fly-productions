// Breaks a title onto two lines after its second word when it has more
// than two words, e.g. "SUPER STAR EILAT" -> ["SUPER STAR", "EILAT"], so
// long titles don't run too wide across a single line on the card.
export function breakAfterTwoWords(name: string): [string, string | null] {
  const words = name.split(" ");
  if (words.length <= 2) return [name, null];
  return [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
}
