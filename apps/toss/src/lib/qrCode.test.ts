import { describe, expect, it } from 'vitest';
import { buildQrSvgDataUri } from './qrCode';

describe('buildQrSvgDataUri', () => {
  it('generates a valid SVG Data URI for short URLs', () => {
    const url = 'https://picky-olive.vercel.app/poll/nkCjnH';
    const dataUri = buildQrSvgDataUri(url);
    expect(dataUri).not.toBeNull();
    expect(dataUri).toContain('data:image/svg+xml;charset=utf-8,');
    expect(dataUri).toContain('%3Csvg');
    expect(dataUri).toContain('%3Cpath');
  });

  it('returns null if text length exceeds version capacity', () => {
    // QR_VERSION = 10 capacity is ~271 bytes for Byte Mode ECC L
    const longUrl = 'https://picky-olive.vercel.app/poll/nkCjnH?' + 'a'.repeat(300);
    const dataUri = buildQrSvgDataUri(longUrl);
    expect(dataUri).toBeNull();
  });
});
