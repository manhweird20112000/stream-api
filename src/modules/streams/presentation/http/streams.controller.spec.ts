import { StreamsController } from './streams.controller';

describe('StreamsController', () => {
  it('passes the authenticated user to the use case', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue({
        streamId: 'stream-1',
        status: 'created',
      }),
    };
    const controller = new StreamsController(useCase as never);

    await expect(
      controller.create(
        { title: 'Launch stream', description: 'Demo' },
        { user: { sub: 'user-1' } } as never,
      ),
    ).resolves.toEqual({ streamId: 'stream-1', status: 'created' });

    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
    });
  });
});
