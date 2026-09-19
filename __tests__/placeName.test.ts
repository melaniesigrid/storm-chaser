import { formatPlace } from '@/features/location/usePlaceName';

/**
 * Reverse geocoding fills in whatever the provider happens to know, which in
 * open country is often not a city and sometimes not much at all. These are the
 * shapes that actually come back, and the header has to survive all of them.
 */
describe('formatPlace', () => {
  it('names a city and its country', () => {
    expect(formatPlace({ city: 'Toronto', country: 'Canada' } as never)).toBe('Toronto, Canada');
  });

  it('falls through to the next locality the provider did fill in', () => {
    expect(formatPlace({ city: null, subregion: 'Kent County', country: 'Canada' } as never)).toBe(
      'Kent County, Canada',
    );
    expect(formatPlace({ city: null, subregion: null, region: 'Kansas', country: 'United States' } as never)).toBe(
      'Kansas, United States',
    );
  });

  it('keeps whichever half it has', () => {
    expect(formatPlace({ city: 'Toronto', country: null } as never)).toBe('Toronto');
    expect(formatPlace({ city: null, country: 'Canada' } as never)).toBe('Canada');
  });

  it('gives up rather than printing an empty label', () => {
    expect(formatPlace({} as never)).toBeNull();
  });
});
