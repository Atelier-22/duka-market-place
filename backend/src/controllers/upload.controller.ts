import path from 'path';
import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { ApiError } from '../middleware/errorHandler';
import { contentMatchesDeclaredType } from '../utils/fileSignature';

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',

  'audio/webm': '.weba',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'application/pdf': '.pdf',
};

function baseMime(mimetype: string): string {
  return mimetype.split(';')[0].trim().toLowerCase();
}

export async function upload(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, 'No file uploaded');

  const declared = baseMime(file.mimetype ?? '');
  if (!ALLOWED[declared]) {
    throw new ApiError(400, 'That file type is not supported — send a photo, a voice note, or a PDF');
  }
  const mime = contentMatchesDeclaredType(file.buffer, declared);
  if (!mime || !ALLOWED[mime]) {
    throw new ApiError(400, 'That file does not look like the type it claims to be');
  }
  const extension = ALLOWED[mime];

  const stem = path.basename(file.originalname ?? 'upload', path.extname(file.originalname ?? ''));
  const key = await storageService.save(file.buffer, `${stem || 'upload'}${extension}`, folderOf(req), {
    mimeType: mime,
    uploadedBy: req.user?.id ?? null,
  });
  const url = storageService.getUrl(key);

  res.status(201).json({ url, key, mimeType: mime, size: file.size });
}

const FOLDERS_REQUIRING_PRIVATE_STORAGE = ['verification', 'identity', 'id', 'kyc'];

function folderOf(req: Request): string {
  const folder = typeof req.query.folder === 'string' ? req.query.folder : 'misc';
  const clean = folder.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'misc';

  if (FOLDERS_REQUIRING_PRIVATE_STORAGE.includes(clean)) {
    throw new ApiError(
      400,
      'Identity documents cannot be uploaded here. Use POST /api/verification, which stores them privately.'
    );
  }

  return clean;
}
