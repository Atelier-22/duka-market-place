import { createHmac } from 'crypto';
import { env } from '../config/env';
import { query, queryOne } from '../db/pool';
import { storageService } from './storage.service';
import { ExtractedIdFields } from './ocr.service';

/**
 * The automated pass that runs before any person sees a submission.
 *
 * It can reject and it can queue. It cannot approve. Every check here is a
 * check on what is printed on a card — the format of a number, a date that has
 * not passed, whether we have seen this document before. None of that
 * establishes that a document is genuine or that it belongs to the person who
 * sent it, and a competent forgery passes all of it. Auto-approving on these
 * checks would manufacture exactly the confidence that makes identity fraud
 * easy, so the only way to become verified is for a reviewer to decide it.
 */

export type AutoDecision = 'auto_rejected' | 'queued';

export interface AutoCheckResult {
  decision: AutoDecision;
  reason: string | null;
  /** Set when the submission collides with an ID already on file. */
  fraudFlag: boolean;
}

/** Ugandan NINs are 14 characters, letters and digits, no separators. */
const NIN_PATTERN = /^[A-Z0-9]{14}$/;

/**
 * Strips everything that is not a letter or digit and upper-cases the rest, so
 * "CM1234-5678 9012" and "cm123456789012" are recognised as the same document.
 * Matching depends on this being applied identically everywhere.
 */
