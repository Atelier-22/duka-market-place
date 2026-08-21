import { z } from 'zod';

/**
 * A URL pointing at a file this platform stores.
 *
 * Accepts an absolute http(s) URL — what `storageService.getUrl` returns — and
 * also a bare "/uploads/..." path, because rows written before uploads became
 * absolute still hold the relative form. Plain `z.string().url()` rejects the
 * latter, which is what made every image upload fail after the file itself had
 * already been stored successfully.
 */
export const mediaUrl = z
  .string()
  .max(2048)
  .refine(
    (value) => {
      if (value.startsWith('/uploads/')) return true;
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be an uploaded file URL' }
  );
