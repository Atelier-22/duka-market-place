import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { ApiError } from '../middleware/errorHandler';

/** Uploaded content never changes — the key contains a fresh uuid every time. */
const CACHE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Serves a stored file back by its key.
 *
 * Deliberately unauthenticated, exactly as the old static folder was: these
 * URLs are stored in message and evidence rows and rendered by <img> and
 * <audio> tags, which cannot carry an Authorization header. The key is an
 * unguessable uuid, which is the same protection the folder had.
 *
 * Range requests are honoured because <audio> needs them: without a 206 a
 * browser cannot seek within a voice note, and some will refuse to report a
 * duration at all.
 */
export async function serve(req: Request, res: Response) {
  // Everything after /uploads/ is the key, including the folder segment.
  const key = req.params[0];
  if (!key) throw new ApiError(404, 'File not found');

  const file = await storageService.read(key);
  if (!file) throw new ApiError(404, 'File not found');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Cache-Control', `public, max-age=${CACHE_SECONDS}, immutable`);
  res.setHeader('Accept-Ranges', 'bytes');
  // The bytes are whatever a user uploaded — never let a browser sniff them
  // into something executable.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : file.byteSize - 1;
      if (start >= file.byteSize || end >= file.byteSize || start > end) {
        res.setHeader('Content-Range', `bytes */${file.byteSize}`);
        return res.status(416).end();
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${file.byteSize}`);
      res.setHeader('Content-Length', String(end - start + 1));
      return res.end(file.data.subarray(start, end + 1));
    }
  }

  res.setHeader('Content-Length', String(file.byteSize));
  return res.end(file.data);
}
