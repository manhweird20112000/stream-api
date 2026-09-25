import { AuthUser, SavedAuthUser } from '../auth-user';

export abstract class AuthUserRepository {
  abstract findById(id: string): Promise<SavedAuthUser | null>;
  abstract findByEmail(email: string): Promise<SavedAuthUser | null>;
  abstract save(user: AuthUser): Promise<SavedAuthUser>;
}
