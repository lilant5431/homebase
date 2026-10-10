/** WCAG text contrast for opaque computed RGB colors. Reject uncomposited transparency. */
export function opaqueTextContrast(foreground: string, background: string): number {
  function luminance(color: string) {
    const match = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(color)
    if (!match || (match[4] !== undefined && Number(match[4]) !== 1))
      throw new RangeError('Expected an opaque computed RGB color')
    const channels = match.slice(1, 4).map(Number)
    if (channels.some((value) => !Number.isFinite(value) || value < 0 || value > 255))
      throw new RangeError('Invalid RGB channel')
    return channels
      .map((value) => value / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
      .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)
  }
  const first = luminance(foreground),
    second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}