export function normaliseIdNumber(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function hashIdNumber(normalised: string): string {
  return createHmac('sha256', env.idHashSecret).update(normalised).digest('hex');
}

/** "CM••••••••9012" — referable in a review note without being the number. */
export function maskIdNumber(normalised: string): string {
  if (normalised.length <= 6) return '•'.repeat(normalised.length);
  const head = normalised.slice(0, 2);
  const tail = normalised.slice(-4);
  return `${head}${'•'.repeat(Math.max(0, normalised.length - 6))}${tail}`;
}

function isPastDate(iso: string): boolean {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return false;
  return parsed < Date.now();
}

function ageFrom(iso: string): number | null {
  const dob = Date.parse(iso);
  if (Number.isNaN(dob)) return null;
  return (Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000);
}

export interface RegistryMatch {
  id_hash: string;
  outcome: string;
  outcome_reason: string | null;
  fraud_flag: boolean;
  last_user_id: string | null;
}

/**
 * Has this document been seen before, on any account — including accounts that
 * have since been deleted? identity_registry holds no foreign key to users for
 * exactly this reason.
 */
export async function findRegisteredIdentity(idHash: string): Promise<RegistryMatch | null> {
  return queryOne<RegistryMatch>(
    `SELECT id_hash, outcome, outcome_reason, fraud_flag, last_user_id
       FROM identity_registry WHERE id_hash = $1`,
    [idHash]
  );
}

/**
 * Runs the format, expiry and duplicate checks. Returns a rejection with a
 * reason a person can act on, or queues the submission for review.
 */
export async function runAutomatedChecks(
  fields: ExtractedIdFields | null,
  ocrReadable: boolean,
  userId: string
): Promise<AutoCheckResult> {
  if (!ocrReadable || !fields) {
    // Not a rejection: an unread document is exactly what a reviewer is for.
    return { decision: 'queued', reason: null, fraudFlag: false };
  }

  if (!fields.legible) {
    return {
      decision: 'auto_rejected',
      reason: 'We could not read this photo clearly. Take another in good light, with the whole card flat in frame.',
      fraudFlag: false,
    };
  }

  if (fields.documentType && !['national_id', 'passport', 'drivers_licence', 'refugee_id'].includes(fields.documentType)) {
    return {
      decision: 'auto_rejected',
      reason: 'That does not look like an accepted identity document. Send a national ID, passport, driving permit or refugee ID.',
      fraudFlag: false,
    };
  }

  if (!fields.idNumber) {
    return {
      decision: 'auto_rejected',
      reason: 'We could not read the ID number. Make sure it is not covered by glare or a finger.',
      fraudFlag: false,
    };
  }

  const normalised = normaliseIdNumber(fields.idNumber);
  // Only national IDs have a format we can check. A passport or a permit is
  // left to the reviewer rather than rejected for failing a rule written for
  // a different document.
  if ((fields.documentType ?? 'national_id') === 'national_id' && !NIN_PATTERN.test(normalised)) {
    return {
      decision: 'auto_rejected',
      reason: 'That ID number does not look like a Ugandan national ID number. Check it and send the photo again.',
      fraudFlag: false,
    };
  }

  if (fields.expiryDate && isPastDate(fields.expiryDate)) {
    return {
      decision: 'auto_rejected',
      reason: `That document expired on ${fields.expiryDate}. Send a current one.`,
      fraudFlag: false,
    };
  }

  if (fields.dateOfBirth) {
    const age = ageFrom(fields.dateOfBirth);
    if (age !== null && age < 18) {
      return {
        decision: 'auto_rejected',
        reason: 'You must be 18 or over to use Duka.',
        fraudFlag: false,
      };
    }
  }

  const idHash = hashIdNumber(normalised);
  const seen = await findRegisteredIdentity(idHash);

  if (seen && seen.last_user_id && seen.last_user_id !== userId) {
    if (seen.fraud_flag) {
      return {
        decision: 'auto_rejected',
        reason: 'This document cannot be used to verify an account. Contact support.',
        fraudFlag: true,
      };
    }
    if (seen.outcome === 'approved') {
      return {
        decision: 'auto_rejected',
        reason: 'This document is already verified on another account. An ID can only verify one account.',
        fraudFlag: true,
      };
    }
  }

  return { decision: 'queued', reason: null, fraudFlag: false };
}

/**
 * Records the document in the registry that outlives accounts.
 *
 * Written on submission rather than on decision, so an ID that was used to
 * attempt verification is remembered even if the attempt is abandoned or the
 * account is deleted before anyone reviews it.
 */
export async function recordIdentity(
  idHash: string,
  masked: string,
  documentType: string,
  userId: string,
  fraudFlag: boolean
): Promise<void> {
  await query(
    `INSERT INTO identity_registry (id_hash, id_masked, document_type, first_user_id, last_user_id, fraud_flag)
     VALUES ($1,$2,$3,$4,$4,$5)
     ON CONFLICT (id_hash) DO UPDATE
        SET last_user_id = EXCLUDED.last_user_id,
            seen_count   = identity_registry.seen_count + 1,
            fraud_flag   = identity_registry.fraud_flag OR EXCLUDED.fraud_flag,
            updated_at   = now()`,
    [idHash, masked, documentType, userId, fraudFlag]
  );
}

export async function setIdentityOutcome(
  idHash: string,
  outcome: 'approved' | 'rejected',
  reason: string | null,
  fraudFlag: boolean
): Promise<void> {
  await query(
    `UPDATE identity_registry
        SET outcome = $2, outcome_reason = $3,
            fraud_flag = fraud_flag OR $4, updated_at = now()
      WHERE id_hash = $1`,
    [idHash, outcome, reason, fraudFlag]
  );
}

/**
 * Destroys the document image and records that it is gone.
 *
 * Called the moment a decision is final, in either direction. The extracted
 * fields and the decision survive; the photograph of someone's ID does not.
 * Deliberately tolerant of a missing object — a key already deleted is the
 * desired end state, not an error worth failing a review over.
 */
export async function destroyDocument(recordId: string): Promise<void> {
  const record = await queryOne<{ storage_key: string | null; document_deleted_at: string | null }>(
    'SELECT storage_key, document_deleted_at FROM verification_records WHERE id = $1',
    [recordId]
  );
  if (!record || record.document_deleted_at) return;

  if (record.storage_key) {
    try {
      await storageService.delete(record.storage_key);
    } catch {
      // Fall through: the row is still marked deleted below, and leaving it
      // unmarked would mean a retry loop that can never succeed.
    }
  }

  await query(
    `UPDATE verification_records
        SET document_deleted_at = now(), storage_key = NULL, document_url = ''
      WHERE id = $1`,
    [recordId]
  );
}
