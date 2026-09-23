import { BadRequestException } from '@nestjs/common';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from './pagination.constants';
import {
  CursorPaginatedResponse,
  CursorPaginationOptions,
  CursorPaginationParams,
  CursorPaginationQuery,
  CursorPayload,
  OffsetPaginatedResponse,
  OffsetPaginationParams,
  OffsetPaginationQuery,
} from './pagination.types';

function toPositiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : fallback;
}

export function normalizeLimit(
  limit?: number | string,
  defaultLimit = DEFAULT_LIMIT,
  maxLimit = MAX_LIMIT,
): number {
  return Math.min(toPositiveInteger(limit, defaultLimit), maxLimit);
}

export function getOffsetPaginationParams(
  query: OffsetPaginationQuery = {},
  defaultLimit = DEFAULT_LIMIT,
  maxLimit = MAX_LIMIT,
): OffsetPaginationParams {
  const page = toPositiveInteger(query.page, DEFAULT_PAGE);
  const limit = normalizeLimit(query.limit, defaultLimit, maxLimit);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildOffsetPaginatedResponse<T>(
  items: T[],
  totalItems: number,
  query: OffsetPaginationQuery = {},
  defaultLimit = DEFAULT_LIMIT,
  maxLimit = MAX_LIMIT,
): OffsetPaginatedResponse<T> {
  const { page, limit } = getOffsetPaginationParams(
    query,
    defaultLimit,
    maxLimit,
  );
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const payload = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<CursorPayload>;

    if (
      typeof payload.createdAt !== 'string' ||
      (typeof payload.id !== 'string' && typeof payload.id !== 'number')
    ) {
      throw new Error('Cursor payload is incomplete');
    }

    return {
      createdAt: payload.createdAt,
      id: payload.id,
    };
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
}

export function getCursorPaginationParams(
  query: CursorPaginationQuery = {},
  options: CursorPaginationOptions = {},
): CursorPaginationParams {
  const createdAtField = options.createdAtField ?? 'createdAt';
  const idField = options.idField ?? 'id';
  const direction = options.direction ?? 'DESC';
  const baseWhere = options.where;
  const limit = normalizeLimit(
    query.limit,
    options.defaultLimit ?? DEFAULT_LIMIT,
    options.maxLimit ?? MAX_LIMIT,
  );
  const params: CursorPaginationParams = {
    limit,
    take: limit + 1,
    orderBy: {
      [createdAtField]: direction,
      [idField]: direction,
    },
  };

  if (!query.cursor) {
    if (baseWhere) {
      params.where = baseWhere;
    }

    return params;
  }

  const cursor = decodeCursor(query.cursor);
  const createdAt = new Date(cursor.createdAt);
  const operator = direction === 'DESC' ? '$lt' : '$gt';

  if (Number.isNaN(createdAt.getTime())) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  const cursorWhere = {
    $or: [
      { [createdAtField]: { [operator]: createdAt } },
      {
        [createdAtField]: createdAt,
        [idField]: { [operator]: cursor.id },
      },
    ],
  };
  params.where = baseWhere ? { $and: [baseWhere, cursorWhere] } : cursorWhere;

  return params;
}

export function createCursorFromItem<T extends Record<string, unknown>>(
  item: T,
  options: CursorPaginationOptions = {},
): string {
  const createdAtField = options.createdAtField ?? 'createdAt';
  const idField = options.idField ?? 'id';
  const createdAt = item[createdAtField];
  const id = item[idField];
  const createdAtDate =
    createdAt instanceof Date
      ? createdAt
      : new Date(createdAt as string | number);

  if (
    Number.isNaN(createdAtDate.getTime()) ||
    (typeof id !== 'string' && typeof id !== 'number')
  ) {
    throw new BadRequestException('Cannot create pagination cursor');
  }

  return encodeCursor({
    createdAt: createdAtDate.toISOString(),
    id,
  });
}

export function buildCursorPaginatedResponse<T extends Record<string, unknown>>(
  items: T[],
  query: CursorPaginationQuery = {},
  options: CursorPaginationOptions = {},
): CursorPaginatedResponse<T> {
  const limit = normalizeLimit(
    query.limit,
    options.defaultLimit ?? DEFAULT_LIMIT,
    options.maxLimit ?? MAX_LIMIT,
  );
  const hasNextPage = items.length > limit;
  const visibleItems = hasNextPage ? items.slice(0, limit) : items;
  const lastItem = visibleItems[visibleItems.length - 1];

  return {
    items: visibleItems,
    meta: {
      limit,
      hasNextPage,
      nextCursor:
        hasNextPage && lastItem
          ? createCursorFromItem(lastItem, options)
          : null,
    },
  };
}
