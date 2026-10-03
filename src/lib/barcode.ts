// The bars of the placeholder barcode on the membership card (ui/Barcode).
// PLACEHOLDER: the Society has not yet chosen the symbology its partner
// outlets will scan, so this draws a stable, readable-looking pattern from
// the member number meanwhile. When the format is decided (Code 128 is the
// likely one), this is the function to replace; the card does not change.
//
// Each character becomes four bars of width 1..4 with 1-unit gaps, so the
// same text always draws the same pattern. Even indexes are ink, odd are
// gaps.
export function barsFor(text: string): number[] {
  const bars: number[] = [2, 1, 1]; // start
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    for (let i = 0; i < 4; i++) bars.push(((code >> (i * 2)) & 3) + 1, 1);
  }
  bars.push(1, 1, 2); // stop
  return bars;
}
