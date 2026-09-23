import { parseFileVisibility } from './file-visibility';

describe('parseFileVisibility', () => {
  it.each(['public', 'private'] as const)('accepts %s', (value) => {
    expect(parseFileVisibility(value)).toBe(value);
  });

  it('rejects unsupported visibility', () => {
    expect(() => parseFileVisibility('internal')).toThrow(
      'Invalid file visibility',
    );
  });
});
