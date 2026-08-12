export function toSlug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/gu, '')
    .replace(/[\s_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
}
