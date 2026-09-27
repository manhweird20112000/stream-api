import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  STREAM_KEY_REPOSITORY,
  type StreamKeyRepository,
} from '../../domain/repositories/stream-key.repository';

export interface VerifyStreamKeyInput {
  streamKey: string;
}

export type VerifyStreamKeyOutput =
  | {
      valid: true;
      ownerUserId: string;
      streamKeyId: string;
    }
  | {
      valid: false;
    };

@Injectable()
export class VerifyStreamKeyUseCase {
  constructor(
    @Inject(STREAM_KEY_REPOSITORY)
    private readonly streamKeyRepository: StreamKeyRepository,
  ) {}

  async execute(input: VerifyStreamKeyInput): Promise<VerifyStreamKeyOutput> {
    const keyHash = createHash('sha256').update(input.streamKey).digest('hex');
    const streamKey =
      await this.streamKeyRepository.findActiveByKeyHash(keyHash);

    if (!streamKey) {
      return { valid: false };
    }

    return {
      valid: true,
      ownerUserId: streamKey.ownerUserId,
      streamKeyId: streamKey.id,
    };
  }
}
