import { NotFoundException } from '@nestjs/common';
import { assertPrivateOwner, storedFilePath } from './file-access';

describe('private file access', () => {
  const file = { ownerId: 'user-a', visibility: 'private' as const };

  it('allows the owner', () => {
    expect(() => assertPrivateOwner(file, 'user-a')).not.toThrow();
  });

  it("hides another user's file", () => {
    expect(() => assertPrivateOwner(file, 'user-b')).toThrow(NotFoundException);
  });

  it('does not serve public files through the private endpoint', () => {
    expect(() =>
      assertPrivateOwner({ ...file, visibility: 'public' }, 'user-a'),
    ).toThrow(NotFoundException);
  });

  it('rejects a filename that can escape storage', () => {
    expect(() =>
      storedFilePath('storage', 'private', '../other/secret.webp'),
    ).toThrow(NotFoundException);
  });
});
