import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports liveness', () => {
    const controller = new HealthController();

    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports readiness without Kafka', () => {
    const controller = new HealthController();

    expect(controller.ready()).toEqual({ status: 'ok' });
  });
});
