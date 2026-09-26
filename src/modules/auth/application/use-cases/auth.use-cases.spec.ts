import { InvalidCredentialsException } from '@/shared/exceptions';
import {
  EmailRegistrationDraftInput,
  EmailRegistrationDraftResult,
  EmailRegistrationRepository,
  VerifyEmailInput,
} from '../../domain/auth-email-verification';
import { AuthIdentity } from '../../domain/auth-identity';
import { AuthProvider } from '../../domain/auth-provider';
import {
  AuthRefreshToken,
  SavedAuthRefreshToken,
} from '../../domain/auth-refresh-token';
import { AuthUser, SavedAuthUser, UserStatus } from '../../domain/auth-user';
import { AccessTokenService } from '../../domain/ports/access-token.service';
import { AuthIdentityRepository } from '../../domain/ports/auth-identity.repository';
import { AuthRefreshTokenRepository } from '../../domain/ports/auth-refresh-token.repository';
import { AuthUserRepository } from '../../domain/ports/auth-user.repository';
import { PasswordHasher } from '../../domain/ports/password-hasher';
import { RefreshTokenService } from '../../domain/ports/refresh-token.service';
import { VerificationCodeService } from '../../domain/ports/verification-code.service';
import { AuthAccountService } from '../services/auth-account.service';
import { SessionIssuerService } from '../services/session-issuer.service';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { LoginWithPasswordUseCase } from './login-with-password.use-case';
import { LoginWithProviderUseCase } from './login-with-provider.use-case';
import { LogoutUseCase } from './logout.use-case';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import { RegisterWithPasswordUseCase } from './register-with-password.use-case';
import { UpdateCurrentUserUseCase } from './update-current-user.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';

class InMemoryUserRepository implements AuthUserRepository {
  private nextId = 1;
  readonly records: SavedAuthUser[] = [];

  async findById(id: string): Promise<SavedAuthUser | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<SavedAuthUser | null> {
    return this.records.find((record) => record.email === email) ?? null;
  }

  async save(user: AuthUser): Promise<SavedAuthUser> {
    const saved = { ...user, id: user.id ?? `user-${this.nextId++}` };
    const index = this.records.findIndex((record) => record.id === saved.id);
    if (index >= 0) this.records[index] = saved;
    else this.records.push(saved);
    return saved;
  }
}

class InMemoryIdentityRepository implements AuthIdentityRepository {
  private nextId = 1;
  readonly records: AuthIdentity[] = [];

  async findByProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthIdentity | null> {
    return (
      this.records.find(
        (record) =>
          record.provider === provider &&
          record.providerUserId === providerUserId,
      ) ?? null
    );
  }

  async findByUserAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<AuthIdentity | null> {
    return (
      this.records.find(
        (record) => record.userId === userId && record.provider === provider,
      ) ?? null
    );
  }

  async save(identity: AuthIdentity): Promise<AuthIdentity> {
    const saved = { ...identity, id: identity.id ?? `identity-${this.nextId++}` };
    const index = this.records.findIndex((record) => record.id === saved.id);
    if (index >= 0) this.records[index] = saved;
    else this.records.push(saved);
    return saved;
  }
}

class InMemoryEmailRegistrationRepository
  implements EmailRegistrationRepository
{
  readonly outbox: Array<Record<string, unknown>> = [];
  private latestCodeHashByEmail = new Map<string, string>();

  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly identities: InMemoryIdentityRepository,
  ) {}

  async saveDraft(
    input: EmailRegistrationDraftInput,
  ): Promise<EmailRegistrationDraftResult> {
    let user = await this.users.findByEmail(input.email);
    if (user?.emailVerified || user?.status === UserStatus.Active) {
      throw new Error('Email is already registered');
    }

    user = await this.users.save({
      ...user,
      email: input.email,
      emailVerified: false,
      displayName: null,
      avatarUrl: user?.avatarUrl ?? null,
      passwordHash: input.passwordHash,
      status: UserStatus.PendingVerification,
    });
    await this.identities.save({
      id: (
        await this.identities.findByUserAndProvider(user.id, AuthProvider.Email)
      )?.id,
      userId: user.id,
      user,
      provider: AuthProvider.Email,
      providerUserId: input.email,
      providerEmail: input.email,
      providerEmailVerified: false,
      metadata: null,
    });
    this.latestCodeHashByEmail.set(input.email, input.codeHash);
    this.outbox.push({
      type: 'auth.email_verification_requested',
      payload: {
        email: input.email,
        code: input.rawCode,
        expiresAt: input.expiresAt.toISOString(),
      },
    });
    return { user };
  }

  async verifyEmail(input: VerifyEmailInput): Promise<SavedAuthUser | null> {
    if (this.latestCodeHashByEmail.get(input.email) !== input.codeHash) {
      return null;
    }

    const user = await this.users.findByEmail(input.email);
    if (!user) return null;

    const verified = await this.users.save({
      ...user,
      emailVerified: true,
      status: UserStatus.Active,
    });
    const identity = await this.identities.findByUserAndProvider(
      verified.id,
      AuthProvider.Email,
    );
    if (identity) {
      await this.identities.save({ ...identity, providerEmailVerified: true });
    }
    return verified;
  }
}

