export const FILE_VISIBILITIES = ['public', 'private'] as const;

export type FileVisibility = (typeof FILE_VISIBILITIES)[number];

export function parseFileVisibility(value: string): FileVisibility {
  if (value !== 'public' && value !== 'private') {
    throw new Error('Invalid file visibility');
  }
  return value;
}
