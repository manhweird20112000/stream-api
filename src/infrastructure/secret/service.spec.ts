import { SecretService } from './service';

describe('SecretService', () => {
  const names = [
    'APP_NAME',
    'APP_PORT',
    'KAFKA_BROKERS',
    'KAFKA_CLIENT_ID',
    'KAFKA_GROUP_ID',
    'DB_USER',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_SYNC',
    'JWT_SECRET',
    'TOKEN_EXPIRATION',
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
      DB_USER: 'postgres',
      DB_PASSWORD: 'test-password',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'test',
      DB_SYNC: 'false',
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
