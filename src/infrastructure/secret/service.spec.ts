import { SecretService } from './service';

describe('SecretService', () => {
  const names = [
    'APP_NAME',
    'APP_PORT',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'KAFKA_BROKERS',
    'KAFKA_CLIENT_ID',
    'KAFKA_GROUP_ID',
    'JWT_SECRET',
    'TOKEN_EXPIRATION',
  ] as const;
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );

  beforeEach(() => {
    Object.assign(process.env, {
      APP_NAME: 'auth-service',
      APP_PORT: '3000',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '5432',
      DATABASE_USER: 'auth_service',
      DATABASE_PASSWORD: 'auth_service_password',
      DATABASE_NAME: 'auth_service',
      KAFKA_BROKERS: 'localhost:9092, kafka:9092 ',
      KAFKA_CLIENT_ID: 'auth-service',
      KAFKA_GROUP_ID: 'auth-service',
      JWT_SECRET: 'test-secret',
      TOKEN_EXPIRATION: '1d',
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

  it('parses the database port as a number', () => {
    expect(new SecretService().DATABASE_PORT).toBe(5432);
  });

  it('parses Kafka brokers into a trimmed list', () => {
    expect(new SecretService().KAFKA_BROKERS).toEqual([
      'localhost:9092',
      'kafka:9092',
    ]);
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
