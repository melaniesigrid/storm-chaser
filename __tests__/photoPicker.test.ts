import { resolveCapturedAt } from '@/features/storms/data/photoPicker';

const FALLBACK = new Date('2026-09-19T12:00:00.000Z');

describe('resolveCapturedAt', () => {
  it('prefers the EXIF original date over everything else', () => {
    const iso = resolveCapturedAt(
      {
        uri: 'file:///library/a.jpg',
        creationTime: Date.parse('2026-09-18T09:00:00.000Z'),
        exif: { DateTimeOriginal: '2025:06:11 18:04:22' },
      },
      FALLBACK,
    );

    // EXIF carries no timezone, so it is read as local time. Asserting against
    // a locally constructed Date keeps this green under `npm run test:tz`,
    // where the suite runs at a negative offset rather than UTC.
    expect(iso).toBe(new Date(2025, 5, 11, 18, 4, 22).toISOString());
  });

  it('falls back through DateTimeDigitized and DateTime', () => {
    expect(
      resolveCapturedAt(
        { uri: 'file:///a.jpg', exif: { DateTimeDigitized: '2024:01:02 03:04:05' } },
        FALLBACK,
      ),
    ).toBe(new Date(2024, 0, 2, 3, 4, 5).toISOString());

    expect(
      resolveCapturedAt({ uri: 'file:///a.jpg', exif: { DateTime: '2024:01:02 03:04:05' } }, FALLBACK),
    ).toBe(new Date(2024, 0, 2, 3, 4, 5).toISOString());
  });

  it('uses the asset creation time when the photo carries no EXIF date', () => {
    const iso = resolveCapturedAt(
      { uri: 'file:///a.jpg', creationTime: Date.parse('2026-09-18T09:00:00.000Z'), exif: {} },
      FALLBACK,
    );

    expect(iso).toBe('2026-09-18T09:00:00.000Z');
  });

  it('falls back to the clock when the photo carries no usable timestamp', () => {
    expect(resolveCapturedAt({ uri: 'file:///a.jpg' }, FALLBACK)).toBe(FALLBACK.toISOString());
    expect(resolveCapturedAt({ uri: 'file:///a.jpg', exif: null, creationTime: null }, FALLBACK)).toBe(
      FALLBACK.toISOString(),
    );
  });

  it('discards malformed or impossible EXIF rather than guessing at it', () => {
    const cases = [
      '',
      'yesterday',
      '2025-06-11 18:04:22',
      '2025:13:11 18:04:22', // month 13
      '0000:00:00 00:00:00', // the blank value some cameras write
    ];

    for (const value of cases) {
      expect(resolveCapturedAt({ uri: 'file:///a.jpg', exif: { DateTimeOriginal: value } }, FALLBACK)).toBe(
        FALLBACK.toISOString(),
      );
    }
  });

  it('ignores a non-finite creation time', () => {
    expect(
      resolveCapturedAt({ uri: 'file:///a.jpg', creationTime: Number.NaN }, FALLBACK),
    ).toBe(FALLBACK.toISOString());
  });
});
