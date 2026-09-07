import Anthropic from '@anthropic-ai/sdk';

import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { env } from '../config/env';

export interface ExtractedIdFields {
  idNumber: string | null;
  fullName: string | null;

  dateOfBirth: string | null;
  expiryDate: string | null;
  documentType: string | null;

  legible: boolean;
  notes: string | null;
}

export type OcrStatus = 'ok' | 'unreadable' | 'refused' | 'skipped' | 'error';

export interface OcrResult {
  status: OcrStatus;
  engine: string;
  fields: ExtractedIdFields | null;

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
