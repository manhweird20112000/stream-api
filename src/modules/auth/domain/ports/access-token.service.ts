import { SavedAuthUser } from '../auth-user';

export abstract class AccessTokenService {
  abstract sign(user: SavedAuthUser): Promise<string>;
}

