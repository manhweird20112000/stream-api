import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports liveness', () => {
    const controller = new HealthController({ isReady: () => false } as never);

    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports readiness when Kafka is connected', () => {
    const controller = new HealthController({ isReady: () => true } as never);

    expect(controller.ready()).toEqual({
      status: 'ok',
      dependencies: { kafka: 'ok' },
    });
  });

  it('rejects readiness when Kafka is not connected', () => {
    const controller = new HealthController({ isReady: () => false } as never);

    expect(() => controller.ready()).toThrow(ServiceUnavailableException);
  });
});
