import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { ApiError } from '../middleware/errorHandler';

/**
 * Generic authenticated file upload used for request reference photos,
 * item-found photos, receipts, verification documents, and chat attachments.
 * The `folder` query param namespaces where the file is stored
 * (e.g. ?folder=receipts) — it does not affect authorization; every
 * consumer of the returned URL still enforces its own access checks.
 */
export async function upload(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, 'No file uploaded');

  const folder = typeof req.query.folder === 'string' ? req.query.folder : 'misc';
  const key = await storageService.save(file.buffer, file.originalname, folder);
  const url = storageService.getUrl(key);

  res.status(201).json({ url, key });
}
