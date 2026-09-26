export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface UserScopedInput {
  userId: string;
}

export interface LogoutInput {
  refreshToken: string;
}

export interface UpdateMeInput {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface GoogleCallbackInput {
  code: string;
}