class InMemoryRefreshTokenRepository implements AuthRefreshTokenRepository {
  private nextId = 1;
  readonly records: SavedAuthRefreshToken[] = [];

  async findByHash(tokenHash: string): Promise<SavedAuthRefreshToken | null> {
    return this.records.find((record) => record.tokenHash === tokenHash) ?? null;
  }

  async save(token: AuthRefreshToken): Promise<SavedAuthRefreshToken> {
    const saved = { ...token, id: token.id ?? `refresh-${this.nextId++}` };
    const index = this.records.findIndex((record) => record.id === saved.id);
    if (index >= 0) this.records[index] = saved;
    else this.records.push(saved);
    return saved;
  }
}

class FakePasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  compare(password: string, hashedPassword: string): Promise<boolean> {
    return Promise.resolve(hashedPassword === `hashed:${password}`);
  }
}

class FakeAccessTokenService implements AccessTokenService {
  sign(user: SavedAuthUser): Promise<string> {
    return Promise.resolve(`token-for-${user.id}`);
  }
}

class FakeRefreshTokenService implements RefreshTokenService {
  private nextValue = 1;

  generate(): string {
    return `refresh-token-${this.nextValue++}`;
  }

  hash(refreshToken: string): string {
    return `hash:${refreshToken}`;
  }

  expiresAt(): Date {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
}

class FakeVerificationCodeService implements VerificationCodeService {
  generate(): string {
    return '123456';
  }

  hash(code: string): string {
    return `code-hash:${code}`;
  }

  expiresAt(): Date {
    return new Date('2030-01-01T00:00:00.000Z');
  }
}

describe('auth use cases', () => {
  let users: InMemoryUserRepository;
  let identities: InMemoryIdentityRepository;
  let registrations: InMemoryEmailRegistrationRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let register: RegisterWithPasswordUseCase;
  let verifyEmail: VerifyEmailUseCase;
  let login: LoginWithPasswordUseCase;
  let providerLogin: LoginWithProviderUseCase;
  let refresh: RefreshSessionUseCase;
  let logout: LogoutUseCase;
  let me: GetCurrentUserUseCase;
  let updateMe: UpdateCurrentUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    identities = new InMemoryIdentityRepository();
    registrations = new InMemoryEmailRegistrationRepository(users, identities);
    refreshTokens = new InMemoryRefreshTokenRepository();

    const accounts = new AuthAccountService(users, identities);
    const sessions = new SessionIssuerService(
      new FakeAccessTokenService(),
      new FakeRefreshTokenService(),
      refreshTokens,
    );
    const passwords = new FakePasswordHasher();
    const verificationCodes = new FakeVerificationCodeService();

    register = new RegisterWithPasswordUseCase(
      registrations,
      passwords,
      verificationCodes,
    );
    verifyEmail = new VerifyEmailUseCase(
      registrations,
      verificationCodes,
      sessions,
    );
    login = new LoginWithPasswordUseCase(accounts, passwords, sessions);
    providerLogin = new LoginWithProviderUseCase(accounts, sessions);
    refresh = new RefreshSessionUseCase(refreshTokens, sessions);
    logout = new LogoutUseCase(refreshTokens, sessions);
    me = new GetCurrentUserUseCase(users);
    updateMe = new UpdateCurrentUserUseCase(users);
  });

  async function registerAndVerify() {
    await register.execute({ email: 'owner@example.com', password: 'secret123' });
    return verifyEmail.execute({ email: 'owner@example.com', code: '123456' });
  }

