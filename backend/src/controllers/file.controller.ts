import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { ApiError } from '../middleware/errorHandler';

const CACHE_SECONDS = 60 * 60 * 24 * 365;

const PRIVATE_FOLDERS = ['verification', 'identity', 'id', 'kyc'];
const SAFE_KEY = /^[a-z0-9_-]+\/[a-z0-9-]+\.[a-z0-9]{1,5}$/i;

export async function serve(req: Request, res: Response) {
  const key = req.params[0];
  if (!key || !SAFE_KEY.test(key)) throw new ApiError(404, 'File not found');
  if (PRIVATE_FOLDERS.includes(key.split('/')[0].toLowerCase())) throw new ApiError(404, 'File not found');

  const file = await storageService.read(key);
  if (!file) throw new ApiError(404, 'File not found');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Cache-Control', `public, max-age=${CACHE_SECONDS}, immutable`);
  res.setHeader('Accept-Ranges', 'bytes');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

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
