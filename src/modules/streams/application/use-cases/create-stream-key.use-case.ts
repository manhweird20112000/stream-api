import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { StreamKey } from '../../domain/entities/stream-key';
import {
  STREAM_KEY_REPOSITORY,
  type StreamKeyRepository,
} from '../../domain/repositories/stream-key.repository';

export interface CreateStreamKeyInput {
  ownerUserId: string;
  refresh?: boolean;
}

export interface CreateStreamKeyOutput {
  success: true;
}

@Injectable()
export class CreateStreamKeyUseCase {
  constructor(
    @Inject(STREAM_KEY_REPOSITORY)
    private readonly streamKeyRepository: StreamKeyRepository,
  ) {}

  async execute(input: CreateStreamKeyInput): Promise<CreateStreamKeyOutput> {
    const activeKey = await this.streamKeyRepository.findActiveByOwnerUserId(
      input.ownerUserId,
    );

    if (activeKey) {
      if (!input.refresh) {
        throw new ConflictException('Active stream key already exists');
      }

      activeKey.revoke();
      await this.streamKeyRepository.save(activeKey);
    }

    const plainKey = `sk_${randomBytes(32).toString('base64url')}`;
    const streamKey = StreamKey.create({
      ownerUserId: input.ownerUserId,
      keyHash: createHash('sha256').update(plainKey).digest('hex'),
      keyPrefix: plainKey.slice(0, 12),
    });

    await this.streamKeyRepository.save(streamKey);

    return { success: true };
  }
}
