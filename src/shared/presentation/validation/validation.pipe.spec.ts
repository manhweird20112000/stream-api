import { ArgumentMetadata } from '@nestjs/common';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidationPipe } from './validation.pipe';

class QueryDto {
  @Type(() => Number)
  @IsInt()
  page!: number;
}

describe('ValidationPipe', () => {
  it('returns the transformed value used during validation', async () => {
    const metadata: ArgumentMetadata = { type: 'query', metatype: QueryDto };
    const result = await new ValidationPipe().transform(
      { page: '2' },
      metadata,
    );

    expect(result).toBeInstanceOf(QueryDto);
    expect(result.page).toBe(2);
  });

  it('rejects properties outside the DTO', async () => {
    const metadata: ArgumentMetadata = { type: 'query', metatype: QueryDto };

    await expect(
      new ValidationPipe().transform(
        { page: '2', unexpected: 'value' },
        metadata,
      ),
    ).rejects.toThrow();
  });
});
