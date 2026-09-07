import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../middleware/errorHandler';
import { hasOversight } from '../utils/roles';
import { storageService } from '../services/storage.service';
import { contentMatchesDeclaredType } from '../utils/fileSignature';
import { ocrService } from '../services/ocr.service';
import {
  runAutomatedChecks,
  normaliseIdNumber,
  hashIdNumber,
  maskIdNumber,
  recordIdentity,
  setIdentityOutcome,
  destroyDocument,
} from '../services/verification.service';

const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function submit(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, 'No document uploaded');

  const declared = (file.mimetype ?? '').split(';')[0].trim().toLowerCase();
  if (!ACCEPTED_IMAGE.includes(declared)) {
    throw new ApiError(400, 'Send a photo of the document — JPEG, PNG, WEBP or HEIC');
  }
  const mime = contentMatchesDeclaredType(file.buffer, declared);
  if (!mime || !ACCEPTED_IMAGE.includes(mime)) {
    throw new ApiError(400, 'That file is not a readable photo — take a fresh picture of the document');
  }

  const userId = req.user!.id;

  const open = await queryOne<{ id: string }>(
    `SELECT id FROM verification_records
      WHERE shopper_id = $1 AND status = 'pending' LIMIT 1`,
    [userId]
  );
  if (open) throw new ApiError(409, 'You already have a document waiting to be reviewed');

  const storageKey = await storageService.save(file.buffer, file.originalname ?? 'id.jpg', 'verification', {
    mimeType: mime,
    uploadedBy: userId,
  });

  const ocr = await ocrService.extract(file.buffer, mime);
  const fields = ocr.fields;
  const readable = ocr.status === 'ok';

  const auto = await runAutomatedChecks(fields, readable, userId);

  let idHash: string | null = null;
  let masked: string | null = null;
  if (fields?.idNumber) {
    const normalised = normaliseIdNumber(fields.idNumber);
    idHash = hashIdNumber(normalised);
    masked = maskIdNumber(normalised);
    await recordIdentity(idHash, masked, fields.documentType ?? 'national_id', userId, auto.fraudFlag);
  }

  const rejected = auto.decision === 'auto_rejected';

  const record = await queryOne<{ id: string }>(
    `INSERT INTO verification_records
       (shopper_id, document_type, document_url, storage_key, status,
        id_hash, id_masked, extracted_name, extracted_dob, extracted_expiry, extracted_doc_type,
        ocr_status, ocr_engine, ocr_notes, auto_decision, auto_reason, rejection_reason)
     VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      userId,
      fields?.documentType ?? 'national_id',
      storageKey,
      rejected ? 'rejected' : 'pending',
      idHash,
      masked,
      fields?.fullName ?? null,
      fields?.dateOfBirth ?? null,
      fields?.expiryDate ?? null,
      fields?.documentType ?? null,
      ocr.status,
      ocr.engine,
      fields?.notes ?? ocr.message ?? null,
      auto.decision,
      auto.reason,
      rejected ? auto.reason : null,
    ]
  );

  await query(
    `UPDATE shopper_profiles SET verification_status = $2, updated_at = now() WHERE user_id = $1`,
    [userId, rejected ? 'rejected' : 'pending']
  );

  if (rejected && record) {
    await destroyDocument(record.id);
    if (idHash) await setIdentityOutcome(idHash, 'rejected', auto.reason, auto.fraudFlag);
  }

  res.status(201).json({
    id: record?.id,
    status: rejected ? 'rejected' : 'pending',
    reason: auto.reason,
    extracted: rejected
      ? null
      : {
          idMasked: masked,
          fullName: fields?.fullName ?? null,
          dateOfBirth: fields?.dateOfBirth ?? null,
          expiryDate: fields?.expiryDate ?? null,
          documentType: fields?.documentType ?? null,
        },
  });
}

export async function mine(req: Request, res: Response) {
  const rows = await query(
    `SELECT id, document_type, status, auto_decision, auto_reason, rejection_reason,
            id_masked, extracted_name, extracted_dob, extracted_expiry,
            document_deleted_at, reviewed_at, created_at
       FROM verification_records
      WHERE shopper_id = $1
      ORDER BY created_at DESC`,
    [req.user!.id]
  );
  res.json({ records: rows });
}

export async function serveDocument(req: Request, res: Response) {
  const record = await queryOne<{
    shopper_id: string;
    storage_key: string | null;
    document_deleted_at: string | null;
  }>('SELECT shopper_id, storage_key, document_deleted_at FROM verification_records WHERE id = $1', [
    req.params.id,
  ]);
  if (!record) throw new ApiError(404, 'Not found');

  const isOwner = record.shopper_id === req.user!.id;
  if (!isOwner && !hasOversight(req.user!.role)) {
    throw new ApiError(403, 'Not authorized to view this document');
  }

  if (record.document_deleted_at || !record.storage_key) {
    throw new ApiError(410, 'That document was deleted when the decision was made');
  }

  const file = await storageService.read(record.storage_key);
  if (!file) throw new ApiError(410, 'That document is no longer stored');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(file.byteSize));

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  return res.end(file.data);
}

export async function queue(_req: Request, res: Response) {
  const rows = await query(
    `SELECT v.id, v.shopper_id, v.document_type, v.status,
            v.id_masked, v.extracted_name, v.extracted_dob, v.extracted_expiry,
            v.extracted_doc_type, v.ocr_status, v.ocr_engine, v.ocr_notes,
            v.document_deleted_at, v.created_at,
            u.full_name AS submitted_by_name, u.phone AS submitted_by_phone,
            reg.seen_count, reg.fraud_flag
       FROM verification_records v
       JOIN users u ON u.id = v.shopper_id
       LEFT JOIN identity_registry reg ON reg.id_hash = v.id_hash
      WHERE v.status = 'pending'
      ORDER BY v.created_at ASC`
  );
  res.json({ records: rows });
}

const decisionSchema = z.object({
  approve: z.boolean(),
  reason: z.string().max(500).optional(),

  fraud: z.boolean().optional(),
});

export async function decide(req: Request, res: Response) {
  const input = decisionSchema.parse(req.body);
  if (!input.approve && !input.reason) {
    throw new ApiError(400, 'Give a reason when rejecting — the person is shown it');
  }

  const record = await queryOne<{ id: string; shopper_id: string; status: string; id_hash: string | null }>(
    'SELECT id, shopper_id, status, id_hash FROM verification_records WHERE id = $1',
    [req.params.id]
  );
  if (!record) throw new ApiError(404, 'Not found');
  if (record.status !== 'pending') throw new ApiError(409, 'That submission has already been decided');

  const status = input.approve ? 'approved' : 'rejected';

  await query(
    `UPDATE verification_records
        SET status = $2, reviewed_by = $3, reviewed_at = now(), rejection_reason = $4
      WHERE id = $1`,
    [record.id, status, req.user!.id, input.approve ? null : input.reason ?? null]
  );

  if (record.id_hash) {
    await setIdentityOutcome(record.id_hash, status, input.reason ?? null, input.fraud ?? false);
  }

  if (input.approve) {
    await query(
      `UPDATE shopper_profiles SET verification_status = 'approved', updated_at = now()
        WHERE user_id = $1`,
      [record.shopper_id]
    );
  } else {
    await query(
      `UPDATE shopper_profiles SET verification_status = 'rejected', updated_at = now()
        WHERE user_id = $1`,
      [record.shopper_id]
    );
  }

  await destroyDocument(record.id);

  res.json({ id: record.id, status, documentDeleted: true });
}
