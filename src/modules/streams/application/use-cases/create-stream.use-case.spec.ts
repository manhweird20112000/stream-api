import { STREAM_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { CreateStreamUseCase } from './create-stream.use-case';

describe('CreateStreamUseCase', () => {
  it('publishes a stream.create command envelope', async () => {
    const kafka = {
      request: jest.fn().mockResolvedValue({
        streamId: 'stream-1',
        status: 'created',
      }),
    };
    const useCase = new CreateStreamUseCase(kafka as never);

    await expect(
      useCase.execute({
        userId: 'user-1',
        title: 'Launch stream',
        description: 'Demo',
      }),
    ).resolves.toEqual({ streamId: 'stream-1', status: 'created' });

    expect(kafka.request).toHaveBeenCalledWith(
      STREAM_TOPICS.commands,
      expect.objectContaining({
        requestId: expect.any(String),
        userId: 'user-1',
        type: 'stream.create',
        payload: {
          title: 'Launch stream',
          description: 'Demo',
        },
      }),
    );
  });
});
