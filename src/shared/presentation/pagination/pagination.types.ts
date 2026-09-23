export type SortDirection = 'ASC' | 'DESC';

export interface OffsetPaginationQuery {
  page?: number | string;
  limit?: number | string;
}

export interface OffsetPaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface OffsetPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface OffsetPaginatedResponse<T> {
  items: T[];
  meta: OffsetPaginationMeta;
}

export interface CursorPaginationQuery {
  cursor?: string;
  limit?: number | string;
}

export interface CursorPaginationOptions {
  createdAtField?: string;
  idField?: string;
  direction?: SortDirection;
  defaultLimit?: number;
  maxLimit?: number;
  where?: Record<string, unknown>;
}

export interface CursorPaginationParams {
  limit: number;
  take: number;
  orderBy: Record<string, SortDirection>;
  where?: Record<string, unknown>;
}

export interface CursorPaginationMeta {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  meta: CursorPaginationMeta;
}

export interface CursorPayload {
  createdAt: string;
  id: string | number;
}
