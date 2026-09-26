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
    'DATABASE_MIGRATIONS_RUN',
    'JWT_SECRET',
    'TOKEN_EXPIRATION',
    'EMAIL_DELIVERY_ENABLED',
    'SMTP_HOST',
    'SMTP_PORT',
    'MAIL_FROM',
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
      DATABASE_MIGRATIONS_RUN: 'true',
      JWT_SECRET: 'test-secret',
      TOKEN_EXPIRATION: '1d',
      EMAIL_DELIVERY_ENABLED: 'true',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      MAIL_FROM: 'no-reply@stream.local',
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

  it('parses the database migration flag as a boolean', () => {
    expect(new SecretService().DATABASE_MIGRATIONS_RUN).toBe(true);
  });

  it('parses email delivery config', () => {
    const secrets = new SecretService();

    expect(secrets.EMAIL_DELIVERY_ENABLED).toBe(true);
    expect(secrets.SMTP_HOST).toBe('localhost');
    expect(secrets.SMTP_PORT).toBe(1025);
    expect(secrets.MAIL_FROM).toBe('no-reply@stream.local');
  });

  it('rejects a missing JWT secret', () => {
    process.env.JWT_SECRET = '';
    expect(() => new SecretService()).toThrow('JWT_SECRET is required');
  });

  it('rejects an invalid port', () => {
    process.env.APP_PORT = 'abc';
    expect(() => new SecretService()).toThrow('APP_PORT must be a valid port');
  });

  it('rejects an invalid database migration flag', () => {
    process.env.DATABASE_MIGRATIONS_RUN = 'yes';
    expect(() => new SecretService()).toThrow(
      'DATABASE_MIGRATIONS_RUN must be true or false',
    );
  });

  it('rejects an invalid email delivery flag', () => {
    process.env.EMAIL_DELIVERY_ENABLED = 'yes';
    expect(() => new SecretService()).toThrow(
      'EMAIL_DELIVERY_ENABLED must be true or false',
    );
  });
});
