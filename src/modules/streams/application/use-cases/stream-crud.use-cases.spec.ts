import { NotFoundException } from '@nestjs/common';
import {
  Stream,
  StreamStatus,
  StreamVisibility,
} from '../../domain/entities/stream';
import type { StreamRepository } from '../../domain/repositories/stream.repository';
import {
  DeleteStreamUseCase,
  GetStreamUseCase,
  ListStreamsUseCase,
  UpdateStreamUseCase,
} from './stream-crud.use-cases';

function makeStream(ownerUserId = 'user-1'): Stream {
  return Stream.rehydrate({
    id: 'stream-1',
    ownerUserId,
    title: 'Launch stream',
    description: 'Demo',
    thumbnailUrl: null,
    visibility: StreamVisibility.PRIVATE,
    status: StreamStatus.CREATED,
    playbackId: null,
    streamKeyId: null,
    createdAt: new Date('2026-09-26T00:00:00.000Z'),
    updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    startedAt: null,
    endedAt: null,
  });
}

describe('stream CRUD use cases', () => {
  it('lists streams owned by the user', async () => {
    const stream = makeStream();
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByOwnerUserId: jest.fn(async () => [stream]),
      delete: jest.fn(),
    };

    await expect(
      new ListStreamsUseCase(repository).execute({ ownerUserId: 'user-1' }),
    ).resolves.toEqual([stream]);
    expect(repository.findByOwnerUserId).toHaveBeenCalledWith('user-1');
  });

  it('returns an owned stream by id', async () => {
    const stream = makeStream();
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      delete: jest.fn(),
    };

    await expect(
      new GetStreamUseCase(repository).execute({
        ownerUserId: 'user-1',
        streamId: 'stream-1',
      }),
    ).resolves.toBe(stream);
  });

  it('rejects streams owned by another user', async () => {
    const stream = makeStream('user-2');
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      delete: jest.fn(),
    };

    await expect(
      new GetStreamUseCase(repository).execute({
        ownerUserId: 'user-1',
        streamId: 'stream-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates owned stream metadata', async () => {
    const stream = makeStream();
    const repository: StreamRepository = {
      save: jest.fn(async (saved) => saved),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      delete: jest.fn(),
    };

    const result = await new UpdateStreamUseCase(repository).execute({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
      title: 'Updated stream',
      description: null,
      visibility: StreamVisibility.PUBLIC,
    });

    expect(result.toPrimitives()).toMatchObject({
      title: 'Updated stream',
      description: null,
      visibility: StreamVisibility.PUBLIC,
    });
    expect(repository.save).toHaveBeenCalledWith(result);
  });

  it('deletes an owned stream', async () => {
    const stream = makeStream();
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      delete: jest.fn(async () => undefined),
    };

    await new DeleteStreamUseCase(repository).execute({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });

    expect(repository.delete).toHaveBeenCalledWith('stream-1');
  });
});
