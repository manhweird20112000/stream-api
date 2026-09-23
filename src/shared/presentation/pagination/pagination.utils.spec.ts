import { BadRequestException } from '@nestjs/common';
import {
  buildCursorPaginatedResponse,
  buildOffsetPaginatedResponse,
  createCursorFromItem,
  decodeCursor,
  encodeCursor,
  getCursorPaginationParams,
  getOffsetPaginationParams,
  normalizeLimit,
} from './pagination.utils';

describe('pagination utils', () => {
  describe('offset pagination', () => {
    it('normalizes page, limit, and offset', () => {
      expect(getOffsetPaginationParams({ page: '3', limit: '10' })).toEqual({
        page: 3,
        limit: 10,
        offset: 20,
      });
    });

    it('caps limit and builds metadata', () => {
      expect(normalizeLimit('200')).toBe(100);
      expect(normalizeLimit('10abc')).toBe(20);

      const response = buildOffsetPaginatedResponse(['a', 'b'], 25, {
        page: '2',
        limit: '10',
      });

      expect(response).toEqual({
        items: ['a', 'b'],
        meta: {
          page: 2,
          limit: 10,
          totalItems: 25,
          totalPages: 3,
          hasPreviousPage: true,
          hasNextPage: true,
        },
      });
    });
  });

  describe('cursor pagination', () => {
    it('encodes and decodes an opaque cursor', () => {
      const payload = {
        createdAt: '2026-08-31T00:00:00.000Z',
        id: 'user-1',
      };

      expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
    });

    it('rejects invalid cursors', () => {
      expect(() => decodeCursor('not-a-cursor')).toThrow(BadRequestException);

      const malformedCursor = Buffer.from(
        JSON.stringify({ createdAt: 123, id: { value: 'user-1' } }),
      ).toString('base64url');

      expect(() => decodeCursor(malformedCursor)).toThrow(BadRequestException);
    });

    it('creates DESC keyset params from cursor', () => {
      const cursor = encodeCursor({
        createdAt: '2026-08-31T00:00:00.000Z',
        id: 'user-1',
      });

      expect(getCursorPaginationParams({ cursor, limit: '10' })).toEqual({
        limit: 10,
        take: 11,
        orderBy: {
          createdAt: 'DESC',
          id: 'DESC',
        },
        where: {
          $or: [
            { createdAt: { $lt: new Date('2026-08-31T00:00:00.000Z') } },
            {
              createdAt: new Date('2026-08-31T00:00:00.000Z'),
              id: { $lt: 'user-1' },
            },
          ],
        },
      });
    });

    it('merges base filters with cursor filters', () => {
      const cursor = encodeCursor({
        createdAt: '2026-08-31T00:00:00.000Z',
        id: 'user-1',
      });
      const where = { status: 'ACTIVE' };

      expect(getCursorPaginationParams({ cursor }, { where }).where).toEqual({
        $and: [
          where,
          {
            $or: [
              { createdAt: { $lt: new Date('2026-08-31T00:00:00.000Z') } },
              {
                createdAt: new Date('2026-08-31T00:00:00.000Z'),
                id: { $lt: 'user-1' },
              },
            ],
          },
        ],
      });
    });

    it('returns limit items and next cursor when an extra item exists', () => {
      const items = [
        { id: '3', createdAt: new Date('2026-08-31T03:00:00.000Z') },
        { id: '2', createdAt: new Date('2026-08-31T02:00:00.000Z') },
        { id: '1', createdAt: new Date('2026-08-31T01:00:00.000Z') },
      ];

      const response = buildCursorPaginatedResponse(items, { limit: '2' });

      expect(response.items).toEqual(items.slice(0, 2));
      expect(response.meta.hasNextPage).toBe(true);
      expect(decodeCursor(response.meta.nextCursor as string)).toEqual({
        createdAt: '2026-08-31T02:00:00.000Z',
        id: '2',
      });
    });

    it('supports custom field names', () => {
      const item = {
        uuid: 'post-1',
        publishedAt: new Date('2026-08-31T00:00:00.000Z'),
      };

      expect(
        decodeCursor(
          createCursorFromItem(item, {
            idField: 'uuid',
            createdAtField: 'publishedAt',
          }),
        ),
      ).toEqual({
        createdAt: '2026-08-31T00:00:00.000Z',
        id: 'post-1',
      });
    });
  });
});
