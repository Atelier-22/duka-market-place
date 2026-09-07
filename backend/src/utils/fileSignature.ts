function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

function ascii(buffer: Buffer, start: number, length: number): string {
  return buffer.subarray(start, start + length).toString('latin1');
}

function isIsoMediaWithBrand(buffer: Buffer, brands: string[]): boolean {
  if (buffer.length < 12 || ascii(buffer, 4, 4) !== 'ftyp') return false;
  const major = ascii(buffer, 8, 4).trim().toLowerCase();
  if (brands.includes(major)) return true;
  const boxSize = buffer.readUInt32BE(0);
  const end = Math.min(buffer.length, Math.max(16, boxSize));
  for (let at = 16; at + 4 <= end; at += 4) {
    if (brands.includes(ascii(buffer, at, 4).trim().toLowerCase())) return true;
  }
  return false;
}

function isMp3(buffer: Buffer): boolean {
  if (startsWith(buffer, [0x49, 0x44, 0x33])) return true;
  return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe6) === 0xe2;
}

function isAac(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
}

export function detectMimeType(buffer: Buffer): string | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 4) === 'WEBP') return 'image/webp';
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 4) === 'WAVE') return 'audio/wav';
  if (isIsoMediaWithBrand(buffer, ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'])) {
    return 'image/heic';
  }
  if (isIsoMediaWithBrand(buffer, ['m4a', 'mp42', 'mp41', 'isom', 'iso2', 'dash', 'm4b', 'm4p', 'f4a', 'f4b', 'avc1', 'mp4', 'qt'])) {
    return 'audio/mp4';
  }
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm';
  if (ascii(buffer, 0, 4) === 'OggS') return 'audio/ogg';
  if (ascii(buffer, 0, 5) === '%PDF-') return 'application/pdf';
  if (isMp3(buffer)) return 'audio/mpeg';
  if (isAac(buffer)) return 'audio/aac';
  return null;
}

const EQUIVALENT: Record<string, string[]> = {
  'image/jpeg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  'image/png': ['image/png'],
  'image/gif': ['image/gif'],
  'image/webp': ['image/webp'],
  'image/heic': ['image/heic', 'image/heif'],
  'audio/webm': ['audio/webm', 'video/webm'],
  'audio/ogg': ['audio/ogg', 'application/ogg'],
  'audio/mp4': ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'video/mp4', 'audio/aac'],
  'audio/mpeg': ['audio/mpeg', 'audio/mp3'],
  'audio/aac': ['audio/aac', 'audio/aacp'],
  'audio/wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
  'application/pdf': ['application/pdf'],
};

export function contentMatchesDeclaredType(buffer: Buffer, declared: string): string | null {
  const detected = detectMimeType(buffer);
  if (!detected) return null;
  const base = declared.split(';')[0].trim().toLowerCase();
  const family = EQUIVALENT[detected] ?? [detected];
  if (family.includes(base)) return detected;
  if (detected.startsWith('image/') && base.startsWith('image/') && detected === 'image/heic') return detected;
  return null;
}
