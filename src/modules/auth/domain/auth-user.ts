export enum UserStatus {
  PendingVerification = 'pending_verification',
  Active = 'active',
  Disabled = 'disabled',
}

export interface AuthUser {
  id?: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  status: UserStatus;
}

export interface SavedAuthUser extends AuthUser {
  id: string;
}
