import path from 'path';
import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { ApiError } from '../middleware/errorHandler';

/**
 * What may be uploaded, and the extension each type is stored under.
 *
 * The extension matters beyond tidiness: uploads are served by `express.static`,
 * which decides the Content-Type from the file extension alone. A voice note
 * saved as `.bin` comes back as `application/octet-stream` and no browser will
 * play it.
 */
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  // Voice notes. Which container you get depends on the browser: Chrome and
  // Firefox record webm/opus, Safari records mp4/aac — so all of them are here.
  // `.weba`, not `.webm`: express.static maps `.webm` to video/webm, which is
  // the wrong type for an audio-only recording. `.weba` is the audio-only
  // WebM extension and maps to audio/webm.
  'audio/webm': '.weba',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'application/pdf': '.pdf',
};

/** `audio/webm;codecs=opus` is a legal Content-Type — match on the type alone. */
function baseMime(mimetype: string): string {
  return mimetype.split(';')[0].trim().toLowerCase();
}

/**
 * Generic authenticated file upload used for request reference photos,
 * item-found photos, receipts, verification documents, chat attachments, and
 * voice notes. The `folder` query param namespaces where the file is stored
 * (e.g. ?folder=chat) — it does not affect authorization; every consumer of
 * the returned URL still enforces its own access checks.
 */
export async function upload(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, 'No file uploaded');

  const mime = baseMime(file.mimetype ?? '');
  const extension = ALLOWED[mime];
  if (!extension) {
    throw new ApiError(400, 'That file type is not supported — send a photo, a voice note, or a PDF');
  }

  // Trust the mime type over the filename. Phone cameras and MediaRecorder
  // blobs routinely arrive with no extension or a misleading one.
  const stem = path.basename(file.originalname ?? 'upload', path.extname(file.originalname ?? ''));
  const key = await storageService.save(file.buffer, `${stem || 'upload'}${extension}`, folderOf(req));
  const url = storageService.getUrl(key);

  res.status(201).json({ url, key, mimeType: mime, size: file.size });
}

function folderOf(req: Request): string {
  const folder = typeof req.query.folder === 'string' ? req.query.folder : 'misc';
  // Keep the key inside the upload root — a folder of "../../etc" would
  // otherwise write wherever it liked.
  return folder.replace(/[^a-z0-9_-]/gi, '') || 'misc';
}