  it('creates a pending email registration draft and outbox event', async () => {
    await expect(
      register.execute({ email: 'Owner@Example.com', password: 'secret123' }),
    ).resolves.toEqual({
      email: 'owner@example.com',
      verificationRequired: true,
    });

    expect(users.records[0]).toEqual(
      expect.objectContaining({
        email: 'owner@example.com',
        emailVerified: false,
        displayName: null,
        passwordHash: 'hashed:secret123',
        status: UserStatus.PendingVerification,
      }),
    );
    expect(identities.records[0]).toEqual(
      expect.objectContaining({
        provider: AuthProvider.Email,
        providerUserId: 'owner@example.com',
        providerEmailVerified: false,
      }),
    );
    expect(registrations.outbox).toEqual([
      {
        type: 'auth.email_verification_requested',
        payload: {
          email: 'owner@example.com',
          code: '123456',
          expiresAt: '2030-01-01T00:00:00.000Z',
        },
      },
    ]);
  });

  it('allows pending registrations to be overwritten before verification', async () => {
    await register.execute({ email: 'owner@example.com', password: 'secret123' });
    await register.execute({
      email: 'OWNER@example.com',
      password: 'newsecret123',
    });

    expect(users.records).toHaveLength(1);
    expect(users.records[0].passwordHash).toBe('hashed:newsecret123');
    expect(registrations.outbox).toHaveLength(2);
  });

  it('rejects password login before email verification', async () => {
    await register.execute({ email: 'owner@example.com', password: 'secret123' });

    await expect(
      login.execute({ email: 'owner@example.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('verifies email and issues a session', async () => {
    const result = await registerAndVerify();

    expect(result).toEqual({
      accessToken: 'token-for-user-1',
      refreshToken: 'refresh-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });
    expect(users.records[0].status).toBe(UserStatus.Active);
    expect(users.records[0].emailVerified).toBe(true);
    expect(identities.records[0].providerEmailVerified).toBe(true);
  });

  it('rejects wrong passwords after verification', async () => {
    await registerAndVerify();

    await expect(
      login.execute({ email: 'owner@example.com', password: 'wrong123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('activates a pending password user when Google login proves the same email', async () => {
    await register.execute({ email: 'owner@example.com', password: 'secret123' });

    const googleResult = await providerLogin.execute({
      provider: AuthProvider.Google,
      providerUserId: 'google-sub-1',
      email: 'OWNER@example.com',
      emailVerified: true,
      displayName: 'Google Owner',
      avatarUrl: 'https://example.com/avatar.png',
      metadata: { locale: 'vi' },
    });

    expect(googleResult.user.id).toBe('user-1');
    expect(users.records).toHaveLength(1);
    expect(users.records[0].status).toBe(UserStatus.Active);
    expect(users.records[0].emailVerified).toBe(true);
  });

  it('rejects email registration for an already verified Google user', async () => {
    const googleResult = await providerLogin.execute({
      provider: AuthProvider.Google,
      providerUserId: 'google-sub-2',
      email: 'viewer@example.com',
      emailVerified: true,
    });

    await expect(
      register.execute({ email: 'VIEWER@example.com', password: 'secret123' }),
    ).rejects.toThrow('Email is already registered');
    expect(users.records[0].id).toBe(googleResult.user.id);
  });

  it('rotates refresh tokens and rejects reuse of a revoked token', async () => {
    const initial = await registerAndVerify();
    const refreshed = await refresh.execute({
      refreshToken: initial.refreshToken,
    });

    expect(refreshed.refreshToken).toBe('refresh-token-2');
    expect(refreshTokens.records).toHaveLength(2);
    expect(refreshTokens.records[0].revokedAt).toBeInstanceOf(Date);
    expect(refreshTokens.records[0].replacedByTokenId).toBe('refresh-2');
    await expect(
      refresh.execute({ refreshToken: initial.refreshToken }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('revokes a refresh token on logout', async () => {
    const initial = await registerAndVerify();

    await logout.execute({ refreshToken: initial.refreshToken });

    expect(refreshTokens.records[0].revokedAt).toBeInstanceOf(Date);
    await expect(
      refresh.execute({ refreshToken: initial.refreshToken }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('returns the current user profile by id', async () => {
    const initial = await registerAndVerify();

    await expect(me.execute(initial.user.id)).resolves.toEqual({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: null,
      avatarUrl: null,
    });
  });

  it('updates the current user profile', async () => {
    const initial = await registerAndVerify();

    await expect(
      updateMe.execute(initial.user.id, {
        displayName: '  Owner Name  ',
        avatarUrl: 'https://example.com/avatar.png',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner Name',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(users.records[0]).toEqual(
      expect.objectContaining({
        displayName: 'Owner Name',
        avatarUrl: 'https://example.com/avatar.png',
      }),
    );
  });
});
