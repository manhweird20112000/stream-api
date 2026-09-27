import { createHash } from 'node:crypto';
import {
  StreamKey,
  StreamKeyStatus,
} from '../../domain/entities/stream-key';
import type { StreamKeyRepository } from '../../domain/repositories/stream-key.repository';
import { VerifyStreamKeyUseCase } from './verify-stream-key.use-case';

describe('VerifyStreamKeyUseCase', () => {
  it('returns owner and key identity when the key hash is active', async () => {
    const plainKey = 'sk_valid-stream-key';
    const keyHash = createHash('sha256').update(plainKey).digest('hex');
    const activeKey = StreamKey.rehydrate({
      id: 'key-1',
      ownerUserId: 'user-1',
      keyHash,
      keyPrefix: plainKey.slice(0, 12),
      status: StreamKeyStatus.ACTIVE,
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
    });
    const repository: StreamKeyRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(),
      findActiveByKeyHash: jest.fn(async () => activeKey),
    };
    const useCase = new VerifyStreamKeyUseCase(repository);

    await expect(useCase.execute({ streamKey: plainKey })).resolves.toEqual({
      valid: true,
      ownerUserId: 'user-1',
      streamKeyId: 'key-1',
    });
    expect(repository.findActiveByKeyHash).toHaveBeenCalledWith(keyHash);
  });

  it('returns invalid without identities when no active key matches', async () => {
    const repository: StreamKeyRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(),
      findActiveByKeyHash: jest.fn(async () => null),
    };
    const useCase = new VerifyStreamKeyUseCase(repository);

    await expect(
      useCase.execute({ streamKey: 'sk_invalid-stream-key' }),
    ).resolves.toEqual({ valid: false });
  });
});
