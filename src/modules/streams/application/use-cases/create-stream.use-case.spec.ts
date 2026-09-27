import { StreamVisibility } from '../../domain/entities/stream';
import type { StreamRepository } from '../../domain/repositories/stream.repository';
import { CreateStreamUseCase } from './create-stream.use-case';

describe('CreateStreamUseCase', () => {
  it('creates a stream through the repository', async () => {
    const repository: StreamRepository = {
      save: jest.fn(async (stream) => stream),
      findById: jest.fn(),
      findByOwnerUserId: jest.fn(),
      delete: jest.fn(),
    };
    const useCase = new CreateStreamUseCase(repository);

    const result = await useCase.execute({
      userId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
      visibility: StreamVisibility.PUBLIC,
    });

    expect(result.toPrimitives()).toEqual({
      id: expect.any(String),
      ownerUserId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
      visibility: 'PUBLIC',
      status: 'CREATED',
      playbackId: null,
      streamKeyId: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      startedAt: null,
      endedAt: null,
    });
    expect(repository.save).toHaveBeenCalledWith(result);
  });
});
