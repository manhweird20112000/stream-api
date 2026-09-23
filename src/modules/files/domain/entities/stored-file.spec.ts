import { StoredFile } from './stored-file';

jest.mock('uuid', () => ({
  v7: () => '0196d7fa-9752-7048-baf4-de9c43877a67',
}));

describe('StoredFile', () => {
  it('creates metadata with a generated UUID', () => {
    const file = StoredFile.create({
      ownerId: 'user-a',
      visibility: 'private',
      filename: '0196d7fa-9752-7048-baf4-de9c43877a67.webp',
    });

    expect(file.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(file.ownerId).toBe('user-a');
  });
});
