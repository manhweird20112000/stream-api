import { BadRequestException } from '@nestjs/common';
import { DebugController } from './debug.controller';

describe('DebugController', () => {
  it('blocks for the default duration', () => {
    const controller = new DebugController();
    const now = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(2000);

    expect(controller.blockEventLoop()).toEqual({
      requestedDurationMs: 1000,
      elapsedDurationMs: 1000,
    });

    now.mockRestore();
  });

  it('blocks for a valid requested duration', () => {
    const controller = new DebugController();
    const now = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1250)
      .mockReturnValueOnce(1250);

    expect(controller.blockEventLoop(250)).toEqual({
      requestedDurationMs: 250,
      elapsedDurationMs: 250,
    });

    now.mockRestore();
  });

  it.each([0, 10001])('rejects duration %i', (durationMs) => {
    const controller = new DebugController();

    expect(() => controller.blockEventLoop(durationMs)).toThrow(
      BadRequestException,
    );
  });
});
