import Anthropic from '@anthropic-ai/sdk';
// The JSON-schema helper rather than the zod one: the SDK's zod helper wants
// zod v4, and zod v3 is what every request validator in this codebase is
// written against. Upgrading zod to read an ID card is not a trade worth
// making. Both helpers produce the same `parsed_output` guarantee.
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { env } from '../config/env';

/**
 * Reading the fields off an identity document.
 *
 * Same shape as the storage and payment abstractions: an interface, a driver
 * chosen by an environment variable, and a `manual` default that keeps the
 * whole feature working with no external service configured. With OCR_DRIVER
 * unset, submissions simply arrive in the review queue with nothing pre-filled
 * and a human reads the document — which is what happens at the end of every
 * path anyway.
 *
 * ── WHAT THIS CANNOT DO ──
 * It reads what is printed on a card. It does not check that the card exists,
 * that it was issued, or that it belongs to the person holding it. Confirming
 * someone is a real Ugandan resident needs the NIRA register, which needs an
 * agreement with NIRA. Everything here is a data-quality gate and a duplicate
 * check in front of a person, and it is deliberately unable to approve anyone
 * on its own.
 */
export interface ExtractedIdFields {
  idNumber: string | null;
  fullName: string | null;
  /** ISO yyyy-mm-dd, or null when absent or unreadable. */
  dateOfBirth: string | null;
  expiryDate: string | null;
  documentType: string | null;
  /** The model's own read on whether the image is legible at all. */
  legible: boolean;
  notes: string | null;
}

export type OcrStatus = 'ok' | 'unreadable' | 'refused' | 'skipped' | 'error';

export interface OcrResult {
  status: OcrStatus;
  engine: string;
  fields: ExtractedIdFields | null;
  /** Why it is not 'ok', in words a reviewer can read. */
  message: string | null;
}

export interface OcrDriver {
  readonly name: string;
  extract(image: Buffer, mimeType: string): Promise<OcrResult>;
}

const EMPTY_FIELDS: ExtractedIdFields = {
  idNumber: null,
  fullName: null,
  dateOfBirth: null,
  expiryDate: null,
  documentType: null,
  legible: false,
  notes: null,
};

/** No automated reading at all; every submission goes to a person. */
class ManualOcrDriver implements OcrDriver {
  readonly name = 'manual';

  async extract(): Promise<OcrResult> {
    return {
      status: 'skipped',
      engine: this.name,
      fields: null,
      message: 'Automated reading is off — a reviewer enters the details.',
    };
  }
}

const ID_FIELDS_SCHEMA = {
  type: 'object',
  properties: {
    idNumber: { type: ['string', 'null'] },
    fullName: { type: ['string', 'null'] },
    dateOfBirth: { type: ['string', 'null'] },
    expiryDate: { type: ['string', 'null'] },
    documentType: { type: ['string', 'null'] },
    legible: { type: 'boolean' },
    notes: { type: ['string', 'null'] },
  },
  required: ['idNumber', 'fullName', 'dateOfBirth', 'expiryDate', 'documentType', 'legible', 'notes'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You read fields from photographs of identity documents for a delivery marketplace in Uganda, so a human reviewer can check them.

Report only what is printed on the document. Never infer, correct or complete a value that you cannot actually read — a null is useful, a guess is worse than nothing, because a reviewer will trust what you return.

Set legible to false if the image is too blurry, dark, cropped or angled to read the fields reliably, or if it is not an identity document at all.

Dates must be ISO yyyy-mm-dd. Ugandan national IDs print dates as DD.MM.YYYY, so convert them. If a date is partly illegible, return null rather than a partial date.

documentType should be one of: national_id, passport, drivers_licence, refugee_id, other.

Put anything a reviewer should know in notes — glare over the number, a torn corner, signs the card has been altered, a photo of a screen rather than a card.`;

/**
 * Claude vision. Structured output rather than free text, so a malformed read
 * is a parse failure the caller can act on rather than a plausible-looking
 * string that quietly reaches a reviewer as fact.
 */
class ClaudeOcrDriver implements OcrDriver {
  readonly name = 'claude';
  private client: Anthropic;

  constructor() {
    if (!env.anthropicApiKey) {
      throw new Error('OCR_DRIVER=claude but ANTHROPIC_API_KEY is not set');
    }
    this.client = new Anthropic({ apiKey: env.anthropicApiKey });
  }

  async extract(image: Buffer, mimeType: string): Promise<OcrResult> {
    const mediaType = normaliseMediaType(mimeType);
    if (!mediaType) {
      return {
        status: 'error',
        engine: this.name,
        fields: null,
        message: `Cannot read a ${mimeType} document.`,
      };
    }

    try {
      const response = await this.client.messages.parse({
        model: 'claude-opus-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: image.toString('base64') },
              },
              { type: 'text', text: 'Read the fields from this identity document.' },
            ],
          },
        ],
        output_config: { format: jsonSchemaOutputFormat(ID_FIELDS_SCHEMA) },
      });

      // A safety decline is a real outcome for identity documents, not an
      // exception. It must not fail the submission — it just means nobody
      // pre-filled the form and a person reads the document instead.
      if (response.stop_reason === 'refusal') {
        return {
          status: 'refused',
          engine: this.name,
          fields: null,
          message: 'Automated reading declined this image; a reviewer will read it.',
        };
      }

      const parsed = response.parsed_output;
      if (!parsed) {
        return {
          status: 'error',
          engine: this.name,
          fields: null,
          message: 'Automated reading returned nothing usable.',
        };
      }

      const fields: ExtractedIdFields = { ...EMPTY_FIELDS, ...parsed };
      return {
        status: fields.legible ? 'ok' : 'unreadable',
        engine: this.name,
        fields,
        message: fields.legible ? null : fields.notes ?? 'The document could not be read clearly.',
      };
    } catch (err) {
      // Never let the reader's failure block a submission: the person has
      // uploaded their ID and is waiting. Fall through to human review.
      if (err instanceof Anthropic.RateLimitError) {
        return { status: 'error', engine: this.name, fields: null, message: 'Automated reading is busy; queued for a reviewer.' };
      }
      if (err instanceof Anthropic.APIError) {
        return { status: 'error', engine: this.name, fields: null, message: `Automated reading failed (${err.status}); queued for a reviewer.` };
      }
      return { status: 'error', engine: this.name, fields: null, message: 'Automated reading failed; queued for a reviewer.' };
    }
  }
}

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

function normaliseMediaType(mimeType: string): SupportedMediaType | null {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  switch (base) {
    case 'image/jpg':
    case 'image/jpeg':
      return 'image/jpeg';
    case 'image/png':
      return 'image/png';
    case 'image/webp':
      return 'image/webp';
    case 'image/gif':
      return 'image/gif';
    default:
      return null;
  }
}

function getOcrDriver(): OcrDriver {
  switch (env.ocrDriver) {
    case 'claude':
      return new ClaudeOcrDriver();
    case 'manual':
    default:
      return new ManualOcrDriver();
  }
}

export const ocrService = getOcrDriver();
export const activeOcrDriver = ocrService.name;
