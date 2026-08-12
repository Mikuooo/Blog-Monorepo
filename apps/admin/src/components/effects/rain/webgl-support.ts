export function supportsWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    return Boolean(canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function parseHexColor(hex: string): readonly [number, number, number] {
  const normalized = hex.trim().replace(/^#/, '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized

  if (!/^[0-9a-f]{6}$/i.test(value)) return [57 / 255, 197 / 255, 187 / 255]

  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  ]
}
