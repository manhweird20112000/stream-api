import { ConflictException } from '@nestjs/common';
import {
  StreamKey,
  StreamKeyStatus,
} from '../../domain/entities/stream-key';
import type { StreamKeyRepository } from '../../domain/repositories/stream-key.repository';
import { CreateStreamKeyUseCase } from './create-stream-key.use-case';

describe('CreateStreamKeyUseCase', () => {
  it('creates a new stream key without returning the plain key', async () => {
    const saved: StreamKey[] = [];
    const repository: StreamKeyRepository = {
      save: jest.fn(async (streamKey) => {
        saved.push(streamKey);
        return streamKey;
      }),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(async () => null),
      findActiveByKeyHash: jest.fn(),
    };
    const useCase = new CreateStreamKeyUseCase(repository);

    const result = await useCase.execute({ ownerUserId: 'user-1' });

    expect(result).toEqual({ success: true });
    expect(saved).toHaveLength(1);
    expect(saved[0].toPrimitives()).toMatchObject({
      ownerUserId: 'user-1',
      keyPrefix: expect.stringMatching(/^sk_[A-Za-z0-9_-]{9}$/),
      keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      status: StreamKeyStatus.ACTIVE,
      rotatedAt: null,
      revokedAt: null,
    });
  });

  it('rejects generate when an active key already exists', async () => {
    const existingKey = StreamKey.rehydrate({
      id: 'key-1',
      ownerUserId: 'user-1',
      keyHash: 'old-hash',
      keyPrefix: 'old-prefix',
      status: StreamKeyStatus.ACTIVE,
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
    });
    const repository: StreamKeyRepository = {
      save: jest.fn(async (streamKey) => streamKey),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(async () => existingKey),
      findActiveByKeyHash: jest.fn(),
    };
    const useCase = new CreateStreamKeyUseCase(repository);

    await expect(useCase.execute({ ownerUserId: 'user-1' })).rejects.toThrow(
      ConflictException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('revokes the active key and creates a new key without returning the plain key when refresh is requested', async () => {
    const existingKey = StreamKey.rehydrate({
      id: 'key-1',
      ownerUserId: 'user-1',
      keyHash: 'old-hash',
      keyPrefix: 'old-prefix',
      status: StreamKeyStatus.ACTIVE,
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
    });
    const saved: StreamKey[] = [];
    const repository: StreamKeyRepository = {
      save: jest.fn(async (streamKey) => {
        saved.push(streamKey);
        return streamKey;
      }),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(async () => existingKey),
      findActiveByKeyHash: jest.fn(),
    };
    const useCase = new CreateStreamKeyUseCase(repository);

    const result = await useCase.execute({
      ownerUserId: 'user-1',
      refresh: true,
    });

    expect(result).toEqual({ success: true });
    expect(saved).toHaveLength(2);
    expect(saved[1].toPrimitives()).toMatchObject({
      ownerUserId: 'user-1',
      keyPrefix: expect.stringMatching(/^sk_[A-Za-z0-9_-]{9}$/),
      keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      status: StreamKeyStatus.ACTIVE,
      rotatedAt: null,
      revokedAt: null,
    });
    expect(existingKey.status).toBe(StreamKeyStatus.INACTIVE);
    expect(existingKey.revokedAt).toBeInstanceOf(Date);
    expect(saved[0]).toBe(existingKey);
  });
});
