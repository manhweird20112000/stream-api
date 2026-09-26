import { SecretService } from './service';

describe('SecretService', () => {
  const names = [
    'APP_NAME',
    'APP_PORT',
    'KAFKA_BROKERS',
    'KAFKA_CLIENT_ID',
    'KAFKA_GROUP_ID',
    'JWT_SECRET',
    'TOKEN_EXPIRATION',
    'REFRESH_TOKEN_EXPIRATION_DAYS',
    'AUTH_SUCCESS_REDIRECT_URL',
    'AUTH_FAILURE_REDIRECT_URL',
  ] as const;
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );

  beforeEach(() => {
    Object.assign(process.env, {
      APP_NAME: 'api-gateway',
      APP_PORT: '3000',
      KAFKA_BROKERS: 'localhost:9092, kafka:9092 ',
      KAFKA_CLIENT_ID: 'api-gateway',
      KAFKA_GROUP_ID: 'api-gateway',
      JWT_SECRET: 'test-secret',
      TOKEN_EXPIRATION: '1d',
      REFRESH_TOKEN_EXPIRATION_DAYS: '30',
      AUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/success',
      AUTH_FAILURE_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/failure',
    });
  });

  afterAll(() => {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });

  it('parses the HTTP port as a number', () => {
    expect(new SecretService().APP_PORT).toBe(3000);
  });

  it('parses Kafka brokers into a trimmed list', () => {
    expect(new SecretService().KAFKA_BROKERS).toEqual([
      'localhost:9092',
      'kafka:9092',
    ]);
  });

  it('parses refresh token expiration days as a number', () => {
    expect(new SecretService().REFRESH_TOKEN_EXPIRATION_DAYS).toBe(30);
  });

  it('rejects a missing JWT secret', () => {
    process.env.JWT_SECRET = '';
    expect(() => new SecretService()).toThrow('JWT_SECRET is required');
  });

  it('rejects an invalid port', () => {
    process.env.APP_PORT = 'abc';
    expect(() => new SecretService()).toThrow('APP_PORT must be a valid port');
  });

  it('rejects an empty Kafka broker list', () => {
    process.env.KAFKA_BROKERS = ' , ';
    expect(() => new SecretService()).toThrow('KAFKA_BROKERS is required');
  });
});
