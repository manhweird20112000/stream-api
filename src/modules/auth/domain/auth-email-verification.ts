import { SavedAuthUser } from './auth-user';

export interface EmailRegistrationDraftInput {
  email: string;
  passwordHash: string;
  codeHash: string;
  expiresAt: Date;
  rawCode: string;
}

export interface VerifyEmailInput {
  email: string;
  codeHash: string;
}

export interface EmailRegistrationDraftResult {
  user: SavedAuthUser;
}

export abstract class EmailRegistrationRepository {
  abstract saveDraft(
    input: EmailRegistrationDraftInput,
  ): Promise<EmailRegistrationDraftResult>;

  abstract verifyEmail(input: VerifyEmailInput): Promise<SavedAuthUser | null>;
}

