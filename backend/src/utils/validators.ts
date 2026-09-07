import { z } from 'zod';

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
