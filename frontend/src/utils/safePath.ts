export function internalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//') || trimmed.includes('\\')) return null;
  if (/^\/[^/]*:/.test(trimmed)) return null;
  return trimmed;
}
